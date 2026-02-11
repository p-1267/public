/*
  # Geolocation Validation & Fraud Detection RPCs (Phase 24)

  ## Purpose
  Validate geolocation and detect attendance anomalies.
  Flags are advisory, not blocking.

  ## Functions
  1. validate_geolocation - Validate clock location against resident address
  2. detect_attendance_anomalies - Scan for fraud patterns
  3. get_attendance_anomalies - Get unacknowledged anomalies
  4. acknowledge_attendance_anomaly - Acknowledge an anomaly

  ## Security
  - Supervisor/admin only for anomaly viewing
  - Flags do not block operations
  - Complete audit trail
*/

-- Function: validate_geolocation
-- Validates clock location is plausible
CREATE OR REPLACE FUNCTION validate_geolocation(
  p_shift_id uuid,
  p_gps_latitude numeric,
  p_gps_longitude numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift record;
  v_resident_location record;
  v_distance_km numeric;
  v_is_valid boolean := true;
  v_warning text := NULL;
BEGIN
  -- Get shift and resident data
  SELECT s.*, r.address_latitude, r.address_longitude
  INTO v_shift
  FROM shifts s
  LEFT JOIN shift_resident_assignments sra ON sra.shift_id = s.id
  LEFT JOIN residents r ON r.id = sra.resident_id
  WHERE s.id = p_shift_id
  LIMIT 1;

  IF v_shift IS NULL THEN
    RETURN json_build_object(
      'valid', false,
      'reason', 'Shift not found'
    );
  END IF;

  -- If no GPS provided, cannot validate
  IF p_gps_latitude IS NULL OR p_gps_longitude IS NULL THEN
    RETURN json_build_object(
      'valid', true,
      'warning', 'No GPS data provided - validation skipped',
      'requires_manual_review', true
    );
  END IF;

  -- If no resident location, cannot validate
  IF v_shift.address_latitude IS NULL OR v_shift.address_longitude IS NULL THEN
    RETURN json_build_object(
      'valid', true,
      'warning', 'No resident location on file - validation skipped',
      'requires_manual_review', true
    );
  END IF;

  -- Calculate distance using Haversine formula (approximate)
  v_distance_km := 6371 * acos(
    cos(radians(p_gps_latitude)) * 
    cos(radians(v_shift.address_latitude)) * 
    cos(radians(v_shift.address_longitude) - radians(p_gps_longitude)) + 
    sin(radians(p_gps_latitude)) * 
    sin(radians(v_shift.address_latitude))
  );

  -- Flag if distance is large (>5km)
  IF v_distance_km > 5 THEN
    v_is_valid := false;
    v_warning := format('Location is %.2f km from resident address', v_distance_km);
  ELSIF v_distance_km > 1 THEN
    v_warning := format('Location is %.2f km from resident address - within acceptable range', v_distance_km);
  END IF;

  RETURN json_build_object(
    'valid', v_is_valid,
    'distance_km', v_distance_km,
    'warning', v_warning,
    'requires_manual_review', NOT v_is_valid
  );
END;
$$;

-- Function: detect_attendance_anomalies
-- Scans for attendance fraud patterns
CREATE OR REPLACE FUNCTION detect_attendance_anomalies(
  p_lookback_days integer DEFAULT 30
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_agency_id uuid;
  v_anomalies_created integer := 0;
  v_caregiver record;
  v_start_date date;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name, up.agency_id
  INTO v_user_role, v_agency_id
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- Only supervisors and admins can detect anomalies
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  v_start_date := CURRENT_DATE - p_lookback_days;

  -- Detect duplicate clock events
  INSERT INTO attendance_anomalies (
    shift_id,
    attendance_event_id,
    user_id,
    anomaly_type,
    severity,
    description,
    data
  )
  SELECT 
    ae1.shift_id,
    ae1.id,
    ae1.user_id,
    'DUPLICATE_CLOCK_EVENT',
    'HIGH',
    'Multiple ' || ae1.event_type || ' events detected for same shift',
    jsonb_build_object('event_count', COUNT(*))
  FROM attendance_events ae1
  JOIN shifts s ON s.id = ae1.shift_id
  WHERE s.agency_id = v_agency_id
  AND ae1.timestamp::date >= v_start_date
  GROUP BY ae1.shift_id, ae1.user_id, ae1.event_type, ae1.id
  HAVING COUNT(*) > 1
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_anomalies_created = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'anomalies_created', v_anomalies_created,
    'message', format('Created %s new attendance anomalies', v_anomalies_created)
  );
END;
$$;

-- Function: get_attendance_anomalies
-- Gets unacknowledged attendance anomalies
CREATE OR REPLACE FUNCTION get_attendance_anomalies(
  p_shift_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_agency_id uuid;
  v_anomalies json;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name, up.agency_id
  INTO v_user_role, v_agency_id
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- Only supervisors and admins can view anomalies
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', aa.id,
      'shift_id', aa.shift_id,
      'caregiver_id', aa.user_id,
      'caregiver_name', up.full_name,
      'anomaly_type', aa.anomaly_type,
      'severity', aa.severity,
      'description', aa.description,
      'data', aa.data,
      'created_at', aa.created_at
    ) ORDER BY aa.severity DESC, aa.created_at DESC
  )
  INTO v_anomalies
  FROM attendance_anomalies aa
  JOIN user_profiles up ON up.id = aa.user_id
  JOIN shifts s ON s.id = aa.shift_id
  WHERE s.agency_id = v_agency_id
  AND aa.is_acknowledged = false
  AND (p_shift_id IS NULL OR aa.shift_id = p_shift_id);

  RETURN json_build_object(
    'success', true,
    'anomalies', COALESCE(v_anomalies, '[]'::json),
    'anomaly_count', COALESCE(jsonb_array_length(v_anomalies::jsonb), 0)
  );
END;
$$;

-- Function: acknowledge_attendance_anomaly
-- Acknowledges an attendance anomaly
CREATE OR REPLACE FUNCTION acknowledge_attendance_anomaly(
  p_anomaly_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name
  INTO v_user_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- Only supervisors and admins can acknowledge anomalies
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  UPDATE attendance_anomalies
  SET is_acknowledged = true,
      acknowledged_by = v_user_id,
      acknowledged_at = now()
  WHERE id = p_anomaly_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Anomaly acknowledged successfully'
  );
END;
$$;
