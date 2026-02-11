/*
  # STEP 5: Voice Pipeline RPCs (Intent → Draft → Confirm → Commit)

  Works with existing voice tables:
  - voice_intents
  - voice_action_drafts
  - voice_action_confirmations

  RPCs for full pipeline: voice → intent → draft → confirm → commit → DB writes + audit
*/

-- Generate action draft from intent (using existing table schema)
CREATE OR REPLACE FUNCTION generate_action_draft_from_intent(
  p_intent_id uuid,
  p_agency_id uuid,
  p_resident_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_intent record;
  v_draft_id uuid;
  v_payload jsonb;
  v_preview text;
  v_conflicts jsonb := '[]';
BEGIN
  -- Get intent
  SELECT * INTO v_intent
  FROM voice_intents
  WHERE id = p_intent_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Intent not found');
  END IF;

  -- Generate structured payload based on intent type
  CASE v_intent.intent_type
    WHEN 'MEDICATION_ADMINISTRATION' THEN
      v_payload := jsonb_build_object(
        'type', 'medication_administration',
        'resident_id', p_resident_id,
        'medication_name', 'Medication',
        'dose', 'Standard dose',
        'route', 'Oral',
        'administered_at', now(),
        'notes', v_intent.raw_transcript
      );
      v_preview := 'Medication Administration: ' || v_intent.raw_transcript;

    WHEN 'URGENT_ACTION' THEN
      v_payload := jsonb_build_object(
        'type', 'urgent_action',
        'resident_id', p_resident_id,
        'urgency', 'high',
        'description', v_intent.raw_transcript,
        'reported_at', now()
      );
      v_preview := 'URGENT: ' || v_intent.raw_transcript;

    WHEN 'REQUEST' THEN
      v_payload := jsonb_build_object(
        'type', 'request',
        'request_type', 'supply',
        'description', v_intent.raw_transcript,
        'requested_at', now()
      );
      v_preview := 'Request: ' || v_intent.raw_transcript;

    WHEN 'SCHEDULING' THEN
      v_payload := jsonb_build_object(
        'type', 'scheduling',
        'resident_id', p_resident_id,
        'appointment_type', 'general',
        'description', v_intent.raw_transcript,
        'scheduled_for', now() + interval '1 day'
      );
      v_preview := 'Schedule: ' || v_intent.raw_transcript;

    ELSE -- DOCUMENTATION
      v_payload := jsonb_build_object(
        'type', 'documentation',
        'resident_id', p_resident_id,
        'note_type', 'general',
        'content', v_intent.raw_transcript,
        'documented_at', now()
      );
      v_preview := 'Documentation: ' || v_intent.raw_transcript;
  END CASE;

  -- Check for conflicts
  IF LOWER(v_intent.raw_transcript) LIKE '%duplicate%' OR LOWER(v_intent.raw_transcript) LIKE '%again%' THEN
    v_conflicts := jsonb_build_array(
      jsonb_build_object(
        'type', 'potential_duplicate',
        'message', 'Transcript may indicate duplicate action'
      )
    );
  END IF;

  -- Create draft using existing table schema
  INSERT INTO voice_action_drafts (
    intent_classification_id,
    resident_id,
    user_id,
    agency_id,
    action_type,
    draft_status,
    structured_payload,
    human_readable_preview,
    safety_warnings,
    validation_status,
    drafted_at,
    expires_at
  ) VALUES (
    p_intent_id,
    p_resident_id,
    p_user_id,
    p_agency_id,
    v_intent.intent_type,
    'pending_confirmation',
    v_payload,
    v_preview,
    v_conflicts,
    CASE WHEN jsonb_array_length(v_conflicts) > 0 THEN 'warning' ELSE 'valid' END,
    now(),
    now() + interval '15 minutes'
  )
  RETURNING id INTO v_draft_id;

  RETURN jsonb_build_object(
    'success', true,
    'draft_id', v_draft_id,
    'action_type', v_intent.intent_type,
    'preview', v_preview,
    'payload', v_payload,
    'conflicts', v_conflicts,
    'requires_confirmation', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION generate_action_draft_from_intent(uuid, uuid, uuid, uuid) TO authenticated, anon;

-- Confirm and commit action (using existing table schema)
CREATE OR REPLACE FUNCTION confirm_and_commit_voice_action(
  p_draft_id uuid,
  p_user_id uuid DEFAULT NULL,
  p_decision text DEFAULT 'approve'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_draft record;
  v_confirm_id uuid;
  v_task_id uuid;
  v_obs_event_id uuid;
  v_med_log_id uuid;
  v_appt_id uuid;
  v_audit_id uuid;
  v_payload jsonb;
BEGIN
  -- Get draft
  SELECT * INTO v_draft
  FROM voice_action_drafts
  WHERE id = p_draft_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Draft not found');
  END IF;

  v_payload := v_draft.structured_payload;

  -- Perform DB writes based on action type
  IF p_decision = 'approve' THEN
    CASE v_draft.action_type
      WHEN 'DOCUMENTATION' THEN
        -- Create observation event
        INSERT INTO observation_events (
          resident_id,
          agency_id,
          event_type,
          observed_by,
          observation_text,
          quality_score,
          idempotency_key,
          observed_at
        ) VALUES (
          v_draft.resident_id,
          v_draft.agency_id,
          'voice_documentation',
          p_user_id,
          v_payload->>'content',
          80,
          gen_random_uuid()::text,
          now()
        )
        RETURNING id INTO v_obs_event_id;

      WHEN 'MEDICATION_ADMINISTRATION' THEN
        -- Create medication log
        INSERT INTO medication_administration_log (
          resident_id,
          user_id,
          agency_id,
          medication_name,
          dose,
          route,
          administered_at,
          status,
          notes,
          idempotency_key
        ) VALUES (
          v_draft.resident_id,
          p_user_id,
          v_draft.agency_id,
          v_payload->>'medication_name',
          v_payload->>'dose',
          v_payload->>'route',
          now(),
          'administered',
          v_payload->>'notes',
          gen_random_uuid()::text
        )
        RETURNING id INTO v_med_log_id;

      WHEN 'URGENT_ACTION' THEN
        -- Create urgent task
        INSERT INTO tasks (
          resident_id,
          agency_id,
          category_id,
          title,
          description,
          priority,
          status,
          due_at,
          idempotency_key
        )
        SELECT
          v_draft.resident_id,
          v_draft.agency_id,
          tc.id,
          'URGENT: ' || (v_payload->>'description'),
          v_payload->>'description',
          'urgent',
          'pending',
          now() + interval '15 minutes',
          gen_random_uuid()::text
        FROM task_categories tc
        WHERE tc.category_name = 'Emergency Response'
        LIMIT 1
        RETURNING id INTO v_task_id;

      WHEN 'REQUEST' THEN
        -- Create request task
        INSERT INTO tasks (
          agency_id,
          category_id,
          title,
          description,
          priority,
          status,
          idempotency_key
        )
        SELECT
          v_draft.agency_id,
          tc.id,
          'Request: ' || (v_payload->>'request_type'),
          v_payload->>'description',
          'normal',
          'pending',
          gen_random_uuid()::text
        FROM task_categories tc
        WHERE tc.category_name = 'Housekeeping'
        LIMIT 1
        RETURNING id INTO v_task_id;

      WHEN 'SCHEDULING' THEN
        -- Create appointment
        INSERT INTO resident_appointments (
          resident_id,
          agency_id,
          appointment_type,
          provider_name,
          appointment_datetime,
          status,
          notes
        ) VALUES (
          v_draft.resident_id,
          v_draft.agency_id,
          v_payload->>'appointment_type',
          'Provider',
          COALESCE((v_payload->>'scheduled_for')::timestamptz, now() + interval '1 day'),
          'SCHEDULED',
          v_payload->>'description'
        )
        RETURNING id INTO v_appt_id;

    END CASE;

    -- Create audit log entry
    INSERT INTO audit_log (
      action_type,
      actor_id,
      target_type,
      target_id,
      metadata,
      created_at
    ) VALUES (
      'voice_action.committed',
      p_user_id,
      'voice_action_draft',
      p_draft_id,
      jsonb_build_object(
        'action_type', v_draft.action_type,
        'task_id', v_task_id,
        'observation_event_id', v_obs_event_id,
        'medication_log_id', v_med_log_id,
        'appointment_id', v_appt_id
      ),
      now()
    )
    RETURNING id INTO v_audit_id;
  END IF;

  -- Create confirmation record
  INSERT INTO voice_action_confirmations (
    action_draft_id,
    resident_id,
    user_id,
    agency_id,
    decision,
    decision_reason,
    execution_status,
    execution_result,
    confirmed_at,
    executed_at,
    created_medication_admin_id,
    created_task_id,
    created_observation_id
  ) VALUES (
    p_draft_id,
    v_draft.resident_id,
    p_user_id,
    v_draft.agency_id,
    p_decision,
    'User confirmed action',
    CASE WHEN p_decision = 'approve' THEN 'success' ELSE 'rejected' END,
    jsonb_build_object(
      'task_id', v_task_id,
      'observation_event_id', v_obs_event_id,
      'medication_log_id', v_med_log_id,
      'appointment_id', v_appt_id,
      'audit_log_id', v_audit_id
    ),
    now(),
    now(),
    v_med_log_id,
    v_task_id,
    v_obs_event_id
  )
  RETURNING id INTO v_confirm_id;

  -- Update draft status
  UPDATE voice_action_drafts
  SET draft_status = CASE WHEN p_decision = 'approve' THEN 'executed' ELSE 'rejected' END,
      reviewed_at = now(),
      reviewed_by = p_user_id
  WHERE id = p_draft_id;

  RETURN jsonb_build_object(
    'success', true,
    'confirmation_id', v_confirm_id,
    'task_id', v_task_id,
    'observation_event_id', v_obs_event_id,
    'medication_log_id', v_med_log_id,
    'appointment_id', v_appt_id,
    'audit_log_id', v_audit_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION confirm_and_commit_voice_action(uuid, uuid, text) TO authenticated, anon;
