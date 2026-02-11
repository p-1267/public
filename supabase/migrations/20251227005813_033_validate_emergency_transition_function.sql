/*
  # Emergency State Transition Validation Function

  1. New Functions
    - `validate_emergency_transition(from_state, to_state)` 
      - Returns boolean indicating if transition is allowed
      - Does NOT perform the transition
      - Validation only, no side effects

    - `request_emergency_transition(new_state, expected_version)`
      - Validates transition is allowed
      - Validates version matches (optimistic locking)
      - Updates emergency_state if valid
      - Returns success/failure with message
      - Logs to audit_log on success

  2. Purpose
    - Database enforces validation rules
    - Brain logic layer owns transition decisions
    - Version check prevents race conditions
*/

CREATE OR REPLACE FUNCTION validate_emergency_transition(
  p_from_state text,
  p_to_state text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM emergency_state_transitions
    WHERE from_state = p_from_state
    AND to_state = p_to_state
  );
END;
$$;

CREATE OR REPLACE FUNCTION request_emergency_transition(
  p_new_state text,
  p_expected_version integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_state text;
  v_current_version integer;
  v_is_valid boolean;
BEGIN
  SELECT emergency_state, state_version
  INTO v_current_state, v_current_version
  FROM brain_state
  LIMIT 1;

  IF v_current_version IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NO_BRAIN_STATE',
      'message', 'Brain state not initialized'
    );
  END IF;

  IF v_current_version != p_expected_version THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'VERSION_CONFLICT',
      'message', 'State version mismatch',
      'current_version', v_current_version,
      'expected_version', p_expected_version
    );
  END IF;

  IF v_current_state = p_new_state THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NO_CHANGE',
      'message', 'Already in requested state'
    );
  END IF;

  SELECT validate_emergency_transition(v_current_state, p_new_state)
  INTO v_is_valid;

  IF NOT v_is_valid THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_TRANSITION',
      'message', format('Transition from %s to %s not allowed', v_current_state, p_new_state),
      'from_state', v_current_state,
      'to_state', p_new_state
    );
  END IF;

  UPDATE brain_state
  SET 
    emergency_state = p_new_state,
    state_version = state_version + 1,
    updated_at = now()
  WHERE state_version = p_expected_version;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'UPDATE_FAILED',
      'message', 'Concurrent modification detected'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Emergency state transitioned from %s to %s', v_current_state, p_new_state),
    'from_state', v_current_state,
    'to_state', p_new_state,
    'new_version', p_expected_version + 1
  );
END;
$$;
