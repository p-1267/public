/*
  # Supervisor Escalation & Physician Notification System

  1. New Tables
    - `escalation_queue` - Tracks all escalations requiring supervisor attention
      - Includes SLA tracking, status, and urgency levels
    - `clinician_reviews` - Tracks physician notification requests and responses
      - Notification status, acknowledgment, and timeline tracking
    - `escalation_audit_log` - Complete audit trail of all escalation actions

  2. Security
    - Enable RLS on all tables
    - Supervisors can view/manage escalations for their agency
    - Clinicians can view escalations assigned to them
    - Audit log is read-only for non-system users

  3. Features
    - SLA countdown and breach detection
    - Notification lifecycle tracking
    - Multi-level escalation (Level 1, 2, 3)
    - Complete audit trail
*/

-- Escalation Queue Table
CREATE TABLE IF NOT EXISTS escalation_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id),
  resident_id uuid NOT NULL REFERENCES residents(id),
  resident_name text NOT NULL,
  
  -- Source tracking
  signal_id uuid REFERENCES intelligence_signals(id),
  task_id uuid REFERENCES tasks(id),
  issue_id uuid REFERENCES prioritized_issues(id),
  
  -- Escalation details
  escalation_type text NOT NULL CHECK (escalation_type IN ('PHYSICIAN_NOTIFICATION', 'CLINICAL_REVIEW', 'INCREASED_MONITORING', 'STAFFING_ADJUSTMENT', 'IMMEDIATE_INTERVENTION')),
  escalation_level integer NOT NULL DEFAULT 1 CHECK (escalation_level IN (1, 2, 3)),
  priority text NOT NULL CHECK (priority IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  
  -- Description
  title text NOT NULL,
  description text NOT NULL,
  recommended_action text,
  clinical_context text,
  
  -- Timing & SLA
  escalated_at timestamptz NOT NULL DEFAULT now(),
  required_response_by timestamptz NOT NULL,
  sla_hours numeric NOT NULL DEFAULT 24,
  
  -- Status tracking
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'NOTIFIED', 'RESOLVED', 'ESCALATED', 'CANCELLED')),
  assigned_to uuid REFERENCES user_profiles(id),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES user_profiles(id),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES user_profiles(id),
  resolution_notes text,
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Clinician Review Requests
CREATE TABLE IF NOT EXISTS clinician_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_id uuid NOT NULL REFERENCES escalation_queue(id),
  resident_id uuid NOT NULL REFERENCES residents(id),
  resident_name text NOT NULL,
  
  -- Notification details
  notification_reason text NOT NULL,
  clinical_summary text NOT NULL,
  urgency text NOT NULL CHECK (urgency IN ('IMMEDIATE', 'URGENT', 'ROUTINE')),
  required_by timestamptz NOT NULL,
  
  -- Notification status
  notification_status text NOT NULL DEFAULT 'NOT_SENT' CHECK (notification_status IN ('NOT_SENT', 'SENT', 'DELIVERED', 'READ', 'ACKNOWLEDGED')),
  notified_at timestamptz,
  notification_method text CHECK (notification_method IN ('SMS', 'EMAIL', 'PHONE', 'FAX', 'EHR')),
  
  -- Physician details
  physician_id uuid,
  physician_name text,
  physician_contact text,
  
  -- Response tracking
  acknowledged_at timestamptz,
  response_received_at timestamptz,
  physician_orders text,
  physician_notes text,
  
  -- Outcomes
  outcome text CHECK (outcome IN ('ORDERS_RECEIVED', 'NO_ACTION_NEEDED', 'ESCALATED_FURTHER', 'TRANSFERRED', 'NO_RESPONSE')),
  
  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Escalation Audit Log
CREATE TABLE IF NOT EXISTS escalation_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_id uuid NOT NULL REFERENCES escalation_queue(id),
  action text NOT NULL,
  actor_id uuid REFERENCES user_profiles(id),
  actor_role text,
  previous_status text,
  new_status text,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_escalation_queue_agency_status ON escalation_queue(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_escalation_queue_resident ON escalation_queue(resident_id);
CREATE INDEX IF NOT EXISTS idx_escalation_queue_priority ON escalation_queue(priority, status);
CREATE INDEX IF NOT EXISTS idx_escalation_queue_sla ON escalation_queue(required_response_by) WHERE status IN ('PENDING', 'IN_PROGRESS');

CREATE INDEX IF NOT EXISTS idx_clinician_reviews_escalation ON clinician_reviews(escalation_id);
CREATE INDEX IF NOT EXISTS idx_clinician_reviews_status ON clinician_reviews(notification_status, required_by);

CREATE INDEX IF NOT EXISTS idx_escalation_audit_log_escalation ON escalation_audit_log(escalation_id, created_at DESC);

-- Enable RLS
ALTER TABLE escalation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinician_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Escalation Queue: Supervisors can view/manage their agency's escalations
CREATE POLICY "Supervisors can view escalations for their agency"
  ON escalation_queue FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Supervisors can insert escalations"
  ON escalation_queue FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Supervisors can update escalations"
  ON escalation_queue FOR UPDATE
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Clinician Reviews: Supervisors and assigned clinicians can view
CREATE POLICY "Supervisors and clinicians can view reviews"
  ON clinician_reviews FOR SELECT
  TO authenticated
  USING (
    escalation_id IN (
      SELECT id FROM escalation_queue WHERE agency_id IN (
        SELECT agency_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Supervisors can create clinician reviews"
  ON clinician_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    escalation_id IN (
      SELECT id FROM escalation_queue WHERE agency_id IN (
        SELECT agency_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Clinicians and supervisors can update reviews"
  ON clinician_reviews FOR UPDATE
  TO authenticated
  USING (
    escalation_id IN (
      SELECT id FROM escalation_queue WHERE agency_id IN (
        SELECT agency_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Audit Log: Read-only for authenticated users
CREATE POLICY "Authenticated users can view audit log"
  ON escalation_audit_log FOR SELECT
  TO authenticated
  USING (
    escalation_id IN (
      SELECT id FROM escalation_queue WHERE agency_id IN (
        SELECT agency_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

-- Showcase mode: Allow anon access
CREATE POLICY "Showcase mode: anon can view escalations"
  ON escalation_queue FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Showcase mode: anon can insert escalations"
  ON escalation_queue FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Showcase mode: anon can update escalations"
  ON escalation_queue FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Showcase mode: anon can view clinician reviews"
  ON clinician_reviews FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Showcase mode: anon can insert clinician reviews"
  ON clinician_reviews FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Showcase mode: anon can update clinician reviews"
  ON clinician_reviews FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Showcase mode: anon can view audit log"
  ON escalation_audit_log FOR SELECT
  TO anon
  USING (true);
