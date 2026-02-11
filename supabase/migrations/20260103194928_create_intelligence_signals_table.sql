/*
  # Create Intelligence Signals Table

  1. New Tables
    - `intelligence_signals`
      - Stores AI-generated signals that require human action
      - Includes reasoning, sources, and suggested actions
    - `translation_confirmations`
      - Audit trail for translation confirmations
      - Records who confirmed, when, and if edited

  2. Security
    - Enable RLS on both tables
    - Policies for reading and writing signals
    - Policies for logging translation confirmations
*/

CREATE TABLE IF NOT EXISTS intelligence_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id text UNIQUE NOT NULL,
  category text NOT NULL CHECK (category IN ('PROACTIVE', 'REACTIVE', 'PREDICTIVE')),
  severity text NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL,
  reasoning text NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  requires_human_action boolean NOT NULL DEFAULT true,
  suggested_actions text[] NOT NULL DEFAULT '{}',
  data_source text[] NOT NULL DEFAULT '{}',
  dismissed boolean NOT NULL DEFAULT false,
  dismissed_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  dismissed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intelligence_signals_resident ON intelligence_signals(resident_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_signals_agency ON intelligence_signals(agency_id);
CREATE INDEX IF NOT EXISTS idx_intelligence_signals_severity ON intelligence_signals(severity);
CREATE INDEX IF NOT EXISTS idx_intelligence_signals_dismissed ON intelligence_signals(dismissed);
CREATE INDEX IF NOT EXISTS idx_intelligence_signals_detected_at ON intelligence_signals(detected_at DESC);

CREATE TABLE IF NOT EXISTS translation_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  translation_id text NOT NULL,
  confirmed_by text NOT NULL,
  confirmed_at timestamptz NOT NULL,
  original_text text NOT NULL,
  translated_text text NOT NULL,
  was_edited boolean NOT NULL DEFAULT false,
  edited_text text,
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE,
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_translation_confirmations_resident ON translation_confirmations(resident_id);
CREATE INDEX IF NOT EXISTS idx_translation_confirmations_agency ON translation_confirmations(agency_id);
CREATE INDEX IF NOT EXISTS idx_translation_confirmations_confirmed_at ON translation_confirmations(confirmed_at DESC);

ALTER TABLE intelligence_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE translation_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signals for their agency residents"
  ON intelligence_signals
  FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
    OR
    resident_id IN (
      SELECT r.id FROM residents r
      INNER JOIN user_profiles up ON up.agency_id = r.agency_id
      WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "System can insert intelligence signals"
  ON intelligence_signals
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can dismiss signals for their agency"
  ON intelligence_signals
  FOR UPDATE
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can view translation confirmations for their agency"
  ON translation_confirmations
  FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can insert translation confirmations"
  ON translation_confirmations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );
