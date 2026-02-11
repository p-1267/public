/*
  # Anomaly Detections - Pattern & Deviation Detection

  1. Purpose
    - Store detected anomalies and deviations from baseline
    - Track missed care patterns, rushed tasks, vital trends
    - Foundation for risk scoring

  2. Anomaly Types
    - Missed or late care
    - Rushed care patterns
    - Vital sign trend alerts
    - Medication adherence issues
    - Activity level changes
    - Caregiver performance degradation

  3. Schema
    - Detection timestamp
    - Anomaly type and severity
    - Baseline deviation metrics
    - Confidence scoring
    - Evidence links
*/

CREATE TABLE IF NOT EXISTS anomaly_detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  
  anomaly_type text NOT NULL,
  anomaly_subtype text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE,
  caregiver_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  
  detected_at timestamptz NOT NULL DEFAULT now(),
  observation_window_start timestamptz NOT NULL,
  observation_window_end timestamptz NOT NULL,
  
  baseline_value numeric,
  observed_value numeric,
  deviation_magnitude numeric,
  deviation_sigma numeric,
  
  confidence_score numeric NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  anomaly_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  supporting_evidence_ids uuid[],
  
  status text NOT NULL DEFAULT 'detected' CHECK (status IN ('detected', 'acknowledged', 'investigated', 'resolved', 'false_positive')),
  acknowledged_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  resolution_notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anomaly_detections_agency ON anomaly_detections(agency_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_resident ON anomaly_detections(resident_id) WHERE resident_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_caregiver ON anomaly_detections(caregiver_id) WHERE caregiver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_type ON anomaly_detections(anomaly_type, anomaly_subtype);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_severity ON anomaly_detections(severity);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_status ON anomaly_detections(status);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_detected_at ON anomaly_detections(detected_at DESC);

ALTER TABLE anomaly_detections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view agency anomaly detections"
  ON anomaly_detections FOR SELECT
  TO authenticated
  USING (agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "System can manage anomaly detections"
  ON anomaly_detections FOR ALL
  TO authenticated
  USING (agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()));
