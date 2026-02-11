/*
  # Forensic Replay Mode (Phase 3 — Gap 5)

  1. Purpose
    - Full timeline replay per resident/event
    - AI suggestions, human actions, Brain decisions
    - SOP enforcement visualization
    - Legal-grade reconstruction

  2. New Tables
    - `forensic_timelines`
      - Timeline snapshots for replay
    
    - `forensic_decision_points`
      - Brain decision points with reasoning
    
    - `forensic_replay_sessions`
      - Replay session tracking

  3. Enforcement
    - Read-only
    - Immutable
    - Complete audit trace
*/

CREATE TABLE IF NOT EXISTS forensic_timelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_type text NOT NULL CHECK (timeline_type IN ('RESIDENT_CARE', 'INCIDENT', 'MEDICATION_EVENT', 'EMERGENCY', 'DEVICE_EVENT')),
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE,
  incident_id uuid,
  start_timestamp timestamptz NOT NULL,
  end_timestamp timestamptz NOT NULL,
  timeline_snapshot jsonb NOT NULL,
  event_count integer NOT NULL,
  decision_point_count integer NOT NULL,
  sop_enforcement_count integer NOT NULL,
  participant_user_ids uuid[] NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by uuid REFERENCES user_profiles(id),
  is_sealed boolean NOT NULL DEFAULT false,
  sealed_at timestamptz,
  legal_hold boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS forensic_decision_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id uuid NOT NULL REFERENCES forensic_timelines(id) ON DELETE CASCADE,
  decision_timestamp timestamptz NOT NULL,
  decision_type text NOT NULL CHECK (decision_type IN ('AI_SUGGESTION', 'HUMAN_ACTION', 'BRAIN_ENFORCEMENT', 'SOP_TRIGGER', 'STATE_TRANSITION')),
  decision_actor text NOT NULL,
  decision_actor_id uuid,
  decision_context jsonb NOT NULL,
  decision_input jsonb NOT NULL,
  decision_output jsonb NOT NULL,
  decision_reasoning text,
  was_blocked boolean NOT NULL DEFAULT false,
  blocking_rule text,
  alternatives_considered jsonb,
  confidence_score numeric(3,2) CHECK (confidence_score BETWEEN 0 AND 1),
  audit_log_references uuid[],
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS forensic_replay_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timeline_id uuid NOT NULL REFERENCES forensic_timelines(id) ON DELETE CASCADE,
  session_purpose text NOT NULL CHECK (session_purpose IN ('DISPUTE_RESOLUTION', 'AUDIT_REVIEW', 'LEGAL_DISCOVERY', 'TRAINING', 'QUALITY_REVIEW')),
  requested_by uuid NOT NULL REFERENCES user_profiles(id),
  reviewed_by uuid REFERENCES user_profiles(id),
  session_start timestamptz NOT NULL DEFAULT now(),
  session_end timestamptz,
  playback_speed numeric(3,2) DEFAULT 1.0,
  filters_applied jsonb,
  annotations jsonb,
  findings text,
  outcome text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE forensic_timelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE forensic_decision_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE forensic_replay_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_forensic_timelines_type ON forensic_timelines(timeline_type);
CREATE INDEX IF NOT EXISTS idx_forensic_timelines_resident ON forensic_timelines(resident_id);
CREATE INDEX IF NOT EXISTS idx_forensic_timelines_sealed ON forensic_timelines(is_sealed);
CREATE INDEX IF NOT EXISTS idx_forensic_decision_points_timeline ON forensic_decision_points(timeline_id);
CREATE INDEX IF NOT EXISTS idx_forensic_decision_points_timestamp ON forensic_decision_points(decision_timestamp);
CREATE INDEX IF NOT EXISTS idx_forensic_decision_points_type ON forensic_decision_points(decision_type);
CREATE INDEX IF NOT EXISTS idx_forensic_replay_sessions_timeline ON forensic_replay_sessions(timeline_id);
CREATE INDEX IF NOT EXISTS idx_forensic_replay_sessions_purpose ON forensic_replay_sessions(session_purpose);

CREATE POLICY "Supervisors can view forensic timelines"
  ON forensic_timelines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      JOIN residents res ON res.id = forensic_timelines.resident_id
      WHERE up.id = auth.uid()
        AND up.agency_id = res.agency_id
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Supervisors can generate timelines"
  ON forensic_timelines FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Supervisors can view decision points"
  ON forensic_decision_points FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      JOIN forensic_timelines ft ON ft.id = forensic_decision_points.timeline_id
      JOIN residents res ON res.id = ft.resident_id
      WHERE up.id = auth.uid()
        AND up.agency_id = res.agency_id
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Supervisors can create replay sessions"
  ON forensic_replay_sessions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );
