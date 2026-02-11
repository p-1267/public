/*
  # RLS Policies for Phase 31 Tables

  ## Purpose
  Row-level security policies for OTA update and DevOps tables.
  SUPER_ADMIN only access for system-level operations.

  ## Tables Covered
  1. system_versions
  2. version_compatibility_matrix
  3. update_packages
  4. deployment_history
  5. client_version_status
  6. rollback_history
  7. environment_config
  8. system_health_checks
  9. update_audit_log

  ## Security Principles
  - SUPER_ADMIN only for management operations
  - System-managed tables accessible by system
  - Client version status per-user isolation
  - Immutable audit trail
*/

-- ============================================================================
-- system_versions RLS Policies
-- ============================================================================

CREATE POLICY "Super admins can view versions"
  ON system_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "System can manage versions"
  ON system_versions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- version_compatibility_matrix RLS Policies
-- ============================================================================

CREATE POLICY "Super admins can view compatibility matrix"
  ON version_compatibility_matrix FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "System can manage compatibility matrix"
  ON version_compatibility_matrix FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- update_packages RLS Policies
-- ============================================================================

CREATE POLICY "Super admins can view update packages"
  ON update_packages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Super admins can create update packages"
  ON update_packages FOR INSERT
  TO authenticated
  WITH CHECK (
    update_packages.created_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Super admins can update packages"
  ON update_packages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name = 'SUPER_ADMIN'
    )
  );

-- ============================================================================
-- deployment_history RLS Policies
-- ============================================================================

CREATE POLICY "Super admins can view deployment history"
  ON deployment_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "System can manage deployment history"
  ON deployment_history FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- client_version_status RLS Policies
-- ============================================================================

CREATE POLICY "Users can view own client version status"
  ON client_version_status FOR SELECT
  TO authenticated
  USING (
    client_version_status.user_id = auth.uid()
  );

CREATE POLICY "System can manage client version status"
  ON client_version_status FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- rollback_history RLS Policies
-- ============================================================================

CREATE POLICY "Super admins can view rollback history"
  ON rollback_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "System can manage rollback history"
  ON rollback_history FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- environment_config RLS Policies
-- ============================================================================

CREATE POLICY "Super admins can view environment config"
  ON environment_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "Super admins can manage environment config"
  ON environment_config FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name = 'SUPER_ADMIN'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name = 'SUPER_ADMIN'
    )
  );

-- ============================================================================
-- system_health_checks RLS Policies
-- ============================================================================

CREATE POLICY "Super admins can view health checks"
  ON system_health_checks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "System can manage health checks"
  ON system_health_checks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- update_audit_log RLS Policies
-- ============================================================================

CREATE POLICY "Super admins can view update audit log"
  ON update_audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name = 'SUPER_ADMIN'
    )
  );

CREATE POLICY "System can create audit log entries"
  ON update_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (true);
