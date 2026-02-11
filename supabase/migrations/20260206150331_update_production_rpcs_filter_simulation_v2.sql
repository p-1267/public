/*
  # Update Production RPCs to Filter Simulation Data (v2)

  ## Purpose
  All production query RPCs must filter out simulation data by default
  
  ## Strategy
  - Drop existing function versions
  - Recreate with p_include_simulation parameter (defaults to false)
  - Filter WHERE NOT is_simulation in production queries
*/

-- Drop existing versions
DROP FUNCTION IF EXISTS get_caregiver_task_list(uuid, date);
DROP FUNCTION IF EXISTS get_todays_tasks(uuid, uuid);
DROP FUNCTION IF EXISTS get_intelligence_signals_for_resident(uuid, integer);
DROP FUNCTION IF EXISTS get_resident_vital_signs(uuid, text, integer);
DROP FUNCTION IF EXISTS get_medication_administration_history(uuid, integer);
DROP FUNCTION IF EXISTS get_ai_learning_inputs_for_analysis(uuid, text, integer);
DROP FUNCTION IF EXISTS get_task_completion_analytics(uuid, date, date);

-- ============================================================================
-- Recreate with Simulation Filtering
-- ============================================================================

CREATE FUNCTION get_caregiver_task_list(
  p_user_id uuid,
  p_date date DEFAULT CURRENT_DATE,
  p_include_simulation boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  priority text,
  status text,
  resident_id uuid,
  resident_name text,
  room_number text,
  category_name text,
  scheduled_for timestamptz,
  department_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.description,
    t.priority,
    t.status,
    t.resident_id,
    r.full_name as resident_name,
    r.room_number,
    tc.category_name,
    t.scheduled_for,
    d.name as department_name
  FROM tasks t
  INNER JOIN residents r ON r.id = t.resident_id
  LEFT JOIN task_categories tc ON tc.id = t.category_id
  LEFT JOIN departments d ON d.id = t.department_id
  WHERE (t.assigned_to = p_user_id OR t.created_by = p_user_id)
    AND DATE(t.scheduled_for) = p_date
    AND (p_include_simulation OR NOT COALESCE(t.is_simulation, false))
  ORDER BY t.scheduled_for, t.priority DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_caregiver_task_list TO authenticated;

-- ============================================================================

CREATE FUNCTION get_todays_tasks(
  p_agency_id uuid,
  p_department_id uuid DEFAULT NULL,
  p_include_simulation boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  title text,
  priority text,
  status text,
  resident_name text,
  scheduled_for timestamptz,
  assigned_to_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.priority,
    t.status,
    r.full_name as resident_name,
    t.scheduled_for,
    COALESCE(up.full_name, 'Unassigned') as assigned_to_name
  FROM tasks t
  INNER JOIN residents r ON r.id = t.resident_id
  LEFT JOIN user_profiles up ON up.id = t.assigned_to
  WHERE t.agency_id = p_agency_id
    AND (p_department_id IS NULL OR t.department_id = p_department_id)
    AND DATE(t.scheduled_for) = CURRENT_DATE
    AND (p_include_simulation OR NOT COALESCE(t.is_simulation, false))
  ORDER BY t.scheduled_for, t.priority DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_todays_tasks TO authenticated;

-- ============================================================================

CREATE FUNCTION get_intelligence_signals_for_resident(
  p_resident_id uuid,
  p_limit integer DEFAULT 10,
  p_include_simulation boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  signal_type text,
  severity text,
  title text,
  description text,
  recommendation text,
  confidence_score numeric,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.signal_type,
    i.severity,
    i.title,
    i.description,
    i.recommendation,
    i.confidence_score,
    i.created_at
  FROM intelligence_signals i
  WHERE i.resident_id = p_resident_id
    AND (p_include_simulation OR NOT COALESCE(i.is_simulation, false))
  ORDER BY i.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_intelligence_signals_for_resident TO authenticated;

-- ============================================================================

CREATE FUNCTION get_resident_vital_signs(
  p_resident_id uuid,
  p_metric_type text DEFAULT NULL,
  p_days_back integer DEFAULT 7,
  p_include_simulation boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  metric_type text,
  value numeric,
  unit text,
  recorded_at timestamptz,
  recorded_by_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.metric_type,
    v.value,
    v.unit,
    v.recorded_at,
    COALESCE(up.full_name, 'System') as recorded_by_name
  FROM vital_signs v
  LEFT JOIN user_profiles up ON up.id = v.recorded_by
  WHERE v.resident_id = p_resident_id
    AND (p_metric_type IS NULL OR v.metric_type = p_metric_type)
    AND v.recorded_at >= (CURRENT_DATE - p_days_back * interval '1 day')
    AND (p_include_simulation OR NOT COALESCE(v.is_simulation, false))
  ORDER BY v.recorded_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_resident_vital_signs TO authenticated;

-- ============================================================================

CREATE FUNCTION get_medication_administration_history(
  p_resident_id uuid,
  p_days_back integer DEFAULT 30,
  p_include_simulation boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  medication_id uuid,
  medication_name text,
  dosage text,
  administered_at timestamptz,
  administered_by_name text,
  status text,
  notes text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mal.id,
    mal.medication_id,
    rm.medication_name,
    rm.dosage,
    mal.administered_at,
    COALESCE(up.full_name, 'System') as administered_by_name,
    mal.status,
    mal.notes
  FROM medication_administration_log mal
  INNER JOIN resident_medications rm ON rm.id = mal.medication_id
  LEFT JOIN user_profiles up ON up.id = mal.administered_by
  WHERE mal.resident_id = p_resident_id
    AND mal.administered_at >= (CURRENT_DATE - p_days_back * interval '1 day')
    AND (p_include_simulation OR NOT COALESCE(mal.is_simulation, false))
  ORDER BY mal.administered_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_medication_administration_history TO authenticated;

-- ============================================================================

CREATE FUNCTION get_ai_learning_inputs_for_analysis(
  p_agency_id uuid,
  p_input_type text DEFAULT NULL,
  p_days_back integer DEFAULT 30,
  p_include_simulation boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  input_type text,
  input_data jsonb,
  outcome_data jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ai.id,
    ai.input_type,
    ai.input_data,
    ai.outcome_data,
    ai.created_at
  FROM ai_learning_inputs ai
  WHERE ai.agency_id = p_agency_id
    AND (p_input_type IS NULL OR ai.input_type = p_input_type)
    AND ai.created_at >= (CURRENT_DATE - p_days_back * interval '1 day')
    AND (p_include_simulation OR NOT COALESCE(ai.is_simulation, false))
  ORDER BY ai.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_ai_learning_inputs_for_analysis TO authenticated;

-- ============================================================================

CREATE FUNCTION get_task_completion_analytics(
  p_agency_id uuid,
  p_date_from date,
  p_date_to date,
  p_include_simulation boolean DEFAULT false
)
RETURNS TABLE (
  total_tasks bigint,
  completed_tasks bigint,
  pending_tasks bigint,
  overdue_tasks bigint,
  completion_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total bigint;
  v_completed bigint;
  v_pending bigint;
  v_overdue bigint;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM tasks
  WHERE agency_id = p_agency_id
    AND DATE(scheduled_for) BETWEEN p_date_from AND p_date_to
    AND (p_include_simulation OR NOT COALESCE(is_simulation, false));

  SELECT COUNT(*) INTO v_completed
  FROM tasks
  WHERE agency_id = p_agency_id
    AND DATE(scheduled_for) BETWEEN p_date_from AND p_date_to
    AND status = 'completed'
    AND (p_include_simulation OR NOT COALESCE(is_simulation, false));

  SELECT COUNT(*) INTO v_pending
  FROM tasks
  WHERE agency_id = p_agency_id
    AND DATE(scheduled_for) BETWEEN p_date_from AND p_date_to
    AND status = 'pending'
    AND (p_include_simulation OR NOT COALESCE(is_simulation, false));

  SELECT COUNT(*) INTO v_overdue
  FROM tasks
  WHERE agency_id = p_agency_id
    AND DATE(scheduled_for) BETWEEN p_date_from AND p_date_to
    AND status IN ('pending', 'in_progress')
    AND scheduled_for < now()
    AND (p_include_simulation OR NOT COALESCE(is_simulation, false));

  RETURN QUERY
  SELECT
    v_total,
    v_completed,
    v_pending,
    v_overdue,
    CASE WHEN v_total > 0 THEN (v_completed::numeric / v_total::numeric * 100) ELSE 0 END;
END;
$$;

GRANT EXECUTE ON FUNCTION get_task_completion_analytics TO authenticated;

-- ============================================================================

CREATE OR REPLACE FUNCTION should_include_simulation()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND agency_id = 'a0000000-0000-0000-0000-000000000001'::uuid
  );
END;
$$;

GRANT EXECUTE ON FUNCTION should_include_simulation() TO authenticated, anon;
