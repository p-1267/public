/*
  # Fix Brain State Audit Trigger

  1. Purpose
    - Update trigger to use correct brain_state columns:
      - care_state, emergency_state, offline_online_state
    - Also update brain_state_history insert to match schema
*/

-- First drop the existing trigger
DROP TRIGGER IF EXISTS audit_brain_state_changes ON brain_state;

CREATE OR REPLACE FUNCTION trigger_audit_brain_state_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_metadata jsonb;
  v_transition_reason text;
BEGIN
  -- Determine the type of change
  IF OLD.care_state IS DISTINCT FROM NEW.care_state THEN
    v_action := 'CARE_STATE_CHANGE';
    v_transition_reason := 'care_state: ' || OLD.care_state || ' -> ' || NEW.care_state;
  ELSIF OLD.emergency_state IS DISTINCT FROM NEW.emergency_state THEN
    v_action := 'EMERGENCY_STATE_CHANGE';
    v_transition_reason := 'emergency_state: ' || OLD.emergency_state || ' -> ' || NEW.emergency_state;
  ELSIF OLD.offline_online_state IS DISTINCT FROM NEW.offline_online_state THEN
    v_action := 'CONNECTIVITY_STATE_CHANGE';
    v_transition_reason := 'offline_online_state: ' || OLD.offline_online_state || ' -> ' || NEW.offline_online_state;
  ELSE
    v_action := 'BRAIN_STATE_UPDATE';
    v_transition_reason := 'general update';
  END IF;
  
  -- Build metadata
  v_metadata := jsonb_build_object(
    'previous_care_state', OLD.care_state,
    'new_care_state', NEW.care_state,
    'previous_emergency_state', OLD.emergency_state,
    'new_emergency_state', NEW.emergency_state,
    'previous_connectivity_state', OLD.offline_online_state,
    'new_connectivity_state', NEW.offline_online_state,
    'previous_version', OLD.state_version,
    'new_version', NEW.state_version
  );
  
  -- Log to audit_log
  PERFORM log_audit_entry(
    v_action,
    'brain_state',
    NEW.id,
    to_jsonb(OLD),
    to_jsonb(NEW),
    v_metadata
  );
  
  -- Insert into brain_state_history
  INSERT INTO brain_state_history (
    brain_state_id,
    care_state,
    emergency_state,
    offline_online_state,
    state_version,
    triggered_by,
    transition_reason
  ) VALUES (
    NEW.id,
    NEW.care_state,
    NEW.emergency_state,
    NEW.offline_online_state,
    NEW.state_version,
    auth.uid(),
    v_transition_reason
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_brain_state_changes
  AFTER UPDATE ON brain_state
  FOR EACH ROW
  EXECUTE FUNCTION trigger_audit_brain_state_change();