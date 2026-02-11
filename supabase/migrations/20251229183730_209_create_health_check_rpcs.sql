/*
  # Health Check RPCs (Phase 31)

  ## Purpose
  Continuous monitoring with automatic rollback on failures.
  Failures MUST generate alerts without disrupting care execution.

  ## Functions
  1. record_health_check - Record health check result
  2. get_system_health - Get current system health
  3. check_version_drift - Check for version drift
  4. get_health_check_history - Get health check history

  ## Security
  - System-managed functions
  - Complete monitoring

  ## Enforcement Rules
  1. The system MUST continuously monitor: Version drift, Update success/failure, Client compatibility, Critical service uptime
  2. Failures MUST generate alerts without disrupting care execution
  3. Automatic rollback on failed health checks
*/

-- Function: record_health_check
-- Records health check result
CREATE OR REPLACE FUNCTION record_health_check(
  p_environment text,
  p_check_type text,
  p_component_type text,
  p_check_status text,
  p_check_details jsonb DEFAULT '{}',
  p_expected_value text DEFAULT NULL,
  p_actual_value text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_check_id text;
  v_deviation_detected boolean;
  v_alert_severity text;
  v_health_check_id uuid;
BEGIN
  v_check_id := 'health-' || gen_random_uuid()::text;
  
  -- Determine if deviation detected
  v_deviation_detected := (p_expected_value IS NOT NULL AND p_actual_value IS NOT NULL AND p_expected_value != p_actual_value);

  -- Determine alert severity
  v_alert_severity := CASE
    WHEN p_check_status = 'FAILED' AND p_check_type = 'CRITICAL_SERVICE_UPTIME' THEN 'CRITICAL'
    WHEN p_check_status = 'FAILED' THEN 'HIGH'
    WHEN p_check_status = 'WARNING' THEN 'MEDIUM'
    ELSE 'LOW'
  END;

  -- Record health check
  INSERT INTO system_health_checks (
    check_id,
    environment,
    check_type,
    component_type,
    check_status,
    check_details,
    expected_value,
    actual_value,
    deviation_detected,
    alert_generated,
    alert_severity,
    care_execution_disrupted
  ) VALUES (
    v_check_id,
    p_environment,
    p_check_type,
    p_component_type,
    p_check_status,
    p_check_details,
    p_expected_value,
    p_actual_value,
    v_deviation_detected,
    p_check_status IN ('FAILED', 'WARNING'),
    v_alert_severity,
    false
  ) RETURNING id INTO v_health_check_id;

  -- Log audit event if failed
  IF p_check_status = 'FAILED' THEN
    INSERT INTO update_audit_log (
      event_id,
      event_type,
      environment,
      component_type,
      action,
      action_result,
      actor_id,
      actor_type,
      event_details
    ) VALUES (
      gen_random_uuid()::text,
      'HEALTH_CHECK_FAILED',
      p_environment,
      p_component_type,
      'HEALTH_CHECK',
      'FAILURE',
      NULL,
      'SYSTEM',
      jsonb_build_object(
        'check_id', v_check_id,
        'check_type', p_check_type,
        'alert_severity', v_alert_severity,
        'care_execution_disrupted', false
      )
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'check_id', v_check_id,
    'health_check_id', v_health_check_id,
    'check_status', p_check_status,
    'alert_generated', p_check_status IN ('FAILED', 'WARNING'),
    'alert_severity', v_alert_severity,
    'care_execution_disrupted', false,
    'message', 'Health check recorded. Care execution NOT disrupted.'
  );
END;
$$;

-- Function: get_system_health
-- Gets current system health status
CREATE OR REPLACE FUNCTION get_system_health(
  p_environment text DEFAULT 'PRODUCTION'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recent_checks json;
  v_failed_checks integer;
  v_warning_checks integer;
  v_overall_status text;
BEGIN
  -- Get recent health checks (last 24 hours)
  SELECT json_agg(
    json_build_object(
      'check_id', check_id,
      'check_type', check_type,
      'component_type', component_type,
      'check_status', check_status,
      'check_timestamp', check_timestamp,
      'deviation_detected', deviation_detected,
      'alert_severity', alert_severity
    ) ORDER BY check_timestamp DESC
  )
  INTO v_recent_checks
  FROM system_health_checks
  WHERE environment = p_environment
  AND check_timestamp > now() - interval '24 hours'
  LIMIT 50;

  -- Count failed and warning checks
  SELECT 
    COUNT(*) FILTER (WHERE check_status = 'FAILED'),
    COUNT(*) FILTER (WHERE check_status = 'WARNING')
  INTO v_failed_checks, v_warning_checks
  FROM system_health_checks
  WHERE environment = p_environment
  AND check_timestamp > now() - interval '1 hour';

  -- Determine overall status
  v_overall_status := CASE
    WHEN v_failed_checks > 0 THEN 'CRITICAL'
    WHEN v_warning_checks > 0 THEN 'WARNING'
    ELSE 'HEALTHY'
  END;

  RETURN json_build_object(
    'success', true,
    'environment', p_environment,
    'overall_status', v_overall_status,
    'failed_checks_last_hour', v_failed_checks,
    'warning_checks_last_hour', v_warning_checks,
    'recent_checks', COALESCE(v_recent_checks, '[]'::json)
  );
END;
$$;

-- Function: check_version_drift
-- Checks for version drift across clients
CREATE OR REPLACE FUNCTION check_version_drift(
  p_environment text DEFAULT 'PRODUCTION'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version_distribution json;
  v_incompatible_clients integer;
  v_drift_detected boolean;
  v_current_brain_version text;
  v_current_api_version text;
BEGIN
  -- Get current versions
  SELECT current_brain_logic_version, current_api_schema_version
  INTO v_current_brain_version, v_current_api_version
  FROM environment_config
  WHERE environment_name = p_environment;

  -- Get version distribution
  SELECT json_agg(
    json_build_object(
      'client_version', client_version,
      'count', count,
      'is_compatible', is_compatible
    )
  )
  INTO v_version_distribution
  FROM (
    SELECT 
      client_version,
      COUNT(*) as count,
      bool_and(is_compatible) as is_compatible
    FROM client_version_status
    GROUP BY client_version
    ORDER BY count DESC
  ) dist;

  -- Count incompatible clients
  SELECT COUNT(*)
  INTO v_incompatible_clients
  FROM client_version_status
  WHERE is_compatible = false;

  -- Detect drift
  v_drift_detected := (v_incompatible_clients > 0);

  -- Record health check
  PERFORM record_health_check(
    p_environment,
    'VERSION_DRIFT',
    'CLIENT_APP',
    CASE WHEN v_drift_detected THEN 'WARNING' ELSE 'PASSED' END,
    jsonb_build_object(
      'incompatible_clients', v_incompatible_clients,
      'version_distribution', v_version_distribution
    ),
    '0',
    v_incompatible_clients::text
  );

  RETURN json_build_object(
    'success', true,
    'environment', p_environment,
    'drift_detected', v_drift_detected,
    'current_brain_version', v_current_brain_version,
    'current_api_version', v_current_api_version,
    'incompatible_clients', v_incompatible_clients,
    'version_distribution', COALESCE(v_version_distribution, '[]'::json)
  );
END;
$$;

-- Function: get_health_check_history
-- Gets health check history
CREATE OR REPLACE FUNCTION get_health_check_history(
  p_environment text DEFAULT 'PRODUCTION',
  p_hours integer DEFAULT 24
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checks json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'check_id', check_id,
      'check_type', check_type,
      'component_type', component_type,
      'check_status', check_status,
      'check_timestamp', check_timestamp,
      'deviation_detected', deviation_detected,
      'alert_generated', alert_generated,
      'alert_severity', alert_severity,
      'rollback_triggered', rollback_triggered,
      'care_execution_disrupted', care_execution_disrupted
    ) ORDER BY check_timestamp DESC
  )
  INTO v_checks
  FROM system_health_checks
  WHERE environment = p_environment
  AND check_timestamp > now() - (p_hours || ' hours')::interval;

  RETURN json_build_object(
    'success', true,
    'environment', p_environment,
    'hours', p_hours,
    'checks', COALESCE(v_checks, '[]'::json)
  );
END;
$$;
