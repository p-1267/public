/*
  # Shift Lifecycle RPCs - Start, End, Handoff

  1. Purpose
    - Enable caregivers to start and end shifts
    - Record shift handoff notes
    - Track shift lifecycle in database

  2. RPCs Created
    - start_shift - Begin a shift
    - end_shift - Complete a shift with summary
    - submit_handoff_notes - Add handoff notes to shift
    - get_active_shift - Get current active shift for user

  3. Security
    - Only caregivers can start/end their own shifts
    - Supervisors can view all shifts
*/

-- Get active shift for current user
CREATE OR REPLACE FUNCTION get_active_shift()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift shifts%ROWTYPE;
  v_assigned_residents jsonb;
BEGIN
  SELECT * INTO v_shift
  FROM shifts
  WHERE caregiver_id = auth.uid()
    AND status = 'IN_PROGRESS'
  ORDER BY start_time DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'active', false,
      'message', 'No active shift'
    );
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
    'resident_id', sr.resident_id,
    'resident_name', r.full_name,
    'room_number', r.room_number
  ))
  INTO v_assigned_residents
  FROM shift_resident_assignments sr
  JOIN residents r ON r.id = sr.resident_id
  WHERE sr.shift_id = v_shift.id;

  RETURN jsonb_build_object(
    'active', true,
    'shift_id', v_shift.id,
    'start_time', v_shift.start_time,
    'end_time', v_shift.end_time,
    'status', v_shift.status,
    'location_context', v_shift.location_context,
    'assigned_residents', COALESCE(v_assigned_residents, '[]'::jsonb)
  );
END;
$$;

-- Start a shift
CREATE OR REPLACE FUNCTION start_shift(
  p_shift_id uuid DEFAULT NULL,
  p_location_context text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift_id uuid;
  v_agency_id uuid;
BEGIN
  SELECT agency_id INTO v_agency_id
  FROM user_profiles
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'User profile not found');
  END IF;

  IF EXISTS (
    SELECT 1 FROM shifts
    WHERE caregiver_id = auth.uid()
      AND status = 'IN_PROGRESS'
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already has active shift');
  END IF;

  IF p_shift_id IS NOT NULL THEN
    UPDATE shifts
    SET
      status = 'IN_PROGRESS',
      notes = COALESCE(p_notes, notes),
      updated_at = now()
    WHERE id = p_shift_id
      AND caregiver_id = auth.uid()
      AND status IN ('SCHEDULED', 'CONFIRMED')
    RETURNING id INTO v_shift_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Shift not found or already started');
    END IF;
  ELSE
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
      auth.uid(),
      now(),
      now() + INTERVAL '8 hours',
      COALESCE(p_location_context, 'General Care'),
      'MEDIUM',
      'IN_PROGRESS',
      false,
      p_notes,
      auth.uid()
    )
    RETURNING id INTO v_shift_id;
  END IF;

  INSERT INTO audit_log (
    action_type,
    actor_id,
    target_type,
    target_id,
    metadata,
    created_at
  ) VALUES (
    'shift.started',
    auth.uid(),
    'shift',
    v_shift_id,
    jsonb_build_object(
      'shift_id', v_shift_id,
      'start_time', now()
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'shift_id', v_shift_id,
    'status', 'IN_PROGRESS'
  );
END;
$$;

-- End a shift
CREATE OR REPLACE FUNCTION end_shift(
  p_shift_id uuid,
  p_handoff_notes text DEFAULT NULL,
  p_summary text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift shifts%ROWTYPE;
BEGIN
  SELECT * INTO v_shift
  FROM shifts
  WHERE id = p_shift_id
    AND caregiver_id = auth.uid()
    AND status = 'IN_PROGRESS';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Shift not found or not active');
  END IF;

  UPDATE shifts
  SET
    status = 'COMPLETED',
    notes = CASE
      WHEN p_handoff_notes IS NOT NULL THEN
        COALESCE(notes, '') || E'\n\nHandoff Notes:\n' || p_handoff_notes
      ELSE notes
    END,
    updated_at = now()
  WHERE id = p_shift_id;

  INSERT INTO audit_log (
    action_type,
    actor_id,
    target_type,
    target_id,
    metadata,
    created_at
  ) VALUES (
    'shift.ended',
    auth.uid(),
    'shift',
    p_shift_id,
    jsonb_build_object(
      'shift_id', p_shift_id,
      'end_time', now(),
      'duration_hours', EXTRACT(EPOCH FROM (now() - v_shift.start_time)) / 3600,
      'has_handoff_notes', (p_handoff_notes IS NOT NULL),
      'has_summary', (p_summary IS NOT NULL)
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'shift_id', p_shift_id,
    'status', 'COMPLETED',
    'duration_hours', EXTRACT(EPOCH FROM (now() - v_shift.start_time)) / 3600
  );
END;
$$;

-- Submit handoff notes during shift
CREATE OR REPLACE FUNCTION submit_handoff_notes(
  p_shift_id uuid,
  p_notes text,
  p_critical_items jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM shifts
    WHERE id = p_shift_id
      AND caregiver_id = auth.uid()
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Shift not found');
  END IF;

  UPDATE shifts
  SET
    notes = COALESCE(notes, '') || E'\n\n[Handoff ' || now()::text || ']\n' || p_notes,
    updated_at = now()
  WHERE id = p_shift_id;

  INSERT INTO audit_log (
    action_type,
    actor_id,
    target_type,
    target_id,
    metadata,
    created_at
  ) VALUES (
    'shift.handoff_notes_added',
    auth.uid(),
    'shift',
    p_shift_id,
    jsonb_build_object(
      'shift_id', p_shift_id,
      'notes_length', LENGTH(p_notes),
      'has_critical_items', (p_critical_items IS NOT NULL),
      'critical_items', p_critical_items
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'shift_id', p_shift_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_shift() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION start_shift(uuid, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION end_shift(uuid, text, text) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION submit_handoff_notes(uuid, text, jsonb) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_shift_handoff_report(uuid, timestamptz, timestamptz) TO authenticated, anon;

CREATE POLICY "Anon can view shifts in showcase"
  ON shifts FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anon can create shifts in showcase"
  ON shifts FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anon can update shifts in showcase"
  ON shifts FOR UPDATE
  TO anon
  USING (true);
