/*
  # Fix Step 2 Verifier to Use Correct Audit Schema

  1. Issue
    - Verifier uses old audit_log schema
    
  2. Fix
    - Update audit_log query to use action_type, target_type, target_id
*/

CREATE OR REPLACE FUNCTION verify_step2_bidirectional_wiring(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_test_resident_id uuid;
  v_test_family_id uuid;
  v_test_supervisor_id uuid;
  v_test_caregiver_id uuid;
  v_observation_id uuid;
  v_audit_count integer;
  v_exception_count integer;
  v_timeline_count integer;
  v_observation_event_count integer;
  v_results jsonb := '[]'::jsonb;
  v_all_pass boolean := true;
BEGIN
  -- Setup: Get test data
  SELECT id INTO v_test_resident_id
  FROM residents
  WHERE agency_id = p_agency_id
  LIMIT 1;

  IF v_test_resident_id IS NULL THEN
    RETURN jsonb_build_object(
      'overall_status', 'SKIP',
      'message', 'No residents found for agency',
      'checks', '[]'::jsonb
    );
  END IF;

  -- Get family member linked to resident
  SELECT family_user_id INTO v_test_family_id
  FROM family_resident_links
  WHERE resident_id = v_test_resident_id
    AND status = 'active'
  LIMIT 1;

  -- Get supervisor
  SELECT up.id INTO v_test_supervisor_id
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.agency_id = p_agency_id
    AND r.name = 'SUPERVISOR'
  LIMIT 1;

  -- Get caregiver
  SELECT up.id INTO v_test_caregiver_id
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.agency_id = p_agency_id
    AND r.name = 'CAREGIVER'
  LIMIT 1;

  -- ============================================================
  -- TEST 1: Family can submit observation
  -- ============================================================
  BEGIN
    SELECT (submit_family_observation(
      v_test_resident_id,
      COALESCE(v_test_family_id, gen_random_uuid()),
      'Test observation for bidirectional wiring verification',
      'MODERATE',
      'behavioral',
      'test_' || gen_random_uuid()::text
    )->'observation_id')::text::uuid INTO v_observation_id;

    IF v_observation_id IS NOT NULL THEN
      v_results := v_results || jsonb_build_object(
        'check', '1_family_observation_submission',
        'status', 'PASS',
        'message', 'Family observation created',
        'observation_id', v_observation_id
      );
    ELSE
      v_results := v_results || jsonb_build_object(
        'check', '1_family_observation_submission',
        'status', 'FAIL',
        'message', 'Failed to create observation'
      );
      v_all_pass := false;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_results := v_results || jsonb_build_object(
      'check', '1_family_observation_submission',
      'status', 'FAIL',
      'message', 'Exception: ' || SQLERRM
    );
    v_all_pass := false;
  END;

  -- ============================================================
  -- TEST 2: Audit log created with actor attribution
  -- ============================================================
  SELECT COUNT(*) INTO v_audit_count
  FROM audit_log
  WHERE target_type = 'family_observations'
    AND target_id = v_observation_id
    AND action_type = 'family_observation_submitted';

  IF v_audit_count > 0 THEN
    v_results := v_results || jsonb_build_object(
      'check', '2_audit_log_created',
      'status', 'PASS',
      'message', format('Audit log entries: %s', v_audit_count)
    );
  ELSE
    v_results := v_results || jsonb_build_object(
      'check', '2_audit_log_created',
      'status', 'FAIL',
      'message', 'No audit log entry found'
    );
    v_all_pass := false;
  END IF;

  -- ============================================================
  -- TEST 3: Supervisor exception queue entry created
  -- ============================================================
  SELECT COUNT(*) INTO v_exception_count
  FROM supervisor_exception_queue
  WHERE source_table = 'family_observations'
    AND source_id = v_observation_id
    AND exception_type = 'FAMILY_OBSERVATION';

  IF v_exception_count > 0 THEN
    v_results := v_results || jsonb_build_object(
      'check', '3_supervisor_queue_entry',
      'status', 'PASS',
      'message', 'Exception queue entry created'
    );
  ELSE
    v_results := v_results || jsonb_build_object(
      'check', '3_supervisor_queue_entry',
      'status', 'FAIL',
      'message', 'No exception queue entry found'
    );
    v_all_pass := false;
  END IF;

  -- ============================================================
  -- TEST 4: Unified timeline entry created
  -- ============================================================
  SELECT COUNT(*) INTO v_timeline_count
  FROM unified_timeline_events
  WHERE source_table = 'family_observations'
    AND source_id = v_observation_id
    AND actor_type = 'FAMILY';

  IF v_timeline_count > 0 THEN
    v_results := v_results || jsonb_build_object(
      'check', '4_unified_timeline_entry',
      'status', 'PASS',
      'message', 'Timeline entry created with FAMILY actor'
    );
  ELSE
    v_results := v_results || jsonb_build_object(
      'check', '4_unified_timeline_entry',
      'status', 'FAIL',
      'message', 'No timeline entry found'
    );
    v_all_pass := false;
  END IF;

  -- ============================================================
  -- TEST 5: Observation_event created for brain pipeline
  -- ============================================================
  SELECT COUNT(*) INTO v_observation_event_count
  FROM observation_events
  WHERE event_type = 'FAMILY_OBSERVATION'
    AND resident_id = v_test_resident_id
    AND event_data->>'observation_text' LIKE '%bidirectional wiring verification%';

  IF v_observation_event_count > 0 THEN
    v_results := v_results || jsonb_build_object(
      'check', '5_observation_event_for_brain',
      'status', 'PASS',
      'message', 'Observation event created for brain pipeline'
    );
  ELSE
    v_results := v_results || jsonb_build_object(
      'check', '5_observation_event_for_brain',
      'status', 'FAIL',
      'message', 'No observation_event found'
    );
    v_all_pass := false;
  END IF;

  -- ============================================================
  -- TEST 6: Supervisor can process observation
  -- ============================================================
  IF v_test_supervisor_id IS NOT NULL THEN
    BEGIN
      PERFORM supervisor_process_family_observation(
        v_observation_id,
        v_test_supervisor_id,
        'ROUTED_TO_CAREGIVER',
        'Test processing',
        false
      );

      v_results := v_results || jsonb_build_object(
        'check', '6_supervisor_processing',
        'status', 'PASS',
        'message', 'Supervisor processed observation'
      );
    EXCEPTION WHEN OTHERS THEN
      v_results := v_results || jsonb_build_object(
        'check', '6_supervisor_processing',
        'status', 'FAIL',
        'message', 'Exception: ' || SQLERRM
      );
      v_all_pass := false;
    END;
  ELSE
    v_results := v_results || jsonb_build_object(
      'check', '6_supervisor_processing',
      'status', 'SKIP',
      'message', 'No supervisor found for testing'
    );
  END IF;

  -- ============================================================
  -- TEST 7: Timeline shows multiple actor types
  -- ============================================================
  DECLARE
    v_actor_types_count integer;
  BEGIN
    SELECT COUNT(DISTINCT actor_type) INTO v_actor_types_count
    FROM unified_timeline_events
    WHERE resident_id = v_test_resident_id;

    IF v_actor_types_count >= 2 THEN
      v_results := v_results || jsonb_build_object(
        'check', '7_multi_actor_timeline',
        'status', 'PASS',
        'message', format('Timeline has %s different actor types', v_actor_types_count)
      );
    ELSE
      v_results := v_results || jsonb_build_object(
        'check', '7_multi_actor_timeline',
        'status', 'FAIL',
        'message', format('Only %s actor type(s) in timeline', v_actor_types_count)
      );
      v_all_pass := false;
    END IF;
  END;

  -- ============================================================
  -- TEST 8: Brain pipeline can process family observation
  -- ============================================================
  DECLARE
    v_brain_result jsonb;
  BEGIN
    -- Run brain intelligence on this agency
    SELECT run_brain_intelligence(p_agency_id) INTO v_brain_result;

    IF v_brain_result->>'status' = 'success' THEN
      v_results := v_results || jsonb_build_object(
        'check', '8_brain_pipeline_processing',
        'status', 'PASS',
        'message', 'Brain pipeline executed successfully',
        'details', v_brain_result
      );
    ELSE
      v_results := v_results || jsonb_build_object(
        'check', '8_brain_pipeline_processing',
        'status', 'FAIL',
        'message', 'Brain pipeline failed',
        'error', v_brain_result
      );
      v_all_pass := false;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_results := v_results || jsonb_build_object(
      'check', '8_brain_pipeline_processing',
      'status', 'FAIL',
      'message', 'Exception: ' || SQLERRM
    );
    v_all_pass := false;
  END;

  -- Return results
  RETURN jsonb_build_object(
    'overall_status', CASE WHEN v_all_pass THEN 'PASS' ELSE 'FAIL' END,
    'agency_id', p_agency_id,
    'test_resident_id', v_test_resident_id,
    'checks', v_results,
    'executed_at', now()
  );
END;
$$;
