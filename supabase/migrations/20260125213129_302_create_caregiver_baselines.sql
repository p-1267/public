/*
  # Caregiver Baselines - Performance & Workload Tracking

  1. Purpose
    - Track caregiver normal performance patterns
    - Detect fatigue, workload stress, quality degradation
    - Enable proactive workload balancing

  2. Baseline Metrics
    - Task completion time (by category)
    - Evidence quality scores
    - Tasks per shift
    - Documentation completeness
    - Response time to alerts

  3. Calculation Method
    - Rolling 7-day and 30-day windows
    - Statistical aggregates
*/

CREATE TABLE IF NOT EXISTS caregiver_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  caregiver_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  baseline_type text NOT NULL,
  window_7d_mean numeric,
  window_7d_median numeric,
  window_7d_stddev numeric,
  window_7d_min numeric,
  window_7d_max numeric,
  window_7d_sample_count integer DEFAULT 0,
  window_30d_mean numeric,
  window_30d_median numeric,
  window_30d_stddev numeric,
  window_30d_min numeric,
  window_30d_max numeric,
  window_30d_sample_count integer DEFAULT 0,
  trend_direction text,
  trend_velocity numeric,
  trend_confidence numeric,
  baseline_confidence numeric NOT NULL DEFAULT 0.5,
  data_quality_score integer NOT NULL DEFAULT 50,
  last_observation_at timestamptz,
  baseline_computed_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_caregiver_baselines_caregiver ON caregiver_baselines(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_baselines_type ON caregiver_baselines(baseline_type);
CREATE INDEX IF NOT EXISTS idx_caregiver_baselines_agency ON caregiver_baselines(agency_id);

ALTER TABLE caregiver_baselines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view caregiver baselines"
  ON caregiver_baselines FOR SELECT
  TO authenticated
  USING (agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "System can manage caregiver baselines"
  ON caregiver_baselines FOR ALL
  TO authenticated
  USING (agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()));
