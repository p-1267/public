/*
  # Create Departments Showcase RPCs
  
  Creates RPC functions for showcase mode data access with SECURITY DEFINER to bypass RLS
*/

-- Get departments for showcase
CREATE OR REPLACE FUNCTION get_showcase_departments(p_agency_id uuid)
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

-- Get department personnel for showcase
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
    (up.metadata->>'first_name')::text as first_name,
    (up.metadata->>'last_name')::text as last_name,
    up.display_name,
    dp.employee_id,
    dp.position_title,
    dp.shift_pattern,
    dp.skills_tags,
    dp.work_phone,
    dp.work_email,
    dp.status,
    dp.workload_indicator,
    dp.is_primary_department,
    dp.metadata
  FROM department_personnel dp
  INNER JOIN departments d ON d.id = dp.department_id
  INNER JOIN user_profiles up ON up.id = dp.user_id
  WHERE dp.agency_id = p_agency_id
    AND (p_department_id IS NULL OR dp.department_id = p_department_id)
  ORDER BY up.display_name;
END $$;

-- Get department assignments for showcase
CREATE OR REPLACE FUNCTION get_showcase_department_assignments(
  p_agency_id uuid,
  p_department_id uuid DEFAULT NULL,
  p_assigned_to_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  agency_id uuid,
  department_id uuid,
  department_name text,
  title text,
  description text,
  created_by_id uuid,
  created_by_name text,
  assigned_to_id uuid,
  assigned_to_name text,
  shift_type text,
  shift_start timestamptz,
  shift_end timestamptz,
  priority text,
  location_area text,
  status text,
  acceptance_state text,
  checklist_tasks jsonb,
  notes text,
  handoff_notes text,
  completed_at timestamptz,
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
    da.id,
    da.agency_id,
    da.department_id,
    d.name as department_name,
    da.title,
    da.description,
    da.created_by_id,
    creator.display_name as created_by_name,
    da.assigned_to_id,
    assignee.display_name as assigned_to_name,
    da.shift_type,
    da.shift_start,
    da.shift_end,
    da.priority,
    da.location_area,
    da.status,
    da.acceptance_state,
    da.checklist_tasks,
    da.notes,
    da.handoff_notes,
    da.completed_at,
    da.metadata,
    da.created_at
  FROM department_assignments da
  INNER JOIN departments d ON d.id = da.department_id
  LEFT JOIN user_profiles creator ON creator.id = da.created_by_id
  LEFT JOIN user_profiles assignee ON assignee.id = da.assigned_to_id
  WHERE da.agency_id = p_agency_id
    AND (p_department_id IS NULL OR da.department_id = p_department_id)
    AND (p_assigned_to_id IS NULL OR da.assigned_to_id = p_assigned_to_id)
  ORDER BY da.shift_start DESC, da.priority DESC;
END $$;

-- Get department schedules for showcase
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
    up.display_name as user_name,
    dp.employee_id,
    dp.position_title,
    ds.shift_date,
    ds.shift_type,
    ds.shift_start,
    ds.shift_end,
    ds.assignments_count,
    ds.status,
    ds.metadata
  FROM department_schedules ds
  INNER JOIN departments d ON d.id = ds.department_id
  INNER JOIN user_profiles up ON up.id = ds.user_id
  LEFT JOIN department_personnel dp ON dp.user_id = ds.user_id AND dp.department_id = ds.department_id
  WHERE ds.agency_id = p_agency_id
    AND (p_department_id IS NULL OR ds.department_id = p_department_id)
    AND ds.shift_date = p_shift_date
  ORDER BY ds.shift_start, up.display_name;
END $$;

-- Get supervisor daily delivery plan
CREATE OR REPLACE FUNCTION get_supervisor_daily_plan(
  p_agency_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  department_code text,
  department_name text,
  shift_type text,
  staff_on_duty integer,
  total_assignments integer,
  not_started integer,
  in_progress integer,
  blocked integer,
  completed integer,
  pending_acceptance integer,
  high_priority integer,
  urgent_priority integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.department_code,
    d.name as department_name,
    da.shift_type,
    COUNT(DISTINCT ds.user_id)::integer as staff_on_duty,
    COUNT(da.id)::integer as total_assignments,
    COUNT(da.id) FILTER (WHERE da.status = 'not_started')::integer as not_started,
    COUNT(da.id) FILTER (WHERE da.status = 'in_progress')::integer as in_progress,
    COUNT(da.id) FILTER (WHERE da.status = 'blocked')::integer as blocked,
    COUNT(da.id) FILTER (WHERE da.status = 'completed')::integer as completed,
    COUNT(da.id) FILTER (WHERE da.acceptance_state = 'pending')::integer as pending_acceptance,
    COUNT(da.id) FILTER (WHERE da.priority = 'high')::integer as high_priority,
    COUNT(da.id) FILTER (WHERE da.priority = 'urgent')::integer as urgent_priority
  FROM departments d
  LEFT JOIN department_schedules ds ON ds.department_id = d.id AND ds.shift_date = p_date
  LEFT JOIN department_assignments da ON da.department_id = d.id 
    AND DATE(da.shift_start) = p_date
  WHERE d.agency_id = p_agency_id
  GROUP BY d.department_code, d.name, da.shift_type
  ORDER BY d.name, da.shift_type;
END $$;
