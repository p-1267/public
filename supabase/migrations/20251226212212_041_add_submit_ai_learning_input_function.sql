/*
  # Add submit_ai_learning_input function

  1. New Function
    - `submit_ai_learning_input(p_input_type, p_input_data)` - Submits AI learning input
    - Captures current brain state version
    - Sets source_user_id from authenticated user

  2. Security
    - SECURITY DEFINER to allow proper insertion
    - Validates authenticated user exists
*/

CREATE OR REPLACE FUNCTION submit_ai_learning_input(
  p_input_type text,
  p_input_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_brain_state_version bigint;
  v_new_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'NOT_AUTHENTICATED',
      'message', 'User must be authenticated to submit AI learning inputs'
    );
  END IF;

  SELECT state_version INTO v_brain_state_version
  FROM brain_state
  LIMIT 1;

  INSERT INTO ai_learning_inputs (
    input_type,
    input_data,
    source_user_id,
    brain_state_version
  ) VALUES (
    p_input_type,
    p_input_data,
    v_user_id,
    v_brain_state_version
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_new_id,
    'message', 'AI learning input submitted successfully'
  );
END;
$$;
