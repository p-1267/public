/*
  # Fix update_offline_online_state column references

  1. Changes
    - Replace `updated_at` with `last_transition_at` in UPDATE statement

  2. Notes
    - Function was referencing non-existent updated_at column
    - This fix aligns function with actual brain_state table schema
*/

CREATE OR REPLACE FUNCTION update_offline_online_state(
  p_new_state text,
  p_expected_version bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_state text;
  v_current_version bigint;
BEGIN
  SELECT offline_online_state, state_version
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
      'success', true,
      'message', 'No change required',
      'current_version', v_current_version
    );
  END IF;

  UPDATE brain_state
  SET 
    offline_online_state = p_new_state,
    state_version = state_version + 1,
    last_transition_at = now(),
    last_transition_by = auth.uid()
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
    'message', format('Offline/online state updated from %s to %s', v_current_state, p_new_state),
    'from_state', v_current_state,
    'to_state', p_new_state,
    'new_version', p_expected_version + 1
  );
END;
$$;