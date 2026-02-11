/*
  # Fix Department Personnel RPC - Drop and Recreate
  
  Drops and recreates the get_showcase_department_personnel function with correct types
*/

DROP FUNCTION IF EXISTS get_showcase_department_personnel(uuid, uuid);

CREATE FUNCTION get_showcase_department_personnel(
  p_agency_id uuid,
  p_department_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  department_id uuid,
  department_name text,
  user_id uuid,
  first_name text,
  last_name text,
  display_name text,
  employee_id text,
  position_title text,
  shift_pattern text,
  skills_tags text[],
  work_phone text,
  work_email text,
  status text,
  workload_indicator integer,
  is_primary_department boolean,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dp.id,
    dp.department_id,
    d.name as department_name,
    dp.user_id,
    dp.first_name,
    dp.last_name,
    dp.display_name,
    dp.employee_id,
    dp.position_title,
    dp.shift_pattern,
    dp.skills as skills_tags,
    dp.work_phone,
    dp.work_email,
    dp.status,
    dp.workload_indicator,
    dp.is_primary_department,
    dp.metadata
  FROM department_personnel dp
  INNER JOIN departments d ON d.id = dp.department_id
  WHERE dp.agency_id = p_agency_id
    AND (p_department_id IS NULL OR dp.department_id = p_department_id)
  ORDER BY dp.display_name;
END $$;