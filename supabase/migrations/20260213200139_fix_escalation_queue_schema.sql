/*
  # Fix Escalation Queue RPC Schema

  Fix column name from title to task_name to match actual tasks table schema.
*/

DROP FUNCTION IF EXISTS get_supervisor_escalation_queue(uuid);

CREATE OR REPLACE FUNCTION get_supervisor_escalation_queue(
  p_agency_id uuid DEFAULT NULL
)
RETURNS TABLE (
  review_id uuid,
  task_id uuid,
  task_title text,
  resident_id uuid,
  resident_name text,
  review_status text,
  escalation_reason text,
  urgency text,
  escalated_at timestamptz,
  age_hours numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sr.id as review_id,
    sr.task_id,
    t.task_name as task_title,
    t.resident_id,
    r.first_name || ' ' || r.last_name as resident_name,
    sr.review_status,
    sr.escalation_reason,
    (sr.metadata->>'urgency')::text as urgency,
    (sr.metadata->>'escalated_at')::timestamptz as escalated_at,
    EXTRACT(EPOCH FROM (now() - (sr.metadata->>'escalated_at')::timestamptz))/3600 as age_hours
  FROM supervisor_reviews sr
  INNER JOIN tasks t ON t.id = sr.task_id
  INNER JOIN residents r ON r.id = t.resident_id
  WHERE sr.review_status = 'escalated'
  AND (p_agency_id IS NULL OR t.agency_id = p_agency_id)
  ORDER BY
    CASE (sr.metadata->>'urgency')::text
      WHEN 'critical' THEN 1
      WHEN 'high' THEN 2
      WHEN 'medium' THEN 3
      ELSE 4
    END,
    (sr.metadata->>'escalated_at')::timestamptz ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_supervisor_escalation_queue TO authenticated, anon;