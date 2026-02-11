/*
  # RLS Policies for Medication Tables (Phase 2 - Fixed)

  1. Security Rules
    - Caregivers: Can read/write for assigned residents
    - Supervisors: Can read/write for all agency residents
    
  2. Tables Secured
    - medication_administration_log
    - medication_schedules
    - medication_interactions (public read)
    - medication_incidents
*/

DROP POLICY IF EXISTS "Caregivers can view assigned resident medication logs" ON medication_administration_log;
DROP POLICY IF EXISTS "Caregivers can log medication administration" ON medication_administration_log;
DROP POLICY IF EXISTS "Caregivers can view assigned resident schedules" ON medication_schedules;
DROP POLICY IF EXISTS "System can manage medication schedules" ON medication_schedules;
DROP POLICY IF EXISTS "Anyone can view medication interactions" ON medication_interactions;
DROP POLICY IF EXISTS "Supervisors can view all agency medication incidents" ON medication_incidents;
DROP POLICY IF EXISTS "System can create medication incidents" ON medication_incidents;
DROP POLICY IF EXISTS "Supervisors can update medication incidents" ON medication_incidents;

CREATE POLICY "Caregivers can view assigned resident medication logs"
  ON medication_administration_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM caregiver_assignments ca
      WHERE ca.resident_id = medication_administration_log.resident_id
        AND ca.caregiver_user_id = auth.uid()
        AND ca.status = 'ACTIVE'
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
        AND up.agency_id = (SELECT agency_id FROM residents WHERE id = medication_administration_log.resident_id)
    )
  );

CREATE POLICY "Caregivers can log medication administration"
  ON medication_administration_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM caregiver_assignments ca
      WHERE ca.resident_id = medication_administration_log.resident_id
        AND ca.caregiver_user_id = auth.uid()
        AND ca.status = 'ACTIVE'
    )
  );

CREATE POLICY "Caregivers can view assigned resident schedules"
  ON medication_schedules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM caregiver_assignments ca
      WHERE ca.resident_id = medication_schedules.resident_id
        AND ca.caregiver_user_id = auth.uid()
        AND ca.status = 'ACTIVE'
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
        AND up.agency_id = (SELECT agency_id FROM residents WHERE id = medication_schedules.resident_id)
    )
  );

CREATE POLICY "System can manage medication schedules"
  ON medication_schedules FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can view medication interactions"
  ON medication_interactions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Supervisors can view all agency medication incidents"
  ON medication_incidents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
        AND up.agency_id = (SELECT agency_id FROM residents WHERE id = medication_incidents.resident_id)
    )
    OR EXISTS (
      SELECT 1 FROM caregiver_assignments ca
      WHERE ca.resident_id = medication_incidents.resident_id
        AND ca.caregiver_user_id = auth.uid()
        AND ca.status = 'ACTIVE'
    )
  );

CREATE POLICY "System can create medication incidents"
  ON medication_incidents FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Supervisors can update medication incidents"
  ON medication_incidents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
        AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
        AND up.agency_id = (SELECT agency_id FROM residents WHERE id = medication_incidents.resident_id)
    )
  );
