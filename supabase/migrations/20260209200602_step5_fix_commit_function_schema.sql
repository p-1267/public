/*
  # STEP 5: Fix commit function to match actual table schemas
*/

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
        -- Create observation event (correct schema)
        INSERT INTO observation_events (
          resident_id,
          agency_id,
          event_type,
          caregiver_id,
          event_data,
          observation_quality,
          idempotency_key,
          event_timestamp
        ) VALUES (
          v_draft.resident_id,
          v_draft.agency_id,
          'voice_documentation',
          p_user_id,
          jsonb_build_object('content', v_payload->>'content', 'source', 'voice'),
          80,
          gen_random_uuid()::text,
          now()
        )
        RETURNING id INTO v_obs_event_id;

      WHEN 'MEDICATION_ADMINISTRATION' THEN
        -- Create medication log (correct schema)
        INSERT INTO medication_administration_log (
          resident_id,
          medication_id,
          administered_at,
          administered_by,
          status,
          dosage_given,
          route_used,
          idempotency_key
        )
        SELECT
          v_draft.resident_id,
          rm.id,
          now(),
          p_user_id,
          'administered',
          v_payload->>'dose',
          v_payload->>'route',
          gen_random_uuid()::text
        FROM resident_medications rm
        WHERE rm.resident_id = v_draft.resident_id
        LIMIT 1
        RETURNING id INTO v_med_log_id;

      WHEN 'URGENT_ACTION' THEN
        -- Create urgent task (correct schema)
        INSERT INTO tasks (
          resident_id,
          agency_id,
          category_id,
          task_name,
          description,
          priority,
          state,
          scheduled_start,
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
        -- Create request task (correct schema)
        INSERT INTO tasks (
          agency_id,
          category_id,
          task_name,
          description,
          priority,
          state,
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
        -- Create appointment (correct schema)
        INSERT INTO appointments (
          resident_id,
          appointment_type,
          title,
          description,
          scheduled_at,
          status,
          provider_name
        ) VALUES (
          v_draft.resident_id,
          v_payload->>'appointment_type',
          'Appointment: ' || (v_payload->>'description'),
          v_payload->>'description',
          COALESCE((v_payload->>'scheduled_for')::timestamptz, now() + interval '1 day'),
          'scheduled',
          'Provider'
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
