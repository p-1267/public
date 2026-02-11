/*
  # Operational Workflow RPCs
  
  Complete daily cycle functions:
  - assign_task_to_caregiver
  - start_task
  - complete_task_with_evidence
  - review_task
  - get_department_daily_summary
*/

-- SUPERVISOR: Assign task
CREATE OR REPLACE FUNCTION assign_task_to_caregiver(
  p_task_id uuid,
  p_caregiver_id uuid,
  p_department_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE tasks
  SET 
    owner_user_id = p_caregiver_id,
    department_id = COALESCE(p_department_id, department_id),
    state = 'scheduled',
    updated_at = now()
  WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found');
  END IF;
  
  RETURN jsonb_build_object('success', true, 'task_id', p_task_id, 'assigned_to', p_caregiver_id);
END;
$$;

-- CAREGIVER: Start task
CREATE OR REPLACE FUNCTION start_task(
  p_task_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id uuid;
BEGIN
  SELECT owner_user_id INTO v_owner_id FROM tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found');
  END IF;
  
  IF v_owner_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not assigned to you');
  END IF;
  
  UPDATE tasks
  SET state = 'in_progress', actual_start = now(), updated_at = now()
  WHERE id = p_task_id;
  
  RETURN jsonb_build_object('success', true, 'task_id', p_task_id, 'state', 'in_progress');
END;
$$;

-- CAREGIVER: Complete with evidence
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
  v_dept_id uuid;
  v_item jsonb;
  v_count integer := 0;
BEGIN
  SELECT owner_user_id, department_id INTO v_owner_id, v_dept_id FROM tasks WHERE id = p_task_id;
  
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
    INSERT INTO task_evidence (
      task_id, department_id, submitted_by, evidence_type, 
      evidence_data, file_url, transcription
    ) VALUES (
      p_task_id, v_dept_id, auth.uid(), v_item->>'type',
      COALESCE(v_item->'data', '{}'::jsonb), v_item->>'file_url', v_item->>'transcription'
    );
    v_count := v_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object('success', true, 'task_id', p_task_id, 'evidence_count', v_count);
END;
$$;

-- SUPERVISOR: Review
CREATE OR REPLACE FUNCTION review_task(
  p_task_id uuid,
  p_review_status text,
  p_reviewer_comments text DEFAULT NULL,
  p_quality_rating integer DEFAULT NULL,
  p_flagged_issues text[] DEFAULT ARRAY[]::text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dept_id uuid;
  v_review_id uuid;
BEGIN
  SELECT department_id INTO v_dept_id FROM tasks WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Task not found');
  END IF;
  
  INSERT INTO supervisor_reviews (
    task_id, department_id, reviewer_id, review_status,
    reviewer_comments, quality_rating, flagged_issues, reviewed_at
  ) VALUES (
    p_task_id, v_dept_id, auth.uid(), p_review_status,
    p_reviewer_comments, p_quality_rating, p_flagged_issues,
    CASE WHEN p_review_status IN ('approved', 'rejected') THEN now() ELSE NULL END
  )
  ON CONFLICT (task_id) DO UPDATE SET
    review_status = EXCLUDED.review_status,
    reviewer_comments = EXCLUDED.reviewer_comments,
    quality_rating = EXCLUDED.quality_rating,
    flagged_issues = EXCLUDED.flagged_issues,
    reviewed_at = EXCLUDED.reviewed_at,
    updated_at = now()
  RETURNING id INTO v_review_id;
  
  UPDATE tasks
  SET supervisor_acknowledged = true, supervisor_acknowledged_at = now(),
      supervisor_acknowledged_by = auth.uid(), supervisor_response = p_reviewer_comments
  WHERE id = p_task_id;
  
  RETURN jsonb_build_object('success', true, 'review_id', v_review_id, 'status', p_review_status);
END;
$$;

-- MANAGER: Daily summary
CREATE OR REPLACE FUNCTION get_department_daily_summary(
  p_agency_id uuid,
  p_report_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  department_id uuid, department_name text, department_code text, supervisor_name text,
  total_tasks integer, completed_tasks integer, in_progress_tasks integer, overdue_tasks integer,
  completion_rate numeric, staff_count integer, residents_served integer, status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id, d.name, d.department_code, up.display_name,
    COUNT(t.id)::integer,
    COUNT(t.id) FILTER (WHERE t.state = 'completed')::integer,
    COUNT(t.id) FILTER (WHERE t.state = 'in_progress')::integer,
    COUNT(t.id) FILTER (WHERE t.state = 'overdue')::integer,
    CASE WHEN COUNT(t.id) > 0 THEN ROUND((COUNT(t.id) FILTER (WHERE t.state = 'completed')::numeric / COUNT(t.id)::numeric) * 100, 2) ELSE 0 END,
    d.staff_count, COUNT(DISTINCT t.resident_id)::integer, d.status
  FROM departments d
  LEFT JOIN user_profiles up ON d.supervisor_id = up.id
  LEFT JOIN tasks t ON t.department_id = d.id AND DATE(t.scheduled_start) = p_report_date
  WHERE d.agency_id = p_agency_id
  GROUP BY d.id, d.name, d.department_code, up.display_name, d.staff_count, d.status
  ORDER BY d.name;
END;
$$;
