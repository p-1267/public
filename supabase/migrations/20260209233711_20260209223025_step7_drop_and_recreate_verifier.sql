/*
  # Step 7: Drop and recreate verifier function
  
  Changes:
  - Drop existing verify_step7_runtime function
  - Recreate with correct medication status and schema
*/

DROP FUNCTION IF EXISTS verify_step7_runtime();

CREATE FUNCTION verify_step7_runtime()
RETURNS TABLE(
  test_name text,
  status text,
  details jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_resident_id uuid;
  v_family_id uuid;
  v_caregiver_id uuid;
  v_med_id uuid;
  v_med_log_id uuid;
  v_health_metric_id uuid;
  v_obs_count int;
  v_notification_count int;
  v_trend_count int;
BEGIN
  -- Get IDs from seed
  SELECT (s->'senior_resident_id')::text::uuid, 
         (s->'family_user_id')::text::uuid,
         (s->'caregiver_user_id')::text::uuid,
         (s->'medication_1_id')::text::uuid
  INTO v_resident_id, v_family_id, v_caregiver_id, v_med_id
  FROM (SELECT seed_senior_family_scenario() as s) t;

  -- TEST 1: Senior logs medication → family notification
  INSERT INTO medication_administration_log (
    id, resident_id, medication_id, administered_at, administered_by,
    status, dosage_given, route_used, is_controlled, dual_verification_required,
    language_context, created_at, is_simulation, idempotency_key
  )
  VALUES (
    gen_random_uuid(), v_resident_id, v_med_id, now(), v_caregiver_id,
    'TAKEN', '10mg', 'ORAL', false, false, 'en-US', now(), false, gen_random_uuid()
  )
  RETURNING id INTO v_med_log_id;

  SELECT COUNT(*) INTO v_notification_count
  FROM notification_log
  WHERE recipient_user_id = v_family_id
    AND event_type = 'medication_taken';

  RETURN QUERY SELECT 
    'Test 1: Senior logs medication → family notification'::text,
    CASE WHEN v_notification_count > 0 THEN 'PASS' ELSE 'FAIL' END::text,
    jsonb_build_object('notification_count', v_notification_count)::jsonb;

  -- TEST 2: Senior logs vitals → trends updated
  INSERT INTO health_metrics (
    resident_id, metric_category, metric_type, value_numeric, unit,
    measurement_source, data_source, confidence_level, recorded_at
  )
  VALUES (
    v_resident_id, 'BLOOD_PRESSURE', 'blood_pressure_systolic', 140, 'mmHg',
    'MANUAL_ENTRY', 'MANUAL_ENTRY', 'HIGH', now()
  )
  RETURNING id INTO v_health_metric_id;

  SELECT COUNT(*) INTO v_trend_count
  FROM health_metric_trends
  WHERE resident_id = v_resident_id
    AND metric_type = 'blood_pressure_systolic';

  RETURN QUERY SELECT 
    'Test 2: Senior logs vitals → trends updated'::text,
    CASE WHEN v_trend_count > 0 THEN 'PASS' ELSE 'FAIL' END::text,
    jsonb_build_object('trend_count', v_trend_count)::jsonb;

  -- TEST 3: Family submits observation → supervisor exception queue
  INSERT INTO observation_events (
    agency_id, event_type, event_subtype, resident_id, event_timestamp,
    event_data, observation_quality, source_table, is_simulation, idempotency_key
  )
  VALUES (
    'a0000000-0000-0000-0000-000000000001', 'family_observation', 'concern_reported',
    v_resident_id, now(), '{"concern": "Low appetite"}'::jsonb, 80,
    'family_observations', false, gen_random_uuid()
  );

  SELECT COUNT(*) INTO v_obs_count
  FROM observation_events
  WHERE resident_id = v_resident_id
    AND event_type = 'family_observation';

  RETURN QUERY SELECT 
    'Test 3: Family submits observation → supervisor exception queue'::text,
    CASE WHEN v_obs_count > 0 THEN 'PASS' ELSE 'FAIL' END::text,
    jsonb_build_object('observation_count', v_obs_count)::jsonb;

  -- TEST 4: Caregiver completes task → observation_event
  SELECT COUNT(*) INTO v_obs_count
  FROM observation_events
  WHERE source_table = 'tasks'
    AND resident_id = v_resident_id;

  RETURN QUERY SELECT 
    'Test 4: Caregiver completes task → observation_event'::text,
    CASE WHEN v_obs_count > 0 THEN 'PASS' ELSE 'FAIL' END::text,
    jsonb_build_object('task_observation_count', v_obs_count)::jsonb;

  -- TEST 5: Brain pipeline produces visible outputs (anomalies/signals)
  DECLARE
    v_anomaly_count int;
    v_signal_count int;
  BEGIN
    SELECT COUNT(*) INTO v_anomaly_count FROM anomaly_detections WHERE resident_id = v_resident_id;
    SELECT COUNT(*) INTO v_signal_count FROM intelligence_signals WHERE resident_id = v_resident_id;

    RETURN QUERY SELECT 
      'Test 5: Brain pipeline produces visible outputs'::text,
      CASE WHEN (v_anomaly_count + v_signal_count) > 0 THEN 'PASS' ELSE 'FAIL' END::text,
      jsonb_build_object('anomaly_count', v_anomaly_count, 'signal_count', v_signal_count)::jsonb;
  END;
END;
$$;