/*
  # STEP 5: Fix draft and commit RPCs to match correct table schemas
*/

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
  v_warnings text[] := '{}';
BEGIN
  -- Get intent from voice_intent_classifications
  SELECT * INTO v_intent
  FROM voice_intent_classifications
  WHERE id = p_intent_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Intent not found');
  END IF;

  -- Generate structured payload based on intent type
  CASE v_intent.classified_intent
    WHEN 'MEDICATION_ADMINISTRATION' THEN
      v_payload := jsonb_build_object(
        'type', 'medication_administration',
        'resident_id', COALESCE(p_resident_id, v_intent.resident_id),
        'medication_name', 'Medication',
        'dose', 'Standard dose',
        'route', 'Oral',
        'administered_at', now(),
        'notes', v_intent.voice_input_text
      );
      v_preview := 'Medication Administration: ' || v_intent.voice_input_text;

    WHEN 'URGENT_ACTION' THEN
      v_payload := jsonb_build_object(
        'type', 'urgent_action',
        'resident_id', COALESCE(p_resident_id, v_intent.resident_id),
        'urgency', 'high',
        'description', v_intent.voice_input_text,
        'reported_at', now()
      );
      v_preview := 'URGENT: ' || v_intent.voice_input_text;

    WHEN 'REQUEST' THEN
      v_payload := jsonb_build_object(
        'type', 'request',
        'request_type', 'supply',
        'description', v_intent.voice_input_text,
        'requested_at', now()
      );
      v_preview := 'Request: ' || v_intent.voice_input_text;

    WHEN 'SCHEDULING' THEN
      v_payload := jsonb_build_object(
        'type', 'scheduling',
        'resident_id', COALESCE(p_resident_id, v_intent.resident_id),
        'appointment_type', 'general',
        'description', v_intent.voice_input_text,
        'scheduled_for', now() + interval '1 day'
      );
      v_preview := 'Schedule: ' || v_intent.voice_input_text;

    ELSE -- DOCUMENTATION
      v_payload := jsonb_build_object(
        'type', 'documentation',
        'resident_id', COALESCE(p_resident_id, v_intent.resident_id),
        'note_type', 'general',
        'content', v_intent.voice_input_text,
        'documented_at', now()
      );
      v_preview := 'Documentation: ' || v_intent.voice_input_text;
  END CASE;

  -- Check for conflicts
  IF LOWER(v_intent.voice_input_text) LIKE '%duplicate%' OR LOWER(v_intent.voice_input_text) LIKE '%again%' THEN
    v_warnings := ARRAY['Potential duplicate action detected'];
  END IF;

  -- Create draft
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
    COALESCE(p_resident_id, v_intent.resident_id),
    p_user_id,
    p_agency_id,
    v_intent.classified_intent,
    'pending_confirmation',
    v_payload,
    v_preview,
    v_warnings,
    CASE WHEN array_length(v_warnings, 1) > 0 THEN 'warning' ELSE 'valid' END,
    now(),
    now() + interval '15 minutes'
  )
  RETURNING id INTO v_draft_id;

  RETURN jsonb_build_object(
    'success', true,
    'draft_id', v_draft_id,
    'action_type', v_intent.classified_intent,
    'preview', v_preview,
    'payload', v_payload,
    'warnings', v_warnings,
    'requires_confirmation', true
  );
END;
$$;
