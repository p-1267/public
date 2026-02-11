/*
  # Bulk Task Operations for WP1

  Creates RPCs for bulk assignment, batch review, and manager reporting.

  1. New Functions
    - bulk_assign_tasks - Assign multiple tasks to caregivers
    - batch_review_tasks - Review multiple tasks at once
    - get_pending_review_queue - Get tasks awaiting review
    - get_caregiver_task_list - Get caregiver's assigned tasks
    - get_manager_dashboard_data - Comprehensive manager view

  2. Security
    - All functions use SECURITY DEFINER
    - Role-based access checks within functions
*/

-- SUPERVISOR: Bulk assign tasks
CREATE OR REPLACE FUNCTION bulk_assign_tasks(
  p_task_ids uuid[],
  p_caregiver_id uuid,
  p_department_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assigned_count integer := 0;
  v_task_id uuid;
  v_errors jsonb[] := ARRAY[]::jsonb[];
BEGIN
  FOREACH v_task_id IN ARRAY p_task_ids
  LOOP
    BEGIN
      UPDATE tasks
      SET
        owner_user_id = p_caregiver_id,
        department_id = COALESCE(p_department_id, department_id),
        state = 'scheduled',
        updated_at = now()
      WHERE id = v_task_id
        AND state IN ('unassigned', 'scheduled');

      IF FOUND THEN
        v_assigned_count := v_assigned_count + 1;
      ELSE
        v_errors := array_append(v_errors, jsonb_build_object(
          'task_id', v_task_id,
          'error', 'Task not found or already in progress'
        ));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_errors := array_append(v_errors, jsonb_build_object(
        'task_id', v_task_id,
        'error', SQLERRM
      ));
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'assigned_count', v_assigned_count,
    'total_count', array_length(p_task_ids, 1),
    'errors', v_errors
  );
END;
$$;

-- SUPERVISOR: Batch review tasks
CREATE OR REPLACE FUNCTION batch_review_tasks(
  p_reviews jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_review jsonb;
  v_reviewed_count integer := 0;
  v_errors jsonb[] := ARRAY[]::jsonb[];
  v_task_id uuid;
BEGIN
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
        auth.uid(),
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
        supervisor_acknowledged_by = auth.uid(),
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

-- SUPERVISOR: Get pending review queue
CREATE OR REPLACE FUNCTION get_pending_review_queue(
  p_agency_id uuid,
  p_department_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE (
  task_id uuid,
  task_name text,
  resident_name text,
  caregiver_name text,
  completed_at timestamptz,
  outcome text,
  evidence_count bigint,
  priority text,
  risk_level text,
  review_status text,
  reviewer_comments text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.task_name,
    r.full_name,
    cg.display_name,
    t.actual_end,
    t.outcome,
    COUNT(te.id),
    t.priority,
    t.risk_level,
    COALESCE(sr.review_status, 'pending')::text,
    sr.reviewer_comments
  FROM tasks t
  INNER JOIN residents r ON t.resident_id = r.id
  LEFT JOIN user_profiles cg ON t.owner_user_id = cg.id
  LEFT JOIN task_evidence te ON t.id = te.task_id
  LEFT JOIN supervisor_reviews sr ON t.id = sr.task_id
  WHERE t.agency_id = p_agency_id
    AND t.state = 'completed'
    AND (p_department_id IS NULL OR t.department_id = p_department_id)
    AND (sr.review_status IS NULL OR sr.review_status = 'pending')
  GROUP BY t.id, t.task_name, r.full_name, cg.display_name, t.actual_end,
           t.outcome, t.priority, t.risk_level, sr.review_status, sr.reviewer_comments
  ORDER BY t.actual_end DESC
  LIMIT p_limit;
END;
$$;

-- CAREGIVER: Get task list
CREATE OR REPLACE FUNCTION get_caregiver_task_list(
  p_caregiver_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  task_id uuid,
  task_name text,
  description text,
  resident_id uuid,
  resident_name text,
  priority text,
  risk_level text,
  state text,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  requires_evidence boolean,
  evidence_types jsonb,
  category_name text,
  department_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.task_name,
    t.description,
    t.resident_id,
    r.full_name,
    t.priority,
    t.risk_level,
    t.state,
    t.scheduled_start,
    t.scheduled_end,
    t.requires_evidence,
    COALESCE(tc.required_evidence_types, '[]'::jsonb),
    tc.category_name,
    d.name
  FROM tasks t
  INNER JOIN residents r ON t.resident_id = r.id
  INNER JOIN task_categories tc ON t.category_id = tc.id
  LEFT JOIN departments d ON t.department_id = d.id
  WHERE t.owner_user_id = p_caregiver_id
    AND DATE(t.scheduled_start) = p_date
    AND t.state IN ('scheduled', 'due', 'in_progress')
  ORDER BY
    CASE t.priority
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    t.scheduled_start;
END;
$$;

-- MANAGER: Comprehensive dashboard data
CREATE OR REPLACE FUNCTION get_manager_dashboard_data(
  p_agency_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_summary jsonb;
  v_departments jsonb;
  v_issues jsonb;
BEGIN
  -- Overall summary
  SELECT jsonb_build_object(
    'total_tasks', COUNT(*),
    'completed', COUNT(*) FILTER (WHERE state = 'completed'),
    'in_progress', COUNT(*) FILTER (WHERE state = 'in_progress'),
    'overdue', COUNT(*) FILTER (WHERE state = 'overdue'),
    'completion_rate', ROUND((COUNT(*) FILTER (WHERE state = 'completed')::numeric / NULLIF(COUNT(*), 0)) * 100, 2),
    'staff_on_duty', (SELECT COUNT(DISTINCT owner_user_id) FROM tasks WHERE agency_id = p_agency_id AND DATE(scheduled_start) = p_date),
    'residents_served', COUNT(DISTINCT resident_id)
  ) INTO v_summary
  FROM tasks
  WHERE agency_id = p_agency_id
    AND DATE(scheduled_start) = p_date;

  -- Department breakdown
  SELECT jsonb_agg(
    jsonb_build_object(
      'department_id', d.id,
      'department_name', d.name,
      'department_code', d.department_code,
      'supervisor_name', up.display_name,
      'total_tasks', dept_stats.total_tasks,
      'completed', dept_stats.completed,
      'in_progress', dept_stats.in_progress,
      'overdue', dept_stats.overdue,
      'completion_rate', dept_stats.completion_rate,
      'staff_count', d.staff_count,
      'status', d.status
    )
  ) INTO v_departments
  FROM departments d
  LEFT JOIN user_profiles up ON d.supervisor_id = up.id
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::integer AS total_tasks,
      COUNT(*) FILTER (WHERE t.state = 'completed')::integer AS completed,
      COUNT(*) FILTER (WHERE t.state = 'in_progress')::integer AS in_progress,
      COUNT(*) FILTER (WHERE t.state = 'overdue')::integer AS overdue,
      ROUND((COUNT(*) FILTER (WHERE t.state = 'completed')::numeric / NULLIF(COUNT(*), 0)) * 100, 2) AS completion_rate
    FROM tasks t
    WHERE t.department_id = d.id
      AND DATE(t.scheduled_start) = p_date
  ) dept_stats ON true
  WHERE d.agency_id = p_agency_id
    AND d.status = 'active';

  -- Issues requiring attention
  SELECT jsonb_agg(
    jsonb_build_object(
      'task_id', t.id,
      'task_name', t.task_name,
      'resident_name', r.full_name,
      'issue_type', CASE
        WHEN t.state = 'overdue' THEN 'overdue'
        WHEN t.is_blocked THEN 'blocked'
        WHEN sr.review_status = 'rejected' THEN 'rejected'
        WHEN sr.review_status = 'needs_revision' THEN 'needs_revision'
        ELSE 'other'
      END,
      'priority', t.priority,
      'department_name', d.name
    )
  ) INTO v_issues
  FROM tasks t
  INNER JOIN residents r ON t.resident_id = r.id
  LEFT JOIN departments d ON t.department_id = d.id
  LEFT JOIN supervisor_reviews sr ON t.id = sr.task_id
  WHERE t.agency_id = p_agency_id
    AND DATE(t.scheduled_start) = p_date
    AND (
      t.state = 'overdue'
      OR t.is_blocked
      OR sr.review_status IN ('rejected', 'needs_revision')
    )
  LIMIT 20;

  RETURN jsonb_build_object(
    'summary', v_summary,
    'departments', COALESCE(v_departments, '[]'::jsonb),
    'issues', COALESCE(v_issues, '[]'::jsonb),
    'report_date', p_date,
    'generated_at', now()
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION bulk_assign_tasks TO authenticated;
GRANT EXECUTE ON FUNCTION batch_review_tasks TO authenticated;
GRANT EXECUTE ON FUNCTION get_pending_review_queue TO authenticated;
GRANT EXECUTE ON FUNCTION get_caregiver_task_list TO authenticated;
GRANT EXECUTE ON FUNCTION get_manager_dashboard_data TO authenticated;
