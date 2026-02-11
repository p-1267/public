/*
  # AI Learning Inputs Audit Trigger

  1. Purpose
    - Log AI input submissions
    - Log acknowledgments of AI suggestions
    - Track who acknowledges AI recommendations

  2. Trigger Details
    - Fires AFTER INSERT on ai_learning_inputs (new observations)
    - Fires AFTER UPDATE on ai_learning_inputs (acknowledgments)
    - Captures acknowledgment decisions

  3. Security
    - AI is non-executing: logs observations only
    - Acknowledgments require explicit human action
    - Full audit trail of AI interactions
*/

CREATE OR REPLACE FUNCTION trigger_audit_ai_input_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action text;
  v_metadata jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'AI_INPUT_SUBMITTED';
    v_metadata := jsonb_build_object(
      'input_type', NEW.input_type,
      'source', NEW.source
    );
    
    PERFORM log_audit_entry(
      v_action,
      'ai_learning_inputs',
      NEW.id,
      NULL,
      to_jsonb(NEW),
      v_metadata
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if this is an acknowledgment
    IF OLD.acknowledged_at IS NULL AND NEW.acknowledged_at IS NOT NULL THEN
      v_action := 'AI_INPUT_ACKNOWLEDGED';
      v_metadata := jsonb_build_object(
        'input_type', NEW.input_type,
        'acknowledged_by', NEW.acknowledged_by,
        'time_to_acknowledge', EXTRACT(EPOCH FROM (NEW.acknowledged_at - NEW.created_at))
      );
      
      PERFORM log_audit_entry(
        v_action,
        'ai_learning_inputs',
        NEW.id,
        to_jsonb(OLD),
        to_jsonb(NEW),
        v_metadata
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER audit_ai_input_changes
  AFTER INSERT OR UPDATE ON ai_learning_inputs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_audit_ai_input_change();