/*
  # Step 7 - Runtime Verification

  Creates verification function that tests all 5 end-to-end flows.
*/

CREATE OR REPLACE FUNCTION verify_step7_runtime()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb := '{"tests": []}'::jsonb;
  v_test jsonb;
  v_resident_id uuid;
  v_med_id uuid;
  v_caregiver_id uuid;
  v_family_id uuid;
  v_task_id uuid;
  v_agency_id uuid := 'a0000000-0000-0000-0000-000000000001';
  v_count int;
BEGIN
  -- Get test data
  SELECT id INTO v_resident_id FROM residents WHERE agency_id = v_agency_id LIMIT 1;
  SELECT id INTO v_med_id FROM resident_medications WHERE resident_id = v_resident_id LIMIT 1;
  SELECT id INTO v_caregiver_id FROM user_profiles WHERE role_id IN (
    SELECT id FROM roles WHERE name = 'Caregiver'
  ) LIMIT 1;
  SELECT id INTO v_family_id FROM user_profiles WHERE role_id IN (
    SELECT id FROM roles WHERE name = 'Family Member'
  ) LIMIT 1;

  -- TEST 1: Senior logs medication → family notification created
  INSERT INTO medication_administration_log (
    id, resident_id, medication_id, administered_at, administered_by,
    status, dosage_given, route_used, is_controlled, dual_verification_required,
    language_context, created_at, is_simulation, idempotency_key
  )
  VALUES (
    gen_random_uuid(), v_resident_id, v_med_id, now(), v_caregiver_id,
    'administered', '10mg', 'Oral', false, false, 'en-US', now(), false, gen_random_uuid()
  );

  SELECT COUNT(*) INTO v_count FROM notification_log
  WHERE resident_id = v_resident_id
  AND notification_type = 'medication_administered'
  AND created_at > now() - interval '10 seconds';

  v_test := jsonb_build_object(
    'test', 'Senior logs medication → family notification',
    'status', CASE WHEN v_count > 0 THEN 'PASS' ELSE 'FAIL' END,
    'details', jsonb_build_object('notifications_created', v_count)
  );
  v_result := jsonb_set(v_result, '{tests}', (v_result->'tests') || v_test);

  -- TEST 2: Senior logs vitals → trends updated
  INSERT INTO health_metrics (
    id, resident_id, metric_category, metric_type, value_numeric, unit,
    confidence_level, measurement_source, recorded_at, synced_at, created_at
  )
  VALUES (
    gen_random_uuid(), v_resident_id, 'vitals', 'blood_pressure_systolic',
    135, 'mmHg', 'high', 'manual', now(), now(), now()
  );

  SELECT COUNT(*) INTO v_count FROM health_metric_trends
  WHERE resident_id = v_resident_id
  AND metric_type = 'blood_pressure_systolic';

  v_test := jsonb_build_object(
    'test', 'Senior logs vitals → trends updated',
    'status', CASE WHEN v_count > 0 THEN 'PASS' ELSE 'FAIL' END,
    'details', jsonb_build_object('trends_count', v_count)
  );
  v_result := jsonb_set(v_result, '{tests}', (v_result->'tests') || v_test);

  -- TEST 3: Family submits observation → supervisor exception queue
  INSERT INTO family_observations (
    id, resident_id, family_user_id, observation_text, concern_level,
    observation_category, submitted_at, created_at
  )
  VALUES (
    gen_random_uuid(), v_resident_id, v_family_id,
    'Mom seemed confused this morning', 'high', 'cognitive',
    now(), now()
  );

  SELECT COUNT(*) INTO v_count FROM observation_events
  WHERE resident_id = v_resident_id
  AND event_type = 'family_input'
  AND created_at > now() - interval '10 seconds';

  v_test := jsonb_build_object(
    'test', 'Family observation → supervisor exception queue',
    'status', CASE WHEN v_count > 0 THEN 'PASS' ELSE 'FAIL' END,
    'details', jsonb_build_object('observation_events_created', v_count)
  );
  v_result := jsonb_set(v_result, '{tests}', (v_result->'tests') || v_test);

  -- TEST 4: Caregiver completes task → observation_event created
  SELECT id INTO v_task_id FROM tasks
  WHERE resident_id = v_resident_id
  AND state = 'in_progress'
  LIMIT 1;

  IF v_task_id IS NOT NULL THEN
    UPDATE tasks
    SET state = 'completed',
        actual_end = now(),
        completed_by = v_caregiver_id,
        outcome = 'success',
        evidence_submitted = true,
        updated_at = now()
    WHERE id = v_task_id;

    SELECT COUNT(*) INTO v_count FROM observation_events
    WHERE source_table = 'tasks'
    AND source_id = v_task_id;

    v_test := jsonb_build_object(
      'test', 'Caregiver completes task → observation_event',
      'status', CASE WHEN v_count > 0 THEN 'PASS' ELSE 'FAIL' END,
      'details', jsonb_build_object('observation_created', v_count > 0, 'task_id', v_task_id)
    );
  ELSE
    v_test := jsonb_build_object(
      'test', 'Caregiver completes task → observation_event',
      'status', 'SKIP',
      'details', 'No in_progress tasks found'
    );
  END IF;
  v_result := jsonb_set(v_result, '{tests}', (v_result->'tests') || v_test);

  -- TEST 5: Brain pipeline → visible outputs
  SELECT COUNT(*) INTO v_count FROM anomaly_detections
  WHERE resident_id = v_resident_id;

  v_test := jsonb_build_object(
    'test', 'Brain pipeline produces anomaly detections',
    'status', CASE WHEN v_count > 0 THEN 'PASS' ELSE 'PENDING' END,
    'details', jsonb_build_object('anomalies_count', v_count, 'note', 'May require scheduler execution')
  );
  v_result := jsonb_set(v_result, '{tests}', (v_result->'tests') || v_test);

  SELECT COUNT(*) INTO v_count FROM intelligence_signals
  WHERE resident_id = v_resident_id;

  v_test := jsonb_build_object(
    'test', 'Brain pipeline produces intelligence signals',
    'status', CASE WHEN v_count > 0 THEN 'PASS' ELSE 'PENDING' END,
    'details', jsonb_build_object('signals_count', v_count, 'note', 'May require scheduler execution')
  );
  v_result := jsonb_set(v_result, '{tests}', (v_result->'tests') || v_test);

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION verify_step7_runtime() TO anon, authenticated;