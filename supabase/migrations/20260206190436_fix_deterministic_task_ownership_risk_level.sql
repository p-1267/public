/*
  # Fix Deterministic Task Ownership Risk Level

  ## Issue
  tasks.risk_level check constraint expects: 'A', 'B', 'C'
  But create_task_with_simulation_tag defaults to 'low'

  ## Fix
  Update RPC to use correct risk_level values matching constraint
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
  v_owner_user_id uuid;
  v_agency_id uuid;
  v_department_id uuid;
  v_risk_level text;
BEGIN
  v_agency_id := (p_task_data->>'agency_id')::uuid;
  v_department_id := (p_task_data->>'department_id')::uuid;

  -- Determine owner: provided > department-based > agency-based
  v_owner_user_id := (p_task_data->>'owner_user_id')::uuid;

  IF v_owner_user_id IS NULL THEN
    v_owner_user_id := get_available_caregiver(v_agency_id, v_department_id);
  END IF;

  -- CRITICAL: Never allow NULL owner_user_id
  IF v_owner_user_id IS NULL THEN
    RAISE EXCEPTION 'Cannot create task: no available caregiver found for agency %', v_agency_id;
  END IF;

  -- Normalize risk_level to match constraint (A, B, C)
  v_risk_level := COALESCE(p_task_data->>'risk_level', 'B');
  v_risk_level := CASE UPPER(v_risk_level)
    WHEN 'LOW' THEN 'C'
    WHEN 'MEDIUM' THEN 'B'
    WHEN 'HIGH' THEN 'A'
    WHEN 'CRITICAL' THEN 'A'
    ELSE v_risk_level  -- Already A/B/C
  END;

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
    owner_user_id,  -- ALWAYS SET
    metadata
  ) VALUES (
    v_agency_id,
    (p_task_data->>'resident_id')::uuid,
    COALESCE(
      (p_task_data->>'category_id')::uuid,
      (SELECT id FROM task_categories WHERE agency_id = v_agency_id LIMIT 1)
    ),
    COALESCE(p_task_data->>'task_name', p_task_data->>'title', 'Test Task'),
    p_task_data->>'description',
    COALESCE(p_task_data->>'priority', 'medium'),
    v_risk_level,  -- Normalized A/B/C
    COALESCE(p_task_data->>'state', 'scheduled'),
    COALESCE((p_task_data->>'scheduled_start')::timestamptz, now()),
    COALESCE((p_task_data->>'scheduled_end')::timestamptz, now() + interval '1 hour'),
    COALESCE((p_task_data->>'requires_evidence')::boolean, false),
    p_is_simulation,
    (p_task_data->>'created_by')::uuid,
    v_department_id,
    v_owner_user_id,  -- DETERMINISTIC ASSIGNMENT
    p_task_data - 'agency_id' - 'resident_id' - 'category_id' - 'task_name' - 'title' - 'description' - 'priority' - 'risk_level' - 'state' - 'scheduled_start' - 'scheduled_end' - 'requires_evidence' - 'created_by' - 'department_id' - 'owner_user_id'
  )
  RETURNING id INTO v_task_id;

  RETURN v_task_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_task_with_simulation_tag(jsonb, boolean) TO authenticated, anon;

COMMENT ON FUNCTION create_task_with_simulation_tag IS
'Test helper: Creates task with guaranteed owner_user_id assignment. Risk level auto-normalized to A/B/C constraint.';
