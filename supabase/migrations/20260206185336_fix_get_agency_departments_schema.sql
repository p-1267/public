/*
  # Fix get_agency_departments Schema Mismatch

  ## Purpose
  Fix get_agency_departments RPC to match actual departments table schema:
  - Remove shift_pattern (doesn't exist in departments)
  - Remove is_active check (doesn't exist in departments)
  - Add missing columns (icon, status, staff_count, department_code)
  - Match the Department interface from useDepartments hook
*/

DROP FUNCTION IF EXISTS get_agency_departments(uuid, boolean);

CREATE OR REPLACE FUNCTION get_agency_departments(
  p_agency_id uuid,
  p_include_simulation boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  agency_id uuid,
  name text,
  department_code text,
  description text,
  icon text,
  supervisor_id uuid,
  supervisor_name text,
  status text,
  staff_count integer,
  metadata jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.agency_id,
    d.name,
    d.department_code,
    d.description,
    d.icon,
    d.supervisor_id,
    up.display_name as supervisor_name,
    d.status,
    d.staff_count,
    d.metadata,
    d.created_at
  FROM departments d
  LEFT JOIN user_profiles up ON up.id = d.supervisor_id
  WHERE d.agency_id = p_agency_id
  ORDER BY d.name;
END $$;

GRANT EXECUTE ON FUNCTION get_agency_departments(uuid, boolean) TO authenticated, anon;

COMMENT ON FUNCTION get_agency_departments IS
'Returns all departments for an agency with supervisor info and staff counts.';
