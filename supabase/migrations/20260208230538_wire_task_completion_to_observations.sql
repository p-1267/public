/*
  # Wire Task Completion to Observation Events

  1. Purpose
    - Automatically create observation events when tasks are completed
    - Feeds caregiver work into brain intelligence pipeline
    - Enables cross-role visibility of task outcomes

  2. Changes
    - Create trigger function to generate observations from task completion
    - Wire tasks UPDATE (completed) → observation_events INSERT
    - Includes evidence data in observation payload

  3. Security
    - Trigger runs with SECURITY DEFINER
    - Respects RLS policies on observation_events table
    - Only creates observations for completed tasks
*/

-- Create trigger function to generate observation from task completion
CREATE OR REPLACE FUNCTION trigger_create_observation_from_task()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only process when task transitions to completed
  IF NEW.state = 'completed' AND (OLD.state IS NULL OR OLD.state != 'completed') THEN
    -- Create observation event
    INSERT INTO observation_events (
      resident_id,
      event_timestamp,
      event_type,
      event_subtype,
      event_data,
      caregiver_id,
      evidence_quality_score,
      requires_review
    ) VALUES (
      NEW.resident_id,
      COALESCE(NEW.completed_at, NOW()),
      'TASK_COMPLETION',
      NEW.category,
      jsonb_build_object(
        'task_id', NEW.id,
        'task_name', NEW.task_name,
        'outcome', NEW.outcome,
        'notes', NEW.notes,
        'priority', NEW.priority,
        'evidence_count', (SELECT COUNT(*) FROM task_evidence WHERE task_id = NEW.id)
      ),
      NEW.completed_by,
      CASE 
        WHEN (SELECT COUNT(*) FROM task_evidence WHERE task_id = NEW.id) > 0 THEN 0.9
        ELSE 0.6
      END,
      NEW.outcome = 'CONCERN'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on tasks UPDATE
DROP TRIGGER IF EXISTS auto_create_observation_from_task ON tasks;
CREATE TRIGGER auto_create_observation_from_task
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_create_observation_from_task();
