/*
  # Step 4: Trajectory & Near-Future Projection Infrastructure
  
  Creates tables and policies for deterministic trajectory projection
*/

CREATE TABLE IF NOT EXISTS projection_rule_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_name text NOT NULL UNIQUE,
  version_number integer NOT NULL,
  rule_set jsonb NOT NULL,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_until timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

CREATE TABLE IF NOT EXISTS risk_trajectory_projections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  risk_type text NOT NULL,
  current_risk_level text NOT NULL,
  
  trend_velocity numeric NOT NULL,
  persistence_duration_hours integer NOT NULL,
  escalation_horizon_hours integer,
  projected_next_level text,
  
  projection_confidence numeric NOT NULL CHECK (projection_confidence >= 0 AND projection_confidence <= 1),
  data_sufficiency text NOT NULL,
  data_points_used integer NOT NULL,
  lookback_window_hours integer NOT NULL,
  assumptions text NOT NULL,
  
  rule_version_id uuid NOT NULL REFERENCES projection_rule_versions(id),
  computation_timestamp timestamptz NOT NULL DEFAULT now(),
  
  source_data_ids uuid[],
  velocity_calculation_details jsonb,
  threshold_crossing_details jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trajectory_resident ON risk_trajectory_projections(resident_id, computation_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_trajectory_agency ON risk_trajectory_projections(agency_id);
CREATE INDEX IF NOT EXISTS idx_trajectory_escalation ON risk_trajectory_projections(escalation_horizon_hours) WHERE escalation_horizon_hours IS NOT NULL;

CREATE TABLE IF NOT EXISTS trajectory_computation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  computation_type text NOT NULL,
  trigger_source text,
  
  input_data_snapshot jsonb NOT NULL,
  output_projection_id uuid REFERENCES risk_trajectory_projections(id),
  
  computation_status text NOT NULL,
  computation_duration_ms integer,
  error_details jsonb,
  
  rule_version_id uuid REFERENCES projection_rule_versions(id),
  computed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trajectory_log_resident ON trajectory_computation_log(resident_id, computed_at DESC);

CREATE TABLE IF NOT EXISTS historical_pattern_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  pattern_type text NOT NULL,
  pattern_signature jsonb NOT NULL,
  
  observed_in_resident_id uuid REFERENCES residents(id) ON DELETE SET NULL,
  observation_window_start timestamptz NOT NULL,
  observation_window_end timestamptz NOT NULL,
  outcome_severity text,
  outcome_description text,
  
  pattern_confidence numeric CHECK (pattern_confidence >= 0 AND pattern_confidence <= 1),
  match_criteria jsonb,
  
  created_at timestamptz DEFAULT now(),
  created_by uuid
);

CREATE INDEX IF NOT EXISTS idx_pattern_library_agency ON historical_pattern_library(agency_id);
CREATE INDEX IF NOT EXISTS idx_pattern_library_type ON historical_pattern_library(pattern_type);

ALTER TABLE projection_rule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE risk_trajectory_projections ENABLE ROW LEVEL SECURITY;
ALTER TABLE trajectory_computation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_pattern_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Rule versions readable by all"
  ON projection_rule_versions FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Trajectory projections readable"
  ON risk_trajectory_projections FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Trajectory projections insert"
  ON risk_trajectory_projections FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Computation log readable"
  ON trajectory_computation_log FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Computation log insert"
  ON trajectory_computation_log FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Pattern library readable"
  ON historical_pattern_library FOR SELECT
  TO authenticated, anon
  USING (true);

CREATE POLICY "Pattern library insert"
  ON historical_pattern_library FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

INSERT INTO projection_rule_versions (version_name, version_number, rule_set, effective_from)
VALUES (
  'v1.0-baseline',
  1,
  jsonb_build_object(
    'minimum_data_points', 5,
    'lookback_window_hours', 168,
    'velocity_unit', 'normalized_per_day',
    'thresholds', jsonb_build_object(
      'MEDICATION_STABILITY', jsonb_build_object(
        'LOW_TO_MEDIUM', 2,
        'MEDIUM_TO_HIGH', 4,
        'HIGH_TO_CRITICAL', 6
      ),
      'VITAL_INSTABILITY', jsonb_build_object(
        'LOW_TO_MEDIUM', 3,
        'MEDIUM_TO_HIGH', 5,
        'HIGH_TO_CRITICAL', 8
      )
    ),
    'confidence_factors', jsonb_build_object(
      'data_points_weight', 0.4,
      'consistency_weight', 0.3,
      'recency_weight', 0.3
    )
  ),
  now()
)
ON CONFLICT (version_name) DO NOTHING;
