/*
  # Brain State Audit Trigger

  1. Purpose
    - Automatically log all Brain state transitions
    - Captures previous and new state values
    - Records state changes with full context

  2. Trigger Details
    - Fires AFTER UPDATE on brain_state
    - Logs state_mode, override_active, comfort settings changes
    - Adds entry to brain_state_history automatically

  3. Security
    - Trigger function uses SECURITY DEFINER
    - Ensures complete audit trail of all state changes
*/

CREATE OR REPLACE FUNCTION trigger_audit_brain_state_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_metadata jsonb;
BEGIN
  -- Determine the type of change
  IF OLD.state_mode IS DISTINCT FROM NEW.state_mode THEN
    v_action := 'BRAIN_STATE_MODE_CHANGE';
  ELSIF OLD.override_active IS DISTINCT FROM NEW.override_active THEN
    v_action := 'BRAIN_OVERRIDE_CHANGE';
  ELSE
    v_action := 'BRAIN_STATE_UPDATE';
  END IF;
  
  -- Build metadata
  v_metadata := jsonb_build_object(
    'previous_mode', OLD.state_mode,
    'new_mode', NEW.state_mode,
    'override_changed', OLD.override_active IS DISTINCT FROM NEW.override_active,
    'comfort_changed', (
      OLD.comfort_temp_min IS DISTINCT FROM NEW.comfort_temp_min OR
      OLD.comfort_temp_max IS DISTINCT FROM NEW.comfort_temp_max OR
      OLD.comfort_humidity_min IS DISTINCT FROM NEW.comfort_humidity_min OR
      OLD.comfort_humidity_max IS DISTINCT FROM NEW.comfort_humidity_max
    )
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
  
  -- Also insert into brain_state_history for state transitions
  INSERT INTO brain_state_history (
    brain_state_id,
    state_mode,
    override_active,
    override_reason,
    override_expires_at,
    triggered_by,
    transition_reason
  ) VALUES (
    NEW.id,
    NEW.state_mode,
    NEW.override_active,
    NEW.override_reason,
    NEW.override_expires_at,
    auth.uid(),
    v_metadata->>'new_mode'
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_brain_state_changes
  AFTER UPDATE ON brain_state
  FOR EACH ROW
  EXECUTE FUNCTION trigger_audit_brain_state_change();