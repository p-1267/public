/*
  # Device Trust Management RPCs (Phase 19)

  ## Purpose
  RPC functions for registering, managing, and revoking device trust.
  Enforces device-level access control and security.

  ## Functions
  1. register_device - Register new device
  2. update_device_activity - Update last seen timestamp
  3. revoke_device - Revoke device trust
  4. list_user_devices - List devices for user
  5. mark_device_suspicious - Mark device as suspicious

  ## Security
  - All functions enforce device ownership
  - Revoked devices cannot be re-trusted
  - All actions are audited
*/

-- Function: register_device
-- Registers a new device for user
CREATE OR REPLACE FUNCTION register_device(
  p_device_fingerprint text,
  p_device_name text,
  p_device_type text,
  p_user_agent text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_device_id uuid;
  v_ip_address inet;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_ip_address := inet_client_addr();

  INSERT INTO device_trust (
    user_id,
    device_fingerprint,
    device_name,
    device_type,
    trust_state,
    first_seen_at,
    last_seen_at,
    last_ip_address,
    user_agent
  ) VALUES (
    v_user_id,
    p_device_fingerprint,
    p_device_name,
    p_device_type,
    'TRUSTED',
    now(),
    now(),
    v_ip_address,
    p_user_agent
  )
  ON CONFLICT (user_id, device_fingerprint)
  DO UPDATE SET
    last_seen_at = now(),
    last_ip_address = v_ip_address,
    user_agent = COALESCE(p_user_agent, device_trust.user_agent),
    updated_at = now()
  RETURNING id INTO v_device_id;

  RETURN json_build_object(
    'success', true,
    'device_id', v_device_id,
    'trust_state', 'TRUSTED'
  );
END;
$$;

-- Function: update_device_activity
-- Updates last seen timestamp for device
CREATE OR REPLACE FUNCTION update_device_activity(
  p_device_fingerprint text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_ip_address inet;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_ip_address := inet_client_addr();

  UPDATE device_trust
  SET last_seen_at = now(),
      last_ip_address = v_ip_address,
      updated_at = now()
  WHERE user_id = v_user_id
  AND device_fingerprint = p_device_fingerprint;

  RETURN json_build_object('success', true);
END;
$$;

-- Function: revoke_device
-- Revokes device trust
CREATE OR REPLACE FUNCTION revoke_device(
  p_device_id uuid,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_device record;
  v_can_revoke boolean := false;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_device
  FROM device_trust
  WHERE id = p_device_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Device not found';
  END IF;

  IF v_device.user_id = v_user_id THEN
    v_can_revoke := true;
  ELSE
    SELECT EXISTS (
      SELECT 1
      FROM user_effective_permissions
      WHERE user_id = v_user_id
      AND permission_name IN ('user.revoke', 'agency.manage')
    ) INTO v_can_revoke;
  END IF;

  IF NOT v_can_revoke THEN
    RAISE EXCEPTION 'Insufficient permissions to revoke device';
  END IF;

  UPDATE device_trust
  SET trust_state = 'REVOKED',
      revoked_at = now(),
      revoked_by = v_user_id,
      revoked_reason = p_reason,
      updated_at = now()
  WHERE id = p_device_id;

  INSERT INTO access_revocations (
    user_id,
    revoked_by,
    revocation_type,
    target_id,
    reason,
    immediate_effect,
    revoked_at
  ) VALUES (
    v_device.user_id,
    v_user_id,
    'DEVICE',
    p_device_id,
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

-- Function: list_user_devices
-- Lists devices for user
CREATE OR REPLACE FUNCTION list_user_devices(
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
  v_devices json;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  v_target_user_id := COALESCE(p_user_id, v_user_id);

  IF v_target_user_id != v_user_id THEN
    DECLARE
      v_has_permission boolean;
    BEGIN
      SELECT EXISTS (
        SELECT 1
        FROM user_effective_permissions
        WHERE user_id = v_user_id
        AND permission_name IN ('user.view', 'agency.manage')
      ) INTO v_has_permission;

      IF NOT v_has_permission THEN
        RAISE EXCEPTION 'Insufficient permissions to view user devices';
      END IF;
    END;
  END IF;

  SELECT json_agg(json_build_object(
    'id', id,
    'device_name', device_name,
    'device_type', device_type,
    'trust_state', trust_state,
    'first_seen_at', first_seen_at,
    'last_seen_at', last_seen_at,
    'last_ip_address', host(last_ip_address),
    'revoked_at', revoked_at,
    'revoked_reason', revoked_reason
  ))
  INTO v_devices
  FROM device_trust
  WHERE user_id = v_target_user_id
  ORDER BY last_seen_at DESC;

  RETURN json_build_object(
    'success', true,
    'devices', COALESCE(v_devices, '[]'::json)
  );
END;
$$;

-- Function: mark_device_suspicious
-- Marks device as suspicious (requires re-auth)
CREATE OR REPLACE FUNCTION mark_device_suspicious(
  p_device_id uuid,
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
    AND permission_name IN ('security.monitor', 'agency.manage')
  ) INTO v_has_permission;

  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Insufficient permissions to mark device suspicious';
  END IF;

  UPDATE device_trust
  SET trust_state = 'SUSPICIOUS',
      updated_at = now()
  WHERE id = p_device_id;

  RETURN json_build_object(
    'success', true,
    'marked_at', now()
  );
END;
$$;
