/*
  # AI Input Acknowledgment Function

  1. Purpose
    - Allow authorized users to acknowledge AI observations
    - Record who acknowledged and when
    - Acknowledgment does NOT execute AI suggestions
    - Human must take separate action to implement any changes

  2. New Functions
    - `acknowledge_ai_input(input_id)` - Mark AI input as reviewed
    - `bulk_acknowledge_ai_inputs(input_ids)` - Acknowledge multiple inputs

  3. Security
    - Requires ACKNOWLEDGE_AI_INPUT permission
    - Cannot acknowledge already-acknowledged inputs
    - Full audit trail maintained
*/

-- Function to acknowledge a single AI input
CREATE OR REPLACE FUNCTION acknowledge_ai_input(
  p_input_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_has_permission boolean;
  v_input_exists boolean;
  v_already_acknowledged boolean;
BEGIN
  v_user_id := auth.uid();
  
  -- Check user has permission
  SELECT user_has_permission(v_user_id, 'ACKNOWLEDGE_AI_INPUT') INTO v_has_permission;
  
  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Permission denied: ACKNOWLEDGE_AI_INPUT required';
  END IF;
  
  -- Check input exists
  SELECT EXISTS(
    SELECT 1 FROM ai_learning_inputs WHERE id = p_input_id
  ) INTO v_input_exists;
  
  IF NOT v_input_exists THEN
    RAISE EXCEPTION 'AI input not found: %', p_input_id;
  END IF;
  
  -- Check not already acknowledged
  SELECT acknowledged_at IS NOT NULL 
  FROM ai_learning_inputs 
  WHERE id = p_input_id 
  INTO v_already_acknowledged;
  
  IF v_already_acknowledged THEN
    RAISE EXCEPTION 'AI input already acknowledged: %', p_input_id;
  END IF;
  
  -- Acknowledge the input
  UPDATE ai_learning_inputs
  SET 
    acknowledged_at = now(),
    acknowledged_by = v_user_id
  WHERE id = p_input_id;
  
  RETURN true;
END;
$$;

-- Function to bulk acknowledge AI inputs
CREATE OR REPLACE FUNCTION bulk_acknowledge_ai_inputs(
  p_input_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_has_permission boolean;
  v_count integer := 0;
  v_input_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  -- Check user has permission
  SELECT user_has_permission(v_user_id, 'ACKNOWLEDGE_AI_INPUT') INTO v_has_permission;
  
  IF NOT v_has_permission THEN
    RAISE EXCEPTION 'Permission denied: ACKNOWLEDGE_AI_INPUT required';
  END IF;
  
  -- Acknowledge each input
  FOREACH v_input_id IN ARRAY p_input_ids
  LOOP
    UPDATE ai_learning_inputs
    SET 
      acknowledged_at = now(),
      acknowledged_by = v_user_id
    WHERE id = v_input_id
      AND acknowledged_at IS NULL;
    
    IF FOUND THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;
  
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION acknowledge_ai_input IS 
'Acknowledge an AI observation as reviewed. This does NOT execute any AI suggestions - human action is required separately.';

COMMENT ON FUNCTION bulk_acknowledge_ai_inputs IS 
'Acknowledge multiple AI observations as reviewed. Returns count of newly acknowledged inputs.';