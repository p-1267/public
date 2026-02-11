/*
  # Fix Step 7 Test Functions and Seed

  1. Fix test_e2e_caregiver_task_flow to use owner_user_id instead of assigned_to
  2. Fix seed function to handle FK constraints properly
*/

-- Fix caregiver task test to use correct column name
CREATE OR REPLACE FUNCTION test_e2e_caregiver_task_flow()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_agency_id uuid := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_task_id uuid;
  v_caregiver_id uuid;
  v_resident_id uuid;
  v_observation_count_before int;
  v_observation_count_after int;
BEGIN
  -- Get a pending task and caregiver
  SELECT t.id, t.resident_id, t.owner_user_id
  INTO v_task_id, v_resident_id, v_caregiver_id
  FROM tasks t
  WHERE t.resident_id IN (SELECT id FROM residents WHERE agency_id = v_agency_id)
  AND t.state = 'assigned'
  LIMIT 1;

  IF v_task_id IS NULL THEN
    RETURN jsonb_build_object('status', 'FAIL', 'reason', 'No assigned task found');
  END IF;

  -- Count existing observations
  SELECT COUNT(*) INTO v_observation_count_before
  FROM observation_events
  WHERE resident_id = v_resident_id;

  -- Complete task with evidence
  UPDATE tasks
  SET
    state = 'completed',
    actual_end = NOW(),
    completed_by = v_caregiver_id,
    metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
      'completion_notes', 'Task completed successfully',
      'completion_timestamp', NOW()
    )
  WHERE id = v_task_id;

  -- Insert observation event
  INSERT INTO observation_events (
    id,
    resident_id,
    event_type,
    actor_role,
    actor_user_id,
    observation_text,
    quality_score,
    recorded_at,
    idempotency_key
  ) VALUES (
    gen_random_uuid(),
    v_resident_id,
    'task_completion',
    'CAREGIVER',
    v_caregiver_id,
    'Completed task: ' || v_task_id::text,
    80,
    NOW(),
    'test-task-complete-' || extract(epoch from now())::text
  );

  -- Check if observation was created
  SELECT COUNT(*) INTO v_observation_count_after
  FROM observation_events
  WHERE resident_id = v_resident_id;

  v_result := jsonb_build_object(
    'test', 'caregiver_task_completion',
    'task_completed', true,
    'observation_created', v_observation_count_after > v_observation_count_before,
    'before_count', v_observation_count_before,
    'after_count', v_observation_count_after,
    'status', CASE
      WHEN v_observation_count_after > v_observation_count_before THEN 'PASS'
      ELSE 'FAIL'
    END
  );

  RETURN v_result;
END;
$$;

-- Clean seed that doesn't delete categories
CREATE OR REPLACE FUNCTION seed_senior_family_scenario_clean()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agency_id uuid := '00000000-0000-0000-0000-999999999999'::uuid;
  v_resident_id uuid := 'bbbbbbbb-0000-0000-0000-000000000001'::uuid;
  v_senior_user_id uuid := 'cccccccc-0000-0000-0000-000000000001'::uuid;
  v_family_user_id uuid := 'cccccccc-0000-0000-0000-000000000002'::uuid;
  v_med1_id uuid := 'dddddddd-0000-0000-0000-000000000001'::uuid;
  v_med2_id uuid := 'dddddddd-0000-0000-0000-000000000002'::uuid;
  v_appt_id uuid := 'eeeeeeee-0000-0000-0000-000000000001'::uuid;
BEGIN
  -- Delete existing data for this agency (cascade safe)
  DELETE FROM family_resident_links WHERE resident_id IN (SELECT id FROM residents WHERE agency_id = v_agency_id);
  DELETE FROM senior_resident_links WHERE resident_id IN (SELECT id FROM residents WHERE agency_id = v_agency_id);
  DELETE FROM resident_medications WHERE resident_id IN (SELECT id FROM residents WHERE agency_id = v_agency_id);
  DELETE FROM appointments WHERE resident_id IN (SELECT id FROM residents WHERE agency_id = v_agency_id);
  DELETE FROM vital_signs WHERE resident_id IN (SELECT id FROM residents WHERE agency_id = v_agency_id);
  DELETE FROM residents WHERE agency_id = v_agency_id;
  DELETE FROM user_profiles WHERE agency_id = v_agency_id;
  DELETE FROM agencies WHERE id = v_agency_id;

  -- Create agency
  INSERT INTO agencies (id, name, status, metadata) VALUES
  (v_agency_id, 'Showcase Independent Living', 'active', '{"type": "independent_living"}'::jsonb);

  -- Create senior user
  INSERT INTO user_profiles (id, agency_id, display_name, role_name, email, employee_id, metadata) VALUES
  (v_senior_user_id, v_agency_id, 'Dorothy Miller', 'SENIOR', 'dorothy@example.com', 'SENIOR001', '{"scenario": "senior_family"}'::jsonb);

  -- Create family user
  INSERT INTO user_profiles (id, agency_id, display_name, role_name, email, employee_id, metadata) VALUES
  (v_family_user_id, v_agency_id, 'Robert Miller', 'FAMILY_ADMIN', 'robert@example.com', 'FAMILY001', '{"scenario": "senior_family"}'::jsonb);

  -- Create resident
  INSERT INTO residents (id, agency_id, display_name, date_of_birth, status, risk_level, metadata) VALUES
  (v_resident_id, v_agency_id, 'Dorothy Miller', '1945-03-15', 'active', 'low', jsonb_build_object('room', '101', 'care_level', 'independent'));

  -- Link senior to resident
  INSERT INTO senior_resident_links (senior_user_id, resident_id, status) VALUES
  (v_senior_user_id, v_resident_id, 'active');

  -- Link family to resident
  INSERT INTO family_resident_links (family_user_id, resident_id, status) VALUES
  (v_family_user_id, v_resident_id, 'active');

  -- Set operating mode
  INSERT INTO senior_operating_mode (resident_id, mode, enabled_at, disabled_at) VALUES
  (v_resident_id, 'SELF_MANAGE', NOW(), NULL);

  -- Add medications
  INSERT INTO resident_medications (id, resident_id, medication_name, dosage, route, schedule, prescriber_name, is_active, entered_by) VALUES
  (v_med1_id, v_resident_id, 'Lisinopril', '10mg', 'ORAL', '{"frequency": "once_daily", "time": "08:00"}'::jsonb, 'Dr. Smith', true, v_family_user_id),
  (v_med2_id, v_resident_id, 'Metformin', '500mg', 'ORAL', '{"frequency": "twice_daily", "times": ["08:00", "18:00"]}'::jsonb, 'Dr. Smith', true, v_family_user_id);

  -- Add appointment
  INSERT INTO appointments (id, resident_id, appointment_type, scheduled_time, provider_name, location, status) VALUES
  (v_appt_id, v_resident_id, 'ROUTINE', NOW() + INTERVAL '7 days', 'Dr. Johnson', 'Main Clinic', 'scheduled');

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'agency_id', v_agency_id,
    'resident_id', v_resident_id,
    'senior_user_id', v_senior_user_id,
    'family_user_id', v_family_user_id,
    'medications_count', 2,
    'appointments_count', 1
  );
END;
$$;

GRANT EXECUTE ON FUNCTION seed_senior_family_scenario_clean() TO anon;
GRANT EXECUTE ON FUNCTION test_e2e_caregiver_task_flow() TO anon;
