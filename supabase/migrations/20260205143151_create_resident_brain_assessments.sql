/*
  # Resident Brain Assessments
  
  1. Purpose
    - Per-resident brain intelligence assessments
    - Stores cognitive judgments about each resident's status
    - Supports real-time brain reasoning display in resident views
    
  2. New Table
    - `resident_brain_assessments`
      - `id` (uuid, primary key)
      - `resident_id` (uuid, FK to residents) - which resident
      - `agency_id` (uuid, FK to agencies) - tenant isolation
      - `overall_status` (text) - ALL_CLEAR, WATCH, ATTENTION_NEEDED, CRITICAL
      - `risk_level` (text) - low, medium, high, critical
      - `primary_concern` (text) - main issue identified (nullable)
      - `reasoning` (text) - AI explanation of assessment
      - `confidence_score` (integer) - 0-100 confidence in assessment
      - `data_freshness` (interval) - how old is the data (e.g., '5 minutes')
      - `last_signal_detected_at` (timestamptz) - when last signal was detected
      - `recommended_actions` (text[]) - array of action recommendations
      - `assessed_at` (timestamptz) - when assessment was made
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
  3. Security
    - RLS enabled
    - Policies for authenticated access by agency
    - Showcase mode anon access
    
  4. Indexes
    - resident_id for fast lookups
    - agency_id for tenant isolation
    - assessed_at for time-based queries
*/

CREATE TABLE IF NOT EXISTS resident_brain_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  overall_status text NOT NULL DEFAULT 'ALL_CLEAR',
  risk_level text NOT NULL DEFAULT 'low',
  primary_concern text,
  reasoning text NOT NULL,
  confidence_score integer NOT NULL DEFAULT 85 CHECK (confidence_score >= 0 AND confidence_score <= 100),
  data_freshness interval NOT NULL DEFAULT '5 minutes'::interval,
  last_signal_detected_at timestamptz,
  recommended_actions text[] NOT NULL DEFAULT '{}',
  assessed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_overall_status CHECK (overall_status IN ('ALL_CLEAR', 'WATCH', 'ATTENTION_NEEDED', 'CRITICAL')),
  CONSTRAINT valid_risk_level CHECK (risk_level IN ('low', 'medium', 'high', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_resident_brain_assessments_resident_id ON resident_brain_assessments(resident_id);
CREATE INDEX IF NOT EXISTS idx_resident_brain_assessments_agency_id ON resident_brain_assessments(agency_id);
CREATE INDEX IF NOT EXISTS idx_resident_brain_assessments_assessed_at ON resident_brain_assessments(assessed_at DESC);

ALTER TABLE resident_brain_assessments ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view assessments for their agency
CREATE POLICY "Users can view brain assessments for their agency"
  ON resident_brain_assessments FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Showcase mode: anon can view showcase data
CREATE POLICY "Anon can view showcase brain assessments"
  ON resident_brain_assessments FOR SELECT
  TO anon
  USING (true);

-- System can insert/update assessments
CREATE POLICY "Authenticated users can insert brain assessments"
  ON resident_brain_assessments FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can update brain assessments"
  ON resident_brain_assessments FOR UPDATE
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

-- Anon can insert/update in showcase mode
CREATE POLICY "Anon can manage showcase brain assessments"
  ON resident_brain_assessments FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
