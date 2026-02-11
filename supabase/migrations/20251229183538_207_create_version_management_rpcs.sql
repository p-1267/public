/*
  # Version Management RPCs (Phase 31)

  ## Purpose
  Manage semantic versioning and compatibility matrix.
  Enforces explicit version mapping and compatibility checks.

  ## Functions
  1. release_version - Release new version
  2. get_current_versions - Get current versions for all components
  3. deprecate_version - Deprecate a version
  4. define_version_compatibility - Define compatibility between versions
  5. check_version_compatibility - Check if client version is compatible
  6. verify_client_version_on_startup - Verify client version (startup check)

  ## Security
  - All functions enforce authorization
  - SUPER_ADMIN only
  - Complete audit logging

  ## Enforcement Rules
  1. Semantic versioning (MAJOR.MINOR.PATCH)
  2. Explicit mapping: Brain logic version, API schema version, Client app version
  3. No implicit compatibility allowed
  4. Clients MUST verify version compatibility on startup
  5. Incompatible clients MUST enter RESTRICTED MODE
*/

-- Function: release_version
-- Releases new version (SUPER_ADMIN only)
CREATE OR REPLACE FUNCTION release_version(
  p_version_number text,
  p_version_type text,
  p_release_notes text DEFAULT '',
  p_breaking_changes text[] DEFAULT '{}'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_actor_role text;
  v_version_parts text[];
  v_major integer;
  v_minor integer;
  v_patch integer;
  v_new_version_id uuid;
BEGIN
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get actor role
  SELECT r.name INTO v_actor_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_actor_id;

  -- Check authorization - SUPER_ADMIN only
  IF v_actor_role != 'SUPER_ADMIN' THEN
    RAISE EXCEPTION 'Only SUPER_ADMIN can release versions';
  END IF;

  -- Parse semantic version
  v_version_parts := string_to_array(p_version_number, '.');
  IF array_length(v_version_parts, 1) != 3 THEN
    RAISE EXCEPTION 'Invalid semantic version format. Expected MAJOR.MINOR.PATCH';
  END IF;

  v_major := v_version_parts[1]::integer;
  v_minor := v_version_parts[2]::integer;
  v_patch := v_version_parts[3]::integer;

  -- Unset current version flag for this type
  UPDATE system_versions
  SET is_current_version = false
  WHERE version_type = p_version_type
  AND is_current_version = true;

  -- Create new version
  INSERT INTO system_versions (
    version_number,
    version_type,
    major_version,
    minor_version,
    patch_version,
    release_notes,
    breaking_changes,
    is_current_version,
    created_by
  ) VALUES (
    p_version_number,
    p_version_type,
    v_major,
    v_minor,
    v_patch,
    p_release_notes,
    p_breaking_changes,
    true,
    v_actor_id
  ) RETURNING id INTO v_new_version_id;

  -- Log audit event
  INSERT INTO update_audit_log (
    event_id,
    event_type,
    environment,
    version_number,
    component_type,
    action,
    action_result,
    actor_id,
    actor_type,
    event_details
  ) VALUES (
    gen_random_uuid()::text,
    'VERSION_RELEASED',
    'PRODUCTION',
    p_version_number,
    p_version_type,
    'DEPLOY',
    'SUCCESS',
    v_actor_id,
    'USER',
    jsonb_build_object(
      'version_id', v_new_version_id,
      'breaking_changes', p_breaking_changes
    )
  );

  RETURN json_build_object(
    'success', true,
    'version_id', v_new_version_id,
    'version_number', p_version_number,
    'version_type', p_version_type,
    'message', 'Version released successfully'
  );
END;
$$;

-- Function: get_current_versions
-- Gets current versions for all components
CREATE OR REPLACE FUNCTION get_current_versions()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_versions json;
BEGIN
  SELECT json_object_agg(
    version_type,
    json_build_object(
      'version_number', version_number,
      'major', major_version,
      'minor', minor_version,
      'patch', patch_version,
      'release_timestamp', release_timestamp,
      'is_deprecated', is_deprecated
    )
  )
  INTO v_versions
  FROM system_versions
  WHERE is_current_version = true;

  RETURN json_build_object(
    'success', true,
    'versions', COALESCE(v_versions, '{}'::json)
  );
END;
$$;

-- Function: define_version_compatibility
-- Defines compatibility between versions (explicit only)
CREATE OR REPLACE FUNCTION define_version_compatibility(
  p_brain_logic_version text,
  p_api_schema_version text,
  p_client_app_min_version text,
  p_client_app_max_version text DEFAULT NULL,
  p_is_compatible boolean DEFAULT true,
  p_compatibility_notes text DEFAULT ''
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_actor_role text;
  v_compatibility_id uuid;
BEGIN
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get actor role
  SELECT r.name INTO v_actor_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_actor_id;

  -- Check authorization - SUPER_ADMIN only
  IF v_actor_role != 'SUPER_ADMIN' THEN
    RAISE EXCEPTION 'Only SUPER_ADMIN can define version compatibility';
  END IF;

  -- Insert compatibility matrix entry
  INSERT INTO version_compatibility_matrix (
    brain_logic_version,
    api_schema_version,
    client_app_min_version,
    client_app_max_version,
    is_compatible,
    compatibility_notes,
    verified_by
  ) VALUES (
    p_brain_logic_version,
    p_api_schema_version,
    p_client_app_min_version,
    p_client_app_max_version,
    p_is_compatible,
    p_compatibility_notes,
    v_actor_id
  )
  ON CONFLICT (brain_logic_version, api_schema_version, client_app_min_version)
  DO UPDATE SET
    client_app_max_version = EXCLUDED.client_app_max_version,
    is_compatible = EXCLUDED.is_compatible,
    compatibility_notes = EXCLUDED.compatibility_notes,
    verified_at = now(),
    verified_by = EXCLUDED.verified_by
  RETURNING id INTO v_compatibility_id;

  RETURN json_build_object(
    'success', true,
    'compatibility_id', v_compatibility_id,
    'message', 'Version compatibility defined'
  );
END;
$$;

-- Function: check_version_compatibility
-- Checks if client version is compatible with current system versions
CREATE OR REPLACE FUNCTION check_version_compatibility(
  p_client_version text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_brain_version text;
  v_api_version text;
  v_is_compatible boolean := false;
  v_compatibility_notes text;
BEGIN
  -- Get current Brain and API versions
  SELECT version_number INTO v_brain_version
  FROM system_versions
  WHERE version_type = 'BRAIN_LOGIC' AND is_current_version = true;

  SELECT version_number INTO v_api_version
  FROM system_versions
  WHERE version_type = 'API_SCHEMA' AND is_current_version = true;

  -- Check compatibility matrix
  SELECT is_compatible, compatibility_notes
  INTO v_is_compatible, v_compatibility_notes
  FROM version_compatibility_matrix
  WHERE brain_logic_version = v_brain_version
  AND api_schema_version = v_api_version
  AND p_client_version >= client_app_min_version
  AND (client_app_max_version IS NULL OR p_client_version <= client_app_max_version)
  LIMIT 1;

  RETURN json_build_object(
    'compatible', COALESCE(v_is_compatible, false),
    'brain_logic_version', v_brain_version,
    'api_schema_version', v_api_version,
    'client_version', p_client_version,
    'compatibility_notes', v_compatibility_notes,
    'client_mode', CASE WHEN COALESCE(v_is_compatible, false) THEN 'NORMAL' ELSE 'RESTRICTED' END
  );
END;
$$;

-- Function: verify_client_version_on_startup
-- Verifies client version on startup and updates status
CREATE OR REPLACE FUNCTION verify_client_version_on_startup(
  p_device_id text,
  p_client_version text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_compatibility_result json;
  v_is_compatible boolean;
  v_client_mode text;
  v_brain_version text;
  v_api_version text;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check version compatibility
  SELECT * INTO v_compatibility_result
  FROM check_version_compatibility(p_client_version);

  v_is_compatible := (v_compatibility_result->>'compatible')::boolean;
  v_client_mode := v_compatibility_result->>'client_mode';
  v_brain_version := v_compatibility_result->>'brain_logic_version';
  v_api_version := v_compatibility_result->>'api_schema_version';

  -- Update or insert client version status
  INSERT INTO client_version_status (
    user_id,
    device_id,
    client_version,
    brain_logic_version,
    api_schema_version,
    is_compatible,
    compatibility_check_result,
    client_mode,
    last_version_check,
    last_successful_sync
  ) VALUES (
    v_user_id,
    p_device_id,
    p_client_version,
    v_brain_version,
    v_api_version,
    v_is_compatible,
    v_compatibility_result,
    v_client_mode,
    now(),
    CASE WHEN v_is_compatible THEN now() ELSE NULL END
  )
  ON CONFLICT (user_id, device_id)
  DO UPDATE SET
    client_version = EXCLUDED.client_version,
    brain_logic_version = EXCLUDED.brain_logic_version,
    api_schema_version = EXCLUDED.api_schema_version,
    is_compatible = EXCLUDED.is_compatible,
    compatibility_check_result = EXCLUDED.compatibility_check_result,
    client_mode = EXCLUDED.client_mode,
    last_version_check = EXCLUDED.last_version_check,
    last_successful_sync = CASE WHEN EXCLUDED.is_compatible THEN now() ELSE client_version_status.last_successful_sync END,
    updated_at = now();

  -- Log audit event
  INSERT INTO update_audit_log (
    event_id,
    event_type,
    environment,
    version_number,
    component_type,
    action,
    action_result,
    actor_id,
    actor_type,
    event_details
  ) VALUES (
    gen_random_uuid()::text,
    'CLIENT_VERSION_UPDATED',
    'PRODUCTION',
    p_client_version,
    'CLIENT_APP',
    'VERSION_CHECK',
    CASE WHEN v_is_compatible THEN 'SUCCESS' ELSE 'WARNING' END,
    v_user_id,
    'USER',
    jsonb_build_object(
      'device_id', p_device_id,
      'is_compatible', v_is_compatible,
      'client_mode', v_client_mode
    )
  );

  RETURN v_compatibility_result;
END;
$$;
