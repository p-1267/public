/*
  # WP4.1: Language Learning Loop - Voice Corrections

  1. Purpose
    - Learn from manual corrections to voice transcriptions
    - Build persistent correction memory
    - Improve confidence over time with same phrases

  2. Functions
    - submit_voice_correction: Records a correction
    - apply_language_learning: Processes corrections into memory
    - extract_with_learning: Uses learned patterns before fallback

  3. Truth Enforcement
    - Confidence improves ONLY if corrections exist
    - No pre-seeded corrections
    - Learning derived from real feedback
*/

-- Submit Voice Correction (User Action)
CREATE OR REPLACE FUNCTION submit_voice_correction(
  p_agency_id uuid,
  p_caregiver_id uuid,
  p_original_phrase text,
  p_corrected_structure jsonb,
  p_correction_type text,
  p_facility_context text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_correction_id uuid;
  v_existing_correction uuid;
BEGIN
  -- Check if similar correction already exists
  SELECT id INTO v_existing_correction
  FROM voice_correction_memory
  WHERE agency_id = p_agency_id
    AND original_phrase = p_original_phrase
    AND caregiver_id IS NOT DISTINCT FROM p_caregiver_id
  LIMIT 1;

  IF v_existing_correction IS NOT NULL THEN
    -- Update existing correction
    UPDATE voice_correction_memory
    SET occurrence_count = occurrence_count + 1,
        corrected_structure = p_corrected_structure,
        last_applied_at = now(),
        updated_at = now()
    WHERE id = v_existing_correction
    RETURNING id INTO v_correction_id;
  ELSE
    -- Create new correction
    INSERT INTO voice_correction_memory (
      agency_id, caregiver_id, original_phrase,
      corrected_structure, correction_type, facility_context
    ) VALUES (
      p_agency_id, p_caregiver_id, p_original_phrase,
      p_corrected_structure, p_correction_type, p_facility_context
    )
    RETURNING id INTO v_correction_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'correction_id', v_correction_id,
    'is_new', v_existing_correction IS NULL,
    'message', 'Correction recorded - will improve future extractions'
  );
END;
$$;

-- Apply Language Learning (System Action - Runs Periodically)
CREATE OR REPLACE FUNCTION apply_language_learning(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_corrections_processed int := 0;
  v_learning_changes int := 0;
  v_correction record;
  v_change_id uuid;
BEGIN
  -- Check if learning is enabled
  IF NOT EXISTS (
    SELECT 1 FROM learning_system_state
    WHERE agency_id = p_agency_id
      AND learning_enabled = true
      AND (frozen_until IS NULL OR frozen_until < now())
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Learning is disabled or frozen for this agency'
    );
  END IF;

  -- Process corrections that have sufficient evidence (occurrence_count >= 2)
  FOR v_correction IN
    SELECT *
    FROM voice_correction_memory
    WHERE agency_id = p_agency_id
      AND occurrence_count >= 2
      AND (confidence_improvement IS NULL OR confidence_improvement < 0.9)
    ORDER BY occurrence_count DESC
    LIMIT 50
  LOOP
    -- Calculate confidence improvement based on occurrence count
    -- More occurrences = higher confidence that this correction is valid
    UPDATE voice_correction_memory
    SET confidence_improvement = LEAST(0.95, 0.5 + (occurrence_count * 0.1)),
        success_rate = LEAST(1.0, occurrence_count / NULLIF(occurrence_count + 1.0, 0)),
        updated_at = now()
    WHERE id = v_correction.id;

    -- Log learning change
    INSERT INTO learning_change_ledger (
      agency_id, learning_domain, change_type,
      target_entity_type, target_entity_id,
      previous_value, new_value,
      change_reason, source_signals,
      confidence_delta, evidence_count
    ) VALUES (
      p_agency_id, 'voice_extraction', 'parameter_update',
      'extraction_pattern', v_correction.id,
      jsonb_build_object('confidence', COALESCE(v_correction.confidence_improvement, 0.5)),
      jsonb_build_object(
        'confidence', LEAST(0.95, 0.5 + (v_correction.occurrence_count * 0.1)),
        'pattern', v_correction.original_phrase,
        'correction', v_correction.corrected_structure
      ),
      format('Learned correction pattern after %s occurrences', v_correction.occurrence_count),
      jsonb_build_array(v_correction.id),
      LEAST(0.45, v_correction.occurrence_count * 0.1),
      v_correction.occurrence_count
    )
    RETURNING id INTO v_change_id;

    v_corrections_processed := v_corrections_processed + 1;
    v_learning_changes := v_learning_changes + 1;
  END LOOP;

  -- Update learning system state
  INSERT INTO learning_system_state (
    agency_id, total_learning_events, last_learning_event_at
  ) VALUES (
    p_agency_id, v_learning_changes, now()
  )
  ON CONFLICT (agency_id)
  DO UPDATE SET
    total_learning_events = learning_system_state.total_learning_events + v_learning_changes,
    last_learning_event_at = now(),
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'corrections_processed', v_corrections_processed,
    'learning_changes_created', v_learning_changes,
    'message', 'Language learning applied successfully'
  );
END;
$$;

-- Extract with Learning (Uses Correction Memory)
CREATE OR REPLACE FUNCTION extract_with_learning(
  p_agency_id uuid,
  p_caregiver_id uuid,
  p_voice_text text,
  p_fallback_extraction jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_learned_correction record;
  v_base_confidence numeric := 0.6;
  v_learned_confidence numeric;
BEGIN
  -- Check correction memory FIRST (before fallback)
  SELECT *
  INTO v_learned_correction
  FROM voice_correction_memory
  WHERE agency_id = p_agency_id
    AND (caregiver_id IS NULL OR caregiver_id = p_caregiver_id)
    AND original_phrase = p_voice_text
    AND confidence_improvement IS NOT NULL
  ORDER BY occurrence_count DESC, confidence_improvement DESC
  LIMIT 1;

  -- If learned correction exists, use it
  IF v_learned_correction.id IS NOT NULL THEN
    v_learned_confidence := COALESCE(v_learned_correction.confidence_improvement, 0.85);

    -- Update usage statistics
    UPDATE voice_correction_memory
    SET last_applied_at = now(),
        occurrence_count = occurrence_count + 1
    WHERE id = v_learned_correction.id;

    RETURN jsonb_build_object(
      'extraction', v_learned_correction.corrected_structure,
      'confidence', v_learned_confidence,
      'method', 'learned_correction',
      'learning_source', v_learned_correction.id,
      'improvement_vs_baseline', v_learned_confidence - v_base_confidence,
      'proof', 'confidence_from_learning'
    );
  END IF;

  -- Otherwise, use fallback extraction (heuristic/LLM)
  RETURN jsonb_build_object(
    'extraction', p_fallback_extraction,
    'confidence', v_base_confidence,
    'method', 'fallback_heuristic',
    'learning_source', NULL,
    'improvement_vs_baseline', 0,
    'proof', 'no_prior_learning'
  );
END;
$$;

-- Get Learning Statistics (Inspection)
CREATE OR REPLACE FUNCTION get_language_learning_stats(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_corrections int;
  v_high_confidence_corrections int;
  v_avg_confidence numeric;
  v_recent_improvements int;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE confidence_improvement >= 0.8),
    AVG(confidence_improvement)
  INTO v_total_corrections, v_high_confidence_corrections, v_avg_confidence
  FROM voice_correction_memory
  WHERE agency_id = p_agency_id;

  SELECT COUNT(*)
  INTO v_recent_improvements
  FROM learning_change_ledger
  WHERE agency_id = p_agency_id
    AND learning_domain = 'voice_extraction'
    AND applied_at >= now() - interval '7 days';

  RETURN jsonb_build_object(
    'total_corrections', COALESCE(v_total_corrections, 0),
    'high_confidence_corrections', COALESCE(v_high_confidence_corrections, 0),
    'average_confidence', COALESCE(v_avg_confidence, 0),
    'recent_improvements', COALESCE(v_recent_improvements, 0),
    'learning_active', v_total_corrections > 0
  );
END;
$$;
