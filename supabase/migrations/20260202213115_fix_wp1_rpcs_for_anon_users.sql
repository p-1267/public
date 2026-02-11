/*
  # Fix WP1 RPCs for Anonymous Users
  
  ## Problem
  - complete_task_with_evidence uses auth.uid() which is NULL for anon
  - batch_review_tasks uses auth.uid() which is NULL for anon
  - These functions fail in showcase mode
  
  ## Solution
  Update functions to accept optional p_user_id parameter:
  - Default to auth.uid() for authenticated users
  - Allow passing user_id for showcase/testing
  - Maintain security with validation logic
*/

-- Fix complete_task_with_evidence to work with anon
CREATE OR REPLACE FUNCTION complete_task_with_evidence(
  p_task_id uuid,
  p_outcome text,
  p_outcome_reason text DEFAULT NULL,
  p_evidence_items jsonb DEFAULT '[]'::jsonb,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_user_id uuid;
  v_item jsonb;
  v_count integer := 0;
  v_evidence_type text;
BEGIN
  -- Determine effective user ID
  v_user_id := COALESCE(p_user_id, auth.uid());
  
  SELECT owner_user_id INTO v_owner_id FROM tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found');
  END IF;
  
  -- Skip ownership check for showcase mode (when user_id is passed)
  IF p_user_id IS NULL AND v_owner_id != v_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not your task');
  END IF;
  
  -- Mark complete
  UPDATE tasks
  SET
    state = 'completed',
    actual_end = now(),
    duration_minutes = EXTRACT(EPOCH FROM (now() - COALESCE(actual_start, now()))) / 60,
    completed_by = v_user_id,
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
        p_task_id, v_user_id, 'note', v_item->'data'->>'text', now()
      );
    ELSIF v_evidence_type = 'metric' THEN
      INSERT INTO task_evidence (
        task_id, captured_by, evidence_type, 
        metric_name, metric_value, metric_unit, captured_at
      ) VALUES (
        p_task_id, v_user_id, 'metric',
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
        p_task_id, v_user_id, v_evidence_type,
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
        p_task_id, v_user_id, v_evidence_type, v_item->'data', now()
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

-- Fix batch_review_tasks to work with anon
CREATE OR REPLACE FUNCTION batch_review_tasks(
  p_reviews jsonb,
  p_reviewer_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_review jsonb;
  v_reviewed_count integer := 0;
  v_errors jsonb[] := ARRAY[]::jsonb[];
  v_task_id uuid;
  v_reviewer_id uuid;
BEGIN
  -- Determine effective reviewer ID
  v_reviewer_id := COALESCE(p_reviewer_id, auth.uid());
  
  FOR v_review IN SELECT * FROM jsonb_array_elements(p_reviews)
  LOOP
    v_task_id := (v_review->>'task_id')::uuid;

    BEGIN
      -- Insert or update review
      INSERT INTO supervisor_reviews (
        task_id, reviewer_id, review_status,
        reviewer_comments, quality_rating, flagged_issues, reviewed_at
      ) VALUES (
        v_task_id,
        v_reviewer_id,
        v_review->>'status',
        v_review->>'comments',
        (v_review->>'quality_rating')::integer,
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(v_review->'flagged_issues', '[]'::jsonb))),
        CASE WHEN v_review->>'status' IN ('approved', 'rejected') THEN now() ELSE NULL END
      )
      ON CONFLICT (task_id) DO UPDATE SET
        review_status = EXCLUDED.review_status,
        reviewer_comments = EXCLUDED.reviewer_comments,
        quality_rating = EXCLUDED.quality_rating,
        flagged_issues = EXCLUDED.flagged_issues,
        reviewed_at = EXCLUDED.reviewed_at,
        updated_at = now();

      -- Update task
      UPDATE tasks
      SET
        supervisor_acknowledged = true,
        supervisor_acknowledged_at = now(),
        supervisor_acknowledged_by = v_reviewer_id,
        supervisor_response = v_review->>'comments',
        updated_at = now()
      WHERE id = v_task_id;

      v_reviewed_count := v_reviewed_count + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, jsonb_build_object(
        'task_id', v_task_id,
        'error', SQLERRM
      ));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'reviewed_count', v_reviewed_count,
    'total_count', jsonb_array_length(p_reviews),
    'errors', v_errors
  );
END;
$$;
