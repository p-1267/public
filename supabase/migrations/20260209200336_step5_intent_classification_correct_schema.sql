/*
  # STEP 5: Voice Intent Classification (correct schema)

  Uses existing intent_classification_rules and voice_intent_classifications tables.
  All 5 intent types: DOCUMENTATION, REQUEST, URGENT_ACTION, SCHEDULING, MEDICATION_ADMINISTRATION
*/

-- Seed classification rules (correct column names)
INSERT INTO intent_classification_rules (id, intent_type, keyword_patterns, priority, target_action, required_entities, active) VALUES
  -- MEDICATION_ADMINISTRATION (highest priority)
  ('10000000-0000-0000-0000-000000000001'::uuid, 'MEDICATION_ADMINISTRATION', ARRAY['give', 'medication', 'med', 'dose', 'insulin', 'pill', 'administer'], 10, 'log_medication', ARRAY['medication'], true),
  ('10000000-0000-0000-0000-000000000002'::uuid, 'MEDICATION_ADMINISTRATION', ARRAY['took', 'taken', 'swallowed'], 10, 'log_medication', ARRAY['medication'], true),
  ('10000000-0000-0000-0000-000000000003'::uuid, 'MEDICATION_ADMINISTRATION', ARRAY['refused', 'declined'], 10, 'log_medication_refusal', ARRAY['medication'], true),

  -- URGENT_ACTION (high priority)
  ('10000000-0000-0000-0000-000000000004'::uuid, 'URGENT_ACTION', ARRAY['fall', 'fell', 'fallen', 'emergency', 'urgent', 'help'], 9, 'create_urgent_task', ARRAY['resident'], true),
  ('10000000-0000-0000-0000-000000000005'::uuid, 'URGENT_ACTION', ARRAY['pain', 'hurts', 'hurting'], 9, 'create_urgent_task', ARRAY['resident'], true),
  ('10000000-0000-0000-0000-000000000006'::uuid, 'URGENT_ACTION', ARRAY['distress', 'breathing', 'chest pain'], 9, 'create_urgent_task', ARRAY['resident'], true),

  -- REQUEST (medium priority)
  ('10000000-0000-0000-0000-000000000007'::uuid, 'REQUEST', ARRAY['need', 'request', 'order', 'supply', 'supplies'], 5, 'create_request', ARRAY[]::text[], true),
  ('10000000-0000-0000-0000-000000000008'::uuid, 'REQUEST', ARRAY['broken', 'fix', 'repair', 'maintenance'], 5, 'create_request', ARRAY[]::text[], true),
  ('10000000-0000-0000-0000-000000000009'::uuid, 'REQUEST', ARRAY['transport', 'transfer', 'move', 'wheelchair'], 5, 'create_request', ARRAY[]::text[], true),

  -- SCHEDULING (medium priority)
  ('10000000-0000-0000-0000-00000000000a'::uuid, 'SCHEDULING', ARRAY['schedule', 'appointment', 'doctor', 'visit'], 5, 'create_appointment', ARRAY['datetime'], true),
  ('10000000-0000-0000-0000-00000000000b'::uuid, 'SCHEDULING', ARRAY['activity', 'therapy', 'group'], 5, 'create_appointment', ARRAY['datetime'], true),

  -- DOCUMENTATION (lowest priority)
  ('10000000-0000-0000-0000-00000000000c'::uuid, 'DOCUMENTATION', ARRAY['vital', 'vitals', 'blood pressure', 'temperature', 'pulse'], 1, 'document_observation', ARRAY['resident'], true),
  ('10000000-0000-0000-0000-00000000000d'::uuid, 'DOCUMENTATION', ARRAY['ate', 'meal', 'breakfast', 'lunch', 'dinner', 'food'], 1, 'document_observation', ARRAY['resident'], true),
  ('10000000-0000-0000-0000-00000000000e'::uuid, 'DOCUMENTATION', ARRAY['bathed', 'dressed', 'toileted', 'shower', 'hygiene'], 1, 'document_observation', ARRAY['resident'], true),
  ('10000000-0000-0000-0000-00000000000f'::uuid, 'DOCUMENTATION', ARRAY['behavior', 'mood', 'anxious', 'calm', 'agitated'], 1, 'document_observation', ARRAY['resident'], true),
  ('10000000-0000-0000-0000-000000000010'::uuid, 'DOCUMENTATION', ARRAY['note', 'document', 'log', 'record'], 1, 'document_observation', ARRAY[]::text[], true)
ON CONFLICT (id) DO UPDATE SET
  keyword_patterns = EXCLUDED.keyword_patterns,
  priority = EXCLUDED.priority,
  target_action = EXCLUDED.target_action,
  required_entities = EXCLUDED.required_entities,
  active = EXCLUDED.active,
  updated_at = now();

-- Intent classification function
CREATE OR REPLACE FUNCTION classify_voice_intent(
  p_voice_job_id uuid,
  p_agency_id uuid,
  p_transcript text,
  p_language text DEFAULT 'en',
  p_resident_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_intent_id uuid;
  v_intent_type text;
  v_matched_rules uuid[] := '{}';
  v_entities jsonb := '{}';
  v_confidence numeric := 1.0;
  v_transcript_lower text;
  v_rule record;
  v_highest_priority integer := -1;
  v_matched_rule_id uuid;
BEGIN
  v_transcript_lower := LOWER(p_transcript);

  -- Match against rules (highest priority first)
  FOR v_rule IN
    SELECT * FROM intent_classification_rules
    WHERE active = true
    ORDER BY priority DESC
  LOOP
    -- Check if any keywords match
    IF EXISTS (
      SELECT 1 FROM unnest(v_rule.keyword_patterns) AS keyword
      WHERE v_transcript_lower LIKE '%' || keyword || '%'
    ) THEN
      IF v_highest_priority = -1 THEN
        v_intent_type := v_rule.intent_type;
        v_highest_priority := v_rule.priority;
        v_matched_rule_id := v_rule.id;
      END IF;

      v_matched_rules := array_append(v_matched_rules, v_rule.id);
    END IF;
  END LOOP;

  -- Default to DOCUMENTATION if no rules matched
  IF v_intent_type IS NULL THEN
    v_intent_type := 'DOCUMENTATION';
    v_confidence := 0.5;
  END IF;

  -- Extract entities
  v_entities := jsonb_build_object(
    'raw_transcript', p_transcript,
    'detected_keywords', v_matched_rules
  );

  -- Insert into voice_intent_classifications
  INSERT INTO voice_intent_classifications (
    voice_input_text,
    voice_transcription_id,
    resident_id,
    user_id,
    agency_id,
    classified_intent,
    intent_confidence,
    classification_method,
    matched_rule_id,
    extracted_entities,
    entity_extraction_details,
    recommended_action,
    action_parameters,
    classified_at
  ) VALUES (
    p_transcript,
    p_voice_job_id,
    p_resident_id,
    p_user_id,
    p_agency_id,
    v_intent_type,
    v_confidence,
    'rule_based',
    v_matched_rule_id,
    v_entities,
    jsonb_build_object('matched_rules', v_matched_rules),
    v_intent_type,
    jsonb_build_object('intent_type', v_intent_type),
    now()
  )
  RETURNING id INTO v_intent_id;

  RETURN jsonb_build_object(
    'success', true,
    'intent_id', v_intent_id,
    'intent_type', v_intent_type,
    'confidence', v_confidence,
    'matched_rules', v_matched_rules,
    'entities', v_entities
  );
END;
$$;

GRANT EXECUTE ON FUNCTION classify_voice_intent(uuid, uuid, text, text, uuid, uuid) TO authenticated, anon;
