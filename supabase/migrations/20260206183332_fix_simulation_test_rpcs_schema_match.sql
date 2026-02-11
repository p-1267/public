/*
  # Fix Simulation Test RPCs to Match Current Schema

  ## Purpose
  Update test helper RPCs to match actual database schema:
  - tasks uses task_name not title
  - vital_signs uses vital_type not metric_type and value is text not numeric

  ## Changes
  - Drop and recreate create_task_with_simulation_tag with correct schema
  - Drop and recreate record_vital_sign_with_simulation_tag with correct schema
*/

-- Drop old versions
DROP FUNCTION IF EXISTS create_task_with_simulation_tag(jsonb, boolean);
DROP FUNCTION IF EXISTS record_vital_sign_with_simulation_tag(uuid, text, numeric, text, boolean);

-- Recreate with correct schema
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
    COALESCE(p_task_data->>'priority', 'MEDIUM'),
    COALESCE(p_task_data->>'risk_level', 'LOW'),
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

-- Function to record vital sign with correct schema
CREATE OR REPLACE FUNCTION record_vital_sign_with_simulation_tag(
  p_resident_id uuid,
  p_vital_type text,
  p_value text,
  p_notes text DEFAULT NULL,
  p_is_simulation boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vital_id uuid;
BEGIN
  INSERT INTO vital_signs (
    resident_id,
    vital_type,
    value,
    recorded_at,
    recorded_by,
    notes,
    is_simulation
  ) VALUES (
    p_resident_id,
    p_vital_type,
    p_value,
    now(),
    NULL, -- Allow NULL for test context
    p_notes,
    p_is_simulation
  )
  RETURNING id INTO v_vital_id;

  RETURN v_vital_id;
END;
$$;

GRANT EXECUTE ON FUNCTION record_vital_sign_with_simulation_tag(uuid, text, text, text, boolean) TO authenticated, anon;

COMMENT ON FUNCTION create_task_with_simulation_tag IS
'Test helper: Creates task with is_simulation flag. Used by parity test suite.';

COMMENT ON FUNCTION record_vital_sign_with_simulation_tag IS
'Test helper: Records vital sign with is_simulation flag. Used by parity test suite.';
