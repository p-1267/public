/*
  # Fix Showcase Department RPCs
  
  Fixes RPC functions to read personnel data directly from department_personnel table
  instead of requiring user_profiles join.
  
  Changes:
  - get_showcase_department_personnel: Read first_name/last_name from department_personnel
  - get_showcase_department_schedules: Handle NULL user_id gracefully
*/

-- Fix get_showcase_department_personnel to read from department_personnel directly
CREATE OR REPLACE FUNCTION get_showcase_department_personnel(
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
  skills_tags jsonb,
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

-- Fix get_showcase_department_schedules to use metadata for user info
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
    COALESCE((ds.metadata->>'user_name')::text, 'Unknown') as user_name,
    COALESCE((ds.metadata->>'employee_id')::text, '') as employee_id,
    COALESCE((ds.metadata->>'position_title')::text, '') as position_title,
    ds.shift_date,
    ds.shift_type,
    ds.shift_start,
    ds.shift_end,
    ds.assignments_count,
    ds.status,
    ds.metadata
  FROM department_schedules ds
  INNER JOIN departments d ON d.id = ds.department_id
  WHERE ds.agency_id = p_agency_id
    AND (p_department_id IS NULL OR ds.department_id = p_department_id)
    AND ds.shift_date = p_shift_date
  ORDER BY ds.shift_start;
END $$;