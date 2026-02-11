/*
  # RLS Policies for Phase 29 Tables

  ## Purpose
  Row-level security policies for credential management tables.
  Enforces data access control and admin-only management.

  ## Tables Covered
  1. credential_types
  2. credentials
  3. credential_activation_log
  4. credential_rotation_history

  ## Security Principles
  - Credentials are inert until explicitly unlocked
  - Admin-only management
  - Per-agency isolation
  - Complete audit trail
  - No external system may influence Brain decisions
*/

-- ============================================================================
-- credential_types RLS Policies
-- ============================================================================

CREATE POLICY "All authenticated users can view credential types"
  ON credential_types FOR SELECT
  TO authenticated
  USING (credential_types.is_active = true);

CREATE POLICY "Super admins can manage credential types"
  ON credential_types FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name IN ('SUPER_ADMIN')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND r.name IN ('SUPER_ADMIN')
    )
  );

-- ============================================================================
-- credentials RLS Policies
-- ============================================================================

CREATE POLICY "Admins can view agency credentials"
  ON credentials FOR SELECT
  TO authenticated
  USING (
    credentials.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = credentials.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can create credentials"
  ON credentials FOR INSERT
  TO authenticated
  WITH CHECK (
    credentials.created_by = auth.uid()
    AND credentials.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = credentials.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can update credentials"
  ON credentials FOR UPDATE
  TO authenticated
  USING (
    credentials.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = credentials.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    credentials.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = credentials.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

-- ============================================================================
-- credential_activation_log RLS Policies
-- ============================================================================

CREATE POLICY "Admins can view activation log for their agency"
  ON credential_activation_log FOR SELECT
  TO authenticated
  USING (
    credential_activation_log.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = credential_activation_log.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "System can create activation logs"
  ON credential_activation_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- credential_rotation_history RLS Policies
-- ============================================================================

CREATE POLICY "Admins can view rotation history for their agency"
  ON credential_rotation_history FOR SELECT
  TO authenticated
  USING (
    credential_rotation_history.agency_id IN (
      SELECT agency_id
      FROM user_profiles
      WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
      AND up.agency_id = credential_rotation_history.agency_id
      AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "System can create rotation history"
  ON credential_rotation_history FOR INSERT
  TO authenticated
  WITH CHECK (true);
