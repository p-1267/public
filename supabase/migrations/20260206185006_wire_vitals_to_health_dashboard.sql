/*
  # Wire Vitals to Health Dashboard and Add Audit Simulation Tagging

  ## Purpose
  1. Update audit function to propagate is_simulation
  2. Create triggers to log task/vital changes with simulation flag
  3. Wire vitals properly to health dashboard queries

  ## Changes
  - Drop and recreate log_audit_entry with is_simulation parameter
  - Add task audit trigger
  - Add vital signs audit trigger
*/

-- Drop old audit function (all signatures)
DROP FUNCTION IF EXISTS log_audit_entry(text, text, uuid, jsonb, jsonb, jsonb);

-- Recreate with is_simulation support
CREATE OR REPLACE FUNCTION log_audit_entry(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_old_data jsonb DEFAULT NULL,
  p_new_data jsonb DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL,
  p_is_simulation boolean DEFAULT false
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
    brain_state_version,
    is_simulation
  ) VALUES (
    p_action,
    v_actor_id,
    p_entity_type,
    p_entity_id,
    p_old_data,
    p_new_data,
    p_metadata,
    v_brain_version,
    p_is_simulation
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Task audit trigger function
CREATE OR REPLACE FUNCTION task_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM log_audit_entry(
      'task_created',
      'task',
      NEW.id,
      NULL,
      to_jsonb(NEW),
      jsonb_build_object('task_name', NEW.task_name, 'state', NEW.state),
      NEW.is_simulation
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    PERFORM log_audit_entry(
      'task_updated',
      'task',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object('old_state', OLD.state, 'new_state', NEW.state),
      NEW.is_simulation
    );
  ELSIF (TG_OP = 'DELETE') THEN
    PERFORM log_audit_entry(
      'task_deleted',
      'task',
      OLD.id,
      to_jsonb(OLD),
      NULL,
      jsonb_build_object('task_name', OLD.task_name),
      OLD.is_simulation
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Vital signs audit trigger function
CREATE OR REPLACE FUNCTION vital_signs_audit_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    PERFORM log_audit_entry(
      'vital_recorded',
      'vital_sign',
      NEW.id,
      NULL,
      to_jsonb(NEW),
      jsonb_build_object('vital_type', NEW.vital_type, 'value', NEW.value),
      NEW.is_simulation
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    PERFORM log_audit_entry(
      'vital_updated',
      'vital_sign',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object('vital_type', NEW.vital_type),
      NEW.is_simulation
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS task_audit_log_trigger ON tasks;
DROP TRIGGER IF EXISTS vital_signs_audit_trigger ON vital_signs;

-- Create triggers
CREATE TRIGGER task_audit_log_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION task_audit_trigger();

CREATE TRIGGER vital_signs_audit_trigger
  AFTER INSERT OR UPDATE ON vital_signs
  FOR EACH ROW
  EXECUTE FUNCTION vital_signs_audit_trigger();

COMMENT ON FUNCTION log_audit_entry IS
'Logs audit entry with simulation flag. Preserves is_simulation from source records.';

COMMENT ON TRIGGER task_audit_log_trigger ON tasks IS
'Automatically logs task changes to audit_log with simulation flag preserved.';

COMMENT ON TRIGGER vital_signs_audit_trigger ON vital_signs IS
'Automatically logs vital sign changes to audit_log with simulation flag preserved.';
