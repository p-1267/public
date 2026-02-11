/*
  # STEP 5: Truth-Enforced Verifier
  
  After each commit, queries actual tables to verify DB write succeeded.
  If confirmation exists but DB row missing → FAIL with explicit reason.
*/

CREATE OR REPLACE FUNCTION verify_step5_voice_pipeline(
  p_agency_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_test_transcription_id uuid;
  v_test_resident_id uuid;
  v_test_user_id uuid;
  v_checks jsonb := '[]';
  v_overall_status text := 'PASS';
  
  v_intent_id uuid;
  v_draft_id uuid;
  v_commit_result jsonb;
  v_check_result text;
  v_error_detail text;
  
  v_db_write_exists boolean;
BEGIN
  SELECT id INTO v_test_resident_id
  FROM residents
  WHERE agency_id = p_agency_id
  LIMIT 1;
  
  IF v_test_resident_id IS NULL THEN
    RETURN jsonb_build_object(
      'overall_status', 'FAIL',
      'error', 'No test resident found for agency',
      'checks', '[]'
    );
  END IF;
  
  v_test_user_id := NULL;
  
  -- CHECK 1: DOCUMENTATION
  BEGIN
    INSERT INTO voice_transcriptions (agency_id, transcription_text, transcription_confidence, transcription_provider)
    VALUES (p_agency_id, 'Patient ate full breakfast, appeared in good mood', 0.95, 'test_provider')
    RETURNING id INTO v_test_transcription_id;
    
    SELECT (classify_voice_intent(v_test_transcription_id, p_agency_id, 'Patient ate full breakfast, appeared in good mood', 'en', v_test_resident_id, v_test_user_id)->>'intent_id')::uuid INTO v_intent_id;
    SELECT (generate_action_draft_from_intent(v_intent_id, p_agency_id, v_test_resident_id, v_test_user_id)->>'draft_id')::uuid INTO v_draft_id;
    v_commit_result := confirm_and_commit_voice_action(v_draft_id, v_test_user_id, 'approve');
    
    -- Verify actual DB write
    IF v_commit_result->>'observation_event_id' IS NOT NULL THEN
      SELECT EXISTS(SELECT 1 FROM observation_events WHERE id = (v_commit_result->>'observation_event_id')::uuid) INTO v_db_write_exists;
      IF NOT v_db_write_exists THEN
        v_check_result := 'FAIL';
        v_error_detail := 'Commit returned ID but observation_event row does not exist';
        v_overall_status := 'FAIL';
      ELSIF v_commit_result->>'audit_log_id' IS NULL THEN
        v_check_result := 'FAIL';
        v_error_detail := 'No audit log created';
        v_overall_status := 'FAIL';
      ELSE
        v_check_result := 'PASS';
      END IF;
    ELSE
      v_check_result := 'FAIL';
      v_error_detail := 'Commit did not return observation_event_id';
      v_overall_status := 'FAIL';
    END IF;
    
    v_checks := v_checks || jsonb_build_object(
      'name', 'DOCUMENTATION intent end-to-end',
      'status', v_check_result,
      'details', jsonb_build_object(
        'intent_id', v_intent_id,
        'draft_id', v_draft_id,
        'observation_event_id', v_commit_result->>'observation_event_id',
        'audit_log_id', v_commit_result->>'audit_log_id',
        'db_write_verified', v_db_write_exists,
        'error', v_error_detail
      )
    );
  EXCEPTION WHEN OTHERS THEN
    v_overall_status := 'FAIL';
    v_checks := v_checks || jsonb_build_object('name', 'DOCUMENTATION intent end-to-end', 'status', 'FAIL', 'error', SQLERRM);
  END;
  
  -- CHECK 2: REQUEST
  BEGIN
    INSERT INTO voice_transcriptions (agency_id, transcription_text, transcription_confidence, transcription_provider)
    VALUES (p_agency_id, 'Need more supplies in room 201', 0.95, 'test_provider')
    RETURNING id INTO v_test_transcription_id;
    
    SELECT (classify_voice_intent(v_test_transcription_id, p_agency_id, 'Need more supplies in room 201', 'en', v_test_resident_id, v_test_user_id)->>'intent_id')::uuid INTO v_intent_id;
    SELECT (generate_action_draft_from_intent(v_intent_id, p_agency_id, v_test_resident_id, v_test_user_id)->>'draft_id')::uuid INTO v_draft_id;
    v_commit_result := confirm_and_commit_voice_action(v_draft_id, v_test_user_id, 'approve');
    
    v_error_detail := NULL;
    IF v_commit_result->>'task_id' IS NOT NULL THEN
      SELECT EXISTS(SELECT 1 FROM tasks WHERE id = (v_commit_result->>'task_id')::uuid) INTO v_db_write_exists;
      IF NOT v_db_write_exists THEN
        v_check_result := 'FAIL';
        v_error_detail := 'Commit returned task_id but task row does not exist';
        v_overall_status := 'FAIL';
      ELSIF v_commit_result->>'audit_log_id' IS NULL THEN
        v_check_result := 'FAIL';
        v_error_detail := 'No audit log created';
        v_overall_status := 'FAIL';
      ELSE
        v_check_result := 'PASS';
      END IF;
    ELSE
      v_check_result := 'FAIL';
      v_error_detail := 'Commit did not return task_id';
      v_overall_status := 'FAIL';
    END IF;
    
    v_checks := v_checks || jsonb_build_object(
      'name', 'REQUEST intent end-to-end',
      'status', v_check_result,
      'details', jsonb_build_object(
        'intent_id', v_intent_id,
        'draft_id', v_draft_id,
        'task_id', v_commit_result->>'task_id',
        'audit_log_id', v_commit_result->>'audit_log_id',
        'db_write_verified', v_db_write_exists,
        'error', v_error_detail
      )
    );
  EXCEPTION WHEN OTHERS THEN
    v_overall_status := 'FAIL';
    v_checks := v_checks || jsonb_build_object('name', 'REQUEST intent end-to-end', 'status', 'FAIL', 'error', SQLERRM);
  END;
  
  -- CHECK 3: URGENT_ACTION
  BEGIN
    INSERT INTO voice_transcriptions (agency_id, transcription_text, transcription_confidence, transcription_provider)
    VALUES (p_agency_id, 'Patient fell in bathroom, help needed urgently', 0.95, 'test_provider')
    RETURNING id INTO v_test_transcription_id;
    
    SELECT (classify_voice_intent(v_test_transcription_id, p_agency_id, 'Patient fell in bathroom, help needed urgently', 'en', v_test_resident_id, v_test_user_id)->>'intent_id')::uuid INTO v_intent_id;
    SELECT (generate_action_draft_from_intent(v_intent_id, p_agency_id, v_test_resident_id, v_test_user_id)->>'draft_id')::uuid INTO v_draft_id;
    v_commit_result := confirm_and_commit_voice_action(v_draft_id, v_test_user_id, 'approve');
    
    v_error_detail := NULL;
    IF v_commit_result->>'task_id' IS NOT NULL THEN
      SELECT EXISTS(SELECT 1 FROM tasks WHERE id = (v_commit_result->>'task_id')::uuid) INTO v_db_write_exists;
      IF NOT v_db_write_exists THEN
        v_check_result := 'FAIL';
        v_error_detail := 'Commit returned task_id but task row does not exist';
        v_overall_status := 'FAIL';
      ELSIF v_commit_result->>'audit_log_id' IS NULL THEN
        v_check_result := 'FAIL';
        v_error_detail := 'No audit log created';
        v_overall_status := 'FAIL';
      ELSE
        v_check_result := 'PASS';
      END IF;
    ELSE
      v_check_result := 'FAIL';
      v_error_detail := 'Commit did not return task_id';
      v_overall_status := 'FAIL';
    END IF;
    
    v_checks := v_checks || jsonb_build_object(
      'name', 'URGENT_ACTION intent end-to-end',
      'status', v_check_result,
      'details', jsonb_build_object(
        'intent_id', v_intent_id,
        'draft_id', v_draft_id,
        'task_id', v_commit_result->>'task_id',
        'audit_log_id', v_commit_result->>'audit_log_id',
        'db_write_verified', v_db_write_exists,
        'error', v_error_detail
      )
    );
  EXCEPTION WHEN OTHERS THEN
    v_overall_status := 'FAIL';
    v_checks := v_checks || jsonb_build_object('name', 'URGENT_ACTION intent end-to-end', 'status', 'FAIL', 'error', SQLERRM);
  END;
  
  -- CHECK 4: SCHEDULING
  BEGIN
    INSERT INTO voice_transcriptions (agency_id, transcription_text, transcription_confidence, transcription_provider)
    VALUES (p_agency_id, 'Schedule doctor appointment for tomorrow', 0.95, 'test_provider')
    RETURNING id INTO v_test_transcription_id;
    
    SELECT (classify_voice_intent(v_test_transcription_id, p_agency_id, 'Schedule doctor appointment for tomorrow', 'en', v_test_resident_id, v_test_user_id)->>'intent_id')::uuid INTO v_intent_id;
    SELECT (generate_action_draft_from_intent(v_intent_id, p_agency_id, v_test_resident_id, v_test_user_id)->>'draft_id')::uuid INTO v_draft_id;
    v_commit_result := confirm_and_commit_voice_action(v_draft_id, v_test_user_id, 'approve');
    
    v_error_detail := NULL;
    IF v_commit_result->>'appointment_id' IS NOT NULL THEN
      SELECT EXISTS(SELECT 1 FROM appointments WHERE id = (v_commit_result->>'appointment_id')::uuid) INTO v_db_write_exists;
      IF NOT v_db_write_exists THEN
        v_check_result := 'FAIL';
        v_error_detail := 'Commit returned appointment_id but appointment row does not exist';
        v_overall_status := 'FAIL';
      ELSIF v_commit_result->>'audit_log_id' IS NULL THEN
        v_check_result := 'FAIL';
        v_error_detail := 'No audit log created';
        v_overall_status := 'FAIL';
      ELSE
        v_check_result := 'PASS';
      END IF;
    ELSE
      v_check_result := 'FAIL';
      v_error_detail := 'Commit did not return appointment_id';
      v_overall_status := 'FAIL';
    END IF;
    
    v_checks := v_checks || jsonb_build_object(
      'name', 'SCHEDULING intent end-to-end',
      'status', v_check_result,
      'details', jsonb_build_object(
        'intent_id', v_intent_id,
        'draft_id', v_draft_id,
        'appointment_id', v_commit_result->>'appointment_id',
        'audit_log_id', v_commit_result->>'audit_log_id',
        'db_write_verified', v_db_write_exists,
        'error', v_error_detail
      )
    );
  EXCEPTION WHEN OTHERS THEN
    v_overall_status := 'FAIL';
    v_checks := v_checks || jsonb_build_object('name', 'SCHEDULING intent end-to-end', 'status', 'FAIL', 'error', SQLERRM);
  END;
  
  -- CHECK 5: MEDICATION_ADMINISTRATION
  BEGIN
    INSERT INTO voice_transcriptions (agency_id, transcription_text, transcription_confidence, transcription_provider)
    VALUES (p_agency_id, 'Give insulin dose now', 0.95, 'test_provider')
    RETURNING id INTO v_test_transcription_id;
    
    SELECT (classify_voice_intent(v_test_transcription_id, p_agency_id, 'Give insulin dose now', 'en', v_test_resident_id, v_test_user_id)->>'intent_id')::uuid INTO v_intent_id;
    SELECT (generate_action_draft_from_intent(v_intent_id, p_agency_id, v_test_resident_id, v_test_user_id)->>'draft_id')::uuid INTO v_draft_id;
    v_commit_result := confirm_and_commit_voice_action(v_draft_id, v_test_user_id, 'approve');
    
    v_error_detail := NULL;
    IF v_commit_result->>'medication_log_id' IS NOT NULL THEN
      SELECT EXISTS(SELECT 1 FROM medication_administration_log WHERE id = (v_commit_result->>'medication_log_id')::uuid) INTO v_db_write_exists;
      IF NOT v_db_write_exists THEN
        v_check_result := 'FAIL';
        v_error_detail := 'Commit returned medication_log_id but medication_administration_log row does not exist';
        v_overall_status := 'FAIL';
      ELSIF v_commit_result->>'audit_log_id' IS NULL THEN
        v_check_result := 'FAIL';
        v_error_detail := 'No audit log created';
        v_overall_status := 'FAIL';
      ELSE
        v_check_result := 'PASS';
      END IF;
    ELSE
      v_check_result := 'FAIL';
      v_error_detail := 'Commit did not return medication_log_id';
      v_overall_status := 'FAIL';
    END IF;
    
    v_checks := v_checks || jsonb_build_object(
      'name', 'MEDICATION_ADMINISTRATION intent end-to-end',
      'status', v_check_result,
      'details', jsonb_build_object(
        'intent_id', v_intent_id,
        'draft_id', v_draft_id,
        'medication_log_id', v_commit_result->>'medication_log_id',
        'audit_log_id', v_commit_result->>'audit_log_id',
        'db_write_verified', v_db_write_exists,
        'error', v_error_detail
      )
    );
  EXCEPTION WHEN OTHERS THEN
    v_overall_status := 'FAIL';
    v_checks := v_checks || jsonb_build_object('name', 'MEDICATION_ADMINISTRATION intent end-to-end', 'status', 'FAIL', 'error', SQLERRM);
  END;
  
  v_checks := v_checks || jsonb_build_object(
    'name', 'All 5 intent types tested',
    'status', CASE WHEN jsonb_array_length(v_checks) = 5 AND v_overall_status = 'PASS' THEN 'PASS' ELSE 'FAIL' END
  );
  
  RETURN jsonb_build_object(
    'overall_status', v_overall_status,
    'total_checks', jsonb_array_length(v_checks),
    'passed', (SELECT COUNT(*) FROM jsonb_array_elements(v_checks) WHERE value->>'status' = 'PASS'),
    'failed', (SELECT COUNT(*) FROM jsonb_array_elements(v_checks) WHERE value->>'status' = 'FAIL'),
    'skipped', 0,
    'checks', v_checks
  );
END;
$$;
