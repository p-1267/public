/*
  # Risk Scores - Predictive Risk Assessment

  1. Purpose
    - Calculate and store risk predictions
    - Track resident health risks (fall, infection, medication interaction)
    - Track caregiver risks (fatigue, workload stress, burnout)

  2. Risk Categories
    - Resident: fall_risk, infection_risk, medication_interaction_risk, deterioration_risk
    - Caregiver: fatigue_risk, workload_stress_risk, quality_degradation_risk

  3. Scoring Method
    - Combines multiple anomalies and baseline deviations
    - Weighted scoring based on severity and confidence
    - Time-decay for older signals

  4. Schema
    - Risk type and current score (0-100)
    - Contributing factors
    - Trend analysis
    - Intervention suggestions
*/

CREATE TABLE IF NOT EXISTS risk_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  
  risk_category text NOT NULL CHECK (risk_category IN ('resident_health', 'caregiver_performance')),
  risk_type text NOT NULL,
  
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE,
  caregiver_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  
  current_score integer NOT NULL CHECK (current_score >= 0 AND current_score <= 100),
  previous_score integer,
  score_change integer,
  
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  
  confidence_score numeric NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  contributing_factors jsonb NOT NULL DEFAULT '[]'::jsonb,
  anomaly_ids uuid[],
  
  trend_direction text CHECK (trend_direction IN ('improving', 'worsening', 'stable', 'unknown')),
  trend_velocity numeric,
  
  suggested_interventions jsonb DEFAULT '[]'::jsonb,
  
  computed_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_risk_scores_agency ON risk_scores(agency_id);
CREATE INDEX IF NOT EXISTS idx_risk_scores_resident ON risk_scores(resident_id) WHERE resident_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_risk_scores_caregiver ON risk_scores(caregiver_id) WHERE caregiver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_risk_scores_type ON risk_scores(risk_category, risk_type);
CREATE INDEX IF NOT EXISTS idx_risk_scores_level ON risk_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_risk_scores_score ON risk_scores(current_score DESC);
CREATE INDEX IF NOT EXISTS idx_risk_scores_computed_at ON risk_scores(computed_at DESC);

ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view agency risk scores"
  ON risk_scores FOR SELECT
  TO authenticated
  USING (agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "System can manage risk scores"
  ON risk_scores FOR ALL
  TO authenticated
  USING (agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()));
