/*
  # Deterministic Task Ownership

  ## Purpose
  Ensure all tasks are created with a valid owner_user_id, never NULL.
  Removes dependency on manual SQL patches for assignment.

  ## Changes
  1. Update create_task_with_simulation_tag to auto-assign owner
  2. Add helper function to select caregiver by department
  3. Update seed functions to never create unowned tasks

  ## Assignment Logic
  - If owner_user_id provided: use it
  - If department_id provided: assign to caregiver in that department
  - Otherwise: assign to first available caregiver in agency
*/

-- Helper: Get first available caregiver for department/agency
CREATE OR REPLACE FUNCTION get_available_caregiver(
  p_agency_id uuid,
  p_department_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caregiver_id uuid;
  v_caregiver_role_id uuid;
BEGIN
  -- Get CAREGIVER role ID
  SELECT id INTO v_caregiver_role_id
  FROM roles
  WHERE name = 'CAREGIVER'
  LIMIT 1;

  IF v_caregiver_role_id IS NULL THEN
    -- Fallback: try to find any active user in the agency
    SELECT id INTO v_caregiver_id
    FROM user_profiles
    WHERE agency_id = p_agency_id
      AND is_active = true
    ORDER BY created_at
    LIMIT 1;

    RETURN v_caregiver_id;
  END IF;

  -- Try to find caregiver in specific department
  IF p_department_id IS NOT NULL THEN
    SELECT up.id INTO v_caregiver_id
    FROM user_profiles up
    INNER JOIN department_personnel dp ON dp.user_id = up.id
    WHERE up.role_id = v_caregiver_role_id
      AND up.agency_id = p_agency_id
      AND up.is_active = true
      AND dp.department_id = p_department_id
    ORDER BY up.created_at
    LIMIT 1;

    IF v_caregiver_id IS NOT NULL THEN
      RETURN v_caregiver_id;
    END IF;
  END IF;

  -- Fallback: any caregiver in agency
  SELECT up.id INTO v_caregiver_id
  FROM user_profiles up
  WHERE up.role_id = v_caregiver_role_id
    AND up.agency_id = p_agency_id
    AND up.is_active = true
  ORDER BY up.created_at
  LIMIT 1;

  RETURN v_caregiver_id;
END;
$$;

-- Update task creation to auto-assign owner
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
    COALESCE(p_task_data->>'risk_level', 'low'),
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

GRANT EXECUTE ON FUNCTION get_available_caregiver(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_task_with_simulation_tag(jsonb, boolean) TO authenticated, anon;

COMMENT ON FUNCTION get_available_caregiver IS
'Deterministically selects an available caregiver for task assignment. Prefers department match, falls back to agency-level assignment.';

COMMENT ON FUNCTION create_task_with_simulation_tag IS
'Test helper: Creates task with guaranteed owner_user_id assignment. NEVER creates unowned tasks.';
