/*
  # Shift Management RPCs (Phase 23)

  ## Purpose
  RPC functions for creating, updating, and managing shifts.
  All actions validated and audited.

  ## Functions
  1. create_shift - Create new shift with residents
  2. update_shift - Update existing shift
  3. cancel_shift - Cancel a shift
  4. add_resident_to_shift - Add resident to shift
  5. remove_resident_from_shift - Remove resident from shift
  6. get_shifts_by_date_range - Query shifts

  ## Security
  - All functions enforce authorization
  - Only supervisors/admins can manage shifts
  - All changes audited
*/

-- Function: create_shift
-- Creates a new shift with resident assignments
CREATE OR REPLACE FUNCTION create_shift(
  p_caregiver_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_location_context text,
  p_expected_care_intensity text,
  p_resident_assignments jsonb,
  p_notes text DEFAULT NULL
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
  v_shift_id uuid;
  v_resident_ids uuid[] := '{}';
  v_assignment record;
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

  -- Only supervisors and admins can create shifts
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions: Only supervisors and admins can create shifts';
  END IF;

  -- Validate shift times
  IF p_end_time <= p_start_time THEN
    RAISE EXCEPTION 'Shift end time must be after start time';
  END IF;

  -- Validate resident assignments exist and not empty
  IF p_resident_assignments IS NULL OR jsonb_array_length(p_resident_assignments) = 0 THEN
    RAISE EXCEPTION 'At least one resident must be assigned to shift';
  END IF;

  -- Create shift
  INSERT INTO shifts (
    agency_id,
    caregiver_id,
    start_time,
    end_time,
    location_context,
    expected_care_intensity,
    status,
    is_tentative,
    notes,
    created_by
  ) VALUES (
    v_agency_id,
    p_caregiver_id,
    p_start_time,
    p_end_time,
    p_location_context,
    p_expected_care_intensity,
    'SCHEDULED',
    true,
    p_notes,
    v_user_id
  )
  RETURNING id INTO v_shift_id;

  -- Add resident assignments
  FOR v_assignment IN SELECT * FROM jsonb_array_elements(p_resident_assignments)
  LOOP
    INSERT INTO shift_resident_assignments (
      shift_id,
      resident_id,
      care_type,
      estimated_duration_minutes
    ) VALUES (
      v_shift_id,
      (v_assignment.value->>'resident_id')::uuid,
      v_assignment.value->>'care_type',
      (v_assignment.value->>'estimated_duration_minutes')::integer
    );
    
    v_resident_ids := array_append(v_resident_ids, (v_assignment.value->>'resident_id')::uuid);
  END LOOP;

  -- Audit shift creation
  INSERT INTO shift_audit (
    shift_id,
    actor_id,
    action_type,
    before_state,
    after_state,
    affected_residents,
    affected_caregivers
  ) VALUES (
    v_shift_id,
    v_user_id,
    'CREATE',
    NULL,
    jsonb_build_object(
      'caregiver_id', p_caregiver_id,
      'start_time', p_start_time,
      'end_time', p_end_time,
      'location_context', p_location_context,
      'expected_care_intensity', p_expected_care_intensity,
      'residents', p_resident_assignments
    ),
    v_resident_ids,
    ARRAY[p_caregiver_id]
  );

  RETURN json_build_object(
    'success', true,
    'shift_id', v_shift_id,
    'message', 'Shift created successfully'
  );
END;
$$;

-- Function: update_shift
-- Updates an existing shift
CREATE OR REPLACE FUNCTION update_shift(
  p_shift_id uuid,
  p_start_time timestamptz DEFAULT NULL,
  p_end_time timestamptz DEFAULT NULL,
  p_location_context text DEFAULT NULL,
  p_expected_care_intensity text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_existing_shift record;
  v_before_state jsonb;
  v_after_state jsonb;
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

  -- Only supervisors and admins can update shifts
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions: Only supervisors and admins can update shifts';
  END IF;

  -- Get existing shift
  SELECT * INTO v_existing_shift
  FROM shifts
  WHERE id = p_shift_id;

  IF v_existing_shift IS NULL THEN
    RAISE EXCEPTION 'Shift not found';
  END IF;

  -- Validate shift times if provided
  IF (p_start_time IS NOT NULL AND p_end_time IS NOT NULL) AND (p_end_time <= p_start_time) THEN
    RAISE EXCEPTION 'Shift end time must be after start time';
  END IF;

  -- Store before state
  v_before_state := to_jsonb(v_existing_shift);

  -- Update shift
  UPDATE shifts
  SET start_time = COALESCE(p_start_time, start_time),
      end_time = COALESCE(p_end_time, end_time),
      location_context = COALESCE(p_location_context, location_context),
      expected_care_intensity = COALESCE(p_expected_care_intensity, expected_care_intensity),
      notes = COALESCE(p_notes, notes),
      updated_at = now()
  WHERE id = p_shift_id;

  -- Get updated shift
  SELECT to_jsonb(shifts.*) INTO v_after_state
  FROM shifts
  WHERE id = p_shift_id;

  -- Audit shift update
  INSERT INTO shift_audit (
    shift_id,
    actor_id,
    action_type,
    before_state,
    after_state,
    affected_residents,
    affected_caregivers,
    reason
  ) VALUES (
    p_shift_id,
    v_user_id,
    'UPDATE',
    v_before_state,
    v_after_state,
    ARRAY(SELECT resident_id FROM shift_resident_assignments WHERE shift_id = p_shift_id),
    ARRAY[v_existing_shift.caregiver_id],
    p_reason
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Shift updated successfully'
  );
END;
$$;

-- Function: cancel_shift
-- Cancels a shift
CREATE OR REPLACE FUNCTION cancel_shift(
  p_shift_id uuid,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_existing_shift record;
  v_before_state jsonb;
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

  -- Only supervisors and admins can cancel shifts
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions: Only supervisors and admins can cancel shifts';
  END IF;

  -- Get existing shift
  SELECT * INTO v_existing_shift
  FROM shifts
  WHERE id = p_shift_id;

  IF v_existing_shift IS NULL THEN
    RAISE EXCEPTION 'Shift not found';
  END IF;

  IF v_existing_shift.status = 'CANCELLED' THEN
    RAISE EXCEPTION 'Shift is already cancelled';
  END IF;

  -- Store before state
  v_before_state := to_jsonb(v_existing_shift);

  -- Cancel shift
  UPDATE shifts
  SET status = 'CANCELLED',
      updated_at = now()
  WHERE id = p_shift_id;

  -- Audit shift cancellation
  INSERT INTO shift_audit (
    shift_id,
    actor_id,
    action_type,
    before_state,
    after_state,
    affected_residents,
    affected_caregivers,
    reason
  ) VALUES (
    p_shift_id,
    v_user_id,
    'CANCEL',
    v_before_state,
    jsonb_build_object('status', 'CANCELLED'),
    ARRAY(SELECT resident_id FROM shift_resident_assignments WHERE shift_id = p_shift_id),
    ARRAY[v_existing_shift.caregiver_id],
    p_reason
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Shift cancelled successfully'
  );
END;
$$;

-- Function: add_resident_to_shift
-- Adds a resident to an existing shift
CREATE OR REPLACE FUNCTION add_resident_to_shift(
  p_shift_id uuid,
  p_resident_id uuid,
  p_care_type text,
  p_estimated_duration_minutes integer
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

  -- Only supervisors and admins can modify shift assignments
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions: Only supervisors and admins can modify shifts';
  END IF;

  -- Get shift
  SELECT * INTO v_shift
  FROM shifts
  WHERE id = p_shift_id;

  IF v_shift IS NULL THEN
    RAISE EXCEPTION 'Shift not found';
  END IF;

  -- Add resident assignment
  INSERT INTO shift_resident_assignments (
    shift_id,
    resident_id,
    care_type,
    estimated_duration_minutes
  ) VALUES (
    p_shift_id,
    p_resident_id,
    p_care_type,
    p_estimated_duration_minutes
  )
  ON CONFLICT (shift_id, resident_id) DO UPDATE
  SET care_type = EXCLUDED.care_type,
      estimated_duration_minutes = EXCLUDED.estimated_duration_minutes;

  -- Audit assignment
  INSERT INTO shift_audit (
    shift_id,
    actor_id,
    action_type,
    before_state,
    after_state,
    affected_residents,
    affected_caregivers
  ) VALUES (
    p_shift_id,
    v_user_id,
    'UPDATE',
    NULL,
    jsonb_build_object('added_resident', p_resident_id),
    ARRAY[p_resident_id],
    ARRAY[v_shift.caregiver_id]
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Resident added to shift successfully'
  );
END;
$$;

-- Function: remove_resident_from_shift
-- Removes a resident from a shift
CREATE OR REPLACE FUNCTION remove_resident_from_shift(
  p_shift_id uuid,
  p_resident_id uuid
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
  v_assignment_count integer;
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

  -- Only supervisors and admins can modify shift assignments
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'SUPERVISOR', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions: Only supervisors and admins can modify shifts';
  END IF;

  -- Get shift
  SELECT * INTO v_shift
  FROM shifts
  WHERE id = p_shift_id;

  IF v_shift IS NULL THEN
    RAISE EXCEPTION 'Shift not found';
  END IF;

  -- Check assignment count
  SELECT COUNT(*) INTO v_assignment_count
  FROM shift_resident_assignments
  WHERE shift_id = p_shift_id;

  IF v_assignment_count <= 1 THEN
    RAISE EXCEPTION 'Cannot remove last resident from shift. Cancel shift instead.';
  END IF;

  -- Remove resident assignment
  DELETE FROM shift_resident_assignments
  WHERE shift_id = p_shift_id AND resident_id = p_resident_id;

  -- Audit removal
  INSERT INTO shift_audit (
    shift_id,
    actor_id,
    action_type,
    before_state,
    after_state,
    affected_residents,
    affected_caregivers
  ) VALUES (
    p_shift_id,
    v_user_id,
    'UPDATE',
    jsonb_build_object('removed_resident', p_resident_id),
    NULL,
    ARRAY[p_resident_id],
    ARRAY[v_shift.caregiver_id]
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Resident removed from shift successfully'
  );
END;
$$;

-- Function: get_shifts_by_date_range
-- Gets shifts within a date range
CREATE OR REPLACE FUNCTION get_shifts_by_date_range(
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_caregiver_id uuid DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_agency_id uuid;
  v_shifts json;
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
      'id', s.id,
      'caregiver_id', s.caregiver_id,
      'caregiver_name', up.full_name,
      'start_time', s.start_time,
      'end_time', s.end_time,
      'location_context', s.location_context,
      'expected_care_intensity', s.expected_care_intensity,
      'status', s.status,
      'is_tentative', s.is_tentative,
      'notes', s.notes,
      'residents', (
        SELECT json_agg(
          json_build_object(
            'resident_id', sra.resident_id,
            'resident_name', r.full_name,
            'care_type', sra.care_type,
            'estimated_duration_minutes', sra.estimated_duration_minutes
          )
        )
        FROM shift_resident_assignments sra
        JOIN residents r ON r.id = sra.resident_id
        WHERE sra.shift_id = s.id
      )
    ) ORDER BY s.start_time
  )
  INTO v_shifts
  FROM shifts s
  JOIN user_profiles up ON up.id = s.caregiver_id
  WHERE s.agency_id = v_agency_id
  AND s.start_time >= p_start_date
  AND s.end_time <= p_end_date
  AND (p_caregiver_id IS NULL OR s.caregiver_id = p_caregiver_id)
  AND (p_status IS NULL OR s.status = p_status);

  RETURN json_build_object(
    'success', true,
    'shifts', COALESCE(v_shifts, '[]'::json)
  );
END;
$$;
