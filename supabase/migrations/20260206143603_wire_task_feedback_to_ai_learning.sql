/*
  # Wire Task Completion Feedback to AI Learning Systems

  1. Purpose
    - Feed task execution metrics to AI learning system
    - Track task difficulty, duration, evidence quality
    - Enable AI to learn from operational patterns

  2. Learning Inputs
    - Task completion patterns
    - Unexpected difficulties
    - Evidence quality scores
    - Timing deviations

  3. Implementation
    - Trigger on task completion
    - Calculate quality metrics
    - Feed to ai_learning_inputs table
*/

-- ============================================================
-- Feed task completion data to AI learning
-- ============================================================

CREATE OR REPLACE FUNCTION feed_task_completion_to_ai_learning()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_evidence_count integer;
  v_evidence_quality text;
  v_duration_deviation numeric;
  v_expected_duration numeric;
  v_learning_data jsonb;
BEGIN
  -- Only process completions
  IF NEW.state != 'completed' OR OLD.state = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Count evidence submitted
  SELECT COUNT(*) INTO v_evidence_count
  FROM task_evidence
  WHERE task_id = NEW.id;

  -- Determine evidence quality
  v_evidence_quality := CASE
    WHEN v_evidence_count = 0 AND NEW.requires_evidence THEN 'MISSING'
    WHEN v_evidence_count >= 3 THEN 'HIGH'
    WHEN v_evidence_count >= 1 THEN 'MEDIUM'
    ELSE 'LOW'
  END;

  -- Calculate duration deviation (if we have expected duration)
  v_expected_duration := EXTRACT(EPOCH FROM (NEW.scheduled_end - NEW.scheduled_start)) / 60;
  v_duration_deviation := COALESCE(NEW.duration_minutes, 0) - v_expected_duration;

  -- Build learning data
  v_learning_data := jsonb_build_object(
    'task_id', NEW.id,
    'task_name', NEW.task_name,
    'category', NEW.category,
    'department', NEW.department,
    'resident_id', NEW.resident_id,
    'priority', NEW.priority,
    'outcome', NEW.outcome,
    'outcome_reason', NEW.outcome_reason,
    'duration_minutes', NEW.duration_minutes,
    'expected_duration_minutes', v_expected_duration,
    'duration_deviation_minutes', v_duration_deviation,
    'evidence_count', v_evidence_count,
    'evidence_quality', v_evidence_quality,
    'requires_evidence', NEW.requires_evidence,
    'was_late', (NEW.actual_start > NEW.scheduled_start + INTERVAL '15 minutes'),
    'was_emergency', NEW.is_emergency,
    'completed_at', NEW.actual_end,
    'completed_by', NEW.completed_by
  );

  -- Feed to AI learning system if noteworthy
  IF NEW.outcome != 'success' 
     OR v_evidence_quality = 'MISSING'
     OR ABS(v_duration_deviation) > 15
     OR NEW.is_emergency THEN
    
    INSERT INTO ai_learning_inputs (
      input_type,
      input_data,
      source_user_id,
      acknowledged,
      created_at
    ) VALUES (
      'TASK_COMPLETION_FEEDBACK',
      v_learning_data,
      NEW.completed_by,
      false,
      now()
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_feed_task_to_ai_learning ON tasks;

CREATE TRIGGER trigger_feed_task_to_ai_learning
  AFTER UPDATE ON tasks
  FOR EACH ROW
  WHEN (NEW.state = 'completed' AND OLD.state != 'completed')
  EXECUTE FUNCTION feed_task_completion_to_ai_learning();

-- ============================================================
-- Feed evidence quality feedback
-- ============================================================

CREATE OR REPLACE FUNCTION feed_evidence_quality_to_ai_learning()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_name text;
  v_category text;
  v_learning_data jsonb;
BEGIN
  -- Get task context
  SELECT task_name, category
  INTO v_task_name, v_category
  FROM tasks
  WHERE id = NEW.task_id;

  -- Only feed voice/photo evidence for quality assessment
  IF NEW.evidence_type NOT IN ('audio', 'photo') THEN
    RETURN NEW;
  END IF;

  v_learning_data := jsonb_build_object(
    'evidence_id', NEW.id,
    'task_id', NEW.task_id,
    'task_name', v_task_name,
    'task_category', v_category,
    'evidence_type', NEW.evidence_type,
    'has_transcription', (NEW.transcription IS NOT NULL AND LENGTH(NEW.transcription) > 10),
    'has_file', (NEW.file_url IS NOT NULL),
    'captured_by', NEW.captured_by,
    'captured_at', NEW.captured_at
  );

  INSERT INTO ai_learning_inputs (
    input_type,
    input_data,
    source_user_id,
    acknowledged,
    created_at
  ) VALUES (
    'EVIDENCE_QUALITY_FEEDBACK',
    v_learning_data,
    NEW.captured_by,
    false,
    now()
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_feed_evidence_to_ai_learning ON task_evidence;

CREATE TRIGGER trigger_feed_evidence_to_ai_learning
  AFTER INSERT ON task_evidence
  FOR EACH ROW
  WHEN (NEW.evidence_type IN ('audio', 'photo'))
  EXECUTE FUNCTION feed_evidence_quality_to_ai_learning();
