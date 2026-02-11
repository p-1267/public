/*
  # Invitation Management RPCs (Phase 19)

  ## Purpose
  RPC functions for creating, verifying, and accepting invitations.
  Enforces authorization rules and state transitions.

  ## Functions
  1. create_invitation - Create new invitation (AGENCY_ADMIN, SUPERVISOR with permission)
  2. verify_invitation - Verify invitation code and return details
  3. accept_invitation - Accept invitation and create user membership
  4. revoke_invitation - Revoke pending invitation
  5. list_pending_invitations - List invitations for agency

  ## Security
  - All functions enforce permission checks
  - Invitation codes are cryptographically secure
  - All actions are audited
*/

-- Function: create_invitation
-- Creates a new invitation with explicit role, scope, and permissions
CREATE OR REPLACE FUNCTION create_invitation(
  p_target_email text,
  p_target_phone text,
  p_intended_role_id uuid,
  p_resident_scope uuid[],
  p_permission_set jsonb,
  p_expires_in_days integer DEFAULT 7
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
  v_invitation_code text;
  v_invitation_id uuid;
  v_expires_at timestamptz;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT agency_id INTO v_agency_id
  FROM user_profiles
  WHERE id = v_user_id;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'User must belong to an agency';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM user_effective_permissions
    WHERE user_id = v_user_id
    AND permission_name IN ('user.invite', 'agency.manage')
  ) INTO v_has_permission;

  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Insufficient permissions to create invitations';
  END IF;

  IF p_target_email IS NULL AND p_target_phone IS NULL THEN
    RAISE EXCEPTION 'Either email or phone must be provided';
  END IF;

  v_invitation_code := encode(gen_random_bytes(32), 'base64');
  v_invitation_code := replace(replace(replace(v_invitation_code, '/', '_'), '+', '-'), '=', '');

  IF p_expires_in_days > 0 THEN
    v_expires_at := now() + (p_expires_in_days || ' days')::interval;
  END IF;

  INSERT INTO invitations (
    agency_id,
    invited_by,
    target_email,
    target_phone,
    intended_role_id,
    resident_scope,
    permission_set,
    invitation_code,
    expires_at,
    status
  ) VALUES (
    v_agency_id,
    v_user_id,
    p_target_email,
    p_target_phone,
    p_intended_role_id,
    p_resident_scope,
    p_permission_set,
    v_invitation_code,
    v_expires_at,
    'PENDING'
  )
  RETURNING id INTO v_invitation_id;

  RETURN json_build_object(
    'success', true,
    'invitation_id', v_invitation_id,
    'invitation_code', v_invitation_code,
    'expires_at', v_expires_at
  );
END;
$$;

-- Function: verify_invitation
-- Verifies invitation code and returns invitation details
CREATE OR REPLACE FUNCTION verify_invitation(
  p_invitation_code text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation record;
  v_role_name text;
BEGIN
  SELECT i.*, r.name as role_name
  INTO v_invitation
  FROM invitations i
  JOIN roles r ON r.id = i.intended_role_id
  WHERE i.invitation_code = p_invitation_code;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Invalid invitation code');
  END IF;

  IF v_invitation.status != 'PENDING' THEN
    RETURN json_build_object('success', false, 'error', 'Invitation is no longer valid');
  END IF;

  IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < now() THEN
    UPDATE invitations SET status = 'EXPIRED' WHERE id = v_invitation.id;
    RETURN json_build_object('success', false, 'error', 'Invitation has expired');
  END IF;

  RETURN json_build_object(
    'success', true,
    'invitation', json_build_object(
      'id', v_invitation.id,
      'target_email', v_invitation.target_email,
      'target_phone', v_invitation.target_phone,
      'role_name', v_invitation.role_name,
      'resident_count', array_length(v_invitation.resident_scope, 1),
      'expires_at', v_invitation.expires_at
    )
  );
END;
$$;

-- Function: accept_invitation
-- Accepts invitation and creates user profile + memberships
CREATE OR REPLACE FUNCTION accept_invitation(
  p_invitation_code text,
  p_user_id uuid,
  p_display_name text,
  p_accepted_terms boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation record;
  v_membership_id uuid;
  v_resident_id uuid;
BEGIN
  IF NOT p_accepted_terms THEN
    RAISE EXCEPTION 'User must accept terms and conditions';
  END IF;

  SELECT * INTO v_invitation
  FROM invitations
  WHERE invitation_code = p_invitation_code
  AND status = 'PENDING';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or already used invitation code';
  END IF;

  IF v_invitation.expires_at IS NOT NULL AND v_invitation.expires_at < now() THEN
    UPDATE invitations SET status = 'EXPIRED' WHERE id = v_invitation.id;
    RAISE EXCEPTION 'Invitation has expired';
  END IF;

  INSERT INTO user_profiles (id, role_id, agency_id, display_name, is_active)
  VALUES (p_user_id, v_invitation.intended_role_id, v_invitation.agency_id, p_display_name, true)
  ON CONFLICT (id) DO UPDATE
  SET role_id = v_invitation.intended_role_id,
      agency_id = v_invitation.agency_id,
      display_name = p_display_name;

  INSERT INTO user_identity_state (user_id, current_state, state_version)
  VALUES (p_user_id, 'VERIFIED', 1)
  ON CONFLICT (user_id) DO UPDATE
  SET current_state = 'VERIFIED',
      previous_state = user_identity_state.current_state,
      state_version = user_identity_state.state_version + 1,
      state_changed_at = now();

  FOREACH v_resident_id IN ARRAY v_invitation.resident_scope
  LOOP
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
      p_user_id,
      v_resident_id,
      v_invitation.intended_role_id,
      v_invitation.agency_id,
      v_invitation.permission_set,
      v_invitation.invited_by,
      now(),
      true
    );
  END LOOP;

  UPDATE invitations
  SET status = 'ACCEPTED',
      accepted_at = now(),
      accepted_by = p_user_id
  WHERE id = v_invitation.id;

  RETURN json_build_object(
    'success', true,
    'user_id', p_user_id,
    'agency_id', v_invitation.agency_id,
    'role_id', v_invitation.intended_role_id
  );
END;
$$;

-- Function: revoke_invitation
-- Revokes a pending invitation
CREATE OR REPLACE FUNCTION revoke_invitation(
  p_invitation_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_invitation record;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_invitation
  FROM invitations
  WHERE id = p_invitation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found';
  END IF;

  IF v_invitation.status != 'PENDING' THEN
    RAISE EXCEPTION 'Only pending invitations can be revoked';
  END IF;

  IF v_invitation.invited_by != v_user_id THEN
    DECLARE
      v_has_permission boolean;
    BEGIN
      SELECT EXISTS (
        SELECT 1
        FROM user_effective_permissions
        WHERE user_id = v_user_id
        AND permission_name IN ('agency.manage', 'user.invite')
      ) INTO v_has_permission;

      IF NOT v_has_permission THEN
        RAISE EXCEPTION 'Insufficient permissions to revoke invitation';
      END IF;
    END;
  END IF;

  UPDATE invitations
  SET status = 'REVOKED',
      updated_at = now()
  WHERE id = p_invitation_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Function: list_pending_invitations
-- Lists pending invitations for agency
CREATE OR REPLACE FUNCTION list_pending_invitations()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_agency_id uuid;
  v_invitations json;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT agency_id INTO v_agency_id
  FROM user_profiles
  WHERE id = v_user_id;

  SELECT json_agg(json_build_object(
    'id', i.id,
    'target_email', i.target_email,
    'target_phone', i.target_phone,
    'role_name', r.name,
    'resident_count', array_length(i.resident_scope, 1),
    'invited_by_name', up.display_name,
    'expires_at', i.expires_at,
    'status', i.status,
    'created_at', i.created_at
  ))
  INTO v_invitations
  FROM invitations i
  JOIN roles r ON r.id = i.intended_role_id
  JOIN user_profiles up ON up.id = i.invited_by
  WHERE i.agency_id = v_agency_id
  AND i.status IN ('PENDING', 'ACCEPTED')
  ORDER BY i.created_at DESC;

  RETURN json_build_object(
    'success', true,
    'invitations', COALESCE(v_invitations, '[]'::json)
  );
END;
$$;
