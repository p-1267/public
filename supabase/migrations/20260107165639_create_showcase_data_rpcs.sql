/*
  # Create Showcase Data Query RPCs
  
  Creates RPC functions that bypass RLS for showcase mode data access
*/

-- Get tasks for showcase mode
CREATE OR REPLACE FUNCTION get_showcase_tasks(p_agency_id uuid, p_department text DEFAULT NULL)
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
  ORDER BY t.scheduled_start DESC;
END $$;

-- Get residents for showcase mode
CREATE OR REPLACE FUNCTION get_showcase_residents(p_agency_id uuid)
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
    AND r.status = 'active'
  ORDER BY r.full_name;
END $$;

-- Get task categories for showcase mode
CREATE OR REPLACE FUNCTION get_showcase_categories(p_agency_id uuid)
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
  ORDER BY tc.name;
END $$;

-- Get department stats for showcase mode
CREATE OR REPLACE FUNCTION get_showcase_department_stats(p_agency_id uuid)
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
  GROUP BY t.department
  ORDER BY t.department;
END $$;
