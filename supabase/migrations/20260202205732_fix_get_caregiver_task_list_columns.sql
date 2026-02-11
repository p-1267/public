/*
  # Fix get_caregiver_task_list Column References

  Fixes column references in get_caregiver_task_list that don't exist:
  - tc.required_evidence_types → use empty array
  - tc.category_name → use tc.name
*/

CREATE OR REPLACE FUNCTION get_caregiver_task_list(
  p_caregiver_id uuid,
  p_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  task_id uuid,
  task_name text,
  description text,
  resident_id uuid,
  resident_name text,
  priority text,
  risk_level text,
  state text,
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  requires_evidence boolean,
  evidence_types jsonb,
  category_name text,
  department_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.task_name,
    t.description,
    t.resident_id,
    r.full_name,
    t.priority,
    t.risk_level,
    t.state,
    t.scheduled_start,
    t.scheduled_end,
    t.requires_evidence,
    '[]'::jsonb, -- Fixed: no required_evidence_types column
    tc.name, -- Fixed: use tc.name instead of tc.category_name
    d.name
  FROM tasks t
  INNER JOIN residents r ON t.resident_id = r.id
  INNER JOIN task_categories tc ON t.category_id = tc.id
  LEFT JOIN departments d ON t.department_id = d.id
  WHERE t.owner_user_id = p_caregiver_id
    AND DATE(t.scheduled_start) = p_date
    AND t.state IN ('scheduled', 'due', 'in_progress')
  ORDER BY
    CASE t.priority
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      WHEN 'low' THEN 4
    END,
    t.scheduled_start;
END;
$$;
