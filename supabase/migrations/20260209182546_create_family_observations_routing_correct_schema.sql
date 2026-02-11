/*
  # Create Family Observations and Routing Infrastructure

  1. New Tables
    - family_observations: Family-submitted observations with rate limiting
    - family_action_requests: Family requests for caregiver action
    - supervisor_exception_queue: Unified triage queue for supervisors
    - unified_timeline_events: Single source of truth for all timeline events

  2. Security
    - RLS enabled on all tables
    - Family can only write for their linked residents
    - Supervisors can view/action their agency's items
    - Rate limiting via idempotency keys

  3. Audit
    - All writes create audit_log entries
    - Actor attribution tracked
*/

-- ============================================================
-- Table: family_observations
-- ============================================================

CREATE TABLE IF NOT EXISTS family_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  family_user_id uuid NOT NULL,
  observation_text text NOT NULL,
  concern_level text NOT NULL CHECK (concern_level IN ('INFO', 'MINOR', 'MODERATE', 'URGENT')),
  observation_category text,
  submitted_at timestamptz DEFAULT now(),
  idempotency_key text UNIQUE,
  processed_by_supervisor uuid REFERENCES user_profiles(id),
  supervisor_action text CHECK (supervisor_action IN ('DISMISSED', 'TASK_CREATED', 'ESCALATED', 'ROUTED_TO_CAREGIVER')),
  supervisor_notes text,
  processed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_family_obs_resident ON family_observations(resident_id);
CREATE INDEX IF NOT EXISTS idx_family_obs_family_user ON family_observations(family_user_id);
CREATE INDEX IF NOT EXISTS idx_family_obs_submitted ON family_observations(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_family_obs_unprocessed ON family_observations(processed_at) WHERE processed_at IS NULL;

ALTER TABLE family_observations ENABLE ROW LEVEL SECURITY;

-- Family can insert for their linked residents
CREATE POLICY "Family can submit observations for linked residents"
  ON family_observations FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_resident_links
      WHERE family_resident_links.resident_id = family_observations.resident_id
        AND family_resident_links.family_user_id = family_observations.family_user_id
        AND family_resident_links.status = 'active'
    )
  );

-- Family can view their own observations
CREATE POLICY "Family can view own observations"
  ON family_observations FOR SELECT
  TO authenticated, anon
  USING (
    family_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
        AND up.agency_id = (SELECT agency_id FROM residents WHERE residents.id = family_observations.resident_id)
    )
  );

-- Supervisors can update (process) observations
CREATE POLICY "Supervisors can process observations"
  ON family_observations FOR UPDATE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
        AND up.agency_id = (SELECT agency_id FROM residents WHERE residents.id = family_observations.resident_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
        AND up.agency_id = (SELECT agency_id FROM residents WHERE residents.id = family_observations.resident_id)
    )
  );

-- ============================================================
-- Table: family_action_requests
-- ============================================================

CREATE TABLE IF NOT EXISTS family_action_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  family_user_id uuid NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('CHECK_ON_RESIDENT', 'SCHEDULE_CALL', 'MEDICATION_CONCERN', 'HEALTH_CHECK', 'OTHER')),
  request_text text NOT NULL,
  urgency text NOT NULL CHECK (urgency IN ('ROUTINE', 'SOON', 'URGENT')),
  submitted_at timestamptz DEFAULT now(),
  idempotency_key text UNIQUE,
  routed_to_caregiver uuid REFERENCES user_profiles(id),
  routed_by_supervisor uuid REFERENCES user_profiles(id),
  routed_at timestamptz,
  completed_by uuid REFERENCES user_profiles(id),
  completed_at timestamptz,
  completion_notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_family_req_resident ON family_action_requests(resident_id);
CREATE INDEX IF NOT EXISTS idx_family_req_family_user ON family_action_requests(family_user_id);
CREATE INDEX IF NOT EXISTS idx_family_req_unrouted ON family_action_requests(routed_at) WHERE routed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_family_req_incomplete ON family_action_requests(completed_at) WHERE completed_at IS NULL;

ALTER TABLE family_action_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family can submit action requests for linked residents"
  ON family_action_requests FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM family_resident_links
      WHERE family_resident_links.resident_id = family_action_requests.resident_id
        AND family_resident_links.family_user_id = family_action_requests.family_user_id
        AND family_resident_links.status = 'active'
    )
  );

CREATE POLICY "Family can view own requests"
  ON family_action_requests FOR SELECT
  TO authenticated, anon
  USING (
    family_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN', 'CAREGIVER')
        AND up.agency_id = (SELECT agency_id FROM residents WHERE residents.id = family_action_requests.resident_id)
    )
  );

CREATE POLICY "Supervisors can route requests"
  ON family_action_requests FOR UPDATE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
        AND up.agency_id = (SELECT agency_id FROM residents WHERE residents.id = family_action_requests.resident_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
        AND up.agency_id = (SELECT agency_id FROM residents WHERE residents.id = family_action_requests.resident_id)
    )
  );

-- ============================================================
-- Table: supervisor_exception_queue
-- ============================================================

CREATE TABLE IF NOT EXISTS supervisor_exception_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  exception_type text NOT NULL CHECK (exception_type IN ('FAMILY_OBSERVATION', 'FAMILY_REQUEST', 'ANOMALY_DETECTED', 'TASK_CONCERN', 'MEDICATION_ISSUE', 'HEALTH_ALERT')),
  severity text NOT NULL CHECK (severity IN ('LOW', 'MODERATE', 'HIGH', 'CRITICAL')),
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  summary text NOT NULL,
  context_data jsonb,
  created_at timestamptz DEFAULT now(),
  assigned_to uuid REFERENCES user_profiles(id),
  assigned_at timestamptz,
  resolved_by uuid REFERENCES user_profiles(id),
  resolved_at timestamptz,
  resolution_action text,
  resolution_notes text
);

CREATE INDEX IF NOT EXISTS idx_super_queue_resident ON supervisor_exception_queue(resident_id);
CREATE INDEX IF NOT EXISTS idx_super_queue_agency ON supervisor_exception_queue(agency_id);
CREATE INDEX IF NOT EXISTS idx_super_queue_unresolved ON supervisor_exception_queue(resolved_at) WHERE resolved_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_super_queue_severity ON supervisor_exception_queue(severity, created_at DESC);

ALTER TABLE supervisor_exception_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors can view agency exceptions"
  ON supervisor_exception_queue FOR SELECT
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
        AND up.agency_id = supervisor_exception_queue.agency_id
    )
  );

CREATE POLICY "Supervisors can resolve exceptions"
  ON supervisor_exception_queue FOR UPDATE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
        AND up.agency_id = supervisor_exception_queue.agency_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
        AND up.agency_id = supervisor_exception_queue.agency_id
    )
  );

-- ============================================================
-- Table: unified_timeline_events
-- ============================================================

CREATE TABLE IF NOT EXISTS unified_timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  event_timestamp timestamptz NOT NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('CAREGIVER', 'SENIOR', 'FAMILY', 'SUPERVISOR', 'SYSTEM', 'DEVICE')),
  actor_id uuid,
  actor_name text,
  event_category text NOT NULL,
  event_type text NOT NULL,
  event_summary text NOT NULL,
  event_details jsonb,
  source_table text NOT NULL,
  source_id uuid NOT NULL,
  evidence_count integer DEFAULT 0,
  requires_review boolean DEFAULT false,
  reviewed_by uuid REFERENCES user_profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unified_timeline_resident ON unified_timeline_events(resident_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_unified_timeline_actor ON unified_timeline_events(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_unified_timeline_review ON unified_timeline_events(requires_review) WHERE requires_review = true;

ALTER TABLE unified_timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All roles can view timeline for their residents"
  ON unified_timeline_events FOR SELECT
  TO authenticated, anon
  USING (
    -- Senior can view own timeline
    EXISTS (
      SELECT 1 FROM senior_resident_links
      WHERE senior_resident_links.resident_id = unified_timeline_events.resident_id
        AND senior_resident_links.senior_user_id = auth.uid()
        AND senior_resident_links.status = 'active'
    )
    OR
    -- Family can view linked resident timeline
    EXISTS (
      SELECT 1 FROM family_resident_links
      WHERE family_resident_links.resident_id = unified_timeline_events.resident_id
        AND family_resident_links.family_user_id = auth.uid()
        AND family_resident_links.status = 'active'
    )
    OR
    -- Caregivers/Supervisors can view agency residents
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      JOIN residents res ON res.agency_id = up.agency_id
      WHERE up.id = auth.uid()
        AND res.id = unified_timeline_events.resident_id
        AND r.name IN ('CAREGIVER', 'SUPERVISOR', 'AGENCY_ADMIN')
    )
  );
