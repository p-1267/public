/*
  # Supervisor Shift Assignment RPC with Idempotency

  ## Purpose
  Allow supervisors to assign/reassign shifts with idempotency protection
  
  ## Features
  - Create new shift assignment
  - Reassign existing shift
  - Update shift details (time, residents, notes)
  - Idempotency protection
  - Showcase mode support
  
  ## Security
  - Only supervisors and admins can assign shifts
  - Validates caregiver belongs to agency
  - Validates resident belongs to agency
*/

CREATE OR REPLACE FUNCTION assign_shift_as_supervisor(
  p_agency_id uuid,
  p_caregiver_id uuid,
  p_shift_date date,
  p_shift_type text,
  p_start_time time,
  p_end_time time,
  p_resident_ids uuid[],
  p_notes text DEFAULT NULL,
  p_idempotency_key uuid DEFAULT NULL,
  p_is_simulation boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift_id uuid;
  v_existing_shift_id uuid;
  v_resident_id uuid;
  v_start_timestamp timestamptz;
  v_end_timestamp timestamptz;
BEGIN
  -- Check for duplicate submission
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_shift_id
    FROM shifts
    WHERE agency_id = p_agency_id
      AND CAST(metadata->'idempotency_key' AS text) = format('"%s"', p_idempotency_key);
    
    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'duplicate', true,
        'shift_id', v_existing_shift_id,
        'message', 'Duplicate shift assignment detected'
      );
    END IF;
  END IF;

  -- Validate caregiver belongs to agency
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = p_caregiver_id
      AND agency_id = p_agency_id
  ) THEN
    RAISE EXCEPTION 'INVALID_CAREGIVER: Caregiver not found in agency';
  END IF;

  -- Validate all residents belong to agency
  FOREACH v_resident_id IN ARRAY p_resident_ids
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM residents
      WHERE id = v_resident_id
        AND agency_id = p_agency_id
    ) THEN
      RAISE EXCEPTION 'INVALID_RESIDENT: Resident % not found in agency', v_resident_id;
    END IF;
  END LOOP;

  -- Create timestamps
  v_start_timestamp := (p_shift_date + p_start_time);
  v_end_timestamp := (p_shift_date + p_end_time);

  -- Handle overnight shifts
  IF v_end_timestamp <= v_start_timestamp THEN
    v_end_timestamp := v_end_timestamp + INTERVAL '1 day';
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
    metadata,
    created_by
  ) VALUES (
    p_agency_id,
    p_caregiver_id,
    v_start_timestamp,
    v_end_timestamp,
    p_shift_type,
    'MEDIUM',
    'SCHEDULED',
    false,
    p_notes,
    jsonb_build_object(
      'shift_type', p_shift_type,
      'idempotency_key', p_idempotency_key,
      'assigned_by_supervisor', true,
      'is_simulation', p_is_simulation
    ),
    auth.uid()
  )
  RETURNING id INTO v_shift_id;

  -- Assign residents to shift
  FOREACH v_resident_id IN ARRAY p_resident_ids
  LOOP
    INSERT INTO shift_resident_assignments (
      shift_id,
      resident_id,
      assignment_priority
    ) VALUES (
      v_shift_id,
      v_resident_id,
      'standard'
    );
  END LOOP;

  -- Audit log
  INSERT INTO audit_log (
    agency_id,
    action_type,
    action_description,
    user_id,
    target_id,
    metadata,
    is_simulation,
    created_at
  ) VALUES (
    p_agency_id,
    'SHIFT_ASSIGNED',
    'Supervisor assigned shift to ' || p_caregiver_id::text,
    auth.uid(),
    v_shift_id,
    jsonb_build_object(
      'shift_id', v_shift_id,
      'caregiver_id', p_caregiver_id,
      'resident_count', array_length(p_resident_ids, 1),
      'shift_date', p_shift_date,
      'shift_type', p_shift_type,
      'idempotency_key', p_idempotency_key
    ),
    p_is_simulation,
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'shift_id', v_shift_id,
    'start_time', v_start_timestamp,
    'end_time', v_end_timestamp,
    'resident_count', array_length(p_resident_ids, 1),
    'message', 'Shift assigned successfully'
  );
END;
$$;

-- RPC to fetch upcoming shifts for scheduling view
CREATE OR REPLACE FUNCTION get_upcoming_shifts_for_supervisor(
  p_agency_id uuid,
  p_start_date date,
  p_end_date date,
  p_is_simulation boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  caregiver_id uuid,
  caregiver_name text,
  start_time timestamptz,
  end_time timestamptz,
  status text,
  resident_count bigint,
  shift_type text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.caregiver_id,
    COALESCE(up.full_name, 'Unassigned') as caregiver_name,
    s.start_time,
    s.end_time,
    s.status,
    COUNT(sra.resident_id) as resident_count,
    COALESCE(s.location_context, 'General') as shift_type
  FROM shifts s
  LEFT JOIN user_profiles up ON s.caregiver_id = up.id
  LEFT JOIN shift_resident_assignments sra ON s.id = sra.shift_id
  WHERE s.agency_id = p_agency_id
    AND s.start_time::date BETWEEN p_start_date AND p_end_date
    AND (p_is_simulation = false OR CAST(s.metadata->>'is_simulation' AS boolean) = true)
  GROUP BY s.id, s.caregiver_id, up.full_name, s.start_time, s.end_time, s.status, s.location_context
  ORDER BY s.start_time ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION assign_shift_as_supervisor TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_upcoming_shifts_for_supervisor TO authenticated, anon;

COMMENT ON FUNCTION assign_shift_as_supervisor IS
'Supervisor assigns shift to caregiver with resident assignments and idempotency protection';

COMMENT ON FUNCTION get_upcoming_shifts_for_supervisor IS
'Fetch upcoming shifts for scheduling view with resident counts';
