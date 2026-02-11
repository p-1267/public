/*
  # Update schedules RPC to handle nullable user_id
  
  Updates get_showcase_department_schedules to work with NULL user_id
  by pulling data from metadata when user_id is not present
*/

CREATE OR REPLACE FUNCTION get_showcase_department_schedules(
  p_agency_id uuid,
  p_department_id uuid DEFAULT NULL,
  p_shift_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  id uuid,
  department_id uuid,
  department_name text,
  user_id uuid,
  user_name text,
  employee_id text,
  position_title text,
  shift_date date,
  shift_type text,
  shift_start timestamptz,
  shift_end timestamptz,
  assignments_count integer,
  status text,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ds.id,
    ds.department_id,
    d.name as department_name,
    ds.user_id,
    COALESCE(up.display_name, ds.metadata->>'user_name', 'Unassigned') as user_name,
    COALESCE(dp.employee_id, ds.metadata->>'employee_id', 'N/A') as employee_id,
    COALESCE(dp.position_title, ds.metadata->>'position_title', 'Staff') as position_title,
    ds.shift_date,
    ds.shift_type,
    ds.shift_start,
    ds.shift_end,
    ds.assignments_count,
    ds.status,
    ds.metadata
  FROM department_schedules ds
  INNER JOIN departments d ON d.id = ds.department_id
  LEFT JOIN user_profiles up ON up.id = ds.user_id
  LEFT JOIN department_personnel dp ON dp.user_id = ds.user_id AND dp.department_id = ds.department_id
  WHERE ds.agency_id = p_agency_id
    AND (p_department_id IS NULL OR ds.department_id = p_department_id)
    AND ds.shift_date = p_shift_date
  ORDER BY ds.shift_start, COALESCE(up.display_name, ds.metadata->>'user_name', 'Unassigned');
END $$;
