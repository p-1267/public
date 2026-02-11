/*
  # RLS Policies for Phase 23 Tables

  ## Purpose
  Row-level security policies for workforce and rostering tables.
  Enforces data access control.

  ## Tables Covered
  1. shifts
  2. shift_resident_assignments
  3. caregiver_availability
  4. labor_rules
  5. workload_signals
  6. shift_audit

  ## Security Principles
  - Supervisors/admins can manage shifts
  - Caregivers can view their own shifts
  - Audit logs viewable by authorized users
  - Workload signals viewable only by supervisors/admins
*/

-- ============================================================================
-- shifts RLS Policies
-- ============================================================================

CREATE POLICY "Supervisors and admins can view agency shifts"
  ON shifts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = shifts.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Caregivers can view own shifts"
  ON shifts FOR SELECT
  TO authenticated
  USING (caregiver_id = auth.uid());

CREATE POLICY "Supervisors and admins can create shifts"
  ON shifts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = shifts.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Supervisors and admins can update shifts"
  ON shifts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = shifts.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = shifts.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- shift_resident_assignments RLS Policies
-- ============================================================================

CREATE POLICY "Users can view shift resident assignments"
  ON shift_resident_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM shifts s
      JOIN user_profiles up ON up.agency_id = s.agency_id
      WHERE s.id = shift_resident_assignments.shift_id
      AND up.id = auth.uid()
    )
  );

CREATE POLICY "Supervisors and admins can create assignments"
  ON shift_resident_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM shifts s
      JOIN user_profiles up ON up.agency_id = s.agency_id
      JOIN roles r ON r.id = up.role_id
      WHERE s.id = shift_resident_assignments.shift_id
      AND up.id = auth.uid()
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Supervisors and admins can delete assignments"
  ON shift_resident_assignments FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM shifts s
      JOIN user_profiles up ON up.agency_id = s.agency_id
      JOIN roles r ON r.id = up.role_id
      WHERE s.id = shift_resident_assignments.shift_id
      AND up.id = auth.uid()
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- caregiver_availability RLS Policies
-- ============================================================================

CREATE POLICY "Users can view availability in agency"
  ON caregiver_availability FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up1
      JOIN user_profiles up2 ON up1.agency_id = up2.agency_id
      WHERE up1.id = auth.uid()
      AND up2.id = caregiver_availability.caregiver_id
    )
  );

CREATE POLICY "Caregivers can manage own availability"
  ON caregiver_availability FOR ALL
  TO authenticated
  USING (caregiver_id = auth.uid())
  WITH CHECK (caregiver_id = auth.uid());

CREATE POLICY "Supervisors and admins can manage availability"
  ON caregiver_availability FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up1
      JOIN user_profiles up2 ON up1.agency_id = up2.agency_id
      JOIN roles r ON r.id = up1.role_id
      WHERE up1.id = auth.uid()
      AND up2.id = caregiver_availability.caregiver_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up1
      JOIN user_profiles up2 ON up1.agency_id = up2.agency_id
      JOIN roles r ON r.id = up1.role_id
      WHERE up1.id = auth.uid()
      AND up2.id = caregiver_availability.caregiver_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- labor_rules RLS Policies
-- ============================================================================

CREATE POLICY "Users can view agency labor rules"
  ON labor_rules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.agency_id = labor_rules.agency_id
    )
  );

CREATE POLICY "Admins can create labor rules"
  ON labor_rules FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = labor_rules.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can update labor rules"
  ON labor_rules FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = labor_rules.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = labor_rules.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- workload_signals RLS Policies
-- ============================================================================

CREATE POLICY "Supervisors and admins can view workload signals"
  ON workload_signals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = workload_signals.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "System can create workload signals"
  ON workload_signals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Supervisors and admins can acknowledge signals"
  ON workload_signals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = workload_signals.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = workload_signals.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- shift_audit RLS Policies
-- ============================================================================

CREATE POLICY "Supervisors and admins can view shift audit"
  ON shift_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "System can create shift audit logs"
  ON shift_audit FOR INSERT
  TO authenticated
  WITH CHECK (true);
