/*
  # User Management RPC Functions

  ## Purpose
  Brain-validated functions for user management operations.
  All functions enforce permissions, validate input, and log to audit.

  ## Functions
  1. invite_user(email, role, agency_id) - Invite new user to agency
  2. assign_user_role(user_id, role) - Assign or change user role
  3. deactivate_user(user_id) - Deactivate user account

  ## Security
  - All functions check permissions
  - No self-role escalation
  - All mutations are auditable
  - Email validation required
*/

-- Invite User
CREATE OR REPLACE FUNCTION invite_user(
  p_email text,
  p_role_name text,
  p_agency_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_inviter_id uuid;
  v_role_id uuid;
BEGIN
  -- Get current user
  v_inviter_id := auth.uid();
  
  IF v_inviter_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check permission
  IF NOT user_has_permission(v_inviter_id, 'user.invite') THEN
    RAISE EXCEPTION 'Permission denied: user.invite required';
  END IF;

  -- Validate email
  IF p_email IS NULL OR trim(p_email) = '' OR p_email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Valid email is required';
  END IF;

  -- Get role ID
  SELECT id INTO v_role_id
  FROM roles
  WHERE name = p_role_name;

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role not found: %', p_role_name;
  END IF;

  -- Prevent non-SUPER_ADMIN from creating SUPER_ADMIN users
  IF p_role_name = 'SUPER_ADMIN' AND NOT user_has_permission(v_inviter_id, 'system.override') THEN
    RAISE EXCEPTION 'Cannot assign SUPER_ADMIN role';
  END IF;

  -- Note: Actual user creation happens via Supabase Auth
  -- This function would typically create an invitation record
  -- For now, we'll return a placeholder UUID and log the invitation
  v_user_id := gen_random_uuid();

  -- Log audit entry
  PERFORM log_audit_entry(
    v_inviter_id,
    'INVITE_USER',
    'user',
    v_user_id,
    NULL,
    jsonb_build_object(
      'email', p_email,
      'role', p_role_name,
      'agency_id', p_agency_id
    )
  );

  RETURN v_user_id;
END;
$$;

-- Assign User Role
CREATE OR REPLACE FUNCTION assign_user_role(
  p_user_id uuid,
  p_role_name text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assigner_id uuid;
  v_role_id uuid;
  v_old_role_id uuid;
BEGIN
  -- Get current user
  v_assigner_id := auth.uid();
  
  IF v_assigner_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check permission
  IF NOT user_has_permission(v_assigner_id, 'user.assign_role') THEN
    RAISE EXCEPTION 'Permission denied: user.assign_role required';
  END IF;

  -- Prevent self-role changes
  IF p_user_id = v_assigner_id THEN
    RAISE EXCEPTION 'Cannot change own role';
  END IF;

  -- Get new role ID
  SELECT id INTO v_role_id
  FROM roles
  WHERE name = p_role_name;

  IF v_role_id IS NULL THEN
    RAISE EXCEPTION 'Role not found: %', p_role_name;
  END IF;

  -- Prevent non-SUPER_ADMIN from assigning SUPER_ADMIN role
  IF p_role_name = 'SUPER_ADMIN' AND NOT user_has_permission(v_assigner_id, 'system.override') THEN
    RAISE EXCEPTION 'Cannot assign SUPER_ADMIN role';
  END IF;

  -- Get old role for audit
  SELECT role_id INTO v_old_role_id
  FROM user_profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Update role
  UPDATE user_profiles
  SET role_id = v_role_id,
      updated_at = now()
  WHERE id = p_user_id;

  -- Log audit entry
  PERFORM log_audit_entry(
    v_assigner_id,
    'ASSIGN_ROLE',
    'user',
    p_user_id,
    jsonb_build_object('role_id', v_old_role_id),
    jsonb_build_object('role_id', v_role_id, 'role_name', p_role_name)
  );
END;
$$;

-- Deactivate User
CREATE OR REPLACE FUNCTION deactivate_user(
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deactivator_id uuid;
BEGIN
  -- Get current user
  v_deactivator_id := auth.uid();
  
  IF v_deactivator_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check permission
  IF NOT user_has_permission(v_deactivator_id, 'user.deactivate') THEN
    RAISE EXCEPTION 'Permission denied: user.deactivate required';
  END IF;

  -- Prevent self-deactivation
  IF p_user_id = v_deactivator_id THEN
    RAISE EXCEPTION 'Cannot deactivate own account';
  END IF;

  -- Deactivate user
  UPDATE user_profiles
  SET is_active = false,
      updated_at = now()
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;

  -- Log audit entry
  PERFORM log_audit_entry(
    v_deactivator_id,
    'DEACTIVATE_USER',
    'user',
    p_user_id,
    jsonb_build_object('is_active', true),
    jsonb_build_object('is_active', false)
  );
END;
$$;
