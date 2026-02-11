/*
  # Care Transition Audit Function

  1. New Functions
    - `log_care_transition(...)` - explicitly logs care state changes to audit_log

  2. Purpose
    - Brain logic layer calls this function after successful transitions
    - Uses existing audit_log.metadata field for action_context
    - No triggers - explicit logging only

  3. Audit Entry Structure
    - action_type: 'CARE_STATE_TRANSITION'
    - target_type: 'brain_state'
    - previous_state: { care_state: <old> }
    - new_state: { care_state: <new> }
    - metadata: { action_context: <context>, transition_result: <result> }
*/

CREATE OR REPLACE FUNCTION log_care_transition(
  p_actor_id uuid,
  p_previous_state text,
  p_new_state text,
  p_new_version bigint,
  p_action_context jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO audit_log (
    action_type,
    actor_id,
    target_type,
    previous_state,
    new_state,
    metadata,
    brain_state_version
  ) VALUES (
    'CARE_STATE_TRANSITION',
    p_actor_id,
    'brain_state',
    jsonb_build_object('care_state', p_previous_state),
    jsonb_build_object('care_state', p_new_state),
    jsonb_build_object(
      'action_context', p_action_context,
      'transition_timestamp', now()
    ),
    p_new_version
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;