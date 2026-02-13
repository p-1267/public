/*
  # Escalation Management RPCs

  1. Functions
    - create_escalation_from_signal() - Create escalation from intelligence signal
    - request_physician_notification() - Create physician notification request
    - acknowledge_escalation() - Mark escalation as acknowledged
    - update_escalation_status() - Update escalation status with audit trail
    - get_supervisor_escalation_dashboard() - Get complete escalation view
    - get_sla_metrics() - Get SLA compliance metrics
    - resolve_escalation() - Mark escalation as resolved

  2. Features
    - Automatic SLA calculation
    - Complete audit logging
    - Status validation
    - Notification creation
*/

-- Function: Create escalation from intelligence signal
CREATE OR REPLACE FUNCTION create_escalation_from_signal(
  p_signal_id uuid,
  p_escalation_type text,
  p_sla_hours numeric DEFAULT 24
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_escalation_id uuid;
  v_signal record;
  v_resident record;
BEGIN
  -- Get signal details
  SELECT * INTO v_signal
  FROM intelligence_signals
  WHERE id = p_signal_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Signal not found: %', p_signal_id;
  END IF;

  -- Get resident details
  SELECT * INTO v_resident
  FROM residents
  WHERE id = v_signal.resident_id;

  -- Determine priority from signal severity
  DECLARE
    v_priority text;
  BEGIN
    CASE v_signal.severity
      WHEN 'CRITICAL' THEN v_priority := 'CRITICAL';
      WHEN 'MAJOR' THEN v_priority := 'HIGH';
      WHEN 'MODERATE' THEN v_priority := 'MEDIUM';
      ELSE v_priority := 'LOW';
    END CASE;

    -- Create escalation
    INSERT INTO escalation_queue (
      agency_id,
      resident_id,
      resident_name,
      signal_id,
      escalation_type,
      escalation_level,
      priority,
      title,
      description,
      recommended_action,
      clinical_context,
      escalated_at,
      required_response_by,
      sla_hours,
      status,
      metadata
    ) VALUES (
      v_signal.agency_id,
      v_signal.resident_id,
      v_resident.name,
      p_signal_id,
      p_escalation_type,
      1, -- Start at level 1
      v_priority,
      v_signal.title,
      v_signal.description,
      array_to_string(v_signal.suggested_actions, '; '),
      v_signal.reasoning,
      now(),
      now() + (p_sla_hours || ' hours')::interval,
      p_sla_hours,
      'PENDING',
      jsonb_build_object(
        'signal_category', v_signal.category,
        'data_source', v_signal.data_source,
        'detected_at', v_signal.detected_at
      )
    )
    RETURNING id INTO v_escalation_id;

    -- Create audit log entry
    INSERT INTO escalation_audit_log (
      escalation_id,
      action,
      new_status,
      details
    ) VALUES (
      v_escalation_id,
      'CREATED',
      'PENDING',
      jsonb_build_object(
        'escalation_type', p_escalation_type,
        'signal_id', p_signal_id,
        'sla_hours', p_sla_hours
      )
    );

    RETURN v_escalation_id;
  END;
END;
$$;

-- Function: Request physician notification
CREATE OR REPLACE FUNCTION request_physician_notification(
  p_escalation_id uuid,
  p_urgency text DEFAULT 'URGENT',
  p_required_hours numeric DEFAULT 2
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_review_id uuid;
  v_escalation record;
BEGIN
  -- Get escalation details
  SELECT * INTO v_escalation
  FROM escalation_queue
  WHERE id = p_escalation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Escalation not found: %', p_escalation_id;
  END IF;

  -- Create clinician review request
  INSERT INTO clinician_reviews (
    escalation_id,
    resident_id,
    resident_name,
    notification_reason,
    clinical_summary,
    urgency,
    required_by,
    notification_status
  ) VALUES (
    p_escalation_id,
    v_escalation.resident_id,
    v_escalation.resident_name,
    v_escalation.title,
    v_escalation.clinical_context,
    p_urgency,
    now() + (p_required_hours || ' hours')::interval,
    'NOT_SENT'
  )
  RETURNING id INTO v_review_id;

  -- Update escalation status
  UPDATE escalation_queue
  SET 
    status = 'NOTIFIED',
    updated_at = now()
  WHERE id = p_escalation_id;

  -- Audit log
  INSERT INTO escalation_audit_log (
    escalation_id,
    action,
    previous_status,
    new_status,
    details
  ) VALUES (
    p_escalation_id,
    'PHYSICIAN_NOTIFICATION_REQUESTED',
    v_escalation.status,
    'NOTIFIED',
    jsonb_build_object(
      'review_id', v_review_id,
      'urgency', p_urgency
    )
  );

  RETURN v_review_id;
END;
$$;

-- Function: Acknowledge escalation
CREATE OR REPLACE FUNCTION acknowledge_escalation(
  p_escalation_id uuid,
  p_acknowledger_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_previous_status text;
BEGIN
  -- Get current status
  SELECT status INTO v_previous_status
  FROM escalation_queue
  WHERE id = p_escalation_id;

  -- Update escalation
  UPDATE escalation_queue
  SET 
    status = 'ACKNOWLEDGED',
    acknowledged_at = now(),
    acknowledged_by = COALESCE(p_acknowledger_id, auth.uid()),
    updated_at = now()
  WHERE id = p_escalation_id;

  -- Audit log
  INSERT INTO escalation_audit_log (
    escalation_id,
    action,
    actor_id,
    previous_status,
    new_status
  ) VALUES (
    p_escalation_id,
    'ACKNOWLEDGED',
    COALESCE(p_acknowledger_id, auth.uid()),
    v_previous_status,
    'ACKNOWLEDGED'
  );
END;
$$;

-- Function: Update escalation status
CREATE OR REPLACE FUNCTION update_escalation_status(
  p_escalation_id uuid,
  p_new_status text,
  p_notes text DEFAULT NULL,
  p_actor_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_previous_status text;
BEGIN
  -- Get current status
  SELECT status INTO v_previous_status
  FROM escalation_queue
  WHERE id = p_escalation_id;

  -- Update status
  UPDATE escalation_queue
  SET 
    status = p_new_status,
    updated_at = now()
  WHERE id = p_escalation_id;

  -- Audit log
  INSERT INTO escalation_audit_log (
    escalation_id,
    action,
    actor_id,
    previous_status,
    new_status,
    details
  ) VALUES (
    p_escalation_id,
    'STATUS_CHANGED',
    COALESCE(p_actor_id, auth.uid()),
    v_previous_status,
    p_new_status,
    jsonb_build_object('notes', p_notes)
  );
END;
$$;

-- Function: Resolve escalation
CREATE OR REPLACE FUNCTION resolve_escalation(
  p_escalation_id uuid,
  p_resolution_notes text,
  p_resolver_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_previous_status text;
BEGIN
  -- Get current status
  SELECT status INTO v_previous_status
  FROM escalation_queue
  WHERE id = p_escalation_id;

  -- Update escalation
  UPDATE escalation_queue
  SET 
    status = 'RESOLVED',
    resolved_at = now(),
    resolved_by = COALESCE(p_resolver_id, auth.uid()),
    resolution_notes = p_resolution_notes,
    updated_at = now()
  WHERE id = p_escalation_id;

  -- Audit log
  INSERT INTO escalation_audit_log (
    escalation_id,
    action,
    actor_id,
    previous_status,
    new_status,
    details
  ) VALUES (
    p_escalation_id,
    'RESOLVED',
    COALESCE(p_resolver_id, auth.uid()),
    v_previous_status,
    'RESOLVED',
    jsonb_build_object('resolution_notes', p_resolution_notes)
  );
END;
$$;

-- Function: Get supervisor escalation dashboard
CREATE OR REPLACE FUNCTION get_supervisor_escalation_dashboard(
  p_agency_id uuid
)
RETURNS TABLE (
  escalation_id uuid,
  resident_id uuid,
  resident_name text,
  priority text,
  escalation_type text,
  title text,
  description text,
  status text,
  escalated_at timestamptz,
  required_response_by timestamptz,
  sla_hours_remaining numeric,
  sla_breached boolean,
  assigned_to uuid,
  has_physician_notification boolean,
  notification_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    eq.id as escalation_id,
    eq.resident_id,
    eq.resident_name,
    eq.priority,
    eq.escalation_type,
    eq.title,
    eq.description,
    eq.status,
    eq.escalated_at,
    eq.required_response_by,
    EXTRACT(EPOCH FROM (eq.required_response_by - now())) / 3600 as sla_hours_remaining,
    (now() > eq.required_response_by) as sla_breached,
    eq.assigned_to,
    EXISTS(SELECT 1 FROM clinician_reviews WHERE escalation_id = eq.id) as has_physician_notification,
    (SELECT notification_status FROM clinician_reviews WHERE escalation_id = eq.id ORDER BY created_at DESC LIMIT 1) as notification_status
  FROM escalation_queue eq
  WHERE eq.agency_id = p_agency_id
    AND eq.status IN ('PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'NOTIFIED')
  ORDER BY 
    CASE eq.priority
      WHEN 'CRITICAL' THEN 1
      WHEN 'HIGH' THEN 2
      WHEN 'MEDIUM' THEN 3
      ELSE 4
    END,
    eq.escalated_at ASC;
END;
$$;

-- Function: Get SLA metrics
CREATE OR REPLACE FUNCTION get_sla_metrics(
  p_agency_id uuid,
  p_hours_lookback integer DEFAULT 168 -- Default 7 days
)
RETURNS TABLE (
  total_escalations bigint,
  pending_escalations bigint,
  resolved_escalations bigint,
  breached_sla bigint,
  avg_response_time_hours numeric,
  critical_pending bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_escalations,
    COUNT(*) FILTER (WHERE status IN ('PENDING', 'IN_PROGRESS')) as pending_escalations,
    COUNT(*) FILTER (WHERE status = 'RESOLVED') as resolved_escalations,
    COUNT(*) FILTER (WHERE now() > required_response_by AND status != 'RESOLVED') as breached_sla,
    AVG(EXTRACT(EPOCH FROM (resolved_at - escalated_at)) / 3600) FILTER (WHERE resolved_at IS NOT NULL) as avg_response_time_hours,
    COUNT(*) FILTER (WHERE priority = 'CRITICAL' AND status IN ('PENDING', 'IN_PROGRESS')) as critical_pending
  FROM escalation_queue
  WHERE agency_id = p_agency_id
    AND escalated_at > now() - (p_hours_lookback || ' hours')::interval;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_escalation_from_signal TO authenticated, anon;
GRANT EXECUTE ON FUNCTION request_physician_notification TO authenticated, anon;
GRANT EXECUTE ON FUNCTION acknowledge_escalation TO authenticated, anon;
GRANT EXECUTE ON FUNCTION update_escalation_status TO authenticated, anon;
GRANT EXECUTE ON FUNCTION resolve_escalation TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_supervisor_escalation_dashboard TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_sla_metrics TO authenticated, anon;
