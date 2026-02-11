/*
  # WP4: Shadow AI Learning Infrastructure - Truth Enforced

  1. Purpose
    - Shadow AI learns from real feedback over time
    - NEVER acts directly, only proposes updates
    - All learning is logged, versioned, and reversible

  2. Core Tables
    - learning_change_ledger: Every learning event
    - voice_correction_memory: Language learning pairs
    - alert_feedback_log: Supervisor feedback on alerts
    - baseline_drift_proposals: Shadow baseline adjustments
    - outcome_feedback_log: Prediction vs reality

  3. Governance
    - All changes are versioned
    - Rollback restores exact prior behavior
    - Freeze stops learning temporarily
*/

-- Learning Change Ledger (Master Audit Trail)
CREATE TABLE IF NOT EXISTS learning_change_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  learning_domain text NOT NULL, -- 'voice_extraction', 'alert_threshold', 'baseline_drift', 'prediction_calibration'
  change_type text NOT NULL, -- 'parameter_update', 'threshold_adjustment', 'baseline_proposal', 'confidence_recalibration'
  target_entity_type text, -- 'resident', 'caregiver', 'alert_type', 'extraction_pattern'
  target_entity_id uuid,
  
  previous_value jsonb,
  new_value jsonb,
  change_reason text NOT NULL,
  source_signals jsonb NOT NULL, -- feedback_ids, correction_ids, outcome_ids
  
  confidence_delta numeric, -- how much learning improved confidence
  evidence_count int NOT NULL DEFAULT 0, -- how many feedback signals contributed
  
  applied_at timestamptz NOT NULL DEFAULT now(),
  applied_by_system boolean NOT NULL DEFAULT true,
  applied_by_user uuid REFERENCES user_profiles(id),
  
  version int NOT NULL DEFAULT 1,
  is_rolled_back boolean NOT NULL DEFAULT false,
  rolled_back_at timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_learning_ledger_agency ON learning_change_ledger(agency_id);
CREATE INDEX IF NOT EXISTS idx_learning_ledger_domain ON learning_change_ledger(learning_domain);
CREATE INDEX IF NOT EXISTS idx_learning_ledger_entity ON learning_change_ledger(target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_learning_ledger_applied ON learning_change_ledger(applied_at);

-- Voice Correction Memory (Language Learning)
CREATE TABLE IF NOT EXISTS voice_correction_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  caregiver_id uuid REFERENCES user_profiles(id),
  
  original_phrase text NOT NULL,
  corrected_structure jsonb NOT NULL, -- extracted structure after correction
  correction_type text NOT NULL, -- 'field_mapping', 'entity_resolution', 'value_extraction'
  
  facility_context text, -- specific facility language patterns
  occurrence_count int NOT NULL DEFAULT 1,
  last_applied_at timestamptz,
  
  confidence_improvement numeric, -- how much this correction improves confidence
  success_rate numeric, -- how often this correction helps
  
  learned_from_feedback_ids uuid[], -- source feedback that created this
  version int NOT NULL DEFAULT 1,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_voice_correction_agency ON voice_correction_memory(agency_id);
CREATE INDEX IF NOT EXISTS idx_voice_correction_caregiver ON voice_correction_memory(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_voice_correction_phrase ON voice_correction_memory(original_phrase);

-- Alert Feedback Log (Noise Reduction Learning)
CREATE TABLE IF NOT EXISTS alert_feedback_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  alert_id uuid, -- reference to intelligence_signals or prioritized_issues
  alert_type text NOT NULL,
  alert_severity text NOT NULL,
  
  supervisor_id uuid NOT NULL REFERENCES user_profiles(id),
  feedback_type text NOT NULL CHECK (feedback_type IN ('useful', 'not_useful', 'ignore', 'false_positive')),
  feedback_reason text,
  
  alert_metadata jsonb, -- copy of alert details at time of feedback
  context_at_time jsonb, -- facility state when feedback given
  
  contributed_to_learning boolean NOT NULL DEFAULT false,
  learning_change_id uuid REFERENCES learning_change_ledger(id),
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alert_feedback_agency ON alert_feedback_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_alert_feedback_type ON alert_feedback_log(alert_type, feedback_type);
CREATE INDEX IF NOT EXISTS idx_alert_feedback_supervisor ON alert_feedback_log(supervisor_id);

-- Baseline Drift Proposals (Shadow Baseline Adaptation)
CREATE TABLE IF NOT EXISTS baseline_drift_proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE,
  caregiver_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  baseline_type text NOT NULL,
  current_baseline_value numeric NOT NULL,
  proposed_baseline_value numeric NOT NULL,
  drift_magnitude numeric NOT NULL,
  drift_direction text NOT NULL CHECK (drift_direction IN ('increasing', 'decreasing', 'stable')),
  
  observation_window_days int NOT NULL,
  evidence_data_points int NOT NULL,
  confidence_score numeric NOT NULL,
  
  drift_reason text NOT NULL,
  supporting_observations jsonb NOT NULL,
  
  status text NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'applied', 'rejected', 'auto_applied')),
  applied_at timestamptz,
  applied_by_change_id uuid REFERENCES learning_change_ledger(id),
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_baseline_drift_agency ON baseline_drift_proposals(agency_id);
CREATE INDEX IF NOT EXISTS idx_baseline_drift_resident ON baseline_drift_proposals(resident_id);
CREATE INDEX IF NOT EXISTS idx_baseline_drift_caregiver ON baseline_drift_proposals(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_baseline_drift_status ON baseline_drift_proposals(status);

-- Outcome Feedback Log (Prediction Calibration)
CREATE TABLE IF NOT EXISTS outcome_feedback_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  
  prediction_id uuid NOT NULL, -- risk_score_id or prioritized_issue_id
  prediction_type text NOT NULL, -- 'risk_score', 'prioritized_issue', 'anomaly_detection'
  predicted_severity text NOT NULL,
  predicted_confidence numeric NOT NULL,
  
  actual_outcome text NOT NULL CHECK (actual_outcome IN ('incident_occurred', 'incident_prevented', 'false_alarm', 'no_incident')),
  outcome_severity text,
  outcome_recorded_by uuid REFERENCES user_profiles(id),
  outcome_notes text,
  
  prediction_accuracy numeric, -- calculated: 1.0 if correct, 0.0 if wrong
  confidence_was_appropriate boolean,
  
  contributed_to_learning boolean NOT NULL DEFAULT false,
  learning_change_id uuid REFERENCES learning_change_ledger(id),
  
  created_at timestamptz NOT NULL DEFAULT now(),
  outcome_recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outcome_feedback_agency ON outcome_feedback_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_outcome_feedback_prediction ON outcome_feedback_log(prediction_id);
CREATE INDEX IF NOT EXISTS idx_outcome_feedback_type ON outcome_feedback_log(prediction_type);

-- Learning System State (Governance Control)
CREATE TABLE IF NOT EXISTS learning_system_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  
  learning_enabled boolean NOT NULL DEFAULT true,
  frozen_until timestamptz,
  frozen_by uuid REFERENCES user_profiles(id),
  frozen_reason text,
  
  total_learning_events int NOT NULL DEFAULT 0,
  last_learning_event_at timestamptz,
  
  rollback_count int NOT NULL DEFAULT 0,
  last_rollback_at timestamptz,
  
  learning_metrics jsonb, -- aggregate metrics by domain
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE(agency_id)
);

-- RLS Policies
ALTER TABLE learning_change_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_correction_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_feedback_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE baseline_drift_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE outcome_feedback_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_system_state ENABLE ROW LEVEL SECURITY;

-- Learning change ledger: Read by authenticated users
CREATE POLICY "Users can view learning changes in their agency"
  ON learning_change_ledger FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.agency_id = learning_change_ledger.agency_id
    )
  );

-- Voice correction memory: Read by authenticated, insert by system
CREATE POLICY "Users can view voice corrections in their agency"
  ON voice_correction_memory FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.agency_id = voice_correction_memory.agency_id
    )
  );

-- Alert feedback: Insert by supervisors, read by authenticated
CREATE POLICY "Supervisors can provide alert feedback"
  ON alert_feedback_log FOR INSERT
  TO authenticated
  WITH CHECK (
    supervisor_id = auth.uid()
  );

CREATE POLICY "Users can view alert feedback in their agency"
  ON alert_feedback_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.agency_id = alert_feedback_log.agency_id
    )
  );

-- Baseline drift proposals: Read by authenticated
CREATE POLICY "Users can view baseline drift proposals in their agency"
  ON baseline_drift_proposals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.agency_id = baseline_drift_proposals.agency_id
    )
  );

-- Outcome feedback: Insert by authenticated, read by authenticated
CREATE POLICY "Users can provide outcome feedback"
  ON outcome_feedback_log FOR INSERT
  TO authenticated
  WITH CHECK (
    outcome_recorded_by = auth.uid()
  );

CREATE POLICY "Users can view outcome feedback in their agency"
  ON outcome_feedback_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.agency_id = outcome_feedback_log.agency_id
    )
  );

-- Learning system state: Read by authenticated
CREATE POLICY "Users can view learning system state for their agency"
  ON learning_system_state FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.agency_id = learning_system_state.agency_id
    )
  );
