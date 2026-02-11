/*
  # Observation Events - Unified Event Stream

  1. Purpose
    - Aggregates all system events into a single queryable stream
    - Enables temporal analysis and pattern detection
    - Foundation for anomaly detection and risk scoring

  2. Event Sources
    - Task completions (scheduled, quick-tap, voice)
    - Medication administration
    - Vital sign measurements
    - Incident reports
    - Evidence submissions
    - Caregiver timing patterns

  3. Schema
    - Unified event stream with type classification
    - JSON payload for flexibility
    - Quality scoring for each observation
    - Provenance tracking

  4. Security
    - RLS enforced by agency_id
*/

CREATE TABLE IF NOT EXISTS observation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,

  event_type text NOT NULL CHECK (event_type IN (
    'task_completion',
    'medication_admin',
    'vital_sign',
    'incident',
    'evidence_submission',
    'caregiver_timing',
    'system_event'
  )),
  event_subtype text NOT NULL,

  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE,
  caregiver_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,

  event_timestamp timestamptz NOT NULL DEFAULT now(),
  event_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  observation_quality integer NOT NULL DEFAULT 100 CHECK (observation_quality >= 0 AND observation_quality <= 100),

  source_table text,
  source_id uuid,

  created_at timestamptz DEFAULT now(),
  indexed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_observation_events_agency ON observation_events(agency_id);
CREATE INDEX IF NOT EXISTS idx_observation_events_resident ON observation_events(resident_id) WHERE resident_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_observation_events_caregiver ON observation_events(caregiver_id) WHERE caregiver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_observation_events_timestamp ON observation_events(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_observation_events_type ON observation_events(event_type, event_subtype);
CREATE INDEX IF NOT EXISTS idx_observation_events_resident_time ON observation_events(resident_id, event_timestamp DESC) WHERE resident_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_observation_events_data ON observation_events USING gin(event_data);

ALTER TABLE observation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view agency observation events"
  ON observation_events FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert observation events"
  ON observation_events FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );
