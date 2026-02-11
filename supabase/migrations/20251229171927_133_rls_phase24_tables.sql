/*
  # RLS Policies for Phase 24 Tables

  ## Purpose
  Row-level security policies for attendance and verification tables.
  Enforces data access control and immutability.

  ## Tables Covered
  1. attendance_events
  2. attendance_anomalies
  3. attendance_overrides
  4. attendance_audit

  ## Security Principles
  - Caregivers can create own attendance events
  - Supervisors/admins can view all events
  - Sealed events are immutable
  - Anomalies visible only to supervisors/admins
  - Overrides supervisor-only
  - Audit logs viewable by authorized users
*/

-- ============================================================================
-- attendance_events RLS Policies
-- ============================================================================

CREATE POLICY "Caregivers can view own attendance events"
  ON attendance_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Supervisors and admins can view all attendance events"
  ON attendance_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      JOIN shifts s ON s.agency_id = up.agency_id
      WHERE up.id = auth.uid()
      AND s.id = attendance_events.shift_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Caregivers can create own attendance events"
  ON attendance_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Sealed attendance events cannot be updated"
  ON attendance_events FOR UPDATE
  TO authenticated
  USING (is_sealed = false)
  WITH CHECK (is_sealed = false);

-- ============================================================================
-- attendance_anomalies RLS Policies
-- ============================================================================

CREATE POLICY "Supervisors and admins can view attendance anomalies"
  ON attendance_anomalies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      JOIN shifts s ON s.agency_id = up.agency_id
      WHERE up.id = auth.uid()
      AND s.id = attendance_anomalies.shift_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "System can create attendance anomalies"
  ON attendance_anomalies FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Supervisors and admins can acknowledge anomalies"
  ON attendance_anomalies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      JOIN shifts s ON s.agency_id = up.agency_id
      WHERE up.id = auth.uid()
      AND s.id = attendance_anomalies.shift_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      JOIN shifts s ON s.agency_id = up.agency_id
      WHERE up.id = auth.uid()
      AND s.id = attendance_anomalies.shift_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- attendance_overrides RLS Policies
-- ============================================================================

CREATE POLICY "Supervisors and admins can view attendance overrides"
  ON attendance_overrides FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      JOIN shifts s ON s.agency_id = up.agency_id
      WHERE up.id = auth.uid()
      AND s.id = attendance_overrides.shift_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Supervisors and admins can create attendance overrides"
  ON attendance_overrides FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- attendance_audit RLS Policies
-- ============================================================================

CREATE POLICY "Supervisors and admins can view attendance audit"
  ON attendance_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      JOIN shifts s ON s.agency_id = up.agency_id
      WHERE up.id = auth.uid()
      AND s.id = attendance_audit.shift_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "System can create attendance audit logs"
  ON attendance_audit FOR INSERT
  TO authenticated
  WITH CHECK (true);
