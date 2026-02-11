/*
  # Fix Test RPC to Use Lowercase Priority Values

  ## Purpose
  Update create_task_with_simulation_tag to use lowercase priority values: low, medium, high, critical
*/

DROP FUNCTION IF EXISTS create_task_with_simulation_tag(jsonb, boolean);

CREATE OR REPLACE FUNCTION create_task_with_simulation_tag(
  p_task_data jsonb,
  p_is_simulation boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_id uuid;
BEGIN
  INSERT INTO tasks (
    agency_id,
    resident_id,
    category_id,
    task_name,
    description,
    priority,
    risk_level,
    state,
    scheduled_start,
    scheduled_end,
    requires_evidence,
    is_simulation,
    created_by,
    department_id,
    metadata
  ) VALUES (
    (p_task_data->>'agency_id')::uuid,
    (p_task_data->>'resident_id')::uuid,
    COALESCE((p_task_data->>'category_id')::uuid, (SELECT id FROM task_categories WHERE agency_id = (p_task_data->>'agency_id')::uuid LIMIT 1)),
    COALESCE(p_task_data->>'task_name', p_task_data->>'title', 'Test Task'),
    p_task_data->>'description',
    COALESCE(lower(p_task_data->>'priority'), 'medium'), -- Convert to lowercase
    COALESCE(p_task_data->>'risk_level', 'B'),
    COALESCE(p_task_data->>'state', 'scheduled'),
    COALESCE((p_task_data->>'scheduled_start')::timestamptz, now()),
    COALESCE((p_task_data->>'scheduled_end')::timestamptz, now() + interval '1 hour'),
    COALESCE((p_task_data->>'requires_evidence')::boolean, false),
    p_is_simulation,
    (p_task_data->>'created_by')::uuid,
    (p_task_data->>'department_id')::uuid,
    p_task_data - 'agency_id' - 'resident_id' - 'category_id' - 'task_name' - 'title' - 'description' - 'priority' - 'risk_level' - 'state' - 'scheduled_start' - 'scheduled_end' - 'requires_evidence' - 'created_by' - 'department_id'
  )
  RETURNING id INTO v_task_id;

  RETURN v_task_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_task_with_simulation_tag(jsonb, boolean) TO authenticated, anon;

COMMENT ON FUNCTION create_task_with_simulation_tag IS
'Test helper: Creates task with is_simulation flag. Priority: low/medium/high/critical. Risk: A/B/C.';
