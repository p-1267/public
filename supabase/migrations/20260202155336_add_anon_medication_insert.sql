/*
  # Allow Anonymous Users to Add Medications (Showcase Mode)

  Add INSERT policy for anonymous users to add medications in showcase mode.
*/

DROP POLICY IF EXISTS "anon_can_insert_medications_showcase" ON resident_medications;

CREATE POLICY "anon_can_insert_medications_showcase"
  ON resident_medications FOR INSERT
  TO anon
  WITH CHECK (true);
