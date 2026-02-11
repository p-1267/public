/*
  # Shift Closure, Sealing & Manual Override RPCs (Phase 24)

  ## Purpose
  Close and seal shifts (making attendance immutable).
  Manual overrides by supervisors with full audit trail.

  ## Functions
  1. close_shift - Close shift (validate completion)
  2. seal_shift - Seal shift (make immutable)
  3. create_manual_attendance_override - Create manual correction
  4. get_shift_overrides - Get overrides for shift

  ## Security
  - Strict validation before sealing
  - Manual overrides preserve original data
  - Complete audit trail
*/

-- Function: close_shift
-- Closes a shift after validation
CREATE OR REPLACE FUNCTION close_shift(
  p_shift_id uuid
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
  v_clock_out record;
  v_duration_minutes numeric;
  v_validation_errors text[] := '{}';
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

  -- Only supervisors and admins can close shifts
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions: Only supervisors and admins can close shifts';
  END IF;

  -- Get shift
  SELECT * INTO v_shift
  FROM shifts
  WHERE id = p_shift_id;

  IF v_shift IS NULL THEN
    RAISE EXCEPTION 'Shift not found';
  END IF;

  IF v_shift.status = 'COMPLETED' THEN
    RAISE EXCEPTION 'Shift is already closed';
  END IF;

  -- Validate clock-in exists
  SELECT * INTO v_clock_in
  FROM attendance_events
  WHERE shift_id = p_shift_id
  AND event_type = 'CLOCK_IN';

  IF v_clock_in IS NULL THEN
    v_validation_errors := array_append(v_validation_errors, 'Clock-in missing');
  END IF;

  -- Validate clock-out exists
  SELECT * INTO v_clock_out
  FROM attendance_events
  WHERE shift_id = p_shift_id
  AND event_type = 'CLOCK_OUT';

  IF v_clock_out IS NULL THEN
    v_validation_errors := array_append(v_validation_errors, 'Clock-out missing');
  END IF;

  -- Validate duration is non-zero
  IF v_clock_in IS NOT NULL AND v_clock_out IS NOT NULL THEN
    v_duration_minutes := EXTRACT(EPOCH FROM (v_clock_out.timestamp - v_clock_in.timestamp)) / 60;
    
    IF v_duration_minutes <= 0 THEN
      v_validation_errors := array_append(v_validation_errors, 'Duration must be greater than zero');
    END IF;
  END IF;

  -- If validation errors, block closure
  IF array_length(v_validation_errors, 1) > 0 THEN
    RETURN json_build_object(
      'success', false,
      'can_close', false,
      'validation_errors', v_validation_errors,
      'message', 'Shift cannot be closed: ' || array_to_string(v_validation_errors, ', ')
    );
  END IF;

  -- Close shift
  UPDATE shifts
  SET status = 'COMPLETED',
      updated_at = now()
  WHERE id = p_shift_id;

  RETURN json_build_object(
    'success', true,
    'can_close', true,
    'duration_minutes', v_duration_minutes,
    'message', 'Shift closed successfully'
  );
END;
$$;

-- Function: seal_shift
-- Seals a shift, making attendance immutable
CREATE OR REPLACE FUNCTION seal_shift(
  p_shift_id uuid
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
  v_validation_errors text[] := '{}';
  v_sealed_count integer;
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

  -- Only supervisors and admins can seal shifts
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions: Only supervisors and admins can seal shifts';
  END IF;

  -- Get shift
  SELECT * INTO v_shift
  FROM shifts
  WHERE id = p_shift_id;

  IF v_shift IS NULL THEN
    RAISE EXCEPTION 'Shift not found';
  END IF;

  -- Validate shift is completed
  IF v_shift.status != 'COMPLETED' THEN
    v_validation_errors := array_append(v_validation_errors, 'Shift must be closed before sealing');
  END IF;

  -- Check if already sealed
  SELECT COUNT(*) INTO v_sealed_count
  FROM attendance_events
  WHERE shift_id = p_shift_id
  AND is_sealed = true;

  IF v_sealed_count > 0 THEN
    RAISE EXCEPTION 'Shift is already sealed';
  END IF;

  -- If validation errors, block sealing
  IF array_length(v_validation_errors, 1) > 0 THEN
    RETURN json_build_object(
      'success', false,
      'can_seal', false,
      'validation_errors', v_validation_errors,
      'message', 'Shift cannot be sealed: ' || array_to_string(v_validation_errors, ', ')
    );
  END IF;

  -- Seal all attendance events for this shift
  UPDATE attendance_events
  SET is_sealed = true
  WHERE shift_id = p_shift_id;

  -- Update shift
  UPDATE shifts
  SET is_tentative = false,
      updated_at = now()
  WHERE id = p_shift_id;

  -- Audit seal action
  INSERT INTO attendance_audit (
    shift_id,
    actor_id,
    actor_role,
    event_type,
    timestamp,
    reason,
    metadata
  ) VALUES (
    p_shift_id,
    v_user_id,
    v_user_role,
    'SEAL',
    now(),
    'Shift sealed for payroll/billing',
    jsonb_build_object('sealed_by', v_user_id)
  );

  RETURN json_build_object(
    'success', true,
    'can_seal', true,
    'message', 'Shift sealed successfully - attendance is now immutable'
  );
END;
$$;

-- Function: create_manual_attendance_override
-- Creates a manual correction to attendance
CREATE OR REPLACE FUNCTION create_manual_attendance_override(
  p_shift_id uuid,
  p_override_type text,
  p_reason text,
  p_attendance_event_id uuid DEFAULT NULL,
  p_corrected_data jsonb DEFAULT '{}'::jsonb
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
  v_event record;
  v_before_value jsonb;
  v_override_id uuid;
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

  -- Only supervisors and admins can create overrides
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions: Only supervisors and admins can create manual overrides';
  END IF;

  -- Reason is mandatory
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'Reason is mandatory for manual overrides';
  END IF;

  -- Get shift
  SELECT * INTO v_shift
  FROM shifts
  WHERE id = p_shift_id;

  IF v_shift IS NULL THEN
    RAISE EXCEPTION 'Shift not found';
  END IF;

  -- Get event if provided
  IF p_attendance_event_id IS NOT NULL THEN
    SELECT * INTO v_event
    FROM attendance_events
    WHERE id = p_attendance_event_id;

    IF v_event IS NULL THEN
      RAISE EXCEPTION 'Attendance event not found';
    END IF;

    v_before_value := to_jsonb(v_event);
  END IF;

  -- Create override record
  INSERT INTO attendance_overrides (
    attendance_event_id,
    shift_id,
    performed_by,
    performed_by_role,
    override_type,
    reason,
    before_value,
    after_value
  ) VALUES (
    p_attendance_event_id,
    p_shift_id,
    v_user_id,
    v_user_role,
    p_override_type,
    p_reason,
    v_before_value,
    p_corrected_data
  )
  RETURNING id INTO v_override_id;

  -- Audit override
  INSERT INTO attendance_audit (
    shift_id,
    actor_id,
    actor_role,
    event_type,
    attendance_event_id,
    timestamp,
    reason,
    metadata
  ) VALUES (
    p_shift_id,
    v_user_id,
    v_user_role,
    'OVERRIDE',
    p_attendance_event_id,
    now(),
    p_reason,
    jsonb_build_object(
      'override_id', v_override_id,
      'override_type', p_override_type,
      'before_value', v_before_value,
      'after_value', p_corrected_data
    )
  );

  RETURN json_build_object(
    'success', true,
    'override_id', v_override_id,
    'message', 'Manual override created successfully'
  );
END;
$$;

-- Function: get_shift_overrides
-- Gets all overrides for a shift
CREATE OR REPLACE FUNCTION get_shift_overrides(
  p_shift_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_overrides json;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', ao.id,
      'override_type', ao.override_type,
      'reason', ao.reason,
      'performed_by', up.full_name,
      'performed_by_role', ao.performed_by_role,
      'before_value', ao.before_value,
      'after_value', ao.after_value,
      'created_at', ao.created_at
    ) ORDER BY ao.created_at DESC
  )
  INTO v_overrides
  FROM attendance_overrides ao
  JOIN user_profiles up ON up.id = ao.performed_by
  WHERE ao.shift_id = p_shift_id;

  RETURN json_build_object(
    'success', true,
    'overrides', COALESCE(v_overrides, '[]'::json),
    'override_count', COALESCE(jsonb_array_length(v_overrides::jsonb), 0)
  );
END;
$$;
