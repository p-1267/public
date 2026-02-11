/*
  # Fix Audit Logging Function v2

  1. Purpose
    - Update log_audit_entry to use correct brain_state column name
    - Column is state_version not version
*/

CREATE OR REPLACE FUNCTION log_audit_entry(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_old_data jsonb DEFAULT NULL,
  p_new_data jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_log_id uuid;
  v_brain_version bigint;
BEGIN
  v_actor_id := auth.uid();
  
  -- Get current brain state version
  SELECT state_version INTO v_brain_version FROM brain_state LIMIT 1;
  
  INSERT INTO audit_log (
    action_type,
    actor_id,
    target_type,
    target_id,
    previous_state,
    new_state,
    metadata,
    brain_state_version
  ) VALUES (
    p_action,
    v_actor_id,
    p_entity_type,
    p_entity_id,
    p_old_data,
    p_new_data,
    p_metadata,
    v_brain_version
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;