/*
  # STEP 5: Acceptance Verifier

  Automated verifier for voice→ intent → draft → confirm → commit pipeline.
  
  Tests all 5 intent types:
  1. DOCUMENTATION
  2. REQUEST  
  3. URGENT_ACTION
  4. SCHEDULING
  5. MEDICATION_ADMINISTRATION

  Returns PASS only if:
  - All 5 intent types classified
  - All 5 drafts generated
  - All 5 confirmed and committed
  - All 5 have real DB writes
  - All 5 have audit entries
  - Zero SKIP, zero FAIL
*/

CREATE OR REPLACE FUNCTION verify_step5_voice_pipeline(
  p_agency_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_test_job_id uuid;
  v_test_resident_id uuid;
  v_test_user_id uuid;
  v_checks jsonb := '[]';
  v_overall_status text := 'PASS';
  
  -- Intent IDs for each type
  v_doc_intent_id uuid;
  v_req_intent_id uuid;
  v_urgent_intent_id uuid;
  v_sched_intent_id uuid;
  v_med_intent_id uuid;
  
  -- Draft IDs
  v_doc_draft_id uuid;
  v_req_draft_id uuid;
  v_urgent_draft_id uuid;
  v_sched_draft_id uuid;
  v_med_draft_id uuid;
  
  -- Commit results
  v_doc_commit jsonb;
  v_req_commit jsonb;
  v_urgent_commit jsonb;
  v_sched_commit jsonb;
  v_med_commit jsonb;
  
  v_check_result text;
  v_error_msg text;
BEGIN
  -- Get test resident and user
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
  
  v_test_user_id := NULL; -- Will work with anon for showcase
  
  -- CHECK 1: Test DOCUMENTATION intent
  BEGIN
    -- Create voice job
    INSERT INTO voice_transcription_jobs (
      agency_id,
      audio_storage_path,
      audio_filename,
      status,
      transcript_text,
      confidence_score,
      language_detected,
      resident_id
    ) VALUES (
      p_agency_id,
      '/test/audio1.wav',
      'doc_test.wav',
      'completed',
      'Patient ate full breakfast, appeared in good mood',
      0.95,
      'en',
      v_test_resident_id
    )
    RETURNING id INTO v_test_job_id;
    
    -- Classify intent
    SELECT (classify_voice_intent(v_test_job_id, p_agency_id, 'Patient ate full breakfast, appeared in good mood', 'en')->>'intent_id')::uuid
    INTO v_doc_intent_id;
    
    -- Generate draft
    SELECT (generate_action_draft_from_intent(v_doc_intent_id, p_agency_id, v_test_resident_id, v_test_user_id)->>'draft_id')::uuid
    INTO v_doc_draft_id;
    
    -- Confirm and commit
    v_doc_commit := confirm_and_commit_voice_action(v_doc_draft_id, v_test_user_id, 'approve');
    
    -- Verify DB write and audit
    IF v_doc_commit->>'observation_event_id' IS NOT NULL AND v_doc_commit->>'audit_log_id' IS NOT NULL THEN
      v_check_result := 'PASS';
    ELSE
      v_check_result := 'FAIL';
      v_overall_status := 'FAIL';
    END IF;
    
    v_checks := v_checks || jsonb_build_object(
      'name', 'DOCUMENTATION intent end-to-end',
      'status', v_check_result,
      'details', jsonb_build_object(
        'intent_id', v_doc_intent_id,
        'draft_id', v_doc_draft_id,
        'observation_event_id', v_doc_commit->>'observation_event_id',
        'audit_log_id', v_doc_commit->>'audit_log_id'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    v_overall_status := 'FAIL';
    v_checks := v_checks || jsonb_build_object(
      'name', 'DOCUMENTATION intent end-to-end',
      'status', 'FAIL',
      'error', SQLERRM
    );
  END;
  
  -- CHECK 2: Test REQUEST intent
  BEGIN
    INSERT INTO voice_transcription_jobs (
      agency_id,
      audio_storage_path,
      audio_filename,
      status,
      transcript_text,
      confidence_score,
      language_detected
    ) VALUES (
      p_agency_id,
      '/test/audio2.wav',
      'request_test.wav',
      'completed',
      'Need more supplies in room 201',
      0.95,
      'en'
    )
    RETURNING id INTO v_test_job_id;
    
    SELECT (classify_voice_intent(v_test_job_id, p_agency_id, 'Need more supplies in room 201', 'en')->>'intent_id')::uuid
    INTO v_req_intent_id;
    
    SELECT (generate_action_draft_from_intent(v_req_intent_id, p_agency_id, v_test_resident_id, v_test_user_id)->>'draft_id')::uuid
    INTO v_req_draft_id;
    
    v_req_commit := confirm_and_commit_voice_action(v_req_draft_id, v_test_user_id, 'approve');
    
    IF v_req_commit->>'task_id' IS NOT NULL AND v_req_commit->>'audit_log_id' IS NOT NULL THEN
      v_check_result := 'PASS';
    ELSE
      v_check_result := 'FAIL';
      v_overall_status := 'FAIL';
    END IF;
    
    v_checks := v_checks || jsonb_build_object(
      'name', 'REQUEST intent end-to-end',
      'status', v_check_result,
      'details', jsonb_build_object(
        'intent_id', v_req_intent_id,
        'draft_id', v_req_draft_id,
        'task_id', v_req_commit->>'task_id',
        'audit_log_id', v_req_commit->>'audit_log_id'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    v_overall_status := 'FAIL';
    v_checks := v_checks || jsonb_build_object(
      'name', 'REQUEST intent end-to-end',
      'status', 'FAIL',
      'error', SQLERRM
    );
  END;
  
  -- CHECK 3: Test URGENT_ACTION intent
  BEGIN
    INSERT INTO voice_transcription_jobs (
      agency_id,
      audio_storage_path,
      audio_filename,
      status,
      transcript_text,
      confidence_score,
      language_detected,
      resident_id
    ) VALUES (
      p_agency_id,
      '/test/audio3.wav',
      'urgent_test.wav',
      'completed',
      'Patient fell in bathroom, help needed urgently',
      0.95,
      'en',
      v_test_resident_id
    )
    RETURNING id INTO v_test_job_id;
    
    SELECT (classify_voice_intent(v_test_job_id, p_agency_id, 'Patient fell in bathroom, help needed urgently', 'en')->>'intent_id')::uuid
    INTO v_urgent_intent_id;
    
    SELECT (generate_action_draft_from_intent(v_urgent_intent_id, p_agency_id, v_test_resident_id, v_test_user_id)->>'draft_id')::uuid
    INTO v_urgent_draft_id;
    
    v_urgent_commit := confirm_and_commit_voice_action(v_urgent_draft_id, v_test_user_id, 'approve');
    
    IF v_urgent_commit->>'task_id' IS NOT NULL AND v_urgent_commit->>'audit_log_id' IS NOT NULL THEN
      v_check_result := 'PASS';
    ELSE
      v_check_result := 'FAIL';
      v_overall_status := 'FAIL';
    END IF;
    
    v_checks := v_checks || jsonb_build_object(
      'name', 'URGENT_ACTION intent end-to-end',
      'status', v_check_result,
      'details', jsonb_build_object(
        'intent_id', v_urgent_intent_id,
        'draft_id', v_urgent_draft_id,
        'task_id', v_urgent_commit->>'task_id',
        'audit_log_id', v_urgent_commit->>'audit_log_id'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    v_overall_status := 'FAIL';
    v_checks := v_checks || jsonb_build_object(
      'name', 'URGENT_ACTION intent end-to-end',
      'status', 'FAIL',
      'error', SQLERRM
    );
  END;
  
  -- CHECK 4: Test SCHEDULING intent
  BEGIN
    INSERT INTO voice_transcription_jobs (
      agency_id,
      audio_storage_path,
      audio_filename,
      status,
      transcript_text,
      confidence_score,
      language_detected,
      resident_id
    ) VALUES (
      p_agency_id,
      '/test/audio4.wav',
      'schedule_test.wav',
      'completed',
      'Schedule doctor appointment for tomorrow',
      0.95,
      'en',
      v_test_resident_id
    )
    RETURNING id INTO v_test_job_id;
    
    SELECT (classify_voice_intent(v_test_job_id, p_agency_id, 'Schedule doctor appointment for tomorrow', 'en')->>'intent_id')::uuid
    INTO v_sched_intent_id;
    
    SELECT (generate_action_draft_from_intent(v_sched_intent_id, p_agency_id, v_test_resident_id, v_test_user_id)->>'draft_id')::uuid
    INTO v_sched_draft_id;
    
    v_sched_commit := confirm_and_commit_voice_action(v_sched_draft_id, v_test_user_id, 'approve');
    
    IF v_sched_commit->>'appointment_id' IS NOT NULL AND v_sched_commit->>'audit_log_id' IS NOT NULL THEN
      v_check_result := 'PASS';
    ELSE
      v_check_result := 'FAIL';
      v_overall_status := 'FAIL';
    END IF;
    
    v_checks := v_checks || jsonb_build_object(
      'name', 'SCHEDULING intent end-to-end',
      'status', v_check_result,
      'details', jsonb_build_object(
        'intent_id', v_sched_intent_id,
        'draft_id', v_sched_draft_id,
        'appointment_id', v_sched_commit->>'appointment_id',
        'audit_log_id', v_sched_commit->>'audit_log_id'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    v_overall_status := 'FAIL';
    v_checks := v_checks || jsonb_build_object(
      'name', 'SCHEDULING intent end-to-end',
      'status', 'FAIL',
      'error', SQLERRM
    );
  END;
  
  -- CHECK 5: Test MEDICATION_ADMINISTRATION intent
  BEGIN
    INSERT INTO voice_transcription_jobs (
      agency_id,
      audio_storage_path,
      audio_filename,
      status,
      transcript_text,
      confidence_score,
      language_detected,
      resident_id
    ) VALUES (
      p_agency_id,
      '/test/audio5.wav',
      'med_test.wav',
      'completed',
      'Give insulin dose now',
      0.95,
      'en',
      v_test_resident_id
    )
    RETURNING id INTO v_test_job_id;
    
    SELECT (classify_voice_intent(v_test_job_id, p_agency_id, 'Give insulin dose now', 'en')->>'intent_id')::uuid
    INTO v_med_intent_id;
    
    SELECT (generate_action_draft_from_intent(v_med_intent_id, p_agency_id, v_test_resident_id, v_test_user_id)->>'draft_id')::uuid
    INTO v_med_draft_id;
    
    v_med_commit := confirm_and_commit_voice_action(v_med_draft_id, v_test_user_id, 'approve');
    
    IF v_med_commit->>'medication_log_id' IS NOT NULL AND v_med_commit->>'audit_log_id' IS NOT NULL THEN
      v_check_result := 'PASS';
    ELSE
      v_check_result := 'FAIL';
      v_overall_status := 'FAIL';
    END IF;
    
    v_checks := v_checks || jsonb_build_object(
      'name', 'MEDICATION_ADMINISTRATION intent end-to-end',
      'status', v_check_result,
      'details', jsonb_build_object(
        'intent_id', v_med_intent_id,
        'draft_id', v_med_draft_id,
        'medication_log_id', v_med_commit->>'medication_log_id',
        'audit_log_id', v_med_commit->>'audit_log_id'
      )
    );
  EXCEPTION WHEN OTHERS THEN
    v_overall_status := 'FAIL';
    v_checks := v_checks || jsonb_build_object(
      'name', 'MEDICATION_ADMINISTRATION intent end-to-end',
      'status', 'FAIL',
      'error', SQLERRM
    );
  END;
  
  -- Summary check
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

GRANT EXECUTE ON FUNCTION verify_step5_voice_pipeline(uuid) TO authenticated, anon;
