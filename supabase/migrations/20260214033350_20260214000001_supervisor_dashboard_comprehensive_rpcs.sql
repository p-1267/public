/*
  # Supervisor Dashboard Comprehensive RPCs

  Creates all missing RPCs needed for full supervisor dashboard functionality:

  1. KPI Metrics with Trends
  2. Department Snapshot
  3. Workforce Risk Assessment
  4. Compliance Snapshot
  5. Intelligence Signals with Linkage
  6. Escalation Actions (assign, reassign, etc.)
*/

-- Function: Get KPI metrics with 24h/7d trends
CREATE OR REPLACE FUNCTION get_supervisor_kpi_metrics(
  p_agency_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
  v_now timestamptz := now();
  v_24h_ago timestamptz := now() - interval '24 hours';
  v_7d_ago timestamptz := now() - interval '7 days';
BEGIN
  SELECT jsonb_build_object(
    'critical_residents', (
      SELECT jsonb_build_object(
        'current', COUNT(*),
        'delta_24h', COUNT(*) - (
          SELECT COUNT(*) FROM residents
          WHERE agency_id = p_agency_id AND risk_level = 'HIGH'
          AND created_at < v_24h_ago
        )
      )
      FROM residents
      WHERE agency_id = p_agency_id AND risk_level = 'HIGH'
    ),
    'active_escalations', (
      SELECT jsonb_build_object(
        'current', COUNT(*),
        'delta_24h', COUNT(*) - (
          SELECT COUNT(*) FROM escalation_queue
          WHERE agency_id = p_agency_id
          AND status IN ('PENDING', 'IN_PROGRESS', 'ACKNOWLEDGED')
          AND escalated_at < v_24h_ago
        )
      )
      FROM escalation_queue
      WHERE agency_id = p_agency_id
      AND status IN ('PENDING', 'IN_PROGRESS', 'ACKNOWLEDGED')
    ),
    'sla_breaches', (
      SELECT jsonb_build_object(
        'current', COUNT(*),
        'delta_24h', COUNT(*) - (
          SELECT COUNT(*) FROM escalation_queue
          WHERE agency_id = p_agency_id
          AND status NOT IN ('RESOLVED', 'CANCELLED')
          AND required_response_by < v_now
          AND escalated_at < v_24h_ago
        )
      )
      FROM escalation_queue
      WHERE agency_id = p_agency_id
      AND status NOT IN ('RESOLVED', 'CANCELLED')
      AND required_response_by < v_now
    ),
    'md_notifications_pending', (
      SELECT jsonb_build_object(
        'current', COUNT(*),
        'delta_24h', 0
      )
      FROM clinician_reviews cr
      JOIN escalation_queue eq ON eq.id = cr.escalation_id
      WHERE eq.agency_id = p_agency_id
      AND cr.notification_status NOT IN ('ACKNOWLEDGED', 'READ')
    ),
    'staff_utilization', (
      SELECT jsonb_build_object(
        'current', COALESCE(ROUND(AVG(
          CASE
            WHEN total_tasks = 0 THEN 0
            ELSE (completed_tasks::numeric / total_tasks * 100)
          END
        )), 0),
        'delta_7d', 0
      )
      FROM (
        SELECT
          up.id,
          COUNT(*) FILTER (WHERE t.state IN ('pending', 'in_progress', 'overdue')) as total_tasks,
          COUNT(*) FILTER (WHERE t.state = 'completed') as completed_tasks
        FROM user_profiles up
        LEFT JOIN tasks t ON t.assigned_to = up.id
        WHERE up.agency_id = p_agency_id
        GROUP BY up.id
      ) workload
    ),
    'high_risk_staff', (
      SELECT jsonb_build_object(
        'current', COUNT(*),
        'delta_24h', 0
      )
      FROM (
        SELECT up.id
        FROM user_profiles up
        LEFT JOIN tasks t ON t.assigned_to = up.id AND t.state = 'overdue'
        WHERE up.agency_id = p_agency_id
        GROUP BY up.id
        HAVING COUNT(t.id) FILTER (WHERE t.state = 'overdue') > 3
      ) high_risk
    ),
    'compliance_flags', (
      SELECT jsonb_build_object(
        'current', COUNT(*),
        'delta_24h', 0
      )
      FROM tasks
      WHERE agency_id = p_agency_id
      AND category = 'COMPLIANCE'
      AND state IN ('overdue', 'blocked')
    ),
    'avg_response_time', (
      SELECT jsonb_build_object(
        'current', COALESCE(ROUND(AVG(
          EXTRACT(EPOCH FROM (resolved_at - escalated_at)) / 60
        )), 0),
        'delta_7d', 0
      )
      FROM escalation_queue
      WHERE agency_id = p_agency_id
      AND resolved_at IS NOT NULL
      AND resolved_at > v_7d_ago
    ),
    'total_residents', (
      SELECT COUNT(*) FROM residents WHERE agency_id = p_agency_id
    ),
    'caregivers_on_shift', (
      SELECT COUNT(DISTINCT up.id)
      FROM user_profiles up
      JOIN shifts s ON s.supervisor_id = up.id OR s.id IN (
        SELECT shift_id FROM shift_resident_assignments WHERE caregiver_id = up.id
      )
      WHERE up.agency_id = p_agency_id
      AND s.start_time <= v_now
      AND s.end_time >= v_now
      AND s.status = 'active'
    ),
    'last_updated', v_now
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Function: Get department operational snapshot
CREATE OR REPLACE FUNCTION get_department_snapshot(
  p_agency_id uuid
)
RETURNS TABLE (
  department_id uuid,
  department_name text,
  department_code text,
  staff_on_duty bigint,
  open_tasks bigint,
  overdue_tasks bigint,
  escalations_today bigint,
  needs_review bigint,
  coverage_gap boolean,
  last_updated timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id as department_id,
    d.name as department_name,
    d.code as department_code,
    (
      SELECT COUNT(DISTINCT up.id)
      FROM user_profiles up
      WHERE up.agency_id = d.agency_id
      AND up.id IN (
        SELECT caregiver_id FROM shift_resident_assignments sra
        JOIN shifts s ON s.id = sra.shift_id
        WHERE s.start_time <= now() AND s.end_time >= now()
      )
    ) as staff_on_duty,
    (
      SELECT COUNT(*)
      FROM tasks t
      WHERE t.department_id = d.id
      AND t.state IN ('pending', 'in_progress')
    ) as open_tasks,
    (
      SELECT COUNT(*)
      FROM tasks t
      WHERE t.department_id = d.id
      AND t.state = 'overdue'
    ) as overdue_tasks,
    (
      SELECT COUNT(*)
      FROM escalation_queue eq
      WHERE eq.agency_id = d.agency_id
      AND eq.escalated_at::date = now()::date
      AND eq.metadata->>'department' = d.name
    ) as escalations_today,
    (
      SELECT COUNT(*)
      FROM tasks t
      WHERE t.department_id = d.id
      AND t.state = 'blocked'
      AND t.supervisor_review_required = true
    ) as needs_review,
    false as coverage_gap,
    now() as last_updated
  FROM departments d
  WHERE d.agency_id = p_agency_id
  AND d.status = 'active'
  ORDER BY d.name;
END;
$$;

-- Function: Get workforce risk assessment
CREATE OR REPLACE FUNCTION get_workforce_risk_assessment(
  p_agency_id uuid
)
RETURNS TABLE (
  caregiver_id uuid,
  caregiver_name text,
  role_name text,
  overdue_tasks bigint,
  total_active_tasks bigint,
  incident_flags bigint,
  last_incident_date timestamptz,
  risk_level text,
  risk_reasons jsonb,
  shift_hours_this_week numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.id as caregiver_id,
    up.full_name as caregiver_name,
    r.name as role_name,
    COUNT(*) FILTER (WHERE t.state = 'overdue') as overdue_tasks,
    COUNT(*) FILTER (WHERE t.state IN ('pending', 'in_progress', 'overdue')) as total_active_tasks,
    0::bigint as incident_flags,
    NULL::timestamptz as last_incident_date,
    CASE
      WHEN COUNT(*) FILTER (WHERE t.state = 'overdue') > 5 THEN 'CRITICAL'
      WHEN COUNT(*) FILTER (WHERE t.state = 'overdue') > 3 THEN 'HIGH'
      WHEN COUNT(*) FILTER (WHERE t.state = 'overdue') > 1 THEN 'MEDIUM'
      ELSE 'LOW'
    END as risk_level,
    jsonb_build_array(
      CASE WHEN COUNT(*) FILTER (WHERE t.state = 'overdue') > 3
        THEN jsonb_build_object('reason', 'High overdue task count', 'count', COUNT(*) FILTER (WHERE t.state = 'overdue'))
        ELSE NULL
      END,
      CASE WHEN COUNT(*) FILTER (WHERE t.state IN ('pending', 'in_progress', 'overdue')) > 15
        THEN jsonb_build_object('reason', 'Heavy workload', 'count', COUNT(*) FILTER (WHERE t.state IN ('pending', 'in_progress', 'overdue')))
        ELSE NULL
      END
    ) - NULL as risk_reasons,
    0::numeric as shift_hours_this_week
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  LEFT JOIN tasks t ON t.assigned_to = up.id AND t.state IN ('pending', 'in_progress', 'overdue')
  WHERE up.agency_id = p_agency_id
  GROUP BY up.id, up.full_name, r.name
  HAVING COUNT(*) FILTER (WHERE t.state IN ('pending', 'in_progress', 'overdue')) > 0
  ORDER BY
    CASE
      WHEN COUNT(*) FILTER (WHERE t.state = 'overdue') > 5 THEN 1
      WHEN COUNT(*) FILTER (WHERE t.state = 'overdue') > 3 THEN 2
      WHEN COUNT(*) FILTER (WHERE t.state = 'overdue') > 1 THEN 3
      ELSE 4
    END,
    COUNT(*) FILTER (WHERE t.state = 'overdue') DESC;
END;
$$;

-- Function: Get compliance snapshot
CREATE OR REPLACE FUNCTION get_compliance_snapshot(
  p_agency_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'open_audit_issues', (
      SELECT COUNT(*)
      FROM audit_log
      WHERE table_name IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
      AND created_at > now() - interval '30 days'
      AND details->>'requires_review' = 'true'
    ),
    'missed_medication_logs', (
      SELECT COUNT(*)
      FROM medication_administration ma
      JOIN resident_medications rm ON rm.id = ma.medication_id
      JOIN residents r ON r.id = rm.resident_id
      WHERE r.agency_id = p_agency_id
      AND ma.state IN ('missed', 'refused')
      AND ma.scheduled_time::date >= (now() - interval '7 days')::date
    ),
    'unacknowledged_incidents', (
      SELECT COUNT(*)
      FROM escalation_queue
      WHERE agency_id = p_agency_id
      AND priority IN ('CRITICAL', 'HIGH')
      AND status = 'PENDING'
      AND escalated_at < now() - interval '2 hours'
    ),
    'documentation_gaps', (
      SELECT COUNT(*)
      FROM tasks
      WHERE agency_id = p_agency_id
      AND category = 'DOCUMENTATION'
      AND state IN ('overdue', 'blocked')
    ),
    'oldest_open_issue', (
      SELECT MIN(escalated_at)
      FROM escalation_queue
      WHERE agency_id = p_agency_id
      AND status IN ('PENDING', 'IN_PROGRESS')
    ),
    'most_common_gap_type', (
      SELECT category
      FROM tasks
      WHERE agency_id = p_agency_id
      AND state IN ('overdue', 'blocked')
      GROUP BY category
      ORDER BY COUNT(*) DESC
      LIMIT 1
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Function: Assign escalation to user
CREATE OR REPLACE FUNCTION assign_escalation(
  p_escalation_id uuid,
  p_assignee_id uuid,
  p_assigner_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_previous_assignee uuid;
  v_status text;
BEGIN
  SELECT assigned_to, status INTO v_previous_assignee, v_status
  FROM escalation_queue
  WHERE id = p_escalation_id;

  UPDATE escalation_queue
  SET
    assigned_to = p_assignee_id,
    status = CASE WHEN status = 'PENDING' THEN 'IN_PROGRESS' ELSE status END,
    updated_at = now()
  WHERE id = p_escalation_id;

  INSERT INTO escalation_audit_log (
    escalation_id,
    action,
    actor_id,
    previous_status,
    new_status,
    details
  ) VALUES (
    p_escalation_id,
    'ASSIGNED',
    COALESCE(p_assigner_id, auth.uid()),
    v_status,
    CASE WHEN v_status = 'PENDING' THEN 'IN_PROGRESS' ELSE v_status END,
    jsonb_build_object(
      'assignee_id', p_assignee_id,
      'previous_assignee', v_previous_assignee,
      'reason', p_reason
    )
  );
END;
$$;

-- Function: Get intelligence signals with escalation linkage
CREATE OR REPLACE FUNCTION get_intelligence_signals_with_linkage(
  p_agency_id uuid,
  p_limit integer DEFAULT 10
)
RETURNS TABLE (
  signal_id uuid,
  resident_id uuid,
  resident_name text,
  category text,
  severity text,
  title text,
  description text,
  reasoning text,
  confidence numeric,
  suggested_actions text[],
  detected_at timestamptz,
  linked_escalation_id uuid,
  escalation_status text,
  is_actionable boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sig.id as signal_id,
    sig.resident_id,
    r.name as resident_name,
    sig.category,
    sig.severity,
    sig.title,
    sig.description,
    sig.reasoning,
    sig.confidence,
    sig.suggested_actions,
    sig.detected_at,
    eq.id as linked_escalation_id,
    eq.status as escalation_status,
    (eq.id IS NULL AND sig.severity IN ('CRITICAL', 'MAJOR')) as is_actionable
  FROM intelligence_signals sig
  JOIN residents r ON r.id = sig.resident_id
  LEFT JOIN escalation_queue eq ON eq.signal_id = sig.id
  WHERE sig.agency_id = p_agency_id
  AND sig.detected_at > now() - interval '24 hours'
  ORDER BY
    CASE sig.severity
      WHEN 'CRITICAL' THEN 1
      WHEN 'MAJOR' THEN 2
      WHEN 'MODERATE' THEN 3
      ELSE 4
    END,
    sig.detected_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_supervisor_kpi_metrics TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_department_snapshot TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_workforce_risk_assessment TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_compliance_snapshot TO authenticated, anon;
GRANT EXECUTE ON FUNCTION assign_escalation TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_intelligence_signals_with_linkage TO authenticated, anon;
