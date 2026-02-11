/*
  # Fix Voice Commit Function - Schema Compliance
  
  Fixes:
  - observation_events event_type must be 'care_activity'
  - tasks requires scheduled_start AND scheduled_end (not null)
  - medication_administration_log uses resident_response for correlation (no notes column)
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
  v_user_id_for_insert uuid;
BEGIN
  SELECT * INTO v_draft FROM voice_action_drafts WHERE id = p_draft_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Draft not found');
  END IF;

  v_payload := v_draft.structured_payload;
  v_user_id_for_insert := COALESCE(p_user_id, '00000000-0000-0000-0000-000000000000'::uuid);
  v_confirm_id := gen_random_uuid();

  IF p_decision = 'approve' THEN
    CASE v_draft.action_type
      WHEN 'DOCUMENTATION' THEN
        INSERT INTO observation_events (
          resident_id,
          agency_id,
          event_type,
          event_subtype,
          caregiver_id,
          event_data,
          observation_quality,
          idempotency_key,
          event_timestamp,
          source_table,
          source_id
        ) VALUES (
          v_draft.resident_id,
          v_draft.agency_id,
          'care_activity',
          'voice_documentation',
          v_user_id_for_insert,
          jsonb_build_object(
            'content', v_payload->>'content',
            'source', 'voice',
            'voice_draft_id', p_draft_id,
            'voice_confirmation_id', v_confirm_id
          ),
          80,
          gen_random_uuid(),
          now(),
          'voice_action_drafts',
          p_draft_id
        )
        RETURNING id INTO v_obs_event_id;

      WHEN 'MEDICATION_ADMINISTRATION' THEN
        INSERT INTO medication_administration_log (
          resident_id,
          medication_id,
          administered_at,
          administered_by,
          status,
          dosage_given,
          route_used,
          resident_response,
          idempotency_key,
          language_context,
          is_controlled,
          dual_verification_required
        )
        SELECT
          v_draft.resident_id,
          rm.id,
          now(),
          v_user_id_for_insert,
          'administered',
          v_payload->>'dose',
          v_payload->>'route',
          'Voice action - draft_id: ' || p_draft_id || ', confirmation_id: ' || v_confirm_id,
          gen_random_uuid(),
          'en',
          false,
          false
        FROM resident_medications rm
        WHERE rm.resident_id = v_draft.resident_id
        LIMIT 1
        RETURNING id INTO v_med_log_id;

      WHEN 'URGENT_ACTION' THEN
        INSERT INTO tasks (
          resident_id,
          agency_id,
          category_id,
          task_name,
          description,
          priority,
          escalation_level,
          is_emergency,
          state,
          scheduled_start,
          scheduled_end,
          idempotency_key,
          metadata
        )
        SELECT
          v_draft.resident_id,
          v_draft.agency_id,
          tc.id,
          'URGENT: ' || (v_payload->>'description'),
          v_payload->>'description',
          'urgent',
          1,
          true,
          'pending',
          now(),
          now() + interval '1 hour',
          gen_random_uuid(),
          jsonb_build_object(
            'voice_draft_id', p_draft_id,
            'voice_confirmation_id', v_confirm_id,
            'source', 'voice_urgent_action'
          )
        FROM task_categories tc
        WHERE tc.name = 'NURSING' OR tc.name = 'Wellness Check'
        LIMIT 1
        RETURNING id INTO v_task_id;

      WHEN 'REQUEST' THEN
        INSERT INTO tasks (
          resident_id,
          agency_id,
          category_id,
          task_name,
          description,
          priority,
          state,
          scheduled_start,
          scheduled_end,
          idempotency_key,
          metadata
        )
        SELECT
          v_draft.agency_id,
          v_draft.agency_id,
          tc.id,
          'Request: ' || (v_payload->>'request_type'),
          v_payload->>'description',
          'normal',
          'pending',
          now() + interval '1 hour',
          now() + interval '4 hours',
          gen_random_uuid(),
          jsonb_build_object(
            'voice_draft_id', p_draft_id,
            'voice_confirmation_id', v_confirm_id,
            'source', 'voice_request'
          )
        FROM task_categories tc
        WHERE tc.name = 'HOUSEKEEPING' OR tc.name = 'Room Cleaning'
        LIMIT 1
        RETURNING id INTO v_task_id;

      WHEN 'SCHEDULING' THEN
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
          'DOCTOR_VISIT',
          'Appointment: ' || LEFT(v_payload->>'description', 50),
          v_payload->>'description',
          COALESCE((v_payload->>'scheduled_for')::timestamptz, now() + interval '1 day'),
          'SCHEDULED',
          'Provider'
        )
        RETURNING id INTO v_appt_id;

    END CASE;

    INSERT INTO audit_log (
      action_type,
      actor_id,
      target_type,
      target_id,
      metadata,
      created_at
    ) VALUES (
      'voice_action.committed',
      v_user_id_for_insert,
      'voice_action_draft',
      p_draft_id,
      jsonb_build_object(
        'action_type', v_draft.action_type,
        'task_id', v_task_id,
        'observation_event_id', v_obs_event_id,
        'medication_log_id', v_med_log_id,
        'appointment_id', v_appt_id,
        'confirmation_id', v_confirm_id
      ),
      now()
    )
    RETURNING id INTO v_audit_id;
  END IF;

  INSERT INTO voice_action_confirmations (
    id,
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
    v_confirm_id,
    p_draft_id,
    v_draft.resident_id,
    v_user_id_for_insert,
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
  );

  UPDATE voice_action_drafts
  SET draft_status = CASE WHEN p_decision = 'approve' THEN 'executed' ELSE 'rejected' END,
      reviewed_at = now(),
      reviewed_by = v_user_id_for_insert
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
