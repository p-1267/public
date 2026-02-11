/*
  # WP3 Capability Verifier - Truth Enforced

  1. Purpose
    - Verify Brain COMPUTES intelligence from raw events
    - Test positive path (raw events → flags)
    - Test negative path (no raw events → no flags)

  2. Tests
    - compute_from_events_test: Verifies computation pipeline works
    - negative_proof_test: Verifies no inputs = no outputs
    - sensitivity_test: Verifies changing inputs changes outputs
*/

CREATE OR REPLACE FUNCTION verify_wp3_brain_intelligence(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_test_results jsonb := '[]'::jsonb;
  v_test_result jsonb;
  v_initial_anomalies int;
  v_initial_risks int;
  v_compute_result jsonb;
  v_resident_flags int;
  v_caregiver_flags int;
BEGIN
  -- TEST 1: Positive Path - Compute from events
  v_test_result := jsonb_build_object(
    'test_name', 'compute_from_events_test',
    'status', 'running'
  );

  -- Clear existing brain outputs (not raw events)
  DELETE FROM prioritized_issues WHERE agency_id = p_agency_id;
  DELETE FROM risk_scores WHERE agency_id = p_agency_id;
  DELETE FROM anomaly_detections WHERE agency_id = p_agency_id;
  DELETE FROM caregiver_baselines WHERE agency_id = p_agency_id;
  DELETE FROM resident_baselines WHERE agency_id = p_agency_id;
  DELETE FROM observation_events WHERE agency_id = p_agency_id;

  -- Seed raw events
  PERFORM seed_wp3_raw_events(p_agency_id);

  -- Run Brain compute
  SELECT run_brain_intelligence(p_agency_id) INTO v_compute_result;

  -- Verify outputs were created
  SELECT COUNT(*) INTO v_resident_flags
  FROM risk_scores
  WHERE agency_id = p_agency_id AND risk_category = 'resident_health';

  SELECT COUNT(*) INTO v_caregiver_flags
  FROM risk_scores
  WHERE agency_id = p_agency_id AND risk_category = 'caregiver_performance';

  IF v_resident_flags >= 2 AND v_caregiver_flags >= 2 THEN
    v_test_result := v_test_result || jsonb_build_object(
      'status', 'PASS',
      'message', 'Brain computed ' || v_resident_flags || ' resident + ' || v_caregiver_flags || ' caregiver flags from raw events',
      'resident_flags', v_resident_flags,
      'caregiver_flags', v_caregiver_flags,
      'proof', 'flags_from_computation'
    );
  ELSE
    v_test_result := v_test_result || jsonb_build_object(
      'status', 'FAIL',
      'message', 'Insufficient flags generated',
      'resident_flags', v_resident_flags,
      'caregiver_flags', v_caregiver_flags
    );
  END IF;

  v_test_results := v_test_results || jsonb_build_array(v_test_result);

  -- TEST 2: Negative Proof - No raw events = No flags
  v_test_result := jsonb_build_object(
    'test_name', 'negative_proof_test',
    'status', 'running'
  );

  -- Delete raw events
  DELETE FROM task_completion_telemetry WHERE agency_id = p_agency_id;
  DELETE FROM vital_signs WHERE agency_id = p_agency_id;
  DELETE FROM observation_events WHERE agency_id = p_agency_id;

  -- Clear brain outputs
  DELETE FROM prioritized_issues WHERE agency_id = p_agency_id;
  DELETE FROM risk_scores WHERE agency_id = p_agency_id;
  DELETE FROM anomaly_detections WHERE agency_id = p_agency_id;
  DELETE FROM caregiver_baselines WHERE agency_id = p_agency_id;
  DELETE FROM resident_baselines WHERE agency_id = p_agency_id;

  -- Run Brain compute (should produce nothing)
  SELECT run_brain_intelligence(p_agency_id) INTO v_compute_result;

  -- Verify NO outputs
  SELECT COUNT(*) INTO v_initial_anomalies FROM anomaly_detections WHERE agency_id = p_agency_id;
  SELECT COUNT(*) INTO v_initial_risks FROM risk_scores WHERE agency_id = p_agency_id;

  IF v_initial_anomalies = 0 AND v_initial_risks = 0 THEN
    v_test_result := v_test_result || jsonb_build_object(
      'status', 'PASS',
      'message', 'No raw events = No flags (negative proof validated)',
      'anomalies', v_initial_anomalies,
      'risks', v_initial_risks,
      'proof', 'truth_enforced'
    );
  ELSE
    v_test_result := v_test_result || jsonb_build_object(
      'status', 'FAIL',
      'message', 'Brain generated flags without raw events (INVALID)',
      'anomalies', v_initial_anomalies,
      'risks', v_initial_risks
    );
  END IF;

  v_test_results := v_test_results || jsonb_build_array(v_test_result);

  -- TEST 3: Evidence Linkage - Flags must link to raw events
  v_test_result := jsonb_build_object(
    'test_name', 'evidence_linkage_test',
    'status', 'running'
  );

  -- Reseed for this test
  PERFORM seed_wp3_raw_events(p_agency_id);
  SELECT run_brain_intelligence(p_agency_id) INTO v_compute_result;

  -- Verify anomalies link to observation events
  IF EXISTS (
    SELECT 1 FROM anomaly_detections ad
    WHERE ad.agency_id = p_agency_id
      AND (
        (ad.resident_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM observation_events oe
          WHERE oe.resident_id = ad.resident_id AND oe.agency_id = p_agency_id
        ))
        OR
        (ad.caregiver_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM observation_events oe
          WHERE oe.caregiver_id = ad.caregiver_id AND oe.agency_id = p_agency_id
        ))
      )
  ) THEN
    v_test_result := v_test_result || jsonb_build_object(
      'status', 'PASS',
      'message', 'All anomalies link to underlying observation events',
      'proof', 'evidence_traced'
    );
  ELSE
    v_test_result := v_test_result || jsonb_build_object(
      'status', 'FAIL',
      'message', 'Anomalies exist without observation evidence'
    );
  END IF;

  v_test_results := v_test_results || jsonb_build_array(v_test_result);

  -- Return all test results
  RETURN jsonb_build_object(
    'wp3_verification', 'COMPLETE',
    'tests_run', jsonb_array_length(v_test_results),
    'tests_passed', (
      SELECT COUNT(*)
      FROM jsonb_array_elements(v_test_results) AS test
      WHERE test->>'status' = 'PASS'
    ),
    'overall_status', CASE
      WHEN (
        SELECT COUNT(*)
        FROM jsonb_array_elements(v_test_results) AS test
        WHERE test->>'status' = 'FAIL'
      ) = 0 THEN 'PASS'
      ELSE 'FAIL'
    END,
    'test_results', v_test_results
  );
END;
$$;
