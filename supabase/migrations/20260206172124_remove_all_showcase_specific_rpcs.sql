/*
  # Remove All Showcase-Specific RPCs

  ## Purpose
  Remove all _showcase/_demo named RPCs that create alternate logic paths.
  Replace with properly-named RPCs that filter by is_simulation parameter.

  ## Functions Removed
  - get_showcase_tasks -> Use get_agency_tasks with is_simulation filter
  - get_showcase_residents -> Use get_agency_residents with is_simulation filter
  - get_showcase_categories -> Use get_task_categories with is_simulation filter
  - get_showcase_department_stats -> Use get_department_stats with is_simulation filter
  - get_showcase_departments -> Use get_agency_departments with is_simulation filter
  - get_showcase_department_personnel -> Use get_department_personnel with is_simulation filter
  - get_showcase_department_assignments -> Use get_department_assignments with is_simulation filter
  - get_showcase_department_schedules -> Use get_department_schedules with is_simulation filter
  - create_showcase_agency -> Replaced by normal create_agency
  - All other _showcase functions

  ## Replacement Strategy
  All business logic RPCs now use single code path with p_include_simulation parameter.
  Only seed_* and reset_* utilities retain showcase naming.
*/

-- Drop all get_showcase_* query functions
DROP FUNCTION IF EXISTS get_showcase_tasks(uuid, text);
DROP FUNCTION IF EXISTS get_showcase_residents(uuid);
DROP FUNCTION IF EXISTS get_showcase_categories(uuid);
DROP FUNCTION IF EXISTS get_showcase_department_stats(uuid);
DROP FUNCTION IF EXISTS get_showcase_departments(uuid);
DROP FUNCTION IF EXISTS get_showcase_department_personnel(uuid);
DROP FUNCTION IF EXISTS get_showcase_department_assignments(uuid, text);
DROP FUNCTION IF EXISTS get_showcase_department_schedules(uuid, text);

-- Drop create_showcase_* functions
DROP FUNCTION IF EXISTS create_showcase_agency();

-- Create replacement functions with is_simulation filtering

-- 1. Get agency tasks (replaces get_showcase_tasks)
CREATE OR REPLACE FUNCTION get_agency_tasks(
  p_agency_id uuid,
  p_department text DEFAULT NULL,
  p_include_simulation boolean DEFAULT false
)
RETURNS TABLE (
  task_id uuid,
  task_name text,
  resident_id uuid,
  resident_name text,
  department text,
  priority text,
  risk_level text,
  state text,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  completed_by_name text,
  requires_evidence boolean,
  supervisor_acknowledged boolean,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id as task_id,
    t.task_name,
    t.resident_id,
    r.full_name as resident_name,
    t.department,
    t.priority,
    t.risk_level,
    t.state,
    t.scheduled_start,
    t.scheduled_end,
    (t.metadata->>'completed_by_name')::text as completed_by_name,
    t.requires_evidence,
    t.supervisor_acknowledged,
    t.metadata
  FROM tasks t
  LEFT JOIN residents r ON r.id = t.resident_id
  WHERE t.agency_id = p_agency_id
    AND (p_department IS NULL OR t.department = p_department)
    AND (p_include_simulation OR t.is_simulation IS NOT TRUE)
  ORDER BY t.scheduled_start DESC;
END $$;

-- 2. Get agency residents (replaces get_showcase_residents)
CREATE OR REPLACE FUNCTION get_agency_residents(
  p_agency_id uuid,
  p_include_simulation boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  full_name text,
  date_of_birth date,
  status text,
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
    r.id,
    r.full_name,
    r.date_of_birth,
    r.status,
    r.metadata,
    r.created_at
  FROM residents r
  WHERE r.agency_id = p_agency_id
    AND r.status = 'ACTIVE'
    AND (p_include_simulation OR r.is_simulation IS NOT TRUE)
  ORDER BY r.full_name;
END $$;

-- 3. Get task categories (replaces get_showcase_categories)
CREATE OR REPLACE FUNCTION get_task_categories(
  p_agency_id uuid,
  p_include_simulation boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  name text,
  category_type text,
  description text,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tc.id,
    tc.name,
    tc.category_type,
    tc.description,
    tc.metadata
  FROM task_categories tc
  WHERE tc.agency_id = p_agency_id
    AND tc.is_active = true
    AND (p_include_simulation OR tc.is_simulation IS NOT TRUE)
  ORDER BY tc.name;
END $$;

-- 4. Get department stats (replaces get_showcase_department_stats)
CREATE OR REPLACE FUNCTION get_department_stats(
  p_agency_id uuid,
  p_include_simulation boolean DEFAULT false
)
RETURNS TABLE (
  department text,
  total_tasks bigint,
  completed_tasks bigint,
  scheduled_tasks bigint,
  pending_acknowledgement bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.department,
    COUNT(*) as total_tasks,
    COUNT(*) FILTER (WHERE t.state = 'completed') as completed_tasks,
    COUNT(*) FILTER (WHERE t.state = 'scheduled') as scheduled_tasks,
    COUNT(*) FILTER (WHERE t.state = 'completed' AND t.requires_evidence = true AND t.supervisor_acknowledged = false) as pending_acknowledgement
  FROM tasks t
  WHERE t.agency_id = p_agency_id
    AND (p_include_simulation OR t.is_simulation IS NOT TRUE)
  GROUP BY t.department
  ORDER BY t.department;
END $$;

-- 5. Get agency departments (replaces get_showcase_departments)
CREATE OR REPLACE FUNCTION get_agency_departments(
  p_agency_id uuid,
  p_include_simulation boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  shift_pattern text,
  supervisor_id uuid,
  supervisor_name text,
  active_staff_count bigint,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    d.id,
    d.name,
    d.description,
    d.shift_pattern,
    d.supervisor_id,
    sup.full_name as supervisor_name,
    (
      SELECT COUNT(DISTINCT dp.user_id)
      FROM department_personnel dp
      WHERE dp.department_id = d.id
        AND dp.is_active = true
        AND (p_include_simulation OR dp.is_simulation IS NOT TRUE)
    ) as active_staff_count,
    d.metadata
  FROM departments d
  LEFT JOIN user_profiles sup ON sup.id = d.supervisor_id
  WHERE d.agency_id = p_agency_id
    AND d.is_active = true
    AND (p_include_simulation OR d.is_simulation IS NOT TRUE)
  ORDER BY d.name;
END $$;

-- 6. Get department personnel (replaces get_showcase_department_personnel)
CREATE OR REPLACE FUNCTION get_department_personnel(
  p_department_id uuid,
  p_include_simulation boolean DEFAULT false
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  employee_id text,
  role_name text,
  is_supervisor boolean,
  assigned_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    dp.user_id,
    up.full_name,
    up.employee_id,
    r.name as role_name,
    (d.supervisor_id = dp.user_id) as is_supervisor,
    dp.assigned_at
  FROM department_personnel dp
  JOIN user_profiles up ON up.id = dp.user_id
  JOIN roles r ON r.id = up.role_id
  JOIN departments d ON d.id = dp.department_id
  WHERE dp.department_id = p_department_id
    AND dp.is_active = true
    AND (p_include_simulation OR dp.is_simulation IS NOT TRUE)
  ORDER BY is_supervisor DESC, up.full_name;
END $$;

-- 7. Get department assignments (replaces get_showcase_department_assignments)
CREATE OR REPLACE FUNCTION get_department_assignments(
  p_department_id uuid,
  p_status text DEFAULT 'scheduled',
  p_include_simulation boolean DEFAULT false
)
RETURNS TABLE (
  assignment_id uuid,
  caregiver_name text,
  resident_name text,
  shift_start timestamptz,
  shift_end timestamptz,
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
    ca.id as assignment_id,
    cg.full_name as caregiver_name,
    r.full_name as resident_name,
    ca.shift_start,
    ca.shift_end,
    ca.status,
    ca.metadata
  FROM caregiver_assignments ca
  JOIN user_profiles cg ON cg.id = ca.caregiver_id
  JOIN residents r ON r.id = ca.resident_id
  JOIN department_personnel dp ON dp.user_id = ca.caregiver_id
  WHERE dp.department_id = p_department_id
    AND (p_status IS NULL OR ca.status = p_status)
    AND (p_include_simulation OR ca.is_simulation IS NOT TRUE)
  ORDER BY ca.shift_start;
END $$;

-- 8. Get department schedules (replaces get_showcase_department_schedules)
CREATE OR REPLACE FUNCTION get_department_schedules(
  p_department_id uuid,
  p_shift_pattern text DEFAULT NULL,
  p_include_simulation boolean DEFAULT false
)
RETURNS TABLE (
  schedule_id uuid,
  caregiver_id uuid,
  caregiver_name text,
  shift_date date,
  shift_start timestamptz,
  shift_end timestamptz,
  shift_pattern text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as schedule_id,
    s.caregiver_id,
    up.full_name as caregiver_name,
    s.shift_date,
    s.start_time as shift_start,
    s.end_time as shift_end,
    s.shift_pattern,
    s.status
  FROM shifts s
  JOIN user_profiles up ON up.id = s.caregiver_id
  JOIN department_personnel dp ON dp.user_id = s.caregiver_id
  WHERE dp.department_id = p_department_id
    AND (p_shift_pattern IS NULL OR s.shift_pattern = p_shift_pattern)
    AND (p_include_simulation OR s.metadata->>'is_simulation' IS NULL OR s.metadata->>'is_simulation' = 'false')
  ORDER BY s.shift_date DESC, s.start_time;
END $$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_agency_tasks TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_agency_residents TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_task_categories TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_department_stats TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_agency_departments TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_department_personnel TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_department_assignments TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_department_schedules TO authenticated, anon;

COMMENT ON FUNCTION get_agency_tasks IS
'Get tasks for agency, excludes simulation data by default';

COMMENT ON FUNCTION get_agency_residents IS
'Get residents for agency, excludes simulation data by default';

COMMENT ON FUNCTION get_task_categories IS
'Get task categories for agency, excludes simulation data by default';

COMMENT ON FUNCTION get_department_stats IS
'Get department statistics, excludes simulation data by default';

COMMENT ON FUNCTION get_agency_departments IS
'Get departments for agency, excludes simulation data by default';

COMMENT ON FUNCTION get_department_personnel IS
'Get personnel in department, excludes simulation data by default';

COMMENT ON FUNCTION get_department_assignments IS
'Get assignments for department, excludes simulation data by default';

COMMENT ON FUNCTION get_department_schedules IS
'Get schedules for department, excludes simulation data by default';
