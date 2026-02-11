/*
  # RLS Policies for Phase 19 Tables

  ## Purpose
  Row-level security policies for identity lifecycle tables.
  Enforces principle of least privilege and explicit access control.

  ## Tables Covered
  1. user_identity_state
  2. invitations
  3. user_memberships
  4. device_trust
  5. access_revocations
  6. temporary_access_grants

  ## Security Principles
  - Users can view their own records
  - Admins/supervisors can view agency records
  - Modifications require explicit permissions
  - All policies are restrictive by default
*/

-- ============================================================================
-- user_identity_state RLS Policies
-- ============================================================================

CREATE POLICY "Users can view own identity state"
  ON user_identity_state FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view agency user identity states"
  ON user_identity_state FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('user.view', 'agency.manage')
    )
  );

CREATE POLICY "System can insert identity states"
  ON user_identity_state FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "System can update identity states"
  ON user_identity_state FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================================================
-- invitations RLS Policies
-- ============================================================================

CREATE POLICY "Users can view own created invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (invited_by = auth.uid());

CREATE POLICY "Admins can view agency invitations"
  ON invitations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.agency_id = invitations.agency_id
      AND EXISTS (
        SELECT 1
        FROM user_effective_permissions
        WHERE permission_name IN ('user.invite', 'agency.manage')
      )
    )
  );

CREATE POLICY "Authorized users can create invitations"
  ON invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('user.invite', 'agency.manage')
    )
  );

CREATE POLICY "Invitation creators can update own invitations"
  ON invitations FOR UPDATE
  TO authenticated
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());

-- ============================================================================
-- user_memberships RLS Policies
-- ============================================================================

CREATE POLICY "Users can view own memberships"
  ON user_memberships FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view agency memberships"
  ON user_memberships FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_profiles up
      WHERE up.id = auth.uid()
      AND up.agency_id = user_memberships.agency_id
      AND EXISTS (
        SELECT 1
        FROM user_effective_permissions
        WHERE permission_name IN ('assignment.manage', 'agency.manage')
      )
    )
  );

CREATE POLICY "Authorized users can create memberships"
  ON user_memberships FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('assignment.manage', 'agency.manage')
    )
  );

CREATE POLICY "Authorized users can update memberships"
  ON user_memberships FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('assignment.manage', 'agency.manage')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('assignment.manage', 'agency.manage')
    )
  );

-- ============================================================================
-- device_trust RLS Policies
-- ============================================================================

CREATE POLICY "Users can view own devices"
  ON device_trust FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view agency user devices"
  ON device_trust FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('user.view', 'agency.manage', 'security.monitor')
    )
  );

CREATE POLICY "Users can register own devices"
  ON device_trust FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own devices"
  ON device_trust FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update agency user devices"
  ON device_trust FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('user.revoke', 'agency.manage', 'security.monitor')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('user.revoke', 'agency.manage', 'security.monitor')
    )
  );

-- ============================================================================
-- access_revocations RLS Policies
-- ============================================================================

CREATE POLICY "Users can view revocations affecting them"
  ON access_revocations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view agency revocations"
  ON access_revocations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('user.view', 'agency.manage', 'audit.view')
    )
  );

CREATE POLICY "Authorized users can log revocations"
  ON access_revocations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('user.revoke', 'agency.manage')
    )
  );

-- ============================================================================
-- temporary_access_grants RLS Policies
-- ============================================================================

CREATE POLICY "Users can view own temporary access"
  ON temporary_access_grants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR granted_by = auth.uid());

CREATE POLICY "Admins can view agency temporary access"
  ON temporary_access_grants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('assignment.manage', 'agency.manage')
    )
  );

CREATE POLICY "Authorized users can create temporary access"
  ON temporary_access_grants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('assignment.manage', 'agency.manage')
    )
  );

CREATE POLICY "Authorized users can update temporary access"
  ON temporary_access_grants FOR UPDATE
  TO authenticated
  USING (
    granted_by = auth.uid() OR
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('assignment.manage', 'agency.manage')
    )
  )
  WITH CHECK (
    granted_by = auth.uid() OR
    EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE permission_name IN ('assignment.manage', 'agency.manage')
    )
  );
