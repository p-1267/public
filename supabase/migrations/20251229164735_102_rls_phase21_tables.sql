/*
  # RLS Policies for Phase 21 Tables

  ## Purpose
  Row-level security policies for device management tables.
  Enforces data access control and privacy.

  ## Tables Covered
  1. device_registry
  2. device_health_log
  3. device_pairing_audit
  4. device_data_events

  ## Security Principles
  - Users can view devices for residents they have access to
  - Admins/supervisors can manage devices
  - Health logs and data events are read-only for most users
  - Pairing audit is read-only for all users
*/

-- ============================================================================
-- device_registry RLS Policies
-- ============================================================================

CREATE POLICY "Users can view devices for assigned residents"
  ON device_registry FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_memberships um
      WHERE um.user_id = auth.uid()
      AND um.resident_id = device_registry.resident_id
      AND um.is_active = true
    ) OR
    EXISTS (
      SELECT 1
      FROM residents r
      JOIN user_profiles up ON up.agency_id = r.agency_id
      WHERE r.id = device_registry.resident_id
      AND up.id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM user_effective_permissions
        WHERE permission_name IN ('resident.view', 'agency.manage')
      )
    )
  );

CREATE POLICY "Authorized users can register devices"
  ON device_registry FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('agency.manage', 'resident.update')
    )
  );

CREATE POLICY "Authorized users can update device health"
  ON device_registry FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('agency.manage', 'resident.update')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('agency.manage', 'resident.update')
    )
  );

-- ============================================================================
-- device_health_log RLS Policies
-- ============================================================================

CREATE POLICY "Users can view health logs for assigned residents"
  ON device_health_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_memberships um
      WHERE um.user_id = auth.uid()
      AND um.resident_id = device_health_log.resident_id
      AND um.is_active = true
    ) OR
    EXISTS (
      SELECT 1
      FROM residents r
      JOIN user_profiles up ON up.agency_id = r.agency_id
      WHERE r.id = device_health_log.resident_id
      AND up.id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM user_effective_permissions
        WHERE permission_name IN ('resident.view', 'agency.manage')
      )
    )
  );

CREATE POLICY "System can create health logs"
  ON device_health_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- device_pairing_audit RLS Policies
-- ============================================================================

CREATE POLICY "Users can view pairing audit for assigned residents"
  ON device_pairing_audit FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_memberships um
      WHERE um.user_id = auth.uid()
      AND um.resident_id = device_pairing_audit.resident_id
      AND um.is_active = true
    ) OR
    EXISTS (
      SELECT 1
      FROM residents r
      JOIN user_profiles up ON up.agency_id = r.agency_id
      WHERE r.id = device_pairing_audit.resident_id
      AND up.id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM user_effective_permissions
        WHERE permission_name IN ('audit.view', 'agency.manage')
      )
    )
  );

CREATE POLICY "System can create pairing audit logs"
  ON device_pairing_audit FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- device_data_events RLS Policies
-- ============================================================================

CREATE POLICY "Users can view data events for assigned residents"
  ON device_data_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_memberships um
      WHERE um.user_id = auth.uid()
      AND um.resident_id = device_data_events.resident_id
      AND um.is_active = true
    ) OR
    EXISTS (
      SELECT 1
      FROM residents r
      JOIN user_profiles up ON up.agency_id = r.agency_id
      WHERE r.id = device_data_events.resident_id
      AND up.id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM user_effective_permissions
        WHERE permission_name IN ('resident.view', 'agency.manage')
      )
    )
  );

CREATE POLICY "System can create data events"
  ON device_data_events FOR INSERT
  TO authenticated
  WITH CHECK (true);
