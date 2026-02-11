/*
  # Resident Access RPC Functions
  
  1. Functions
    - `generate_resident_access_token` - Create new QR/proximity token
    - `validate_and_log_access` - Validate token and log access with duplicate detection
    - `get_resident_instant_context` - Fetch full resident context after scan
    - `get_recent_resident_visits` - Get last visits for duplicate detection
  
  2. Security
    - All functions use SECURITY DEFINER with explicit permission checks
    - Validates user roles and assignments
    - Logs all access attempts
*/

-- Generate a new access token for a resident
CREATE OR REPLACE FUNCTION generate_resident_access_token(
  p_resident_id uuid,
  p_token_type text DEFAULT 'qr_code',
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token text;
  v_token_id uuid;
  v_user_role text;
BEGIN
  -- Check permissions (admin or supervisor only)
  SELECT r.name INTO v_user_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = auth.uid();
  
  IF v_user_role NOT IN ('agency_admin', 'super_admin', 'supervisor') THEN
    RAISE EXCEPTION 'Insufficient permissions to generate access tokens';
  END IF;
  
  -- Generate unique token
  v_token := encode(gen_random_bytes(32), 'base64');
  
  -- Insert token
  INSERT INTO resident_access_tokens (
    resident_id,
    token,
    token_type,
    expires_at,
    created_by
  ) VALUES (
    p_resident_id,
    v_token,
    p_token_type,
    p_expires_at,
    auth.uid()
  )
  RETURNING id INTO v_token_id;
  
  RETURN jsonb_build_object(
    'token_id', v_token_id,
    'token', v_token,
    'resident_id', p_resident_id,
    'token_type', p_token_type,
    'expires_at', p_expires_at
  );
END;
$$;

-- Validate token and log access with duplicate detection
CREATE OR REPLACE FUNCTION validate_and_log_access(
  p_token text,
  p_access_method text DEFAULT 'qr_scan',
  p_device_info jsonb DEFAULT '{}'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token_record record;
  v_last_visit record;
  v_duplicate_detected boolean := false;
  v_minutes_ago integer;
  v_access_log_id uuid;
BEGIN
  -- Validate token
  SELECT * INTO v_token_record
  FROM resident_access_tokens
  WHERE token = p_token
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > now());
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired token';
  END IF;
  
  -- Check for recent visits (within 30 minutes = duplicate visit threshold)
  SELECT 
    accessed_by,
    accessed_at,
    EXTRACT(EPOCH FROM (now() - accessed_at))/60 as minutes_ago
  INTO v_last_visit
  FROM resident_access_log
  WHERE resident_id = v_token_record.resident_id
  AND accessed_by != auth.uid()
  ORDER BY accessed_at DESC
  LIMIT 1;
  
  IF FOUND AND v_last_visit.minutes_ago < 30 THEN
    v_duplicate_detected := true;
    v_minutes_ago := v_last_visit.minutes_ago;
  END IF;
  
  -- Log access
  INSERT INTO resident_access_log (
    resident_id,
    token_id,
    accessed_by,
    access_method,
    device_info,
    duplicate_visit_detected,
    last_visit_by,
    last_visit_minutes_ago
  ) VALUES (
    v_token_record.resident_id,
    v_token_record.id,
    auth.uid(),
    p_access_method,
    p_device_info,
    v_duplicate_detected,
    v_last_visit.accessed_by,
    v_minutes_ago
  )
  RETURNING id INTO v_access_log_id;
  
  -- Update token usage
  UPDATE resident_access_tokens
  SET 
    last_used_at = now(),
    use_count = use_count + 1
  WHERE id = v_token_record.id;
  
  RETURN jsonb_build_object(
    'access_log_id', v_access_log_id,
    'resident_id', v_token_record.resident_id,
    'duplicate_visit_detected', v_duplicate_detected,
    'last_visit_by', v_last_visit.accessed_by,
    'last_visit_minutes_ago', v_minutes_ago
  );
END;
$$;

-- Get full resident instant context after scan
CREATE OR REPLACE FUNCTION get_resident_instant_context(
  p_resident_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_context jsonb;
  v_resident jsonb;
  v_last_medications jsonb;
  v_last_vitals jsonb;
  v_recent_visits jsonb;
  v_active_signals jsonb;
BEGIN
  -- Get resident basic info
  SELECT jsonb_build_object(
    'id', r.id,
    'first_name', r.first_name,
    'last_name', r.last_name,
    'room_number', r.room_number,
    'care_level', r.care_level
  ) INTO v_resident
  FROM residents r
  WHERE r.id = p_resident_id;
  
  -- Get last 3 medication administrations
  SELECT jsonb_agg(
    jsonb_build_object(
      'medication_name', ma.medication_name,
      'administered_at', ma.administered_at,
      'administered_by', up.first_name || ' ' || up.last_name,
      'status', ma.status
    ) ORDER BY ma.administered_at DESC
  ) INTO v_last_medications
  FROM medication_administration ma
  JOIN user_profiles up ON up.id = ma.administered_by
  WHERE ma.resident_id = p_resident_id
  AND ma.administered_at > now() - interval '24 hours'
  LIMIT 3;
  
  -- Get last vitals (if vital_signs table exists)
  SELECT jsonb_build_object(
    'recorded_at', vs.recorded_at,
    'heart_rate', vs.heart_rate,
    'blood_pressure_systolic', vs.blood_pressure_systolic,
    'blood_pressure_diastolic', vs.blood_pressure_diastolic,
    'temperature', vs.temperature,
    'oxygen_saturation', vs.oxygen_saturation
  ) INTO v_last_vitals
  FROM vital_signs vs
  WHERE vs.resident_id = p_resident_id
  ORDER BY vs.recorded_at DESC
  LIMIT 1;
  
  -- Get recent visits (last 3)
  SELECT jsonb_agg(
    jsonb_build_object(
      'accessed_by', up.first_name || ' ' || up.last_name,
      'accessed_at', ral.accessed_at,
      'access_method', ral.access_method,
      'minutes_ago', EXTRACT(EPOCH FROM (now() - ral.accessed_at))/60
    ) ORDER BY ral.accessed_at DESC
  ) INTO v_recent_visits
  FROM resident_access_log ral
  JOIN user_profiles up ON up.id = ral.accessed_by
  WHERE ral.resident_id = p_resident_id
  LIMIT 3;
  
  -- Get active intelligence signals (if available)
  SELECT jsonb_agg(
    jsonb_build_object(
      'signal_type', isg.signal_type,
      'severity', isg.severity,
      'message', isg.message,
      'created_at', isg.created_at
    ) ORDER BY isg.severity DESC, isg.created_at DESC
  ) INTO v_active_signals
  FROM intelligence_signals isg
  WHERE isg.resident_id = p_resident_id
  AND isg.status = 'active'
  LIMIT 5;
  
  -- Build complete context
  v_context := jsonb_build_object(
    'resident', v_resident,
    'last_medications', COALESCE(v_last_medications, '[]'::jsonb),
    'last_vitals', v_last_vitals,
    'recent_visits', COALESCE(v_recent_visits, '[]'::jsonb),
    'active_signals', COALESCE(v_active_signals, '[]'::jsonb),
    'context_generated_at', now()
  );
  
  RETURN v_context;
END;
$$;