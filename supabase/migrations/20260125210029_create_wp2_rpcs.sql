/*
  # WP2: Caregiver Efficiency RPCs

  1. RPCs for quick-tap completion
    - quick_tap_complete_task
    - all_clear_complete_multiple_tasks
    
  2. RPCs for exception detection
    - check_task_exception_status
    - get_resident_baselines
    
  3. RPCs for voice pipeline
    - submit_voice_transcription
    - create_structured_extraction
    - correct_voice_extraction
    
  4. RPCs for evidence quality
    - score_evidence_quality
    - get_evidence_quality_report
    
  5. RPCs for telemetry
    - record_task_telemetry
    - get_wp2_metrics
*/

-- Quick-tap complete task
CREATE OR REPLACE FUNCTION quick_tap_complete_task(
  p_task_id uuid,
  p_outcome text DEFAULT 'success',
  p_quick_value text DEFAULT NULL,
  p_tap_count integer DEFAULT 1,
  p_completion_seconds numeric DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agency_id uuid;
  v_task_record record;
  v_telemetry_id uuid;
BEGIN
  -- Get task and verify ownership
  SELECT t.*, up.agency_id INTO v_task_record
  FROM tasks t
  JOIN user_profiles up ON up.id = auth.uid()
  WHERE t.id = p_task_id
  AND t.owner_user_id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found or not assigned to you';
  END IF;

  v_agency_id := v_task_record.agency_id;

  -- Update task state to completed
  UPDATE tasks
  SET 
    state = 'completed',
    actual_end = now(),
    evidence_submitted = true,
    completed_by = auth.uid()
  WHERE id = p_task_id;

  -- Record telemetry
  INSERT INTO task_completion_telemetry (
    task_id,
    user_id,
    agency_id,
    completion_method,
    tap_count,
    character_count,
    completion_seconds,
    was_exception,
    evidence_count
  ) VALUES (
    p_task_id,
    auth.uid(),
    v_agency_id,
    'quick_tap',
    p_tap_count,
    0,
    p_completion_seconds,
    false,
    0
  ) RETURNING id INTO v_telemetry_id;

  -- If quick_value provided, store as evidence
  IF p_quick_value IS NOT NULL THEN
    INSERT INTO task_evidence (
      task_id,
      evidence_type,
      evidence_data,
      captured_by,
      captured_at
    ) VALUES (
      p_task_id,
      'quick_value',
      jsonb_build_object('value', p_quick_value, 'method', 'quick_tap'),
      auth.uid(),
      now()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'task_id', p_task_id,
    'telemetry_id', v_telemetry_id,
    'completion_method', 'quick_tap'
  );
END;
$$;

-- All-clear complete multiple tasks
CREATE OR REPLACE FUNCTION all_clear_complete_multiple_tasks(
  p_task_ids uuid[],
  p_completion_seconds numeric DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agency_id uuid;
  v_task_id uuid;
  v_completed_count integer := 0;
  v_failed_count integer := 0;
BEGIN
  -- Get agency_id
  SELECT agency_id INTO v_agency_id
  FROM user_profiles
  WHERE id = auth.uid();

  -- Complete each task
  FOREACH v_task_id IN ARRAY p_task_ids LOOP
    BEGIN
      -- Update task
      UPDATE tasks
      SET 
        state = 'completed',
        actual_end = now(),
        evidence_submitted = true,
        completed_by = auth.uid()
      WHERE id = v_task_id
      AND owner_user_id = auth.uid();

      IF FOUND THEN
        -- Record telemetry
        INSERT INTO task_completion_telemetry (
          task_id,
          user_id,
          agency_id,
          completion_method,
          tap_count,
          character_count,
          completion_seconds,
          was_exception,
          evidence_count
        ) VALUES (
          v_task_id,
          auth.uid(),
          v_agency_id,
          'all_clear',
          1,
          0,
          p_completion_seconds / array_length(p_task_ids, 1),
          false,
          0
        );

        v_completed_count := v_completed_count + 1;
      ELSE
        v_failed_count := v_failed_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_failed_count := v_failed_count + 1;
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'completed_count', v_completed_count,
    'failed_count', v_failed_count,
    'total_tasks', array_length(p_task_ids, 1),
    'completion_method', 'all_clear'
  );
END;
$$;

-- Check if task requires exception handling
CREATE OR REPLACE FUNCTION check_task_exception_status(
  p_task_id uuid,
  p_metric_values jsonb -- {metric_name: value}
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_resident_id uuid;
  v_threshold record;
  v_metric_value numeric;
  v_exceptions jsonb := '[]'::jsonb;
  v_is_exception boolean := false;
BEGIN
  -- Get resident for task
  SELECT resident_id INTO v_resident_id
  FROM tasks
  WHERE id = p_task_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  -- Check each metric against thresholds
  FOR v_threshold IN 
    SELECT * FROM task_exception_thresholds
    WHERE resident_id = v_resident_id
  LOOP
    -- Get metric value from provided metrics
    IF p_metric_values ? v_threshold.metric_name THEN
      v_metric_value := (p_metric_values->>v_threshold.metric_name)::numeric;

      -- Check if exceeds thresholds
      IF v_metric_value < v_threshold.critical_threshold_min OR
         v_metric_value > v_threshold.critical_threshold_max THEN
        v_is_exception := true;
        v_exceptions := v_exceptions || jsonb_build_object(
          'metric', v_threshold.metric_name,
          'value', v_metric_value,
          'severity', 'critical',
          'requires_evidence', v_threshold.requires_evidence_if_exceeded
        );
      ELSIF v_metric_value < v_threshold.warning_threshold_min OR
            v_metric_value > v_threshold.warning_threshold_max THEN
        v_is_exception := true;
        v_exceptions := v_exceptions || jsonb_build_object(
          'metric', v_threshold.metric_name,
          'value', v_metric_value,
          'severity', 'warning',
          'requires_evidence', v_threshold.requires_evidence_if_exceeded
        );
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'is_exception', v_is_exception,
    'exceptions', v_exceptions,
    'resident_id', v_resident_id
  );
END;
$$;

-- Submit voice transcription
CREATE OR REPLACE FUNCTION submit_voice_transcription(
  p_task_id uuid,
  p_audio_url text,
  p_audio_duration_seconds numeric,
  p_transcription_text text,
  p_transcription_confidence numeric DEFAULT 0.95,
  p_quality_score numeric DEFAULT 80
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agency_id uuid;
  v_transcription_id uuid;
BEGIN
  -- Get agency_id
  SELECT agency_id INTO v_agency_id
  FROM user_profiles
  WHERE id = auth.uid();

  -- Insert transcription
  INSERT INTO voice_transcriptions (
    task_id,
    user_id,
    agency_id,
    audio_url,
    audio_duration_seconds,
    transcription_text,
    transcription_confidence,
    transcription_provider,
    quality_score,
    transcribed_at
  ) VALUES (
    p_task_id,
    auth.uid(),
    v_agency_id,
    p_audio_url,
    p_audio_duration_seconds,
    p_transcription_text,
    p_transcription_confidence,
    'mock_whisper_v1',
    p_quality_score,
    now()
  ) RETURNING id INTO v_transcription_id;

  RETURN v_transcription_id;
END;
$$;

-- Create structured extraction from voice
CREATE OR REPLACE FUNCTION create_structured_extraction(
  p_voice_transcription_id uuid,
  p_extraction_type text,
  p_extracted_data jsonb,
  p_confidence_score numeric DEFAULT 0.9
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_extraction_id uuid;
  v_requires_correction boolean;
BEGIN
  -- Determine if correction needed (confidence < 85%)
  v_requires_correction := p_confidence_score < 0.85;

  -- Insert extraction
  INSERT INTO structured_voice_extractions (
    voice_transcription_id,
    extraction_type,
    extracted_data,
    confidence_score,
    requires_correction,
    final_data
  ) VALUES (
    p_voice_transcription_id,
    p_extraction_type,
    p_extracted_data,
    p_confidence_score,
    v_requires_correction,
    CASE WHEN NOT v_requires_correction THEN p_extracted_data ELSE NULL END
  ) RETURNING id INTO v_extraction_id;

  RETURN v_extraction_id;
END;
$$;

-- Correct voice extraction
CREATE OR REPLACE FUNCTION correct_voice_extraction(
  p_extraction_id uuid,
  p_corrected_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update extraction with corrections
  UPDATE structured_voice_extractions
  SET 
    final_data = p_corrected_data,
    corrected_by = auth.uid(),
    corrected_at = now(),
    requires_correction = false
  WHERE id = p_extraction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Extraction not found';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'extraction_id', p_extraction_id
  );
END;
$$;

-- Score evidence quality
CREATE OR REPLACE FUNCTION score_evidence_quality(
  p_task_evidence_id uuid,
  p_evidence_type text,
  p_overall_score numeric,
  p_quality_metrics jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quality_id uuid;
  v_passed boolean;
BEGIN
  -- Determine if passed minimum threshold (60%)
  v_passed := p_overall_score >= 60;

  -- Insert quality score
  INSERT INTO evidence_quality_scores (
    task_evidence_id,
    evidence_type,
    overall_score,
    blur_score,
    lighting_score,
    composition_score,
    audio_volume_score,
    audio_noise_score,
    quality_issues,
    passed_minimum_threshold
  ) VALUES (
    p_task_evidence_id,
    p_evidence_type,
    p_overall_score,
    (p_quality_metrics->>'blur_score')::numeric,
    (p_quality_metrics->>'lighting_score')::numeric,
    (p_quality_metrics->>'composition_score')::numeric,
    (p_quality_metrics->>'audio_volume_score')::numeric,
    (p_quality_metrics->>'audio_noise_score')::numeric,
    p_quality_metrics->'quality_issues',
    v_passed
  ) RETURNING id INTO v_quality_id;

  RETURN v_quality_id;
END;
$$;

-- Get WP2 metrics for acceptance test
CREATE OR REPLACE FUNCTION get_wp2_metrics(
  p_agency_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_metrics jsonb;
  v_routine_tasks record;
  v_exception_tasks record;
  v_voice_tasks record;
BEGIN
  -- Get routine task metrics
  SELECT 
    COUNT(*) as total_routine,
    AVG(tap_count) as avg_taps,
    AVG(character_count) as avg_typing,
    AVG(completion_seconds) as avg_seconds,
    COUNT(CASE WHEN tap_count <= 1 THEN 1 END) as one_tap_count,
    COUNT(CASE WHEN character_count = 0 THEN 1 END) as zero_typing_count,
    COUNT(CASE WHEN completion_seconds <= 30 THEN 1 END) as under_30s_count
  INTO v_routine_tasks
  FROM task_completion_telemetry
  WHERE agency_id = p_agency_id
  AND completion_method IN ('quick_tap', 'all_clear')
  AND DATE(created_at) = p_date;

  -- Get exception task metrics
  SELECT 
    COUNT(*) as total_exceptions,
    AVG(tap_count) as avg_taps,
    AVG(completion_seconds) as avg_seconds,
    AVG(evidence_count) as avg_evidence
  INTO v_exception_tasks
  FROM task_completion_telemetry
  WHERE agency_id = p_agency_id
  AND was_exception = true
  AND DATE(created_at) = p_date;

  -- Get voice task metrics
  SELECT 
    COUNT(DISTINCT vt.id) as total_voice_tasks,
    COUNT(DISTINCT sve.id) as total_extractions,
    AVG(sve.confidence_score) as avg_confidence,
    COUNT(CASE WHEN sve.requires_correction = false THEN 1 END) as auto_approved_count
  INTO v_voice_tasks
  FROM voice_transcriptions vt
  LEFT JOIN structured_voice_extractions sve ON sve.voice_transcription_id = vt.id
  WHERE vt.agency_id = p_agency_id
  AND DATE(vt.created_at) = p_date;

  -- Build response
  v_metrics := jsonb_build_object(
    'date', p_date,
    'routine_tasks', jsonb_build_object(
      'total', COALESCE(v_routine_tasks.total_routine, 0),
      'avg_taps', ROUND(COALESCE(v_routine_tasks.avg_taps, 0), 2),
      'avg_typing_chars', ROUND(COALESCE(v_routine_tasks.avg_typing, 0), 2),
      'avg_seconds', ROUND(COALESCE(v_routine_tasks.avg_seconds, 0), 2),
      'one_tap_percentage', 
        CASE 
          WHEN COALESCE(v_routine_tasks.total_routine, 0) > 0 
          THEN ROUND((v_routine_tasks.one_tap_count::numeric / v_routine_tasks.total_routine) * 100, 1)
          ELSE 0 
        END,
      'zero_typing_percentage',
        CASE 
          WHEN COALESCE(v_routine_tasks.total_routine, 0) > 0
          THEN ROUND((v_routine_tasks.zero_typing_count::numeric / v_routine_tasks.total_routine) * 100, 1)
          ELSE 0
        END,
      'under_30s_percentage',
        CASE 
          WHEN COALESCE(v_routine_tasks.total_routine, 0) > 0
          THEN ROUND((v_routine_tasks.under_30s_count::numeric / v_routine_tasks.total_routine) * 100, 1)
          ELSE 0
        END
    ),
    'exception_tasks', jsonb_build_object(
      'total', COALESCE(v_exception_tasks.total_exceptions, 0),
      'avg_taps', ROUND(COALESCE(v_exception_tasks.avg_taps, 0), 2),
      'avg_seconds', ROUND(COALESCE(v_exception_tasks.avg_seconds, 0), 2),
      'avg_evidence', ROUND(COALESCE(v_exception_tasks.avg_evidence, 0), 2)
    ),
    'voice_tasks', jsonb_build_object(
      'total', COALESCE(v_voice_tasks.total_voice_tasks, 0),
      'total_extractions', COALESCE(v_voice_tasks.total_extractions, 0),
      'avg_confidence', ROUND(COALESCE(v_voice_tasks.avg_confidence, 0), 2),
      'auto_approved_percentage',
        CASE 
          WHEN COALESCE(v_voice_tasks.total_extractions, 0) > 0
          THEN ROUND((v_voice_tasks.auto_approved_count::numeric / v_voice_tasks.total_extractions) * 100, 1)
          ELSE 0
        END
    )
  );

  RETURN v_metrics;
END;
$$;
