/*
  # Fix request_care_transition column references

  1. Changes
    - Replace `version` with `state_version` in all references
    - Replace `updated_at` with `last_transition_at` in UPDATE statement

  2. Notes
    - Function was referencing non-existent columns
    - This fix aligns function with actual brain_state table schema
*/

CREATE OR REPLACE FUNCTION request_care_transition(
  p_new_state text,
  p_expected_version bigint,
  p_action_context jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_state text;
  v_current_version bigint;
  v_emergency_state text;
  v_transition_valid boolean;
  v_rows_updated integer;
BEGIN
  SELECT care_state, state_version, emergency_state
  INTO v_current_state, v_current_version, v_emergency_state
  FROM brain_state
  LIMIT 1;

  IF v_current_state IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'NO_BRAIN_STATE',
      'message', 'Brain state record does not exist'
    );
  END IF;

  IF v_current_version != p_expected_version THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'VERSION_MISMATCH',
      'message', 'Expected version ' || p_expected_version || ' but found ' || v_current_version,
      'current_version', v_current_version,
      'current_state', v_current_state
    );
  END IF;

  IF v_current_state = p_new_state THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'SAME_STATE',
      'message', 'Already in state ' || p_new_state,
      'current_version', v_current_version,
      'current_state', v_current_state
    );
  END IF;

  IF v_emergency_state = 'ACTIVE' THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'BLOCKED_BY_EMERGENCY',
      'message', 'Care transitions blocked during active emergency',
      'current_version', v_current_version,
      'current_state', v_current_state,
      'emergency_state', v_emergency_state
    );
  END IF;

  v_transition_valid := validate_care_transition(v_current_state, p_new_state);

  IF NOT v_transition_valid THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INVALID_TRANSITION',
      'message', 'Transition from ' || v_current_state || ' to ' || p_new_state || ' is not permitted',
      'current_version', v_current_version,
      'current_state', v_current_state
    );
  END IF;

  UPDATE brain_state
  SET 
    care_state = p_new_state,
    state_version = state_version + 1,
    last_transition_at = now(),
    last_transition_by = auth.uid()
  WHERE state_version = p_expected_version;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  IF v_rows_updated = 0 THEN
    SELECT state_version, care_state INTO v_current_version, v_current_state
    FROM brain_state LIMIT 1;

    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'VERSION_MISMATCH',
      'message', 'Concurrent modification detected',
      'current_version', v_current_version,
      'current_state', v_current_state
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'previous_state', v_current_state,
    'new_state', p_new_state,
    'new_version', p_expected_version + 1,
    'action_context', p_action_context
  );
END;
$$;
