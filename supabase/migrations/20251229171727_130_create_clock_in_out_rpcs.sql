/*
  # Clock-In / Clock-Out RPCs (Phase 24)

  ## Purpose
  Core attendance functions with full data capture.
  Each clock event MUST capture: User ID, Shift ID, Timestamp, GPS, Device fingerprint, Connectivity state.

  ## Functions
  1. clock_in - Clock into a shift
  2. clock_out - Clock out of a shift
  3. get_shift_attendance - Get attendance records for shift

  ## Security
  - All functions enforce authorization
  - Server-verified timestamp is truth
  - Complete audit trail
*/

-- Function: clock_in
-- Clocks caregiver into a shift
CREATE OR REPLACE FUNCTION clock_in(
  p_shift_id uuid,
  p_device_fingerprint text,
  p_connectivity_state text,
  p_device_timestamp timestamptz,
  p_gps_latitude numeric DEFAULT NULL,
  p_gps_longitude numeric DEFAULT NULL,
  p_gps_accuracy numeric DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_shift record;
  v_existing_clock_in record;
  v_attendance_id uuid;
  v_server_timestamp timestamptz;
BEGIN
  v_user_id := auth.uid();
  v_server_timestamp := now();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name
  INTO v_user_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- Get shift
  SELECT * INTO v_shift
  FROM shifts
  WHERE id = p_shift_id;

  IF v_shift IS NULL THEN
    RAISE EXCEPTION 'Shift not found';
  END IF;

  -- Verify user is assigned to shift
  IF v_shift.caregiver_id != v_user_id THEN
    RAISE EXCEPTION 'User not assigned to this shift';
  END IF;

  -- Check if already clocked in
  SELECT * INTO v_existing_clock_in
  FROM attendance_events
  WHERE shift_id = p_shift_id
  AND user_id = v_user_id
  AND event_type = 'CLOCK_IN';

  IF v_existing_clock_in IS NOT NULL THEN
    RAISE EXCEPTION 'Already clocked in to this shift';
  END IF;

  -- Create attendance event
  INSERT INTO attendance_events (
    shift_id,
    user_id,
    event_type,
    timestamp,
    gps_latitude,
    gps_longitude,
    gps_accuracy,
    device_fingerprint,
    connectivity_state,
    is_offline_sync,
    device_timestamp,
    is_sealed
  ) VALUES (
    p_shift_id,
    v_user_id,
    'CLOCK_IN',
    v_server_timestamp,
    p_gps_latitude,
    p_gps_longitude,
    p_gps_accuracy,
    p_device_fingerprint,
    p_connectivity_state,
    (p_connectivity_state = 'OFFLINE'),
    p_device_timestamp,
    false
  )
  RETURNING id INTO v_attendance_id;

  -- Audit clock-in
  INSERT INTO attendance_audit (
    shift_id,
    actor_id,
    actor_role,
    event_type,
    attendance_event_id,
    timestamp,
    gps_latitude,
    gps_longitude,
    device_fingerprint,
    connectivity_state,
    metadata
  ) VALUES (
    p_shift_id,
    v_user_id,
    v_user_role,
    'CLOCK_IN',
    v_attendance_id,
    v_server_timestamp,
    p_gps_latitude,
    p_gps_longitude,
    p_device_fingerprint,
    p_connectivity_state,
    jsonb_build_object(
      'device_timestamp', p_device_timestamp,
      'server_timestamp', v_server_timestamp,
      'time_diff_seconds', EXTRACT(EPOCH FROM (v_server_timestamp - p_device_timestamp))
    )
  );

  -- Update shift status if applicable
  IF v_shift.status = 'SCHEDULED' THEN
    UPDATE shifts
    SET status = 'IN_PROGRESS',
        updated_at = now()
    WHERE id = p_shift_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'attendance_id', v_attendance_id,
    'server_timestamp', v_server_timestamp,
    'message', 'Clocked in successfully'
  );
END;
$$;

-- Function: clock_out
-- Clocks caregiver out of a shift
CREATE OR REPLACE FUNCTION clock_out(
  p_shift_id uuid,
  p_device_fingerprint text,
  p_connectivity_state text,
  p_device_timestamp timestamptz,
  p_gps_latitude numeric DEFAULT NULL,
  p_gps_longitude numeric DEFAULT NULL,
  p_gps_accuracy numeric DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_shift record;
  v_clock_in record;
  v_existing_clock_out record;
  v_attendance_id uuid;
  v_server_timestamp timestamptz;
  v_duration_minutes numeric;
BEGIN
  v_user_id := auth.uid();
  v_server_timestamp := now();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name
  INTO v_user_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- Get shift
  SELECT * INTO v_shift
  FROM shifts
  WHERE id = p_shift_id;

  IF v_shift IS NULL THEN
    RAISE EXCEPTION 'Shift not found';
  END IF;

  -- Verify user is assigned to shift
  IF v_shift.caregiver_id != v_user_id THEN
    RAISE EXCEPTION 'User not assigned to this shift';
  END IF;

  -- Check if clocked in
  SELECT * INTO v_clock_in
  FROM attendance_events
  WHERE shift_id = p_shift_id
  AND user_id = v_user_id
  AND event_type = 'CLOCK_IN';

  IF v_clock_in IS NULL THEN
    RAISE EXCEPTION 'Must clock in before clocking out';
  END IF;

  -- Check if already clocked out
  SELECT * INTO v_existing_clock_out
  FROM attendance_events
  WHERE shift_id = p_shift_id
  AND user_id = v_user_id
  AND event_type = 'CLOCK_OUT';

  IF v_existing_clock_out IS NOT NULL THEN
    RAISE EXCEPTION 'Already clocked out of this shift';
  END IF;

  -- Calculate duration
  v_duration_minutes := EXTRACT(EPOCH FROM (v_server_timestamp - v_clock_in.timestamp)) / 60;

  -- Create attendance event
  INSERT INTO attendance_events (
    shift_id,
    user_id,
    event_type,
    timestamp,
    gps_latitude,
    gps_longitude,
    gps_accuracy,
    device_fingerprint,
    connectivity_state,
    is_offline_sync,
    device_timestamp,
    is_sealed
  ) VALUES (
    p_shift_id,
    v_user_id,
    'CLOCK_OUT',
    v_server_timestamp,
    p_gps_latitude,
    p_gps_longitude,
    p_gps_accuracy,
    p_device_fingerprint,
    p_connectivity_state,
    (p_connectivity_state = 'OFFLINE'),
    p_device_timestamp,
    false
  )
  RETURNING id INTO v_attendance_id;

  -- Audit clock-out
  INSERT INTO attendance_audit (
    shift_id,
    actor_id,
    actor_role,
    event_type,
    attendance_event_id,
    timestamp,
    gps_latitude,
    gps_longitude,
    device_fingerprint,
    connectivity_state,
    metadata
  ) VALUES (
    p_shift_id,
    v_user_id,
    v_user_role,
    'CLOCK_OUT',
    v_attendance_id,
    v_server_timestamp,
    p_gps_latitude,
    p_gps_longitude,
    p_device_fingerprint,
    p_connectivity_state,
    jsonb_build_object(
      'device_timestamp', p_device_timestamp,
      'server_timestamp', v_server_timestamp,
      'duration_minutes', v_duration_minutes,
      'time_diff_seconds', EXTRACT(EPOCH FROM (v_server_timestamp - p_device_timestamp))
    )
  );

  RETURN json_build_object(
    'success', true,
    'attendance_id', v_attendance_id,
    'server_timestamp', v_server_timestamp,
    'duration_minutes', v_duration_minutes,
    'message', 'Clocked out successfully'
  );
END;
$$;

-- Function: get_shift_attendance
-- Gets attendance records for a shift
CREATE OR REPLACE FUNCTION get_shift_attendance(
  p_shift_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_attendance json;
  v_clock_in record;
  v_clock_out record;
  v_duration_minutes numeric;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get clock-in
  SELECT * INTO v_clock_in
  FROM attendance_events
  WHERE shift_id = p_shift_id
  AND event_type = 'CLOCK_IN'
  LIMIT 1;

  -- Get clock-out
  SELECT * INTO v_clock_out
  FROM attendance_events
  WHERE shift_id = p_shift_id
  AND event_type = 'CLOCK_OUT'
  LIMIT 1;

  -- Calculate duration if both exist
  IF v_clock_in IS NOT NULL AND v_clock_out IS NOT NULL THEN
    v_duration_minutes := EXTRACT(EPOCH FROM (v_clock_out.timestamp - v_clock_in.timestamp)) / 60;
  END IF;

  RETURN json_build_object(
    'success', true,
    'shift_id', p_shift_id,
    'clock_in', CASE WHEN v_clock_in IS NOT NULL THEN
      json_build_object(
        'id', v_clock_in.id,
        'timestamp', v_clock_in.timestamp,
        'gps_latitude', v_clock_in.gps_latitude,
        'gps_longitude', v_clock_in.gps_longitude,
        'connectivity_state', v_clock_in.connectivity_state,
        'is_sealed', v_clock_in.is_sealed
      )
    ELSE NULL END,
    'clock_out', CASE WHEN v_clock_out IS NOT NULL THEN
      json_build_object(
        'id', v_clock_out.id,
        'timestamp', v_clock_out.timestamp,
        'gps_latitude', v_clock_out.gps_latitude,
        'gps_longitude', v_clock_out.gps_longitude,
        'connectivity_state', v_clock_out.connectivity_state,
        'is_sealed', v_clock_out.is_sealed
      )
    ELSE NULL END,
    'duration_minutes', v_duration_minutes,
    'is_complete', (v_clock_in IS NOT NULL AND v_clock_out IS NOT NULL)
  );
END;
$$;
