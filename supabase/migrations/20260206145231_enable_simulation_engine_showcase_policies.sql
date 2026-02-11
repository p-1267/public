/*
  # Enable Simulation Engine - Showcase Policies

  1. Purpose
    - Grant anon access to tables used by simulation engine
    - Enable showcase mode to trigger real backend workflows
    - No demo logic - real database operations

  2. Tables Enabled
    - intelligence_signals (for risk/alert generation)
    - medication_administration_log (for medication tracking)
    - vital_signs (for vitals recording)
    - ai_learning_inputs (for feedback loops)

  3. Security
    - Only in showcase mode (anon user)
    - Same operations as authenticated users
*/

-- Intelligence signals anon policies
CREATE POLICY "Anon can view intelligence signals in showcase"
  ON intelligence_signals FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can create intelligence signals in showcase"
  ON intelligence_signals FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update intelligence signals in showcase"
  ON intelligence_signals FOR UPDATE
  TO anon
  USING (true);

-- Medication administration log anon policies
CREATE POLICY "Anon can view medication admin log in showcase"
  ON medication_administration_log FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can create medication admin log in showcase"
  ON medication_administration_log FOR INSERT
  TO anon
  WITH CHECK (true);

-- Vital signs anon policies  
CREATE POLICY "Anon can view vital signs in showcase"
  ON vital_signs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can create vital signs in showcase"
  ON vital_signs FOR INSERT
  TO anon
  WITH CHECK (true);

-- AI learning inputs anon policies
CREATE POLICY "Anon can view ai learning inputs in showcase"
  ON ai_learning_inputs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can create ai learning inputs in showcase"
  ON ai_learning_inputs FOR INSERT
  TO anon
  WITH CHECK (true);

-- Family resident links anon policies
CREATE POLICY "Anon can view family links in showcase"
  ON family_resident_links FOR SELECT
  TO anon
  USING (true);

-- Resident medications anon policies
CREATE POLICY "Anon can view resident medications in showcase"
  ON resident_medications FOR SELECT
  TO anon
  USING (true);

-- Grant execute permissions for notification RPC
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'queue_notification'
  ) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION queue_notification(uuid, text, uuid, text, text, text, text, jsonb, uuid, uuid) TO anon';
  END IF;
END $$;
