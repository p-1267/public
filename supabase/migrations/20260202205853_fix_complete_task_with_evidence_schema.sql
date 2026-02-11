/*
  # Fix complete_task_with_evidence Schema

  Fixes column references in complete_task_with_evidence to match task_evidence table:
  - Remove department_id (doesn't exist)
  - Change submitted_by to captured_by
  - Map evidence_data fields to actual columns
*/

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
  v_item jsonb;
  v_count integer := 0;
  v_evidence_type text;
BEGIN
  SELECT owner_user_id INTO v_owner_id FROM tasks WHERE id = p_task_id;
  
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
  
  RETURN jsonb_build_object(
    'success', true,
    'task_id', p_task_id,
    'evidence_count', v_count
  );
END;
$$;
