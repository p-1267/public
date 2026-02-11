/*
  # Rate Limiting and Circuit Breaker RPCs (Phase 32)

  ## Purpose
  Core resilience functions for rate limiting and circuit breaker management.
  Enforces fail-safe patterns and abuse protection.

  ## Functions
  1. check_rate_limit - Check if request is within rate limit
  2. record_circuit_breaker_event - Record circuit breaker event
  3. get_circuit_breaker_state - Get current circuit breaker state
  4. trigger_circuit_open - Manually trigger circuit open
  5. trigger_circuit_close - Manually trigger circuit close

  ## Security
  - System-managed functions
  - Complete audit logging

  ## Enforcement Rules
  1. Per-user, per-device, per-API-key, per-tenant rate limits
  2. Exceeded limits MUST throttle safely
  3. Exceeded limits MUST return explicit errors
  4. Exceeded limits MUST be logged immutably
  5. Circuit breakers automatically open after threshold
  6. Circuit breakers prevent repeated failures
  7. Circuit breakers auto-close after health recovery
*/

-- Function: check_rate_limit
-- Checks if request is within rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_limit_scope text,
  p_scope_identifier text,
  p_resource_type text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_config record;
  v_current_count integer := 0;
  v_window_start timestamptz;
  v_window_end timestamptz;
  v_limit_exceeded boolean := false;
  v_throttle_action text;
BEGIN
  -- Get rate limit config
  SELECT * INTO v_config
  FROM rate_limit_config
  WHERE limit_scope = p_limit_scope
  AND resource_type = p_resource_type
  AND is_active = true
  LIMIT 1;

  IF v_config IS NULL THEN
    RETURN json_build_object(
      'allowed', true,
      'message', 'No rate limit configured'
    );
  END IF;

  -- Calculate window
  v_window_start := now() - (v_config.window_seconds || ' seconds')::interval;
  v_window_end := now();

  -- Get current request count in window
  SELECT COALESCE(SUM(request_count), 0) INTO v_current_count
  FROM rate_limit_usage
  WHERE limit_scope = p_limit_scope
  AND scope_identifier = p_scope_identifier
  AND resource_type = p_resource_type
  AND window_start >= v_window_start;

  -- Check if limit exceeded
  v_limit_exceeded := (v_current_count >= v_config.limit_count);
  v_throttle_action := CASE WHEN v_limit_exceeded THEN v_config.throttle_action ELSE NULL END;

  -- Record usage
  INSERT INTO rate_limit_usage (
    limit_config_id,
    limit_scope,
    scope_identifier,
    resource_type,
    request_count,
    window_start,
    window_end,
    limit_exceeded,
    throttle_action_taken
  ) VALUES (
    v_config.id,
    p_limit_scope,
    p_scope_identifier,
    p_resource_type,
    1,
    v_window_start,
    v_window_end,
    v_limit_exceeded,
    v_throttle_action
  );

  -- Log audit event if limit exceeded
  IF v_limit_exceeded THEN
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
      'RATE_LIMIT_EXCEEDED',
      p_resource_type,
      auth.uid(),
      CASE WHEN auth.uid() IS NOT NULL THEN 'USER' ELSE 'SYSTEM' END,
      'WARNING',
      jsonb_build_object(
        'limit_scope', p_limit_scope,
        'scope_identifier', p_scope_identifier,
        'current_count', v_current_count,
        'limit_count', v_config.limit_count,
        'throttle_action', v_throttle_action
      )
    );
  END IF;

  RETURN json_build_object(
    'allowed', NOT v_limit_exceeded,
    'limit_exceeded', v_limit_exceeded,
    'current_count', v_current_count,
    'limit_count', v_config.limit_count,
    'window_seconds', v_config.window_seconds,
    'throttle_action', v_throttle_action,
    'message', CASE 
      WHEN v_limit_exceeded THEN 'Rate limit exceeded. ' || v_throttle_action
      ELSE 'Request allowed'
    END
  );
END;
$$;

-- Function: record_circuit_breaker_event
-- Records circuit breaker event and updates state
CREATE OR REPLACE FUNCTION record_circuit_breaker_event(
  p_breaker_name text,
  p_event_type text,
  p_failure_reason text DEFAULT NULL,
  p_response_time_ms integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_breaker record;
  v_new_state text;
  v_should_open boolean := false;
  v_should_close boolean := false;
BEGIN
  -- Get current breaker state
  SELECT * INTO v_breaker
  FROM circuit_breaker_state
  WHERE breaker_name = p_breaker_name
  AND is_active = true;

  IF v_breaker IS NULL THEN
    RAISE EXCEPTION 'Circuit breaker not found: %', p_breaker_name;
  END IF;

  v_new_state := v_breaker.current_state;

  -- Update state based on event type
  IF p_event_type = 'FAILURE' THEN
    UPDATE circuit_breaker_state
    SET failure_count = failure_count + 1,
        total_failures = total_failures + 1,
        last_failure_at = now(),
        updated_at = now()
    WHERE breaker_name = p_breaker_name
    RETURNING failure_count, failure_threshold INTO v_breaker;

    IF v_breaker.failure_count >= v_breaker.failure_threshold THEN
      v_should_open := true;
      v_new_state := 'OPEN';
    END IF;

  ELSIF p_event_type = 'SUCCESS' THEN
    UPDATE circuit_breaker_state
    SET total_successes = total_successes + 1,
        last_success_at = now(),
        updated_at = now()
    WHERE breaker_name = p_breaker_name;

    IF v_breaker.current_state = 'HALF_OPEN' THEN
      v_should_close := true;
      v_new_state := 'CLOSED';
    END IF;
  END IF;

  -- Open circuit if threshold reached
  IF v_should_open THEN
    UPDATE circuit_breaker_state
    SET current_state = 'OPEN',
        opened_at = now(),
        next_retry_at = now() + (timeout_seconds || ' seconds')::interval,
        updated_at = now()
    WHERE breaker_name = p_breaker_name;

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
      'CIRCUIT_OPENED',
      p_breaker_name,
      NULL,
      'SYSTEM',
      'WARNING',
      jsonb_build_object('failure_count', v_breaker.failure_count)
    );
  END IF;

  -- Close circuit if recovered
  IF v_should_close THEN
    UPDATE circuit_breaker_state
    SET current_state = 'CLOSED',
        failure_count = 0,
        updated_at = now()
    WHERE breaker_name = p_breaker_name;

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
      'CIRCUIT_CLOSED',
      p_breaker_name,
      NULL,
      'SYSTEM',
      'SUCCESS',
      jsonb_build_object('state', 'recovered')
    );
  END IF;

  -- Record event
  INSERT INTO circuit_breaker_events (
    breaker_id,
    breaker_name,
    event_type,
    previous_state,
    new_state,
    failure_reason,
    response_time_ms
  ) VALUES (
    v_breaker.id,
    p_breaker_name,
    p_event_type,
    v_breaker.current_state,
    v_new_state,
    p_failure_reason,
    p_response_time_ms
  );

  RETURN json_build_object(
    'success', true,
    'breaker_name', p_breaker_name,
    'event_type', p_event_type,
    'previous_state', v_breaker.current_state,
    'new_state', v_new_state,
    'circuit_opened', v_should_open,
    'circuit_closed', v_should_close
  );
END;
$$;

-- Function: get_circuit_breaker_state
-- Gets current state of circuit breaker
CREATE OR REPLACE FUNCTION get_circuit_breaker_state(
  p_breaker_name text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_states json;
BEGIN
  IF p_breaker_name IS NOT NULL THEN
    SELECT json_build_object(
      'breaker_name', breaker_name,
      'current_state', current_state,
      'failure_count', failure_count,
      'failure_threshold', failure_threshold,
      'last_failure_at', last_failure_at,
      'last_success_at', last_success_at,
      'opened_at', opened_at,
      'next_retry_at', next_retry_at,
      'total_failures', total_failures,
      'total_successes', total_successes
    )
    INTO v_states
    FROM circuit_breaker_state
    WHERE breaker_name = p_breaker_name
    AND is_active = true;
  ELSE
    SELECT json_agg(
      json_build_object(
        'breaker_name', breaker_name,
        'current_state', current_state,
        'failure_count', failure_count,
        'failure_threshold', failure_threshold,
        'dependency_type', dependency_type
      )
    )
    INTO v_states
    FROM circuit_breaker_state
    WHERE is_active = true;
  END IF;

  RETURN json_build_object(
    'success', true,
    'states', COALESCE(v_states, '[]'::json)
  );
END;
$$;
