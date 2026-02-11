/*
  # Add Shift Overlap Enforcement

  ## Purpose
  Enforce no overlapping active shifts per caregiver and per resident

  ## Changes
  1. Create function to check caregiver shift overlap
  2. Create function to check resident shift overlap
  3. Update assign_shift_as_supervisor to enforce overlap rules

  ## Rules
  - Caregiver cannot have overlapping active shifts (SCHEDULED, IN_PROGRESS)
  - Resident cannot have multiple overlapping shifts from different caregivers
  - Cancelled/completed shifts are ignored

  ## Security
  - Prevents double-booking caregivers
  - Prevents conflicting resident assignments
  - Maintains data integrity
*/

-- Function to check caregiver shift overlap
CREATE OR REPLACE FUNCTION check_caregiver_shift_overlap(
  p_caregiver_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_exclude_shift_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_overlap_count integer;
BEGIN
  SELECT COUNT(*) INTO v_overlap_count
  FROM shifts
  WHERE caregiver_id = p_caregiver_id
    AND status IN ('SCHEDULED', 'IN_PROGRESS')
    AND (p_exclude_shift_id IS NULL OR id != p_exclude_shift_id)
    AND (
      (start_time, end_time) OVERLAPS (p_start_time, p_end_time)
    );

  RETURN v_overlap_count > 0;
END;
$$;

-- Function to check resident shift overlap
CREATE OR REPLACE FUNCTION check_resident_shift_overlap(
  p_resident_id uuid,
  p_start_time timestamptz,
  p_end_time timestamptz,
  p_exclude_shift_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_overlap_count integer;
BEGIN
  SELECT COUNT(*) INTO v_overlap_count
  FROM shift_resident_assignments sra
  JOIN shifts s ON sra.shift_id = s.id
  WHERE sra.resident_id = p_resident_id
    AND s.status IN ('SCHEDULED', 'IN_PROGRESS')
    AND (p_exclude_shift_id IS NULL OR s.id != p_exclude_shift_id)
    AND (
      (s.start_time, s.end_time) OVERLAPS (p_start_time, p_end_time)
    );

  RETURN v_overlap_count > 0;
END;
$$;

-- Update assign_shift_as_supervisor to enforce overlap rules
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
  v_has_caregiver_overlap boolean;
  v_has_resident_overlap boolean;
  v_overlapping_resident_id uuid;
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

  -- Check for caregiver shift overlap
  v_has_caregiver_overlap := check_caregiver_shift_overlap(
    p_caregiver_id,
    v_start_timestamp,
    v_end_timestamp
  );

  IF v_has_caregiver_overlap THEN
    RAISE EXCEPTION 'SHIFT_OVERLAP: Caregiver % already has a shift during this time period', p_caregiver_id;
  END IF;

  -- Check for resident shift overlap
  FOREACH v_resident_id IN ARRAY p_resident_ids
  LOOP
    v_has_resident_overlap := check_resident_shift_overlap(
      v_resident_id,
      v_start_timestamp,
      v_end_timestamp
    );

    IF v_has_resident_overlap THEN
      RAISE EXCEPTION 'SHIFT_OVERLAP: Resident % already has an assigned shift during this time period', v_resident_id;
    END IF;
  END LOOP;

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

GRANT EXECUTE ON FUNCTION check_caregiver_shift_overlap TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_resident_shift_overlap TO authenticated, anon;

COMMENT ON FUNCTION check_caregiver_shift_overlap IS
'Check if caregiver has overlapping active shifts in the specified time range';

COMMENT ON FUNCTION check_resident_shift_overlap IS
'Check if resident has overlapping shift assignments in the specified time range';

COMMENT ON FUNCTION assign_shift_as_supervisor IS
'Supervisor assigns shift with overlap enforcement, no double-booking of caregivers or residents';
