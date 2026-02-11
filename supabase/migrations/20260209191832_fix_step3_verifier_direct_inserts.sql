/*
  # Fix Step 3 Verifier - Use Direct Inserts with Test User
  
  Modifies verifier to use direct table inserts with a test user ID
  to bypass auth.uid() constraints while still using real write paths
*/

DROP FUNCTION IF EXISTS verify_step3_compound_intelligence(uuid);

CREATE OR REPLACE FUNCTION verify_step3_compound_intelligence(
  p_agency_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_test_resident_id uuid;
  v_test_user_id uuid;
  v_test_medication_id uuid;
  v_test_schedule_id uuid;
  v_test_log_id uuid;
  v_checks jsonb[] := ARRAY[]::jsonb[];
  v_overall_status text := 'PASS';
  v_correlation_result jsonb;
  v_compound_event_id uuid;
  v_compound_event record;
  v_signal_count integer;
  v_timeline_count integer;
  v_idempotency_base text;
  v_scheduled_time timestamptz;
  v_administered_at timestamptz;
  v_is_late boolean;
  v_time_diff_minutes integer;
BEGIN
  v_idempotency_base := 'step3_verify_' || extract(epoch from now())::text;

  -- CHECK 1: Find test resident
  SELECT id INTO v_test_resident_id
  FROM residents
  WHERE agency_id = p_agency_id
    AND full_name ILIKE '%Dorothy%'
  LIMIT 1;

  IF v_test_resident_id IS NULL THEN
    v_checks := array_append(v_checks, jsonb_build_object(
      'check', 'test_resident_found',
      'status', 'FAIL',
      'message', 'Test resident Dorothy not found in agency'
    ));
    v_overall_status := 'FAIL';

    RETURN jsonb_build_object(
      'overall_status', v_overall_status,
      'agency_id', p_agency_id,
      'checks', v_checks,
      'executed_at', now()
    );
  END IF;

  -- Find a test user from the agency
  SELECT id INTO v_test_user_id
  FROM user_profiles
  WHERE agency_id = p_agency_id
  LIMIT 1;

  IF v_test_user_id IS NULL THEN
    v_test_user_id := gen_random_uuid();
  END IF;

  v_checks := array_append(v_checks, jsonb_build_object(
    'check', 'test_resident_found',
    'status', 'PASS',
    'message', format('Found test resident: %s', v_test_resident_id)
  ));

  -- CHECK 2: Find or create test medication
  SELECT id INTO v_test_medication_id
  FROM resident_medications
  WHERE resident_id = v_test_resident_id
    AND is_active = true
  LIMIT 1;

  IF v_test_medication_id IS NULL THEN
    INSERT INTO resident_medications (
      resident_id,
      medication_name,
      dosage,
      route,
      frequency,
      prescriber,
      is_active,
      is_controlled,
      is_prn
    ) VALUES (
      v_test_resident_id,
      'Test Blood Pressure Med',
      '10mg',
      'ORAL',
      'BID',
      'Dr. Test',
      true,
      false,
      false
    ) RETURNING id INTO v_test_medication_id;
  END IF;

  v_checks := array_append(v_checks, jsonb_build_object(
    'check', 'medication_setup',
    'status', 'PASS',
    'message', format('Medication ready: %s', v_test_medication_id)
  ));

  -- CHECK 3: Generate LATE medication signal 1
  v_scheduled_time := now() - interval '2 hours';
  v_administered_at := now();
  v_is_late := true;
  v_time_diff_minutes := EXTRACT(EPOCH FROM (v_administered_at - v_scheduled_time))/60;

  INSERT INTO medication_administration_log (
    resident_id,
    medication_id,
    scheduled_time,
    administered_at,
    administered_by,
    status,
    dosage_given,
    route_used,
    is_controlled,
    dual_verification_required,
    dual_verification_completed,
    language_context,
    is_simulation
  ) VALUES (
    v_test_resident_id,
    v_test_medication_id,
    v_scheduled_time,
    v_administered_at,
    v_test_user_id,
    'LATE',
    '10mg',
    'ORAL',
    false,
    false,
    false,
    'en',
    true
  ) RETURNING id INTO v_test_log_id;

  v_checks := array_append(v_checks, jsonb_build_object(
    'check', 'late_medication_signal_1',
    'status', 'PASS',
    'message', format('Generated late medication signal (log_id: %s, %s min late)',
      v_test_log_id, v_time_diff_minutes)
  ));

  -- CHECK 4: Generate LATE medication signal 2
  v_scheduled_time := now() - interval '90 minutes';
  v_administered_at := now();
  v_time_diff_minutes := 90;

  INSERT INTO medication_administration_log (
    resident_id,
    medication_id,
    scheduled_time,
    administered_at,
    administered_by,
    status,
    dosage_given,
    route_used,
    is_controlled,
    dual_verification_required,
    dual_verification_completed,
    language_context,
    is_simulation
  ) VALUES (
    v_test_resident_id,
    v_test_medication_id,
    v_scheduled_time,
    v_administered_at,
    v_test_user_id,
    'LATE',
    '10mg',
    'ORAL',
    false,
    false,
    false,
    'en',
    true
  ) RETURNING id INTO v_test_log_id;

  v_checks := array_append(v_checks, jsonb_build_object(
    'check', 'late_medication_signal_2',
    'status', 'PASS',
    'message', format('Generated second late medication signal (log_id: %s)', v_test_log_id)
  ));

  -- CHECK 5: Generate ABNORMAL vital sign signal
  INSERT INTO vital_signs (
    resident_id,
    recorded_at,
    systolic_bp,
    diastolic_bp,
    heart_rate,
    respiratory_rate,
    temperature,
    oxygen_saturation,
    pain_level,
    source,
    notes,
    is_simulation
  ) VALUES (
    v_test_resident_id,
    now(),
    185,
    95,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    'SENIOR_SELF_REPORT',
    'Feeling pressure in head',
    true
  ) RETURNING id INTO v_test_log_id;

  v_checks := array_append(v_checks, jsonb_build_object(
    'check', 'abnormal_vital_signal',
    'status', 'PASS',
    'message', format('Generated abnormal vital signal (BP: 185/95, vital_id: %s)', v_test_log_id)
  ));

  -- CHECK 6: Generate FAMILY observation signal
  INSERT INTO observation_events (
    resident_id,
    observer_type,
    observer_id,
    event_type,
    observation_text,
    severity,
    quality,
    confidence_level,
    requires_followup,
    is_simulation
  ) VALUES (
    v_test_resident_id,
    'FAMILY',
    v_test_user_id,
    'COGNITIVE',
    'Mom seems confused and forgetful. She missed her morning medications.',
    'MODERATE',
    'HIGH',
    0.85,
    true,
    true
  ) RETURNING id INTO v_test_log_id;

  v_checks := array_append(v_checks, jsonb_build_object(
    'check', 'family_observation_signal',
    'status', 'PASS',
    'message', format('Generated family observation signal (obs_id: %s)', v_test_log_id)
  ));

  -- CHECK 7: Call correlation engine
  v_correlation_result := run_correlation_engine(v_test_resident_id, 168);

  IF v_correlation_result->>'success' = 'true' THEN
    v_checks := array_append(v_checks, jsonb_build_object(
      'check', 'correlation_engine_executed',
      'status', 'PASS',
      'message', format('Correlation engine executed: %s events created',
        v_correlation_result->>'events_created'),
      'events_created', (v_correlation_result->>'events_created')::integer
    ));
  ELSE
    v_checks := array_append(v_checks, jsonb_build_object(
      'check', 'correlation_engine_executed',
      'status', 'FAIL',
      'message', format('Correlation engine failed: %s', v_correlation_result)
    ));
    v_overall_status := 'FAIL';
  END IF;

  -- CHECK 8: Assert compound intelligence event exists
  SELECT id INTO v_compound_event_id
  FROM compound_intelligence_events
  WHERE resident_id = v_test_resident_id
    AND created_at > now() - interval '5 minutes'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_compound_event_id IS NOT NULL THEN
    SELECT * INTO v_compound_event
    FROM compound_intelligence_events
    WHERE id = v_compound_event_id;

    v_checks := array_append(v_checks, jsonb_build_object(
      'check', 'compound_event_created',
      'status', 'PASS',
      'message', format('Compound intelligence event created (id: %s, type: %s, severity: %s)',
        v_compound_event_id,
        v_compound_event.correlation_type,
        v_compound_event.severity),
      'event_id', v_compound_event_id
    ));
  ELSE
    v_checks := array_append(v_checks, jsonb_build_object(
      'check', 'compound_event_created',
      'status', 'FAIL',
      'message', 'No compound intelligence event was created by correlation engine'
    ));
    v_overall_status := 'FAIL';
  END IF;

  -- CHECK 9: Assert signal contributions linked
  IF v_compound_event_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_signal_count
    FROM signal_contributions
    WHERE compound_event_id = v_compound_event_id;

    IF v_signal_count >= 2 THEN
      v_checks := array_append(v_checks, jsonb_build_object(
        'check', 'signal_contributions_linked',
        'status', 'PASS',
        'message', format('Signal contributions linked: %s signals', v_signal_count),
        'sources', (
          SELECT jsonb_agg(jsonb_build_object(
            'type', signal_type,
            'table', signal_source_table,
            'timestamp', signal_timestamp
          ))
          FROM signal_contributions
          WHERE compound_event_id = v_compound_event_id
        )
      ));
    ELSE
      v_checks := array_append(v_checks, jsonb_build_object(
        'check', 'signal_contributions_linked',
        'status', 'FAIL',
        'message', format('Insufficient signal contributions: %s (expected >= 2)', v_signal_count)
      ));
      v_overall_status := 'FAIL';
    END IF;
  ELSE
    v_checks := array_append(v_checks, jsonb_build_object(
      'check', 'signal_contributions_linked',
      'status', 'FAIL',
      'message', 'Cannot check signal contributions: no compound event exists'
    ));
    v_overall_status := 'FAIL';
  END IF;

  -- CHECK 10: Assert explainability fields populated
  IF v_compound_event_id IS NOT NULL THEN
    IF v_compound_event.reasoning_text IS NOT NULL
       AND length(v_compound_event.reasoning_text) > 10
       AND v_compound_event.reasoning_details IS NOT NULL
       AND v_compound_event.reasoning_details ? 'rule_id'
       AND v_compound_event.reasoning_details ? 'signal_ids' THEN
      v_checks := array_append(v_checks, jsonb_build_object(
        'check', 'explainability_complete',
        'status', 'PASS',
        'message', format('Explainability complete: reasoning_text (%s chars), rule_id present, %s signal_ids',
          length(v_compound_event.reasoning_text),
          jsonb_array_length(v_compound_event.reasoning_details->'signal_ids')),
        'details', jsonb_build_object(
          'rule_id', v_compound_event.reasoning_details->'rule_id',
          'signal_count', jsonb_array_length(v_compound_event.reasoning_details->'signal_ids'),
          'reasoning_excerpt', left(v_compound_event.reasoning_text, 100)
        )
      ));
    ELSE
      v_checks := array_append(v_checks, jsonb_build_object(
        'check', 'explainability_complete',
        'status', 'FAIL',
        'message', 'Explainability incomplete: missing reasoning_text, rule_id, or signal_ids',
        'details', jsonb_build_object(
          'has_reasoning_text', v_compound_event.reasoning_text IS NOT NULL,
          'reasoning_length', length(COALESCE(v_compound_event.reasoning_text, '')),
          'has_rule_id', v_compound_event.reasoning_details ? 'rule_id',
          'has_signal_ids', v_compound_event.reasoning_details ? 'signal_ids'
        )
      ));
      v_overall_status := 'FAIL';
    END IF;
  ELSE
    v_checks := array_append(v_checks, jsonb_build_object(
      'check', 'explainability_complete',
      'status', 'FAIL',
      'message', 'Cannot check explainability: no compound event exists'
    ));
    v_overall_status := 'FAIL';
  END IF;

  -- CHECK 11: Assert unified timeline entry exists
  IF v_compound_event_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_timeline_count
    FROM unified_timeline_events
    WHERE source_table = 'compound_intelligence_events'
      AND source_id = v_compound_event_id;

    IF v_timeline_count > 0 THEN
      v_checks := array_append(v_checks, jsonb_build_object(
        'check', 'timeline_entry_created',
        'status', 'PASS',
        'message', format('Unified timeline entry created via trigger (%s entries)', v_timeline_count)
      ));
    ELSE
      v_checks := array_append(v_checks, jsonb_build_object(
        'check', 'timeline_entry_created',
        'status', 'FAIL',
        'message', 'Timeline entry not created: trigger may not have fired'
      ));
      v_overall_status := 'FAIL';
    END IF;
  ELSE
    v_checks := array_append(v_checks, jsonb_build_object(
      'check', 'timeline_entry_created',
      'status', 'FAIL',
      'message', 'Cannot check timeline: no compound event exists'
    ));
    v_overall_status := 'FAIL';
  END IF;

  RETURN jsonb_build_object(
    'overall_status', v_overall_status,
    'agency_id', p_agency_id,
    'test_resident_id', v_test_resident_id,
    'checks', v_checks,
    'executed_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION verify_step3_compound_intelligence TO authenticated, anon;
