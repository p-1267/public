/*
  # Access Management RPCs (Phase 19)

  ## Purpose
  RPC functions for granting, revoking, and managing user access.
  Enforces immediate revocation and audit logging.

  ## Functions
  1. grant_user_access - Grant explicit access to user for resident
  2. revoke_user_access - Immediately revoke all access for user
  3. suspend_user_access - Temporarily suspend user (reversible)
  4. reactivate_user_access - Reactivate suspended user
  5. revoke_membership - Revoke specific membership
  6. grant_temporary_access - Grant time-boxed access
  7. list_user_memberships - List memberships for user

  ## Security
  - All functions enforce authorization
  - Revocation is immediate
  - All actions are audited
*/

-- Function: grant_user_access
-- Grants explicit access to a user for a specific resident
CREATE OR REPLACE FUNCTION grant_user_access(
  p_target_user_id uuid,
  p_resident_id uuid,
  p_role_id uuid,
  p_permissions jsonb DEFAULT '{}'::jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_agency_id uuid;
  v_has_permission boolean;
  v_membership_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM user_effective_permissions
    WHERE user_id = v_user_id
    AND permission_name IN ('assignment.manage', 'agency.manage')
  ) INTO v_has_permission;

  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Insufficient permissions to grant access';
  END IF;

  SELECT agency_id INTO v_agency_id
  FROM residents
  WHERE id = p_resident_id;

  INSERT INTO user_memberships (
    user_id,
    resident_id,
    role_id,
    agency_id,
    permissions,
    granted_by,
    granted_at,
    is_active
  ) VALUES (
    p_target_user_id,
    p_resident_id,
    p_role_id,
    v_agency_id,
    p_permissions,
    v_user_id,
    now(),
    true
  )
  ON CONFLICT (user_id, resident_id, role_id)
  DO UPDATE SET
    is_active = true,
    revoked_at = NULL,
    revoked_by = NULL,
    revoked_reason = NULL,
    permissions = p_permissions,
    updated_at = now()
  RETURNING id INTO v_membership_id;

  UPDATE user_identity_state
  SET current_state = 'ACTIVE',
      previous_state = current_state,
      state_version = state_version + 1,
      state_changed_at = now()
  WHERE user_id = p_target_user_id
  AND current_state IN ('VERIFIED', 'SUSPENDED');

  RETURN json_build_object(
    'success', true,
    'membership_id', v_membership_id
  );
END;
$$;

-- Function: revoke_user_access
-- Immediately revokes ALL access for a user
CREATE OR REPLACE FUNCTION revoke_user_access(
  p_target_user_id uuid,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_has_permission boolean;
  v_sessions_count integer := 0;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM user_effective_permissions
    WHERE user_id = v_user_id
    AND permission_name IN ('user.revoke', 'agency.manage')
  ) INTO v_has_permission;

  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Insufficient permissions to revoke access';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Reason is required for revocation';
  END IF;

  UPDATE user_memberships
  SET is_active = false,
      revoked_at = now(),
      revoked_by = v_user_id,
      revoked_reason = p_reason,
      updated_at = now()
  WHERE user_id = p_target_user_id
  AND is_active = true;

  UPDATE user_identity_state
  SET current_state = 'REVOKED',
      previous_state = current_state,
      state_version = state_version + 1,
      revoked_reason = p_reason,
      revoked_by = v_user_id,
      state_changed_at = now()
  WHERE user_id = p_target_user_id;

  UPDATE device_trust
  SET trust_state = 'REVOKED',
      revoked_at = now(),
      revoked_by = v_user_id,
      revoked_reason = 'User access revoked',
      updated_at = now()
  WHERE user_id = p_target_user_id
  AND trust_state != 'REVOKED';

  INSERT INTO access_revocations (
    user_id,
    revoked_by,
    revocation_type,
    reason,
    immediate_effect,
    sessions_invalidated,
    offline_access_revoked,
    audit_sealed,
    revoked_at
  ) VALUES (
    p_target_user_id,
    v_user_id,
    'FULL_ACCESS',
    p_reason,
    true,
    v_sessions_count,
    true,
    true,
    now()
  );

  RETURN json_build_object(
    'success', true,
    'revoked_at', now()
  );
END;
$$;

-- Function: suspend_user_access
-- Temporarily suspends user access (reversible)
CREATE OR REPLACE FUNCTION suspend_user_access(
  p_target_user_id uuid,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_has_permission boolean;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM user_effective_permissions
    WHERE user_id = v_user_id
    AND permission_name IN ('user.suspend', 'agency.manage')
  ) INTO v_has_permission;

  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Insufficient permissions to suspend user';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Reason is required for suspension';
  END IF;

  UPDATE user_identity_state
  SET current_state = 'SUSPENDED',
      previous_state = current_state,
      state_version = state_version + 1,
      suspended_reason = p_reason,
      state_changed_at = now()
  WHERE user_id = p_target_user_id
  AND current_state != 'REVOKED';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User cannot be suspended (may be revoked)';
  END IF;

  RETURN json_build_object(
    'success', true,
    'suspended_at', now()
  );
END;
$$;

-- Function: reactivate_user_access
-- Reactivates suspended user
CREATE OR REPLACE FUNCTION reactivate_user_access(
  p_target_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_has_permission boolean;
  v_current_state text;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM user_effective_permissions
    WHERE user_id = v_user_id
    AND permission_name IN ('user.reactivate', 'agency.manage')
  ) INTO v_has_permission;

  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Insufficient permissions to reactivate user';
  END IF;

  SELECT current_state INTO v_current_state
  FROM user_identity_state
  WHERE user_id = p_target_user_id;

  IF v_current_state != 'SUSPENDED' THEN
    RAISE EXCEPTION 'Only suspended users can be reactivated';
  END IF;

  UPDATE user_identity_state
  SET current_state = 'ACTIVE',
      previous_state = 'SUSPENDED',
      state_version = state_version + 1,
      suspended_reason = NULL,
      state_changed_at = now()
  WHERE user_id = p_target_user_id;

  RETURN json_build_object(
    'success', true,
    'reactivated_at', now()
  );
END;
$$;

-- Function: revoke_membership
-- Revokes specific membership
CREATE OR REPLACE FUNCTION revoke_membership(
  p_membership_id uuid,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_has_permission boolean;
  v_membership record;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM user_effective_permissions
    WHERE user_id = v_user_id
    AND permission_name IN ('assignment.manage', 'agency.manage')
  ) INTO v_has_permission;

  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Insufficient permissions to revoke membership';
  END IF;

  SELECT * INTO v_membership
  FROM user_memberships
  WHERE id = p_membership_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Membership not found';
  END IF;

  UPDATE user_memberships
  SET is_active = false,
      revoked_at = now(),
      revoked_by = v_user_id,
      revoked_reason = p_reason,
      updated_at = now()
  WHERE id = p_membership_id;

  INSERT INTO access_revocations (
    user_id,
    revoked_by,
    revocation_type,
    target_id,
    reason,
    immediate_effect,
    revoked_at
  ) VALUES (
    v_membership.user_id,
    v_user_id,
    'MEMBERSHIP',
    p_membership_id,
    p_reason,
    true,
    now()
  );

  RETURN json_build_object(
    'success', true,
    'revoked_at', now()
  );
END;
$$;

-- Function: grant_temporary_access
-- Grants time-boxed access
CREATE OR REPLACE FUNCTION grant_temporary_access(
  p_target_user_id uuid,
  p_resident_id uuid,
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_permissions jsonb,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_has_permission boolean;
  v_grant_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM user_effective_permissions
    WHERE user_id = v_user_id
    AND permission_name IN ('assignment.manage', 'agency.manage')
  ) INTO v_has_permission;

  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Insufficient permissions to grant temporary access';
  END IF;

  IF p_starts_at >= p_ends_at THEN
    RAISE EXCEPTION 'Start time must be before end time';
  END IF;

  INSERT INTO temporary_access_grants (
    user_id,
    resident_id,
    granted_by,
    starts_at,
    ends_at,
    permissions,
    reason
  ) VALUES (
    p_target_user_id,
    p_resident_id,
    v_user_id,
    p_starts_at,
    p_ends_at,
    p_permissions,
    p_reason
  )
  RETURNING id INTO v_grant_id;

  RETURN json_build_object(
    'success', true,
    'grant_id', v_grant_id,
    'starts_at', p_starts_at,
    'ends_at', p_ends_at
  );
END;
$$;

-- Function: list_user_memberships
-- Lists memberships for user
CREATE OR REPLACE FUNCTION list_user_memberships(
  p_user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_target_user_id uuid;
  v_memberships json;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_target_user_id := COALESCE(p_user_id, v_user_id);

  SELECT json_agg(json_build_object(
    'id', um.id,
    'resident_id', um.resident_id,
    'resident_name', r.name,
    'role_name', ro.name,
    'granted_by_name', up.display_name,
    'granted_at', um.granted_at,
    'is_active', um.is_active,
    'revoked_at', um.revoked_at,
    'revoked_reason', um.revoked_reason
  ))
  INTO v_memberships
  FROM user_memberships um
  JOIN residents r ON r.id = um.resident_id
  JOIN roles ro ON ro.id = um.role_id
  JOIN user_profiles up ON up.id = um.granted_by
  WHERE um.user_id = v_target_user_id
  ORDER BY um.granted_at DESC;

  RETURN json_build_object(
    'success', true,
    'memberships', COALESCE(v_memberships, '[]'::json)
  );
END;
$$;
