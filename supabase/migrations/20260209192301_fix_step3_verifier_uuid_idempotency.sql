/*
  # Fix Step 3 Verifier - Generate UUID for idempotency keys
*/

DROP FUNCTION IF EXISTS verify_step3_compound_intelligence(uuid);

CREATE OR REPLACE FUNCTION verify_step3_compound_intelligence(p_agency_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_test_resident_id uuid; v_test_user_id uuid; v_test_medication_id uuid; v_test_log_id uuid;
  v_checks jsonb[] := ARRAY[]::jsonb[]; v_overall_status text := 'PASS';
  v_correlation_result jsonb; v_compound_event_id uuid; v_compound_event record;
  v_signal_count integer; v_timeline_count integer;
  v_scheduled_time timestamptz;
  v_vital_idem_key uuid; v_obs_idem_key uuid;
BEGIN
  v_vital_idem_key := gen_random_uuid();
  v_obs_idem_key := gen_random_uuid();
  
  SELECT id INTO v_test_resident_id FROM residents WHERE agency_id = p_agency_id AND full_name ILIKE '%Dorothy%' LIMIT 1;
  IF v_test_resident_id IS NULL THEN
    RETURN jsonb_build_object('overall_status', 'FAIL', 'agency_id', p_agency_id, 'checks', array_append(v_checks, jsonb_build_object('check', 'test_resident_found', 'status', 'FAIL', 'message', 'Test resident Dorothy not found')), 'executed_at', now());
  END IF;
  SELECT id INTO v_test_user_id FROM user_profiles WHERE agency_id = p_agency_id LIMIT 1;
  IF v_test_user_id IS NULL THEN v_test_user_id := gen_random_uuid(); END IF;
  v_checks := array_append(v_checks, jsonb_build_object('check', 'test_resident_found', 'status', 'PASS', 'message', format('Found test resident: %s', v_test_resident_id)));
  SELECT id INTO v_test_medication_id FROM resident_medications WHERE resident_id = v_test_resident_id AND is_active = true LIMIT 1;
  IF v_test_medication_id IS NULL THEN
    INSERT INTO resident_medications (resident_id, medication_name, dosage, route, frequency, prescriber, is_active, is_controlled, is_prn) VALUES (v_test_resident_id, 'Test BP Med', '10mg', 'ORAL', 'BID', 'Dr. Test', true, false, false) RETURNING id INTO v_test_medication_id;
  END IF;
  v_checks := array_append(v_checks, jsonb_build_object('check', 'medication_setup', 'status', 'PASS', 'message', format('Medication ready: %s', v_test_medication_id)));
  v_scheduled_time := now() - interval '2 hours';
  INSERT INTO medication_administration_log (resident_id, medication_id, scheduled_time, administered_at, administered_by, status, dosage_given, route_used, is_controlled, dual_verification_required, dual_verification_completed, language_context, is_simulation) VALUES (v_test_resident_id, v_test_medication_id, v_scheduled_time, now(), v_test_user_id, 'LATE', '10mg', 'ORAL', false, false, false, 'en', true) RETURNING id INTO v_test_log_id;
  v_checks := array_append(v_checks, jsonb_build_object('check', 'late_medication_signal_1', 'status', 'PASS', 'message', format('Late medication signal 1 (log_id: %s, 120 min late)', v_test_log_id)));
  v_scheduled_time := now() - interval '90 minutes';
  INSERT INTO medication_administration_log (resident_id, medication_id, scheduled_time, administered_at, administered_by, status, dosage_given, route_used, is_controlled, dual_verification_required, dual_verification_completed, language_context, is_simulation) VALUES (v_test_resident_id, v_test_medication_id, v_scheduled_time, now(), v_test_user_id, 'LATE', '10mg', 'ORAL', false, false, false, 'en', true) RETURNING id INTO v_test_log_id;
  v_checks := array_append(v_checks, jsonb_build_object('check', 'late_medication_signal_2', 'status', 'PASS', 'message', format('Late medication signal 2 (log_id: %s)', v_test_log_id)));
  INSERT INTO vital_signs (resident_id, vital_type, value, systolic, diastolic, recorded_at, recorded_by, notes, is_simulation, idempotency_key) VALUES (v_test_resident_id, 'blood_pressure', 185.0, 185, 95, now(), v_test_user_id, 'Feeling pressure in head', true, v_vital_idem_key) RETURNING id INTO v_test_log_id;
  v_checks := array_append(v_checks, jsonb_build_object('check', 'abnormal_vital_signal', 'status', 'PASS', 'message', format('Abnormal vital signal (BP: 185/95, vital_id: %s)', v_test_log_id)));
  INSERT INTO observation_events (agency_id, resident_id, caregiver_id, event_type, event_subtype, event_timestamp, event_data, observation_quality, is_simulation, idempotency_key) VALUES (p_agency_id, v_test_resident_id, v_test_user_id, 'family_observation', 'COGNITIVE', now(), jsonb_build_object('observation_text', 'Mom seems confused and forgetful. She missed her morning medications.', 'severity', 'MODERATE', 'reported_by', 'FAMILY'), 3, true, v_obs_idem_key) RETURNING id INTO v_test_log_id;
  v_checks := array_append(v_checks, jsonb_build_object('check', 'family_observation_signal', 'status', 'PASS', 'message', format('Family observation signal (obs_id: %s)', v_test_log_id)));
  v_correlation_result := run_correlation_engine(v_test_resident_id, 168);
  IF v_correlation_result->>'success' = 'true' THEN
    v_checks := array_append(v_checks, jsonb_build_object('check', 'correlation_engine_executed', 'status', 'PASS', 'message', format('Correlation engine executed: %s events created', v_correlation_result->>'events_created'), 'events_created', (v_correlation_result->>'events_created')::integer));
  ELSE
    v_checks := array_append(v_checks, jsonb_build_object('check', 'correlation_engine_executed', 'status', 'FAIL', 'message', format('Correlation engine failed: %s', v_correlation_result))); v_overall_status := 'FAIL';
  END IF;
  SELECT id INTO v_compound_event_id FROM compound_intelligence_events WHERE resident_id = v_test_resident_id AND created_at > now() - interval '5 minutes' ORDER BY created_at DESC LIMIT 1;
  IF v_compound_event_id IS NOT NULL THEN
    SELECT * INTO v_compound_event FROM compound_intelligence_events WHERE id = v_compound_event_id;
    v_checks := array_append(v_checks, jsonb_build_object('check', 'compound_event_created', 'status', 'PASS', 'message', format('Compound event created (id: %s, type: %s, severity: %s)', v_compound_event_id, v_compound_event.correlation_type, v_compound_event.severity), 'event_id', v_compound_event_id));
  ELSE
    v_checks := array_append(v_checks, jsonb_build_object('check', 'compound_event_created', 'status', 'FAIL', 'message', 'No compound intelligence event created')); v_overall_status := 'FAIL';
  END IF;
  IF v_compound_event_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_signal_count FROM signal_contributions WHERE compound_event_id = v_compound_event_id;
    IF v_signal_count >= 2 THEN
      v_checks := array_append(v_checks, jsonb_build_object('check', 'signal_contributions_linked', 'status', 'PASS', 'message', format('Signal contributions linked: %s signals', v_signal_count), 'sources', (SELECT jsonb_agg(jsonb_build_object('type', signal_type, 'table', signal_source_table, 'timestamp', signal_timestamp)) FROM signal_contributions WHERE compound_event_id = v_compound_event_id)));
    ELSE
      v_checks := array_append(v_checks, jsonb_build_object('check', 'signal_contributions_linked', 'status', 'FAIL', 'message', format('Insufficient signal contributions: %s', v_signal_count))); v_overall_status := 'FAIL';
    END IF;
  ELSE
    v_checks := array_append(v_checks, jsonb_build_object('check', 'signal_contributions_linked', 'status', 'FAIL', 'message', 'Cannot check: no compound event')); v_overall_status := 'FAIL';
  END IF;
  IF v_compound_event_id IS NOT NULL THEN
    IF v_compound_event.reasoning_text IS NOT NULL AND length(v_compound_event.reasoning_text) > 10 AND v_compound_event.reasoning_details IS NOT NULL AND v_compound_event.reasoning_details ? 'rule_id' AND v_compound_event.reasoning_details ? 'signal_ids' THEN
      v_checks := array_append(v_checks, jsonb_build_object('check', 'explainability_complete', 'status', 'PASS', 'message', format('Explainability complete: %s chars, %s signal_ids', length(v_compound_event.reasoning_text), jsonb_array_length(v_compound_event.reasoning_details->'signal_ids')), 'details', jsonb_build_object('rule_id', v_compound_event.reasoning_details->'rule_id', 'signal_count', jsonb_array_length(v_compound_event.reasoning_details->'signal_ids'), 'reasoning_excerpt', left(v_compound_event.reasoning_text, 100))));
    ELSE
      v_checks := array_append(v_checks, jsonb_build_object('check', 'explainability_complete', 'status', 'FAIL', 'message', 'Explainability incomplete')); v_overall_status := 'FAIL';
    END IF;
  ELSE
    v_checks := array_append(v_checks, jsonb_build_object('check', 'explainability_complete', 'status', 'FAIL', 'message', 'Cannot check: no compound event')); v_overall_status := 'FAIL';
  END IF;
  IF v_compound_event_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_timeline_count FROM unified_timeline_events WHERE source_table = 'compound_intelligence_events' AND source_id = v_compound_event_id;
    IF v_timeline_count > 0 THEN
      v_checks := array_append(v_checks, jsonb_build_object('check', 'timeline_entry_created', 'status', 'PASS', 'message', format('Timeline entry created via trigger (%s entries)', v_timeline_count)));
    ELSE
      v_checks := array_append(v_checks, jsonb_build_object('check', 'timeline_entry_created', 'status', 'FAIL', 'message', 'Timeline entry not created')); v_overall_status := 'FAIL';
    END IF;
  ELSE
    v_checks := array_append(v_checks, jsonb_build_object('check', 'timeline_entry_created', 'status', 'FAIL', 'message', 'Cannot check: no compound event')); v_overall_status := 'FAIL';
  END IF;
  RETURN jsonb_build_object('overall_status', v_overall_status, 'agency_id', p_agency_id, 'test_resident_id', v_test_resident_id, 'checks', v_checks, 'executed_at', now());
END; $$;
GRANT EXECUTE ON FUNCTION verify_step3_compound_intelligence TO authenticated, anon;
