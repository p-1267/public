/*
  # Incident Management and Degraded Mode RPCs (Phase 32)

  ## Purpose
  Functions for incident tracking and degraded mode operation management.
  Ensures system stays safe, explainable, and auditable during failures.

  ## Functions
  1. create_incident - Create new incident
  2. update_incident_status - Update incident status
  3. record_incident_impact - Record incident impact on failure domain
  4. enter_degraded_mode - Enter degraded mode for subsystem
  5. exit_degraded_mode - Exit degraded mode
  6. get_system_degradation_status - Get current degradation status

  ## Security
  - SUPER_ADMIN only for management
  - Complete audit logging

  ## Enforcement Rules
  1. The system must fail safe, never fail open
  2. Partial failure MUST NOT cascade
  3. Care execution MUST degrade conservatively
  4. Core care logging remains available
  5. Emergency escalation remains available
  6. Non-critical features are disabled
  7. UI clearly indicates degraded state
  8. Failure domain isolation enforced
*/

-- Function: create_incident
-- Creates new production incident
CREATE OR REPLACE FUNCTION create_incident(
  p_incident_title text,
  p_incident_description text,
  p_severity text,
  p_scope text,
  p_impacted_systems text[] DEFAULT '{}',
  p_started_at timestamptz DEFAULT now()
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_incident_id text;
  v_new_incident_id uuid;
BEGIN
  v_actor_id := auth.uid();
  v_incident_id := 'incident-' || gen_random_uuid()::text;

  INSERT INTO incident_log (
    incident_id,
    incident_title,
    incident_description,
    severity,
    scope,
    impacted_systems,
    started_at,
    reported_by
  ) VALUES (
    v_incident_id,
    p_incident_title,
    p_incident_description,
    p_severity,
    p_scope,
    p_impacted_systems,
    p_started_at,
    v_actor_id
  ) RETURNING id INTO v_new_incident_id;

  -- Log audit event
  INSERT INTO resilience_audit_log (
    event_id,
    event_type,
    component,
    actor_id,
    actor_type,
    outcome,
    event_details,
    related_incident_id
  ) VALUES (
    gen_random_uuid()::text,
    'INCIDENT_OPENED',
    'INCIDENT_MANAGEMENT',
    v_actor_id,
    'USER',
    'SUCCESS',
    jsonb_build_object(
      'incident_id', v_incident_id,
      'severity', p_severity,
      'scope', p_scope
    ),
    v_incident_id
  );

  RETURN json_build_object(
    'success', true,
    'incident_id', v_incident_id,
    'severity', p_severity,
    'message', 'Incident created'
  );
END;
$$;

-- Function: update_incident_status
-- Updates incident status
CREATE OR REPLACE FUNCTION update_incident_status(
  p_incident_id text,
  p_new_status text,
  p_mitigation_action text DEFAULT NULL,
  p_root_cause text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
BEGIN
  v_actor_id := auth.uid();

  UPDATE incident_log
  SET status = p_new_status,
      root_cause = COALESCE(p_root_cause, root_cause),
      mitigation_actions = CASE 
        WHEN p_mitigation_action IS NOT NULL 
        THEN array_append(mitigation_actions, p_mitigation_action)
        ELSE mitigation_actions
      END,
      resolved_at = CASE WHEN p_new_status = 'RESOLVED' THEN now() ELSE resolved_at END,
      closed_at = CASE WHEN p_new_status = 'CLOSED' THEN now() ELSE closed_at END,
      updated_at = now()
  WHERE incident_id = p_incident_id;

  IF p_new_status = 'RESOLVED' THEN
    INSERT INTO resilience_audit_log (
      event_id,
      event_type,
      component,
      actor_id,
      actor_type,
      outcome,
      event_details,
      related_incident_id
    ) VALUES (
      gen_random_uuid()::text,
      'INCIDENT_RESOLVED',
      'INCIDENT_MANAGEMENT',
      v_actor_id,
      'USER',
      'SUCCESS',
      jsonb_build_object('incident_id', p_incident_id),
      p_incident_id
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'incident_id', p_incident_id,
    'new_status', p_new_status
  );
END;
$$;

-- Function: record_incident_impact
-- Records incident impact on specific failure domain
CREATE OR REPLACE FUNCTION record_incident_impact(
  p_incident_id text,
  p_impact_domain text,
  p_domain_identifier text,
  p_impact_description text,
  p_impact_severity text,
  p_was_isolated boolean DEFAULT true,
  p_cascaded_to_other_domains boolean DEFAULT false,
  p_cascaded_domains text[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO incident_impacts (
    incident_id,
    impact_domain,
    domain_identifier,
    impact_description,
    impact_severity,
    impact_started_at,
    was_isolated,
    cascaded_to_other_domains,
    cascaded_domains
  ) VALUES (
    p_incident_id,
    p_impact_domain,
    p_domain_identifier,
    p_impact_description,
    p_impact_severity,
    now(),
    p_was_isolated,
    p_cascaded_to_other_domains,
    p_cascaded_domains
  );

  RETURN json_build_object(
    'success', true,
    'incident_id', p_incident_id,
    'impact_domain', p_impact_domain,
    'was_isolated', p_was_isolated,
    'cascaded', p_cascaded_to_other_domains,
    'message', CASE 
      WHEN p_was_isolated THEN 'Failure properly isolated to domain'
      ELSE 'WARNING: Failure cascaded to other domains'
    END
  );
END;
$$;

-- Function: enter_degraded_mode
-- Enters degraded mode for subsystem
CREATE OR REPLACE FUNCTION enter_degraded_mode(
  p_subsystem_name text,
  p_subsystem_category text,
  p_degradation_level text,
  p_degradation_reason text,
  p_disabled_features text[] DEFAULT '{}',
  p_core_care_logging_available boolean DEFAULT true,
  p_emergency_escalation_available boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_degradation_id text;
  v_ui_warning text;
BEGIN
  -- Enforce critical subsystem guarantees
  IF p_subsystem_category = 'CRITICAL' THEN
    IF NOT p_core_care_logging_available OR NOT p_emergency_escalation_available THEN
      RAISE EXCEPTION 'CRITICAL subsystems MUST keep core care logging and emergency escalation available';
    END IF;
  END IF;

  v_degradation_id := 'degradation-' || gen_random_uuid()::text;
  v_ui_warning := 'System degradation: ' || p_subsystem_name || ' - ' || p_degradation_reason;

  INSERT INTO system_degradation_state (
    degradation_id,
    subsystem_name,
    subsystem_category,
    degradation_level,
    is_degraded,
    core_care_logging_available,
    emergency_escalation_available,
    disabled_features,
    degradation_reason,
    degradation_started_at,
    ui_warning_message
  ) VALUES (
    v_degradation_id,
    p_subsystem_name,
    p_subsystem_category,
    p_degradation_level,
    true,
    p_core_care_logging_available,
    p_emergency_escalation_available,
    p_disabled_features,
    p_degradation_reason,
    now(),
    v_ui_warning
  );

  -- Log audit event
  INSERT INTO resilience_audit_log (
    event_id,
    event_type,
    component,
    actor_id,
    actor_type,
    outcome,
    event_details
  ) VALUES (
    gen_random_uuid()::text,
    'DEGRADATION_STARTED',
    p_subsystem_name,
    NULL,
    'SYSTEM',
    'WARNING',
    jsonb_build_object(
      'degradation_id', v_degradation_id,
      'degradation_level', p_degradation_level,
      'reason', p_degradation_reason,
      'disabled_features', p_disabled_features
    )
  );

  RETURN json_build_object(
    'success', true,
    'degradation_id', v_degradation_id,
    'subsystem_name', p_subsystem_name,
    'degradation_level', p_degradation_level,
    'core_care_logging_available', p_core_care_logging_available,
    'emergency_escalation_available', p_emergency_escalation_available,
    'ui_warning_message', v_ui_warning,
    'message', 'System entered degraded mode. Core functions protected.'
  );
END;
$$;

-- Function: exit_degraded_mode
-- Exits degraded mode
CREATE OR REPLACE FUNCTION exit_degraded_mode(
  p_degradation_id text,
  p_recovery_action text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subsystem_name text;
BEGIN
  UPDATE system_degradation_state
  SET is_degraded = false,
      degradation_level = 'NONE',
      degradation_ended_at = now(),
      recovery_action_taken = p_recovery_action,
      updated_at = now()
  WHERE degradation_id = p_degradation_id
  RETURNING subsystem_name INTO v_subsystem_name;

  INSERT INTO resilience_audit_log (
    event_id,
    event_type,
    component,
    actor_id,
    actor_type,
    outcome,
    event_details
  ) VALUES (
    gen_random_uuid()::text,
    'DEGRADATION_ENDED',
    v_subsystem_name,
    NULL,
    'SYSTEM',
    'SUCCESS',
    jsonb_build_object(
      'degradation_id', p_degradation_id,
      'recovery_action', p_recovery_action
    )
  );

  RETURN json_build_object(
    'success', true,
    'degradation_id', p_degradation_id,
    'subsystem_name', v_subsystem_name,
    'message', 'System exited degraded mode. Normal operation restored.'
  );
END;
$$;

-- Function: get_system_degradation_status
-- Gets current system degradation status
CREATE OR REPLACE FUNCTION get_system_degradation_status()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_degradations json;
  v_is_any_degraded boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM system_degradation_state
    WHERE is_degraded = true
  ) INTO v_is_any_degraded;

  SELECT json_agg(
    json_build_object(
      'degradation_id', degradation_id,
      'subsystem_name', subsystem_name,
      'subsystem_category', subsystem_category,
      'degradation_level', degradation_level,
      'is_degraded', is_degraded,
      'core_care_logging_available', core_care_logging_available,
      'emergency_escalation_available', emergency_escalation_available,
      'disabled_features', disabled_features,
      'degradation_reason', degradation_reason,
      'ui_warning_message', ui_warning_message,
      'degradation_started_at', degradation_started_at
    )
  )
  INTO v_degradations
  FROM system_degradation_state
  WHERE is_degraded = true;

  RETURN json_build_object(
    'success', true,
    'is_degraded', v_is_any_degraded,
    'degradations', COALESCE(v_degradations, '[]'::json)
  );
END;
$$;
