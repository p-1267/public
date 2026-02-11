/*
  # Brain Computation Log - Processing Audit Trail

  1. Purpose
    - Track Brain processing cycles
    - Monitor computation performance
    - Debug and optimize intelligence layer

  2. Computation Types
    - Observation aggregation
    - Baseline calculation
    - Anomaly detection
    - Risk scoring
    - Prioritization

  3. Schema
    - Computation type and timestamp
    - Performance metrics
    - Input/output counts
    - Error tracking
*/

CREATE TABLE IF NOT EXISTS brain_computation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  
  computation_type text NOT NULL CHECK (computation_type IN (
    'observation_aggregation',
    'baseline_calculation',
    'anomaly_detection',
    'risk_scoring',
    'prioritization',
    'explainability_generation'
  )),
  
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms integer,
  
  status text NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  
  input_count integer DEFAULT 0,
  output_count integer DEFAULT 0,
  
  observations_processed integer DEFAULT 0,
  baselines_updated integer DEFAULT 0,
  anomalies_detected integer DEFAULT 0,
  risks_scored integer DEFAULT 0,
  issues_prioritized integer DEFAULT 0,
  
  error_message text,
  error_details jsonb,
  
  computation_metadata jsonb DEFAULT '{}'::jsonb,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brain_computation_log_agency ON brain_computation_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_brain_computation_log_type ON brain_computation_log(computation_type);
CREATE INDEX IF NOT EXISTS idx_brain_computation_log_started_at ON brain_computation_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_brain_computation_log_status ON brain_computation_log(status);

ALTER TABLE brain_computation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors can view brain computation log"
  ON brain_computation_log FOR SELECT
  TO authenticated
  USING (agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "System can manage brain computation log"
  ON brain_computation_log FOR ALL
  TO authenticated
  USING (agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()));
