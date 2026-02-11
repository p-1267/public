/*
  # Appointment & Test Management RPCs

  Create RPC functions for managing appointments and lab tests
*/

-- Create appointment
CREATE OR REPLACE FUNCTION create_appointment(
  p_resident_id uuid,
  p_appointment_type text,
  p_title text,
  p_scheduled_at timestamptz,
  p_provider_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_duration_minutes integer DEFAULT 30,
  p_location text DEFAULT NULL,
  p_provider_name text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_prep_instructions jsonb DEFAULT '[]'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_appointment_id uuid;
  v_instruction jsonb;
BEGIN
  INSERT INTO appointments (
    resident_id, provider_id, appointment_type, title, description,
    scheduled_at, duration_minutes, location, provider_name, notes,
    status, created_by
  ) VALUES (
    p_resident_id, p_provider_id, p_appointment_type, p_title, p_description,
    p_scheduled_at, p_duration_minutes, p_location, p_provider_name, p_notes,
    'SCHEDULED', auth.uid()
  ) RETURNING id INTO v_appointment_id;

  IF jsonb_array_length(p_prep_instructions) > 0 THEN
    FOR v_instruction IN SELECT * FROM jsonb_array_elements(p_prep_instructions)
    LOOP
      INSERT INTO appointment_prep_instructions (
        appointment_id, instruction_type, instruction, priority
      ) VALUES (
        v_appointment_id,
        v_instruction->>'type',
        v_instruction->>'text',
        COALESCE((v_instruction->>'priority')::integer, 1)
      );
    END LOOP;
  END IF;

  INSERT INTO appointment_reminders (appointment_id, remind_at, reminder_type, message)
  VALUES
    (v_appointment_id, p_scheduled_at - interval '1 day', 'ONE_DAY', 'Reminder: You have an appointment tomorrow'),
    (v_appointment_id, p_scheduled_at - interval '2 hours', 'TWO_HOURS', 'Reminder: Your appointment is in 2 hours');

  RETURN v_appointment_id;
END;
$$;

-- Update appointment
CREATE OR REPLACE FUNCTION update_appointment(
  p_appointment_id uuid,
  p_title text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_scheduled_at timestamptz DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE appointments
  SET
    title = COALESCE(p_title, title),
    description = COALESCE(p_description, description),
    scheduled_at = COALESCE(p_scheduled_at, scheduled_at),
    location = COALESCE(p_location, location),
    notes = COALESCE(p_notes, notes),
    status = COALESCE(p_status, status),
    updated_at = now()
  WHERE id = p_appointment_id;

  RETURN FOUND;
END;
$$;

-- Cancel appointment
CREATE OR REPLACE FUNCTION cancel_appointment(
  p_appointment_id uuid,
  p_cancellation_reason text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE appointments
  SET
    status = 'CANCELLED',
    cancellation_reason = p_cancellation_reason,
    cancelled_at = now(),
    updated_at = now()
  WHERE id = p_appointment_id;

  RETURN FOUND;
END;
$$;

-- Reschedule appointment
CREATE OR REPLACE FUNCTION reschedule_appointment(
  p_appointment_id uuid,
  p_new_scheduled_at timestamptz,
  p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_appointment_id uuid;
  v_old_appointment record;
BEGIN
  SELECT * INTO v_old_appointment FROM appointments WHERE id = p_appointment_id;

  UPDATE appointments SET status = 'RESCHEDULED', updated_at = now() WHERE id = p_appointment_id;

  INSERT INTO appointments (
    resident_id, provider_id, appointment_type, title, description,
    scheduled_at, duration_minutes, location, provider_name, notes,
    status, created_by
  ) VALUES (
    v_old_appointment.resident_id, v_old_appointment.provider_id, v_old_appointment.appointment_type,
    v_old_appointment.title, v_old_appointment.description, p_new_scheduled_at,
    v_old_appointment.duration_minutes, v_old_appointment.location, v_old_appointment.provider_name,
    CASE WHEN p_reason IS NOT NULL THEN v_old_appointment.notes || E'\n\nRescheduled: ' || p_reason ELSE v_old_appointment.notes END,
    'SCHEDULED', auth.uid()
  ) RETURNING id INTO v_new_appointment_id;

  UPDATE appointments SET rescheduled_to = v_new_appointment_id WHERE id = p_appointment_id;

  INSERT INTO appointment_prep_instructions (appointment_id, instruction_type, instruction, priority)
  SELECT v_new_appointment_id, instruction_type, instruction, priority
  FROM appointment_prep_instructions WHERE appointment_id = p_appointment_id;

  INSERT INTO appointment_reminders (appointment_id, remind_at, reminder_type, message)
  VALUES
    (v_new_appointment_id, p_new_scheduled_at - interval '1 day', 'ONE_DAY', 'Reminder: You have an appointment tomorrow'),
    (v_new_appointment_id, p_new_scheduled_at - interval '2 hours', 'TWO_HOURS', 'Reminder: Your appointment is in 2 hours');

  RETURN v_new_appointment_id;
END;
$$;

-- Mark running late
CREATE OR REPLACE FUNCTION mark_appointment_running_late(p_appointment_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE appointments SET status = 'RUNNING_LATE', updated_at = now()
  WHERE id = p_appointment_id AND status = 'SCHEDULED';
  RETURN FOUND;
END;
$$;

-- Create lab test
CREATE OR REPLACE FUNCTION create_lab_test(
  p_resident_id uuid,
  p_test_type text,
  p_test_name text,
  p_description text DEFAULT NULL,
  p_ordered_by text DEFAULT NULL,
  p_scheduled_at timestamptz DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_lab_name text DEFAULT NULL,
  p_fasting_required boolean DEFAULT false,
  p_special_prep text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_test_id uuid;
BEGIN
  INSERT INTO lab_tests (
    resident_id, test_type, test_name, description, ordered_by,
    scheduled_at, location, lab_name, fasting_required, special_prep,
    status, created_by
  ) VALUES (
    p_resident_id, p_test_type, p_test_name, p_description, p_ordered_by,
    p_scheduled_at, p_location, p_lab_name, p_fasting_required, p_special_prep,
    CASE WHEN p_scheduled_at IS NOT NULL THEN 'SCHEDULED' ELSE 'ORDERED' END,
    auth.uid()
  ) RETURNING id INTO v_test_id;

  IF p_scheduled_at IS NOT NULL THEN
    INSERT INTO appointment_reminders (test_id, remind_at, reminder_type, message)
    VALUES
      (v_test_id, p_scheduled_at - interval '1 day', 'ONE_DAY', 'Reminder: You have a lab test tomorrow'),
      (v_test_id, p_scheduled_at - interval '2 hours', 'TWO_HOURS', 'Reminder: Your lab test is in 2 hours');
  END IF;

  IF p_fasting_required THEN
    INSERT INTO appointment_prep_instructions (test_id, instruction_type, instruction, priority)
    VALUES (v_test_id, 'FASTING', 'Fasting required - no food or drink (except water) for 8-12 hours before test', 1);
  END IF;

  RETURN v_test_id;
END;
$$;

-- Update lab test
CREATE OR REPLACE FUNCTION update_lab_test(
  p_test_id uuid,
  p_scheduled_at timestamptz DEFAULT NULL,
  p_location text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE lab_tests
  SET
    scheduled_at = COALESCE(p_scheduled_at, scheduled_at),
    location = COALESCE(p_location, location),
    status = COALESCE(p_status, status),
    notes = COALESCE(p_notes, notes),
    updated_at = now()
  WHERE id = p_test_id;
  RETURN FOUND;
END;
$$;

-- Record test result
CREATE OR REPLACE FUNCTION record_test_result(
  p_test_id uuid,
  p_result_summary text,
  p_result_data jsonb DEFAULT NULL,
  p_abnormal_flags text[] DEFAULT NULL,
  p_provider_notes text DEFAULT NULL,
  p_document_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result_id uuid;
BEGIN
  INSERT INTO test_results (
    test_id, result_date, result_summary, result_data,
    abnormal_flags, provider_notes, document_url, created_by
  ) VALUES (
    p_test_id, now(), p_result_summary, p_result_data,
    p_abnormal_flags, p_provider_notes, p_document_url, auth.uid()
  ) RETURNING id INTO v_result_id;

  UPDATE lab_tests
  SET status = 'RESULTS_READY', completed_at = now(), updated_at = now()
  WHERE id = p_test_id;

  RETURN v_result_id;
END;
$$;

-- Get upcoming appointments
CREATE OR REPLACE FUNCTION get_upcoming_appointments(
  p_resident_id uuid,
  p_days_ahead integer DEFAULT 30
)
RETURNS TABLE(
  id uuid, appointment_type text, title text, description text,
  scheduled_at timestamptz, duration_minutes integer, status text,
  location text, provider_name text, notes text, prep_instructions jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.appointment_type, a.title, a.description, a.scheduled_at, a.duration_minutes,
    a.status, a.location, a.provider_name, a.notes,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('type', api.instruction_type, 'text', api.instruction, 'priority', api.priority))
      FROM appointment_prep_instructions api WHERE api.appointment_id = a.id), '[]'::jsonb) as prep_instructions
  FROM appointments a
  WHERE a.resident_id = p_resident_id AND a.status NOT IN ('CANCELLED', 'COMPLETED', 'RESCHEDULED')
    AND a.scheduled_at >= now() AND a.scheduled_at <= now() + (p_days_ahead || ' days')::interval
  ORDER BY a.scheduled_at;
END;
$$;

-- Get upcoming tests
CREATE OR REPLACE FUNCTION get_upcoming_tests(
  p_resident_id uuid,
  p_days_ahead integer DEFAULT 30
)
RETURNS TABLE(
  id uuid, test_type text, test_name text, description text,
  scheduled_at timestamptz, status text, location text, lab_name text,
  fasting_required boolean, special_prep text, prep_instructions jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT lt.id, lt.test_type, lt.test_name, lt.description, lt.scheduled_at, lt.status,
    lt.location, lt.lab_name, lt.fasting_required, lt.special_prep,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('type', api.instruction_type, 'text', api.instruction, 'priority', api.priority))
      FROM appointment_prep_instructions api WHERE api.test_id = lt.id), '[]'::jsonb) as prep_instructions
  FROM lab_tests lt
  WHERE lt.resident_id = p_resident_id AND lt.status NOT IN ('CANCELLED', 'COMPLETED')
    AND (lt.scheduled_at IS NULL OR (lt.scheduled_at >= now() AND lt.scheduled_at <= now() + (p_days_ahead || ' days')::interval))
  ORDER BY COALESCE(lt.scheduled_at, lt.ordered_at);
END;
$$;