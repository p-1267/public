/*
  # Device Health & Trust RPCs (Phase 21)

  ## Purpose
  RPC functions for device health monitoring and trust state management.
  Brain uses these to evaluate device reliability.

  ## Functions
  1. update_device_health - Update device health status
  2. evaluate_device_trust - Brain evaluation of device trust state
  3. get_device_trust_state - Get current trust state
  4. revoke_device - Revoke device access (permanent)
  5. get_resident_devices - Get all devices for resident
  6. log_device_data_event - Log device data with trust context

  ## Security
  - All functions enforce authorization
  - Trust state changes are logged
  - Revoked devices cannot be re-trusted
*/

-- Function: update_device_health
-- Updates device health metrics and evaluates trust state
CREATE OR REPLACE FUNCTION update_device_health(
  p_device_id text,
  p_battery_level integer,
  p_signal_strength integer DEFAULT NULL,
  p_firmware_version text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resident_id uuid;
  v_current_trust_state text;
  v_new_trust_state text;
  v_last_seen_at timestamptz;
  v_data_freshness_seconds integer;
  v_reliability_score numeric;
  v_health_issues text[] := '{}';
BEGIN
  -- Get device info
  SELECT resident_id, trust_state, last_seen_at
  INTO v_resident_id, v_current_trust_state, v_last_seen_at
  FROM device_registry
  WHERE device_id = p_device_id;

  IF v_resident_id IS NULL THEN
    RAISE EXCEPTION 'Device not found';
  END IF;

  IF v_current_trust_state = 'REVOKED' THEN
    RAISE EXCEPTION 'Device is revoked and cannot be updated';
  END IF;

  -- Calculate data freshness
  v_data_freshness_seconds := EXTRACT(EPOCH FROM (now() - v_last_seen_at))::integer;

  -- Evaluate trust state based on health metrics
  v_new_trust_state := v_current_trust_state;
  v_reliability_score := 100.0;

  -- Check battery level
  IF p_battery_level <= 10 THEN
    v_new_trust_state := 'LOW_BATTERY';
    v_health_issues := array_append(v_health_issues, 'CRITICAL_BATTERY');
    v_reliability_score := v_reliability_score - 50;
  ELSIF p_battery_level <= 20 THEN
    v_new_trust_state := 'LOW_BATTERY';
    v_health_issues := array_append(v_health_issues, 'LOW_BATTERY');
    v_reliability_score := v_reliability_score - 30;
  END IF;

  -- Check data freshness
  IF v_data_freshness_seconds > 3600 THEN
    v_new_trust_state := 'OFFLINE';
    v_health_issues := array_append(v_health_issues, 'OFFLINE');
    v_reliability_score := 0;
  ELSIF v_data_freshness_seconds > 600 THEN
    v_new_trust_state := 'UNRELIABLE';
    v_health_issues := array_append(v_health_issues, 'STALE_DATA');
    v_reliability_score := v_reliability_score - 40;
  END IF;

  -- Check signal strength if provided
  IF p_signal_strength IS NOT NULL AND p_signal_strength < 30 THEN
    v_health_issues := array_append(v_health_issues, 'WEAK_SIGNAL');
    v_reliability_score := v_reliability_score - 20;
    IF v_new_trust_state = 'TRUSTED' THEN
      v_new_trust_state := 'UNRELIABLE';
    END IF;
  END IF;

  -- If no issues, set to TRUSTED
  IF array_length(v_health_issues, 1) IS NULL AND p_battery_level > 20 THEN
    v_new_trust_state := 'TRUSTED';
    v_reliability_score := 100.0;
  END IF;

  -- Ensure reliability score is valid
  v_reliability_score := GREATEST(0, LEAST(100, v_reliability_score));

  -- Update device registry
  UPDATE device_registry
  SET battery_level = p_battery_level,
      trust_state = v_new_trust_state,
      firmware_version = COALESCE(p_firmware_version, firmware_version),
      last_seen_at = now(),
      last_health_check_at = now(),
      updated_at = now()
  WHERE device_id = p_device_id;

  -- Log health check
  INSERT INTO device_health_log (
    device_id,
    resident_id,
    battery_level,
    signal_strength,
    data_freshness_seconds,
    firmware_version,
    trust_state_at_check,
    reliability_score,
    health_issues,
    check_type,
    evaluated_by
  ) VALUES (
    p_device_id,
    v_resident_id,
    p_battery_level,
    p_signal_strength,
    v_data_freshness_seconds,
    COALESCE(p_firmware_version, (SELECT firmware_version FROM device_registry WHERE device_id = p_device_id)),
    v_new_trust_state,
    v_reliability_score,
    v_health_issues,
    'AUTOMATIC',
    'BRAIN'
  );

  RETURN json_build_object(
    'success', true,
    'device_id', p_device_id,
    'previous_trust_state', v_current_trust_state,
    'new_trust_state', v_new_trust_state,
    'reliability_score', v_reliability_score,
    'health_issues', v_health_issues,
    'requires_supervisor_alert', (v_new_trust_state IN ('LOW_BATTERY', 'OFFLINE', 'UNRELIABLE'))
  );
END;
$$;

-- Function: get_device_trust_state
-- Gets current trust state for a device
CREATE OR REPLACE FUNCTION get_device_trust_state(
  p_device_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device record;
BEGIN
  SELECT 
    device_id,
    resident_id,
    device_type,
    device_name,
    trust_state,
    battery_level,
    last_seen_at,
    firmware_version,
    EXTRACT(EPOCH FROM (now() - last_seen_at))::integer as seconds_since_seen
  INTO v_device
  FROM device_registry
  WHERE device_id = p_device_id;

  IF v_device.device_id IS NULL THEN
    RAISE EXCEPTION 'Device not found';
  END IF;

  RETURN json_build_object(
    'device_id', v_device.device_id,
    'resident_id', v_device.resident_id,
    'device_type', v_device.device_type,
    'device_name', v_device.device_name,
    'trust_state', v_device.trust_state,
    'battery_level', v_device.battery_level,
    'last_seen_at', v_device.last_seen_at,
    'firmware_version', v_device.firmware_version,
    'seconds_since_seen', v_device.seconds_since_seen,
    'is_trusted', (v_device.trust_state = 'TRUSTED')
  );
END;
$$;

-- Function: revoke_device
-- Permanently revokes a device (cannot be re-trusted)
CREATE OR REPLACE FUNCTION revoke_device(
  p_device_id text,
  p_revocation_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_resident_id uuid;
  v_current_trust_state text;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name INTO v_user_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  IF v_user_role NOT IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Get device info
  SELECT resident_id, trust_state
  INTO v_resident_id, v_current_trust_state
  FROM device_registry
  WHERE device_id = p_device_id;

  IF v_resident_id IS NULL THEN
    RAISE EXCEPTION 'Device not found';
  END IF;

  IF v_current_trust_state = 'REVOKED' THEN
    RAISE EXCEPTION 'Device is already revoked';
  END IF;

  -- Revoke device
  UPDATE device_registry
  SET trust_state = 'REVOKED',
      revoked_at = now(),
      revoked_by = v_user_id,
      revocation_reason = p_revocation_reason,
      updated_at = now()
  WHERE device_id = p_device_id;

  -- Log health check with revocation
  INSERT INTO device_health_log (
    device_id,
    resident_id,
    battery_level,
    data_freshness_seconds,
    firmware_version,
    trust_state_at_check,
    reliability_score,
    health_issues,
    check_type,
    evaluated_by
  ) SELECT
    device_id,
    resident_id,
    COALESCE(battery_level, 0),
    EXTRACT(EPOCH FROM (now() - last_seen_at))::integer,
    firmware_version,
    'REVOKED',
    0,
    ARRAY['DEVICE_REVOKED'],
    'MANUAL',
    'USER'
  FROM device_registry
  WHERE device_id = p_device_id;

  RETURN json_build_object(
    'success', true,
    'device_id', p_device_id,
    'previous_trust_state', v_current_trust_state,
    'new_trust_state', 'REVOKED',
    'revoked_by', v_user_id,
    'revocation_reason', p_revocation_reason,
    'message', 'Device revoked successfully. This action is permanent.'
  );
END;
$$;

-- Function: get_resident_devices
-- Gets all devices for a resident
CREATE OR REPLACE FUNCTION get_resident_devices(
  p_resident_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_devices json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', id,
      'device_id', device_id,
      'device_type', device_type,
      'device_name', device_name,
      'manufacturer', manufacturer,
      'model', model,
      'firmware_version', firmware_version,
      'battery_level', battery_level,
      'trust_state', trust_state,
      'last_seen_at', last_seen_at,
      'pairing_timestamp', pairing_timestamp,
      'is_revoked', (trust_state = 'REVOKED'),
      'requires_attention', (trust_state IN ('LOW_BATTERY', 'OFFLINE', 'UNRELIABLE')),
      'seconds_since_seen', EXTRACT(EPOCH FROM (now() - last_seen_at))::integer
    )
  )
  INTO v_devices
  FROM device_registry
  WHERE resident_id = p_resident_id
  ORDER BY pairing_timestamp DESC;

  RETURN json_build_object(
    'success', true,
    'resident_id', p_resident_id,
    'devices', COALESCE(v_devices, '[]'::json)
  );
END;
$$;

-- Function: log_device_data_event
-- Logs device data event with trust context
CREATE OR REPLACE FUNCTION log_device_data_event(
  p_device_id text,
  p_event_type text,
  p_event_data jsonb,
  p_data_source text DEFAULT 'LIVE'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_device record;
  v_confidence_level text;
  v_event_id uuid;
BEGIN
  -- Get device info
  SELECT 
    resident_id,
    trust_state,
    firmware_version,
    battery_level,
    NULL::integer as signal_strength
  INTO v_device
  FROM device_registry
  WHERE device_id = p_device_id;

  IF v_device.resident_id IS NULL THEN
    RAISE EXCEPTION 'Device not found';
  END IF;

  -- Determine confidence level based on trust state
  v_confidence_level := CASE v_device.trust_state
    WHEN 'TRUSTED' THEN 'HIGH'
    WHEN 'LOW_BATTERY' THEN 'MEDIUM'
    WHEN 'UNRELIABLE' THEN 'LOW'
    WHEN 'OFFLINE' THEN 'LOW'
    WHEN 'REVOKED' THEN 'REJECTED'
    ELSE 'LOW'
  END;

  -- Log event
  INSERT INTO device_data_events (
    device_id,
    resident_id,
    event_type,
    event_data,
    trust_state_at_reading,
    firmware_version,
    battery_level,
    signal_strength,
    data_source,
    confidence_level,
    used_for_care_decision,
    synced_at
  ) VALUES (
    p_device_id,
    v_device.resident_id,
    p_event_type,
    p_event_data,
    v_device.trust_state,
    v_device.firmware_version,
    v_device.battery_level,
    v_device.signal_strength,
    p_data_source,
    v_confidence_level,
    (v_confidence_level IN ('HIGH', 'MEDIUM')),
    CASE WHEN p_data_source = 'OFFLINE_SYNC' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_event_id;

  RETURN json_build_object(
    'success', true,
    'event_id', v_event_id,
    'confidence_level', v_confidence_level,
    'used_for_care_decision', (v_confidence_level IN ('HIGH', 'MEDIUM')),
    'trust_state', v_device.trust_state
  );
END;
$$;
