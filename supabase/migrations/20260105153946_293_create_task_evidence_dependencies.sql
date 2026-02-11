/*
  # Task Evidence, Dependencies, Escalations, and Handoffs

  1. New Tables
    - `task_evidence` - Photos, voice notes, metrics, signatures
    - `task_dependencies` - Task relationships (must complete A before B)
    - `task_state_transitions` - Full audit trail of state changes
    - `escalation_policies` - Rules for when/how to escalate
    - `task_escalations` - Active escalations
    - `task_warnings` - Pre-escalation warnings
    - `pattern_alerts` - Multi-day pattern detection
    - `handoff_summaries` - Auto-generated shift handoffs

  2. Security
    - Enable RLS on all tables
    - Full audit trail requirements
*/

CREATE TABLE IF NOT EXISTS task_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  evidence_type text NOT NULL CHECK (evidence_type IN ('photo', 'voice', 'note', 'metric', 'signature', 'document')),
  file_url text,
  file_size_bytes integer,
  mime_type text,
  transcription text,
  metric_name text,
  metric_value numeric,
  metric_unit text,
  notes text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  captured_by uuid NOT NULL REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS task_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  depends_on_task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  dependency_type text NOT NULL CHECK (dependency_type IN ('must_complete_before', 'must_start_after', 'blocks', 'related')),
  is_hard_dependency boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  UNIQUE(task_id, depends_on_task_id)
);

CREATE TABLE IF NOT EXISTS task_state_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  from_state text NOT NULL,
  to_state text NOT NULL,
  transition_reason text,
  transition_metadata jsonb DEFAULT '{}'::jsonb,
  transitioned_by uuid NOT NULL REFERENCES auth.users(id),
  transitioned_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS escalation_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  policy_name text NOT NULL,
  category_id uuid REFERENCES task_categories(id),
  risk_level text CHECK (risk_level IN ('A', 'B', 'C')),
  overdue_minutes integer NOT NULL,
  escalation_levels jsonb NOT NULL,
  notification_channels text[] DEFAULT ARRAY['in_app']::text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS task_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  policy_id uuid REFERENCES escalation_policies(id),
  escalation_level integer NOT NULL,
  escalated_to_user_id uuid REFERENCES auth.users(id),
  escalated_to_role text,
  escalation_reason text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'cancelled')),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES auth.users(id),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  resolution_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS task_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  warning_type text NOT NULL CHECK (warning_type IN ('approaching_due', 'missing_evidence', 'dependency_blocked', 'allergy_risk', 'pattern_concern')),
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message text NOT NULL,
  warning_metadata jsonb DEFAULT '{}'::jsonb,
  is_acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid REFERENCES auth.users(id),
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pattern_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  pattern_type text NOT NULL CHECK (pattern_type IN ('missed_meals', 'hygiene_decline', 'medication_refusal', 'behavioral_change', 'mobility_decline')),
  detection_period_days integer NOT NULL,
  occurrences_count integer NOT NULL,
  pattern_data jsonb NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'investigating', 'resolved', 'false_positive')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  resolution_notes text
);

CREATE TABLE IF NOT EXISTS handoff_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  shift_id uuid REFERENCES shifts(id),
  resident_id uuid REFERENCES residents(id),
  handoff_type text NOT NULL CHECK (handoff_type IN ('shift_change', 'emergency', 'transfer', 'discharge')),
  from_user_id uuid REFERENCES auth.users(id),
  to_user_id uuid REFERENCES auth.users(id),
  time_period_start timestamptz NOT NULL,
  time_period_end timestamptz NOT NULL,
  tasks_completed jsonb DEFAULT '[]'::jsonb,
  tasks_pending jsonb DEFAULT '[]'::jsonb,
  tasks_overdue jsonb DEFAULT '[]'::jsonb,
  incidents jsonb DEFAULT '[]'::jsonb,
  warnings jsonb DEFAULT '[]'::jsonb,
  vital_changes jsonb DEFAULT '[]'::jsonb,
  medication_changes jsonb DEFAULT '[]'::jsonb,
  meal_summary jsonb DEFAULT '{}'::jsonb,
  special_notes text,
  auto_generated boolean NOT NULL DEFAULT true,
  reviewed boolean NOT NULL DEFAULT false,
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_evidence_task ON task_evidence(task_id);
CREATE INDEX IF NOT EXISTS idx_task_evidence_type ON task_evidence(evidence_type);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_task_state_transitions_task ON task_state_transitions(task_id);
CREATE INDEX IF NOT EXISTS idx_task_state_transitions_time ON task_state_transitions(transitioned_at);
CREATE INDEX IF NOT EXISTS idx_escalation_policies_agency ON escalation_policies(agency_id);
CREATE INDEX IF NOT EXISTS idx_escalation_policies_active ON escalation_policies(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_task_escalations_task ON task_escalations(task_id);
CREATE INDEX IF NOT EXISTS idx_task_escalations_status ON task_escalations(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_task_warnings_task ON task_warnings(task_id);
CREATE INDEX IF NOT EXISTS idx_task_warnings_acknowledged ON task_warnings(is_acknowledged) WHERE is_acknowledged = false;
CREATE INDEX IF NOT EXISTS idx_pattern_alerts_resident ON pattern_alerts(resident_id);
CREATE INDEX IF NOT EXISTS idx_pattern_alerts_status ON pattern_alerts(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_handoff_summaries_agency ON handoff_summaries(agency_id);
CREATE INDEX IF NOT EXISTS idx_handoff_summaries_shift ON handoff_summaries(shift_id);
CREATE INDEX IF NOT EXISTS idx_handoff_summaries_resident ON handoff_summaries(resident_id);
CREATE INDEX IF NOT EXISTS idx_handoff_summaries_time ON handoff_summaries(time_period_end);

ALTER TABLE task_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_state_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_warnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pattern_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE handoff_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view evidence for tasks in their agency"
  ON task_evidence FOR SELECT
  TO authenticated
  USING (
    task_id IN (SELECT id FROM tasks WHERE agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Caregivers can create evidence for their tasks"
  ON task_evidence FOR INSERT
  TO authenticated
  WITH CHECK (
    task_id IN (SELECT id FROM tasks WHERE owner_user_id = auth.uid() OR agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Users can view task dependencies"
  ON task_dependencies FOR SELECT
  TO authenticated
  USING (
    task_id IN (SELECT id FROM tasks WHERE agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Supervisors can manage dependencies"
  ON task_dependencies FOR ALL
  TO authenticated
  USING (
    task_id IN (
      SELECT t.id FROM tasks t
      INNER JOIN user_profiles up ON t.agency_id = up.agency_id
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
    )
  );

CREATE POLICY "Users can view state transitions"
  ON task_state_transitions FOR SELECT
  TO authenticated
  USING (
    task_id IN (SELECT id FROM tasks WHERE agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()))
  );

CREATE POLICY "System creates state transitions"
  ON task_state_transitions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view escalation policies"
  ON escalation_policies FOR SELECT
  TO authenticated
  USING (
    agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Agency admins can manage escalation policies"
  ON escalation_policies FOR ALL
  TO authenticated
  USING (
    agency_id IN (
      SELECT up.agency_id FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
    )
  );

CREATE POLICY "Users can view escalations"
  ON task_escalations FOR SELECT
  TO authenticated
  USING (
    task_id IN (SELECT id FROM tasks WHERE agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()))
  );

CREATE POLICY "System creates escalations"
  ON task_escalations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Escalated users can acknowledge"
  ON task_escalations FOR UPDATE
  TO authenticated
  USING (escalated_to_user_id = auth.uid() OR task_id IN (
    SELECT t.id FROM tasks t
    INNER JOIN user_profiles up ON t.agency_id = up.agency_id
    INNER JOIN roles r ON up.role_id = r.id
    WHERE up.id = auth.uid() AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
  ));

CREATE POLICY "Users can view warnings"
  ON task_warnings FOR SELECT
  TO authenticated
  USING (
    task_id IN (SELECT id FROM tasks WHERE agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()))
  );

CREATE POLICY "System creates warnings"
  ON task_warnings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can acknowledge warnings"
  ON task_warnings FOR UPDATE
  TO authenticated
  USING (
    task_id IN (SELECT id FROM tasks WHERE owner_user_id = auth.uid() OR agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Users can view pattern alerts"
  ON pattern_alerts FOR SELECT
  TO authenticated
  USING (
    resident_id IN (SELECT r.id FROM residents r WHERE r.agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()))
  );

CREATE POLICY "System creates pattern alerts"
  ON pattern_alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Supervisors can manage pattern alerts"
  ON pattern_alerts FOR UPDATE
  TO authenticated
  USING (
    resident_id IN (
      SELECT r.id FROM residents r
      INNER JOIN user_profiles up ON r.agency_id = up.agency_id
      INNER JOIN roles ro ON up.role_id = ro.id
      WHERE up.id = auth.uid() AND ro.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
    )
  );

CREATE POLICY "Users can view handoff summaries"
  ON handoff_summaries FOR SELECT
  TO authenticated
  USING (
    agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "System creates handoff summaries"
  ON handoff_summaries FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can review handoff summaries"
  ON handoff_summaries FOR UPDATE
  TO authenticated
  USING (
    to_user_id = auth.uid() OR agency_id IN (
      SELECT up.agency_id FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
    )
  );
