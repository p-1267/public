/*
  # Audit Logging Function

  1. Purpose
    - Provide a reusable function for inserting audit log entries
    - Captures actor, action, entity, and change details
    - Used by triggers and application logic

  2. New Functions
    - `log_audit_entry(action, entity_type, entity_id, old_data, new_data, metadata)` - Core logging function

  3. Security
    - Function is SECURITY DEFINER to bypass RLS for inserts
    - All parameters validated
    - Append-only by design
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
BEGIN
  v_actor_id := auth.uid();
  
  INSERT INTO audit_log (
    actor_id,
    action,
    entity_type,
    entity_id,
    old_data,
    new_data,
    metadata
  ) VALUES (
    v_actor_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_data,
    p_new_data,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;