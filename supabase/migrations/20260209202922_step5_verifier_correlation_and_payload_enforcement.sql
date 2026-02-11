/*
  # STEP 5: Truth-Enforced Verifier with Correlation and Payload Verification
  
  Verifies:
  1. DB write exists
  2. DB write was created BY this specific confirmation (correlation tracking)
  3. Payload correctness (REQUEST=normal, URGENT_ACTION=urgent+emergency)
  4. Audit log contains full lineage
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
  
  v_db_row record;
  v_audit_row record;
  v_confirmation_id uuid;
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
  
  -- CHECK 1: DOCUMENTATION - verify correlation in observation_events
  BEGIN
    INSERT INTO voice_transcriptions (agency_id, transcription_text, transcription_confidence, transcription_provider)
    VALUES (p_agency_id, 'Patient ate full breakfast, appeared in good mood', 0.95, 'test_provider')
    RETURNING id INTO v_test_transcription_id;
    
    SELECT (classify_voice_intent(v_test_transcription_id, p_agency_id, 'Patient ate full breakfast, appeared in good mood', 'en', v_test_resident_id, v_test_user_id)->>'intent_id')::uuid INTO v_intent_id;
    SELECT (generate_action_draft_from_intent(v_intent_id, p_agency_id, v_test_resident_id, v_test_user_id)->>'draft_id')::uuid INTO v_draft_id;
    v_commit_result := confirm_and_commit_voice_action(v_draft_id, v_test_user_id, 'approve');
    
    v_confirmation_id := (v_commit_result->>'confirmation_id')::uuid;
    v_error_detail := NULL;
    
    IF v_commit_result->>'observation_event_id' IS NOT NULL THEN
      SELECT * INTO v_db_row FROM observation_events WHERE id = (v_commit_result->>'observation_event_id')::uuid;
      SELECT * INTO v_audit_row FROM audit_log WHERE id = (v_commit_result->>'audit_log_id')::uuid;
      
      IF NOT FOUND THEN
        v_check_result := 'FAIL';
        v_error_detail := 'observation_event row does not exist';
        v_overall_status := 'FAIL';
      ELSIF v_db_row.source_id != v_draft_id THEN
        v_check_result := 'FAIL';
        v_error_detail := 'observation_event.source_id does not match draft_id (correlation broken)';
        v_overall_status := 'FAIL';
      ELSIF v_db_row.event_data->>'voice_confirmation_id' != v_confirmation_id::text THEN
        v_check_result := 'FAIL';
        v_error_detail := 'event_data missing voice_confirmation_id (correlation broken)';
        v_overall_status := 'FAIL';
      ELSIF v_audit_row.metadata->>'confirmation_id' != v_confirmation_id::text THEN
        v_check_result := 'FAIL';
        v_error_detail := 'audit_log missing confirmation_id in metadata';
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
      'name', 'DOCUMENTATION - correlation verified',
      'status', v_check_result,
      'details', jsonb_build_object(
        'confirmation_id', v_confirmation_id,
        'draft_id', v_draft_id,
        'source_id_match', CASE WHEN v_db_row.source_id = v_draft_id THEN true ELSE false END,
        'correlation_in_event_data', v_db_row.event_data->>'voice_confirmation_id',
        'correlation_in_audit', v_audit_row.metadata->>'confirmation_id',
        'error', v_error_detail
      )
    );
  EXCEPTION WHEN OTHERS THEN
    v_overall_status := 'FAIL';
    v_checks := v_checks || jsonb_build_object('name', 'DOCUMENTATION - correlation verified', 'status', 'FAIL', 'error', SQLERRM);
  END;
  
  -- CHECK 2: REQUEST - verify normal priority, correlation in tasks
  BEGIN
    INSERT INTO voice_transcriptions (agency_id, transcription_text, transcription_confidence, transcription_provider)
    VALUES (p_agency_id, 'Need more supplies in room 201', 0.95, 'test_provider')
    RETURNING id INTO v_test_transcription_id;
    
    SELECT (classify_voice_intent(v_test_transcription_id, p_agency_id, 'Need more supplies in room 201', 'en', v_test_resident_id, v_test_user_id)->>'intent_id')::uuid INTO v_intent_id;
    SELECT (generate_action_draft_from_intent(v_intent_id, p_agency_id, v_test_resident_id, v_test_user_id)->>'draft_id')::uuid INTO v_draft_id;
    v_commit_result := confirm_and_commit_voice_action(v_draft_id, v_test_user_id, 'approve');
    
    v_confirmation_id := (v_commit_result->>'confirmation_id')::uuid;
    v_error_detail := NULL;
    
    IF v_commit_result->>'task_id' IS NOT NULL THEN
      SELECT * INTO v_db_row FROM tasks WHERE id = (v_commit_result->>'task_id')::uuid;
      SELECT * INTO v_audit_row FROM audit_log WHERE id = (v_commit_result->>'audit_log_id')::uuid;
      
      IF NOT FOUND THEN
        v_check_result := 'FAIL';
        v_error_detail := 'task row does not exist';
        v_overall_status := 'FAIL';
      ELSIF v_db_row.metadata->>'voice_confirmation_id' != v_confirmation_id::text THEN
        v_check_result := 'FAIL';
        v_error_detail := 'task.metadata missing voice_confirmation_id (correlation broken)';
        v_overall_status := 'FAIL';
      ELSIF v_db_row.priority != 'normal' THEN
        v_check_result := 'FAIL';
        v_error_detail := 'REQUEST created task with priority=' || v_db_row.priority || ' (expected normal)';
        v_overall_status := 'FAIL';
      ELSIF v_db_row.agency_id != p_agency_id THEN
        v_check_result := 'FAIL';
        v_error_detail := 'task.agency_id does not match';
        v_overall_status := 'FAIL';
      ELSIF v_audit_row.metadata->>'confirmation_id' != v_confirmation_id::text THEN
        v_check_result := 'FAIL';
        v_error_detail := 'audit_log missing confirmation_id in metadata';
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
      'name', 'REQUEST - normal priority + correlation',
      'status', v_check_result,
      'details', jsonb_build_object(
        'confirmation_id', v_confirmation_id,
        'draft_id', v_draft_id,
        'task_priority', v_db_row.priority,
        'expected_priority', 'normal',
        'correlation_in_metadata', v_db_row.metadata->>'voice_confirmation_id',
        'correlation_in_audit', v_audit_row.metadata->>'confirmation_id',
        'error', v_error_detail
      )
    );
  EXCEPTION WHEN OTHERS THEN
    v_overall_status := 'FAIL';
    v_checks := v_checks || jsonb_build_object('name', 'REQUEST - normal priority + correlation', 'status', 'FAIL', 'error', SQLERRM);
  END;
  
  -- CHECK 3: URGENT_ACTION - verify urgent priority, escalation, emergency flags
  BEGIN
    INSERT INTO voice_transcriptions (agency_id, transcription_text, transcription_confidence, transcription_provider)
    VALUES (p_agency_id, 'Patient fell in bathroom, help needed urgently', 0.95, 'test_provider')
    RETURNING id INTO v_test_transcription_id;
    
    SELECT (classify_voice_intent(v_test_transcription_id, p_agency_id, 'Patient fell in bathroom, help needed urgently', 'en', v_test_resident_id, v_test_user_id)->>'intent_id')::uuid INTO v_intent_id;
    SELECT (generate_action_draft_from_intent(v_intent_id, p_agency_id, v_test_resident_id, v_test_user_id)->>'draft_id')::uuid INTO v_draft_id;
    v_commit_result := confirm_and_commit_voice_action(v_draft_id, v_test_user_id, 'approve');
    
    v_confirmation_id := (v_commit_result->>'confirmation_id')::uuid;
    v_error_detail := NULL;
    
    IF v_commit_result->>'task_id' IS NOT NULL THEN
      SELECT * INTO v_db_row FROM tasks WHERE id = (v_commit_result->>'task_id')::uuid;
      SELECT * INTO v_audit_row FROM audit_log WHERE id = (v_commit_result->>'audit_log_id')::uuid;
      
      IF NOT FOUND THEN
        v_check_result := 'FAIL';
        v_error_detail := 'task row does not exist';
        v_overall_status := 'FAIL';
      ELSIF v_db_row.metadata->>'voice_confirmation_id' != v_confirmation_id::text THEN
        v_check_result := 'FAIL';
        v_error_detail := 'task.metadata missing voice_confirmation_id (correlation broken)';
        v_overall_status := 'FAIL';
      ELSIF v_db_row.priority != 'urgent' THEN
        v_check_result := 'FAIL';
        v_error_detail := 'URGENT_ACTION created task with priority=' || v_db_row.priority || ' (expected urgent)';
        v_overall_status := 'FAIL';
      ELSIF v_db_row.escalation_level IS NULL OR v_db_row.escalation_level < 1 THEN
        v_check_result := 'FAIL';
        v_error_detail := 'URGENT_ACTION task missing escalation_level';
        v_overall_status := 'FAIL';
      ELSIF v_db_row.is_emergency IS NOT TRUE THEN
        v_check_result := 'FAIL';
        v_error_detail := 'URGENT_ACTION task missing is_emergency flag';
        v_overall_status := 'FAIL';
      ELSIF v_db_row.resident_id != v_test_resident_id THEN
        v_check_result := 'FAIL';
        v_error_detail := 'task.resident_id does not match';
        v_overall_status := 'FAIL';
      ELSIF v_audit_row.metadata->>'confirmation_id' != v_confirmation_id::text THEN
        v_check_result := 'FAIL';
        v_error_detail := 'audit_log missing confirmation_id in metadata';
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
      'name', 'URGENT_ACTION - urgent+emergency+escalation',
      'status', v_check_result,
      'details', jsonb_build_object(
        'confirmation_id', v_confirmation_id,
        'draft_id', v_draft_id,
        'task_priority', v_db_row.priority,
        'expected_priority', 'urgent',
        'escalation_level', v_db_row.escalation_level,
        'is_emergency', v_db_row.is_emergency,
        'resident_id_match', v_db_row.resident_id = v_test_resident_id,
        'correlation_in_metadata', v_db_row.metadata->>'voice_confirmation_id',
        'error', v_error_detail
      )
    );
  EXCEPTION WHEN OTHERS THEN
    v_overall_status := 'FAIL';
    v_checks := v_checks || jsonb_build_object('name', 'URGENT_ACTION - urgent+emergency+escalation', 'status', 'FAIL', 'error', SQLERRM);
  END;
  
  -- CHECK 4: SCHEDULING
  BEGIN
    INSERT INTO voice_transcriptions (agency_id, transcription_text, transcription_confidence, transcription_provider)
    VALUES (p_agency_id, 'Schedule doctor appointment for tomorrow', 0.95, 'test_provider')
    RETURNING id INTO v_test_transcription_id;
    
    SELECT (classify_voice_intent(v_test_transcription_id, p_agency_id, 'Schedule doctor appointment for tomorrow', 'en', v_test_resident_id, v_test_user_id)->>'intent_id')::uuid INTO v_intent_id;
    SELECT (generate_action_draft_from_intent(v_intent_id, p_agency_id, v_test_resident_id, v_test_user_id)->>'draft_id')::uuid INTO v_draft_id;
    v_commit_result := confirm_and_commit_voice_action(v_draft_id, v_test_user_id, 'approve');
    
    v_confirmation_id := (v_commit_result->>'confirmation_id')::uuid;
    v_error_detail := NULL;
    
    IF v_commit_result->>'appointment_id' IS NOT NULL THEN
      SELECT * INTO v_db_row FROM appointments WHERE id = (v_commit_result->>'appointment_id')::uuid;
      SELECT * INTO v_audit_row FROM audit_log WHERE id = (v_commit_result->>'audit_log_id')::uuid;
      
      IF NOT FOUND THEN
        v_check_result := 'FAIL';
        v_error_detail := 'appointment row does not exist';
        v_overall_status := 'FAIL';
      ELSIF v_db_row.resident_id != v_test_resident_id THEN
        v_check_result := 'FAIL';
        v_error_detail := 'appointment.resident_id does not match';
        v_overall_status := 'FAIL';
      ELSIF v_audit_row.metadata->>'confirmation_id' != v_confirmation_id::text THEN
        v_check_result := 'FAIL';
        v_error_detail := 'audit_log missing confirmation_id in metadata';
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
      'name', 'SCHEDULING - appointment created',
      'status', v_check_result,
      'details', jsonb_build_object(
        'confirmation_id', v_confirmation_id,
        'draft_id', v_draft_id,
        'resident_id_match', CASE WHEN v_db_row.resident_id = v_test_resident_id THEN true ELSE false END,
        'error', v_error_detail
      )
    );
  EXCEPTION WHEN OTHERS THEN
    v_overall_status := 'FAIL';
    v_checks := v_checks || jsonb_build_object('name', 'SCHEDULING - appointment created', 'status', 'FAIL', 'error', SQLERRM);
  END;
  
  -- CHECK 5: MEDICATION_ADMINISTRATION
  BEGIN
    INSERT INTO voice_transcriptions (agency_id, transcription_text, transcription_confidence, transcription_provider)
    VALUES (p_agency_id, 'Give insulin dose now', 0.95, 'test_provider')
    RETURNING id INTO v_test_transcription_id;
    
    SELECT (classify_voice_intent(v_test_transcription_id, p_agency_id, 'Give insulin dose now', 'en', v_test_resident_id, v_test_user_id)->>'intent_id')::uuid INTO v_intent_id;
    SELECT (generate_action_draft_from_intent(v_intent_id, p_agency_id, v_test_resident_id, v_test_user_id)->>'draft_id')::uuid INTO v_draft_id;
    v_commit_result := confirm_and_commit_voice_action(v_draft_id, v_test_user_id, 'approve');
    
    v_confirmation_id := (v_commit_result->>'confirmation_id')::uuid;
    v_error_detail := NULL;
    
    IF v_commit_result->>'medication_log_id' IS NOT NULL THEN
      SELECT * INTO v_db_row FROM medication_administration_log WHERE id = (v_commit_result->>'medication_log_id')::uuid;
      SELECT * INTO v_audit_row FROM audit_log WHERE id = (v_commit_result->>'audit_log_id')::uuid;
      
      IF NOT FOUND THEN
        v_check_result := 'FAIL';
        v_error_detail := 'medication_administration_log row does not exist';
        v_overall_status := 'FAIL';
      ELSIF v_db_row.notes NOT LIKE '%' || v_confirmation_id::text || '%' THEN
        v_check_result := 'FAIL';
        v_error_detail := 'medication log notes missing confirmation_id (correlation broken)';
        v_overall_status := 'FAIL';
      ELSIF v_db_row.resident_id != v_test_resident_id THEN
        v_check_result := 'FAIL';
        v_error_detail := 'medication log resident_id does not match';
        v_overall_status := 'FAIL';
      ELSIF v_audit_row.metadata->>'confirmation_id' != v_confirmation_id::text THEN
        v_check_result := 'FAIL';
        v_error_detail := 'audit_log missing confirmation_id in metadata';
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
      'name', 'MEDICATION_ADMINISTRATION - correlation',
      'status', v_check_result,
      'details', jsonb_build_object(
        'confirmation_id', v_confirmation_id,
        'draft_id', v_draft_id,
        'correlation_in_notes', CASE WHEN v_db_row.notes LIKE '%' || v_confirmation_id::text || '%' THEN true ELSE false END,
        'resident_id_match', CASE WHEN v_db_row.resident_id = v_test_resident_id THEN true ELSE false END,
        'error', v_error_detail
      )
    );
  EXCEPTION WHEN OTHERS THEN
    v_overall_status := 'FAIL';
    v_checks := v_checks || jsonb_build_object('name', 'MEDICATION_ADMINISTRATION - correlation', 'status', 'FAIL', 'error', SQLERRM);
  END;
  
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
