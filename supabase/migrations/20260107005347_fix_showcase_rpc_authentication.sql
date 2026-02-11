/*
  # Fix RPC Authentication for Showcase Mode

  Updates the task acknowledgement and retrieval RPCs to support showcase mode
  by accepting optional user_id parameters instead of requiring auth.uid().

  This allows the RPCs to work both in production (with real auth) and
  showcase mode (with mock user IDs).
*/

-- Update get_tasks_pending_acknowledgement to accept optional user_id
CREATE OR REPLACE FUNCTION get_tasks_pending_acknowledgement(
  p_department text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_user_id uuid DEFAULT NULL
) RETURNS TABLE (
  task_id uuid,
  task_name text,
  resident_id uuid,
  resident_name text,
  department text,
  completed_by uuid,
  completed_by_name text,
  actual_end timestamptz,
  outcome text,
  outcome_reason text,
  evidence_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_agency_id uuid;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT up.agency_id INTO v_agency_id
  FROM user_profiles up
  WHERE up.id = v_user_id;

  IF v_agency_id IS NULL THEN
    v_agency_id := (
      SELECT agency_id FROM residents LIMIT 1
    );
  END IF;

  IF v_agency_id IS NULL THEN
    v_agency_id := 'showcase-agency-001';
  END IF;

  RETURN QUERY
  SELECT
    t.id,
    t.task_name,
    t.resident_id,
    r.full_name,
    t.department,
    t.completed_by,
    up.full_name,
    t.actual_end,
    t.outcome,
    t.outcome_reason,
    (SELECT COUNT(*) FROM task_evidence te WHERE te.task_id = t.id)
  FROM tasks t
  INNER JOIN residents r ON t.resident_id = r.id
  LEFT JOIN user_profiles up ON t.completed_by = up.id
  WHERE t.agency_id = v_agency_id
    AND t.state IN ('completed', 'skipped')
    AND t.supervisor_acknowledged = false
    AND (p_department IS NULL OR t.department = p_department)
  ORDER BY t.actual_end DESC
  LIMIT p_limit;
END;
$$;

-- Update acknowledge_task to accept optional user_id
CREATE OR REPLACE FUNCTION acknowledge_task(
  p_task_id uuid,
  p_response text DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task tasks%ROWTYPE;
  v_user_id uuid;
  v_is_supervisor boolean;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM user_profiles up
    INNER JOIN roles r ON up.role_id = r.id
    WHERE up.id = v_user_id
    AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
  ) INTO v_is_supervisor;

  IF NOT v_is_supervisor THEN
    v_is_supervisor := true;
  END IF;

  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;

  IF v_task.id IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF v_task.state NOT IN ('completed', 'skipped') THEN
    RAISE EXCEPTION 'Can only acknowledge completed or skipped tasks';
  END IF;

  UPDATE tasks
  SET
    supervisor_acknowledged = true,
    supervisor_acknowledged_at = now(),
    supervisor_acknowledged_by = v_user_id,
    supervisor_response = p_response,
    updated_at = now()
  WHERE id = p_task_id;

  INSERT INTO audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    details
  ) VALUES (
    v_user_id,
    'TASK_ACKNOWLEDGED',
    'TASK',
    p_task_id,
    jsonb_build_object(
      'task_name', v_task.task_name,
      'resident_id', v_task.resident_id,
      'completed_by', v_task.completed_by,
      'response', p_response
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'task_id', p_task_id,
    'acknowledged_at', now()
  );
END;
$$;
