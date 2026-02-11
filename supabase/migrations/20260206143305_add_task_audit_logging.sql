/*
  # Add Task Audit Logging for Cross-Scenario Wiring

  1. Purpose
    - Wire caregiver task completion to Senior timeline
    - Write audit entries when tasks are started/completed
    - Enable real-time cross-scenario updates

  2. Changes
    - Update start_task RPC to write audit log
    - Update complete_task_with_evidence RPC to write audit log
    - Include evidence summary in audit metadata
*/

-- ============================================================
-- UPDATE start_task to write audit log
-- ============================================================

CREATE OR REPLACE FUNCTION start_task(
  p_task_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id uuid;
  v_resident_id uuid;
  v_task_name text;
BEGIN
  SELECT owner_user_id, resident_id, task_name
  INTO v_owner_id, v_resident_id, v_task_name
  FROM tasks
  WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found');
  END IF;

  IF v_owner_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not assigned to you');
  END IF;

  UPDATE tasks
  SET state = 'in_progress', actual_start = now(), updated_at = now()
  WHERE id = p_task_id;

  -- Write audit log for Senior timeline
  IF v_resident_id IS NOT NULL THEN
    INSERT INTO audit_log (
      action_type,
      actor_id,
      target_type,
      target_id,
      metadata,
      created_at
    ) VALUES (
      'task.started',
      auth.uid(),
      'resident',
      v_resident_id,
      jsonb_build_object(
        'task_id', p_task_id,
        'task_name', v_task_name,
        'started_at', now()
      ),
      now()
    );
  END IF;

  RETURN jsonb_build_object('success', true, 'task_id', p_task_id, 'state', 'in_progress');
END;
$$;

-- ============================================================
-- UPDATE complete_task_with_evidence to write audit log
-- ============================================================

CREATE OR REPLACE FUNCTION complete_task_with_evidence(
  p_task_id uuid,
  p_outcome text,
  p_outcome_reason text DEFAULT NULL,
  p_evidence_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id uuid;
  v_resident_id uuid;
  v_task_name text;
  v_category text;
  v_item jsonb;
  v_count integer := 0;
  v_evidence_type text;
  v_evidence_summary jsonb;
BEGIN
  SELECT owner_user_id, resident_id, task_name, category
  INTO v_owner_id, v_resident_id, v_task_name, v_category
  FROM tasks
  WHERE id = p_task_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found');
  END IF;

  IF v_owner_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not your task');
  END IF;

  -- Mark complete
  UPDATE tasks
  SET
    state = 'completed',
    actual_end = now(),
    duration_minutes = EXTRACT(EPOCH FROM (now() - COALESCE(actual_start, now()))) / 60,
    completed_by = auth.uid(),
    outcome = p_outcome,
    outcome_reason = p_outcome_reason,
    evidence_submitted = (jsonb_array_length(p_evidence_items) > 0),
    updated_at = now()
  WHERE id = p_task_id;

  -- Insert evidence
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_evidence_items)
  LOOP
    v_evidence_type := v_item->>'type';

    IF v_evidence_type = 'note' THEN
      INSERT INTO task_evidence (
        task_id, captured_by, evidence_type, notes, captured_at
      ) VALUES (
        p_task_id, auth.uid(), 'note', v_item->'data'->>'text', now()
      );
    ELSIF v_evidence_type = 'metric' THEN
      INSERT INTO task_evidence (
        task_id, captured_by, evidence_type,
        metric_name, metric_value, metric_unit, captured_at
      ) VALUES (
        p_task_id, auth.uid(), 'metric',
        v_item->'data'->>'metric_name',
        (v_item->'data'->>'metric_value')::numeric,
        v_item->'data'->>'metric_unit',
        now()
      );
    ELSIF v_evidence_type = 'photo' OR v_evidence_type = 'audio' THEN
      INSERT INTO task_evidence (
        task_id, captured_by, evidence_type,
        file_url, mime_type, transcription, captured_at
      ) VALUES (
        p_task_id, auth.uid(), v_evidence_type,
        v_item->>'file_url',
        v_item->>'mime_type',
        v_item->>'transcription',
        now()
      );
    ELSE
      -- Generic evidence with metadata
      INSERT INTO task_evidence (
        task_id, captured_by, evidence_type, metadata, captured_at
      ) VALUES (
        p_task_id, auth.uid(), v_evidence_type, v_item->'data', now()
      );
    END IF;

    v_count := v_count + 1;
  END LOOP;

  -- Build evidence summary
  v_evidence_summary := jsonb_build_object(
    'note_count', (SELECT COUNT(*) FROM jsonb_array_elements(p_evidence_items) WHERE value->>'type' = 'note'),
    'photo_count', (SELECT COUNT(*) FROM jsonb_array_elements(p_evidence_items) WHERE value->>'type' = 'photo'),
    'metric_count', (SELECT COUNT(*) FROM jsonb_array_elements(p_evidence_items) WHERE value->>'type' = 'metric'),
    'voice_count', (SELECT COUNT(*) FROM jsonb_array_elements(p_evidence_items) WHERE value->>'type' = 'audio')
  );

  -- Write audit log for Senior timeline
  IF v_resident_id IS NOT NULL THEN
    INSERT INTO audit_log (
      action_type,
      actor_id,
      target_type,
      target_id,
      metadata,
      created_at
    ) VALUES (
      'task.completed',
      auth.uid(),
      'resident',
      v_resident_id,
      jsonb_build_object(
        'task_id', p_task_id,
        'task_name', v_task_name,
        'category', v_category,
        'outcome', p_outcome,
        'outcome_reason', p_outcome_reason,
        'evidence_count', v_count,
        'evidence_summary', v_evidence_summary,
        'completed_at', now()
      ),
      now()
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'task_id', p_task_id,
    'evidence_count', v_count
  );
END;
$$;

-- Grant execute to authenticated users (showcase mode uses anon)
GRANT EXECUTE ON FUNCTION start_task(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION complete_task_with_evidence(uuid, text, text, jsonb) TO authenticated, anon;