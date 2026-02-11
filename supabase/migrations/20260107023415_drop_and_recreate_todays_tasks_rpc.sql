/*
  # Drop and Recreate Today's Tasks RPC
  
  Properly recreates the RPC with correct return type
*/

DROP FUNCTION IF EXISTS get_todays_tasks_by_department(uuid);

CREATE OR REPLACE FUNCTION get_todays_tasks_by_department(
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_today date;
BEGIN
  v_today := CURRENT_DATE;
  
  WITH task_data AS (
    SELECT 
      COALESCE(t.department, 'OTHER') as department,
      jsonb_build_object(
        'id', t.id,
        'task_name', t.task_name,
        'resident_name', r.full_name,
        'room', COALESCE((r.metadata->>'room')::text, 'N/A'),
        'priority', t.priority,
        'state', t.state,
        'scheduled_start', t.scheduled_start,
        'scheduled_end', t.scheduled_end,
        'requires_evidence', t.requires_evidence,
        'is_emergency', t.is_emergency
      ) as task_obj
    FROM tasks t
    JOIN residents r ON r.id = t.resident_id
    WHERE DATE(t.scheduled_start) = v_today
      AND (p_user_id IS NULL OR t.owner_user_id = p_user_id)
  ),
  dept_groups AS (
    SELECT 
      department,
      COUNT(*) as task_count,
      COUNT(*) FILTER (WHERE (task_obj->>'state')::text = 'completed') as completed_count,
      COUNT(*) FILTER (WHERE (task_obj->>'state')::text = 'overdue') as overdue_count,
      jsonb_agg(task_obj ORDER BY (task_obj->>'scheduled_start')::timestamp) as tasks
    FROM task_data
    GROUP BY department
  )
  SELECT jsonb_agg(
    jsonb_build_object(
      'department', department,
      'task_count', task_count,
      'completed_count', completed_count,
      'overdue_count', overdue_count,
      'tasks', tasks
    )
    ORDER BY 
      CASE department
        WHEN 'NURSING' THEN 1
        WHEN 'KITCHEN' THEN 2
        WHEN 'HOUSEKEEPING' THEN 3
        WHEN 'HYGIENE' THEN 4
        ELSE 5
      END
  ) INTO v_result
  FROM dept_groups;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
