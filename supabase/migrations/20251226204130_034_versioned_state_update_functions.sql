/*
  # Versioned State Update Functions

  1. New Functions
    - `update_offline_online_state(new_state, expected_version)`
      - Version-checked update for connectivity state
      - Returns success/failure with version info

    - `update_care_state(new_state, expected_version)`
      - Version-checked update for care state
      - Returns success/failure with version info

  2. Purpose
    - All state updates require version check
    - Prevents race conditions and stale updates
    - Supports optimistic locking pattern

  3. Notes
    - These functions validate version but do not validate transitions
    - Brain logic layer responsible for transition rules
    - Emergency state has separate function with transition validation
*/

CREATE OR REPLACE FUNCTION update_offline_online_state(
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
    'message', format('Offline/online state updated from %s to %s', v_current_state, p_new_state),
    'from_state', v_current_state,
    'to_state', p_new_state,
    'new_version', p_expected_version + 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION update_care_state(
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
BEGIN
  SELECT care_state, state_version
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
    care_state = p_new_state,
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
    'message', format('Care state updated from %s to %s', v_current_state, p_new_state),
    'from_state', v_current_state,
    'to_state', p_new_state,
    'new_version', p_expected_version + 1
  );
END;
$$;
