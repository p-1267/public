/*
  # Add Operating Mode and Task Acknowledgement Support

  ## Changes

  1. Add operating_mode to agencies table
    - `operating_mode` (text) - AGENCY, HYBRID, FAMILY_HOME
    - Defines how departments and assignments work
    - AGENCY: Dedicated departments, separate staff per department
    - HYBRID: Shared roles, one person across departments with labels
    - FAMILY_HOME: Single caregiver, all departments internally tracked

  2. Add supervisor acknowledgement to tasks table
    - `supervisor_acknowledged` (boolean) - has supervisor reviewed completion
    - `supervisor_acknowledged_at` (timestamptz) - when acknowledged
    - `supervisor_acknowledged_by` (uuid) - which supervisor
    - `supervisor_response` (text) - optional feedback/comment

  3. Add department assignment tracking
    - `department` (text) - which department owns this task
    - Allows multi-department filtering and reporting

  ## Security
  - All changes maintain existing RLS policies
*/

-- Add operating_mode to agencies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agencies' AND column_name = 'operating_mode'
  ) THEN
    ALTER TABLE agencies ADD COLUMN operating_mode text NOT NULL DEFAULT 'AGENCY'
      CHECK (operating_mode IN ('AGENCY', 'HYBRID', 'FAMILY_HOME'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_agencies_operating_mode ON agencies(operating_mode);

-- Add supervisor acknowledgement fields to tasks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'supervisor_acknowledged'
  ) THEN
    ALTER TABLE tasks ADD COLUMN supervisor_acknowledged boolean NOT NULL DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'supervisor_acknowledged_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN supervisor_acknowledged_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'supervisor_acknowledged_by'
  ) THEN
    ALTER TABLE tasks ADD COLUMN supervisor_acknowledged_by uuid REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'supervisor_response'
  ) THEN
    ALTER TABLE tasks ADD COLUMN supervisor_response text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'department'
  ) THEN
    ALTER TABLE tasks ADD COLUMN department text
      CHECK (department IN ('NURSING', 'HOUSEKEEPING', 'KITCHEN', 'HYGIENE', 'MOBILITY', 'NUTRITION', 'MONITORING', 'EMERGENCY'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tasks_supervisor_acknowledged ON tasks(supervisor_acknowledged)
  WHERE supervisor_acknowledged = false AND state = 'completed';

CREATE INDEX IF NOT EXISTS idx_tasks_department ON tasks(department);

-- RPC: Acknowledge completed task
CREATE OR REPLACE FUNCTION acknowledge_task(
  p_task_id uuid,
  p_response text DEFAULT NULL
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
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if user is supervisor or agency admin
  SELECT EXISTS (
    SELECT 1 FROM user_profiles up
    INNER JOIN roles r ON up.role_id = r.id
    WHERE up.id = v_user_id
    AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')
  ) INTO v_is_supervisor;

  IF NOT v_is_supervisor THEN
    RAISE EXCEPTION 'Only supervisors can acknowledge tasks';
  END IF;

  -- Get task
  SELECT * INTO v_task FROM tasks WHERE id = p_task_id;

  IF v_task.id IS NULL THEN
    RAISE EXCEPTION 'Task not found';
  END IF;

  IF v_task.state NOT IN ('completed', 'skipped') THEN
    RAISE EXCEPTION 'Can only acknowledge completed or skipped tasks';
  END IF;

  -- Update task with acknowledgement
  UPDATE tasks
  SET
    supervisor_acknowledged = true,
    supervisor_acknowledged_at = now(),
    supervisor_acknowledged_by = v_user_id,
    supervisor_response = p_response,
    updated_at = now()
  WHERE id = p_task_id;

  -- Log to audit trail
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

-- RPC: Get tasks pending acknowledgement for a department
CREATE OR REPLACE FUNCTION get_tasks_pending_acknowledgement(
  p_department text DEFAULT NULL,
  p_limit integer DEFAULT 50
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
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user's agency
  SELECT up.agency_id INTO v_agency_id
  FROM user_profiles up
  WHERE up.id = v_user_id;

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

-- RPC: Get today's tasks grouped by department
CREATE OR REPLACE FUNCTION get_todays_tasks_by_department(
  p_user_id uuid DEFAULT NULL
) RETURNS TABLE (
  department text,
  task_count bigint,
  completed_count bigint,
  overdue_count bigint,
  tasks jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_agency_id uuid;
  v_today_start timestamptz;
  v_today_end timestamptz;
BEGIN
  v_user_id := COALESCE(p_user_id, auth.uid());

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get user's agency
  SELECT up.agency_id INTO v_agency_id
  FROM user_profiles up
  WHERE up.id = v_user_id;

  -- Define today's time range
  v_today_start := date_trunc('day', now());
  v_today_end := v_today_start + interval '1 day';

  RETURN QUERY
  SELECT
    t.department,
    COUNT(*) as task_count,
    COUNT(*) FILTER (WHERE t.state = 'completed') as completed_count,
    COUNT(*) FILTER (WHERE t.state = 'overdue') as overdue_count,
    jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'task_name', t.task_name,
        'resident_name', r.full_name,
        'room', r.room_number,
        'priority', t.priority,
        'state', t.state,
        'scheduled_start', t.scheduled_start,
        'scheduled_end', t.scheduled_end,
        'requires_evidence', t.requires_evidence,
        'is_emergency', t.is_emergency
      ) ORDER BY t.scheduled_start
    ) as tasks
  FROM tasks t
  INNER JOIN residents r ON t.resident_id = r.id
  WHERE t.agency_id = v_agency_id
    AND (t.owner_user_id = v_user_id OR p_user_id IS NULL)
    AND t.scheduled_start >= v_today_start
    AND t.scheduled_start < v_today_end
    AND t.state != 'cancelled'
  GROUP BY t.department
  ORDER BY t.department;
END;
$$;