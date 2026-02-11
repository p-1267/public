/*
  # Create Vital Signs Table (Simplified)

  1. New Tables
    - `vital_signs`
      - Stores resident vital sign recordings
      - Used for baseline deviation detection

  2. Security
    - Enable RLS
    - Simple agency-based access control
*/

CREATE TABLE IF NOT EXISTS vital_signs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  vital_type text NOT NULL,
  value text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  systolic int,
  diastolic int,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vital_signs_resident ON vital_signs(resident_id);
CREATE INDEX IF NOT EXISTS idx_vital_signs_recorded_at ON vital_signs(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_vital_signs_type ON vital_signs(vital_type);

ALTER TABLE vital_signs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view vitals for their agency residents"
  ON vital_signs
  FOR SELECT
  TO authenticated
  USING (
    resident_id IN (
      SELECT r.id FROM residents r
      INNER JOIN user_profiles up ON up.agency_id = r.agency_id
      WHERE up.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert vitals for their agency residents"
  ON vital_signs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    resident_id IN (
      SELECT r.id FROM residents r
      INNER JOIN user_profiles up ON up.agency_id = r.agency_id
      WHERE up.id = auth.uid()
    )
  );
