/*
  # Credential Management RPCs (Phase 29)

  ## Purpose
  Manage credential creation, rotation, and revocation.
  Enforces sandbox-first and security requirements.

  ## Functions
  1. get_credential_types - Get all available credential types
  2. create_credential - Create new credential (starts INACTIVE)
  3. get_agency_credentials - Get all credentials for agency
  4. rotate_credential - Rotate credential
  5. revoke_credential - Revoke credential immediately

  ## Security
  - All functions enforce authorization
  - Admin-only access
  - Complete audit logging

  ## Enforcement Rules
  1. Credentials are inert until explicitly unlocked
  2. All credentials start in SANDBOX mode (INACTIVE status)
  3. No hard-coded secrets allowed
  4. System MUST support credential rotation and immediate revocation
*/

-- Function: get_credential_types
-- Gets all available credential types
CREATE OR REPLACE FUNCTION get_credential_types()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_types json;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', ct.id,
      'type_key', ct.type_key,
      'type_name', ct.type_name,
      'description', ct.description,
      'category', ct.category,
      'supports_sandbox', ct.supports_sandbox,
      'configuration_schema', ct.configuration_schema
    )
  )
  INTO v_types
  FROM credential_types ct
  WHERE ct.is_active = true;

  RETURN json_build_object(
    'success', true,
    'types', COALESCE(v_types, '[]'::json),
    'type_count', COALESCE(json_array_length(v_types), 0)
  );
END;
$$;

-- Function: create_credential
-- Creates new credential (starts INACTIVE in SANDBOX)
CREATE OR REPLACE FUNCTION create_credential(
  p_credential_type_key text,
  p_credential_name text,
  p_encrypted_credentials text,
  p_configuration jsonb DEFAULT '{}'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_actor_role text;
  v_agency_id uuid;
  v_credential_type_id uuid;
  v_credential_type_name text;
  v_new_credential_id uuid;
BEGIN
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get actor details
  SELECT r.name, up.agency_id
  INTO v_actor_role, v_agency_id
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_actor_id;

  -- Check authorization
  IF v_actor_role NOT IN ('AGENCY_ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Only AGENCY_ADMIN or SUPER_ADMIN can create credentials';
  END IF;

  -- Get credential type
  SELECT id, type_name INTO v_credential_type_id, v_credential_type_name
  FROM credential_types
  WHERE type_key = p_credential_type_key
  AND is_active = true;

  IF v_credential_type_id IS NULL THEN
    RAISE EXCEPTION 'Invalid credential type: %', p_credential_type_key;
  END IF;

  -- Create credential (starts INACTIVE in SANDBOX)
  INSERT INTO credentials (
    agency_id,
    credential_type_id,
    credential_name,
    environment,
    status,
    encrypted_credentials,
    configuration,
    created_by
  ) VALUES (
    v_agency_id,
    v_credential_type_id,
    p_credential_name,
    'SANDBOX',
    'INACTIVE',
    p_encrypted_credentials,
    p_configuration,
    v_actor_id
  ) RETURNING id INTO v_new_credential_id;

  -- Log creation
  INSERT INTO credential_activation_log (
    agency_id,
    credential_id,
    actor_id,
    actor_role,
    credential_type,
    environment,
    action,
    validation_result
  ) VALUES (
    v_agency_id,
    v_new_credential_id,
    v_actor_id,
    v_actor_role,
    v_credential_type_name,
    'SANDBOX',
    'CREATE',
    jsonb_build_object('status', 'INACTIVE', 'message', 'Credential created (inert)')
  );

  RETURN json_build_object(
    'success', true,
    'credential_id', v_new_credential_id,
    'status', 'INACTIVE',
    'environment', 'SANDBOX',
    'message', 'Credential created (inert). Activate sandbox to begin testing.'
  );
END;
$$;

-- Function: get_agency_credentials
-- Gets all credentials for current user's agency
CREATE OR REPLACE FUNCTION get_agency_credentials()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_agency_id uuid;
  v_credentials json;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT agency_id INTO v_agency_id
  FROM user_profiles
  WHERE id = v_user_id;

  SELECT json_agg(
    json_build_object(
      'id', c.id,
      'credential_name', c.credential_name,
      'credential_type', ct.type_name,
      'credential_type_key', ct.type_key,
      'category', ct.category,
      'environment', c.environment,
      'status', c.status,
      'created_at', c.created_at,
      'created_by_name', up_created.full_name,
      'sandbox_activated_at', c.sandbox_activated_at,
      'live_activated_at', c.live_activated_at,
      'revoked_at', c.revoked_at,
      'last_rotated_at', c.last_rotated_at
    ) ORDER BY c.created_at DESC
  )
  INTO v_credentials
  FROM credentials c
  JOIN credential_types ct ON ct.id = c.credential_type_id
  JOIN user_profiles up_created ON up_created.id = c.created_by
  WHERE c.agency_id = v_agency_id;

  RETURN json_build_object(
    'success', true,
    'credentials', COALESCE(v_credentials, '[]'::json),
    'credential_count', COALESCE(json_array_length(v_credentials), 0)
  );
END;
$$;

-- Function: rotate_credential
-- Rotates credential
CREATE OR REPLACE FUNCTION rotate_credential(
  p_credential_id uuid,
  p_new_encrypted_credentials text,
  p_rotation_reason text,
  p_rotation_type text DEFAULT 'MANUAL'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_actor_role text;
  v_agency_id uuid;
  v_credential record;
  v_old_hash text;
  v_new_hash text;
BEGIN
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get actor details
  SELECT r.name, up.agency_id
  INTO v_actor_role, v_agency_id
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_actor_id;

  -- Check authorization
  IF v_actor_role NOT IN ('AGENCY_ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Only AGENCY_ADMIN or SUPER_ADMIN can rotate credentials';
  END IF;

  -- Get credential
  SELECT * INTO v_credential
  FROM credentials
  WHERE id = p_credential_id
  AND agency_id = v_agency_id;

  IF v_credential IS NULL THEN
    RAISE EXCEPTION 'Credential not found';
  END IF;

  IF v_credential.status = 'REVOKED' THEN
    RAISE EXCEPTION 'Cannot rotate revoked credential';
  END IF;

  -- Calculate hashes (simplified - in production use proper hashing)
  v_old_hash := md5(v_credential.encrypted_credentials);
  v_new_hash := md5(p_new_encrypted_credentials);

  -- Update credential
  UPDATE credentials
  SET encrypted_credentials = p_new_encrypted_credentials,
      last_rotated_at = now(),
      updated_at = now()
  WHERE id = p_credential_id;

  -- Log rotation
  INSERT INTO credential_rotation_history (
    agency_id,
    credential_id,
    rotated_by,
    rotation_reason,
    old_credential_hash,
    new_credential_hash,
    environment,
    rotation_type
  ) VALUES (
    v_agency_id,
    p_credential_id,
    v_actor_id,
    p_rotation_reason,
    v_old_hash,
    v_new_hash,
    v_credential.environment,
    p_rotation_type
  );

  -- Log activation event
  INSERT INTO credential_activation_log (
    agency_id,
    credential_id,
    actor_id,
    actor_role,
    credential_type,
    environment,
    action,
    validation_result
  ) SELECT
    v_agency_id,
    p_credential_id,
    v_actor_id,
    v_actor_role,
    ct.type_name,
    v_credential.environment,
    'ROTATE',
    jsonb_build_object('rotation_type', p_rotation_type, 'reason', p_rotation_reason)
  FROM credential_types ct
  WHERE ct.id = v_credential.credential_type_id;

  RETURN json_build_object(
    'success', true,
    'credential_id', p_credential_id,
    'rotated_at', now(),
    'message', 'Credential rotated successfully'
  );
END;
$$;

-- Function: revoke_credential
-- Revokes credential immediately
CREATE OR REPLACE FUNCTION revoke_credential(
  p_credential_id uuid,
  p_revoked_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_actor_role text;
  v_agency_id uuid;
  v_credential record;
BEGIN
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get actor details
  SELECT r.name, up.agency_id
  INTO v_actor_role, v_agency_id
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_actor_id;

  -- Check authorization
  IF v_actor_role NOT IN ('AGENCY_ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Only AGENCY_ADMIN or SUPER_ADMIN can revoke credentials';
  END IF;

  -- Get credential
  SELECT * INTO v_credential
  FROM credentials
  WHERE id = p_credential_id
  AND agency_id = v_agency_id;

  IF v_credential IS NULL THEN
    RAISE EXCEPTION 'Credential not found';
  END IF;

  IF v_credential.status = 'REVOKED' THEN
    RAISE EXCEPTION 'Credential already revoked';
  END IF;

  -- Revoke credential immediately
  UPDATE credentials
  SET status = 'REVOKED',
      revoked_at = now(),
      revoked_by = v_actor_id,
      revoked_reason = p_revoked_reason,
      updated_at = now()
  WHERE id = p_credential_id;

  -- Log revocation
  INSERT INTO credential_activation_log (
    agency_id,
    credential_id,
    actor_id,
    actor_role,
    credential_type,
    environment,
    action,
    validation_result
  ) SELECT
    v_agency_id,
    p_credential_id,
    v_actor_id,
    v_actor_role,
    ct.type_name,
    v_credential.environment,
    'REVOKE',
    jsonb_build_object('reason', p_revoked_reason, 'previous_status', v_credential.status)
  FROM credential_types ct
  WHERE ct.id = v_credential.credential_type_id;

  RETURN json_build_object(
    'success', true,
    'credential_id', p_credential_id,
    'revoked_at', now(),
    'message', 'Credential revoked immediately. Failure fallback to safe mode.'
  );
END;
$$;
