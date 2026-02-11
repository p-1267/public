/*
  # Activate Task Completion → Observation Events

  1. Purpose
    - Feed task completions into brain intelligence pipeline
    - Enable caregiver work to trigger anomaly detection
    - Wire task system to brain compute layer

  2. Implementation
    - Trigger fires AFTER UPDATE on tasks when state = 'completed'
    - Creates observation_event for brain to process
    - Enables cross-role intelligence from caregiver actions
*/

-- Create function to convert task completion to observation
CREATE OR REPLACE FUNCTION create_observation_from_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_category text;
BEGIN
  -- Only process completed tasks
  IF NEW.state != 'completed' OR OLD.state = 'completed' THEN
    RETURN NEW;
  END IF;

  -- Get task category name
  SELECT category_name INTO v_task_category
  FROM task_categories
  WHERE id = NEW.category_id;

  -- Create observation event for brain pipeline
  INSERT INTO observation_events (
    resident_id,
    agency_id,
    caregiver_id,
    event_type,
    event_subtype,
    event_timestamp,
    event_data,
    requires_followup,
    created_at
  ) VALUES (
    NEW.resident_id,
    NEW.agency_id,
    NEW.assigned_to,
    'task_completed',
    v_task_category,
    COALESCE(NEW.completed_at, now()),
    jsonb_build_object(
      'task_id', NEW.id,
      'task_name', NEW.task_name,
      'priority', NEW.priority,
      'duration_minutes', EXTRACT(EPOCH FROM (NEW.completed_at - NEW.scheduled_for)) / 60,
      'outcome', NEW.outcome,
      'is_emergency', NEW.is_emergency,
      'task_category', v_task_category
    ),
    NEW.is_emergency OR NEW.outcome = 'CONCERN_FLAGGED',
    now()
  )
  ON CONFLICT (idempotency_key) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_task_to_observation ON tasks;

-- Create trigger
CREATE TRIGGER trigger_task_to_observation
  AFTER UPDATE ON tasks
  FOR EACH ROW
  WHEN (NEW.state = 'completed' AND OLD.state != 'completed')
  EXECUTE FUNCTION create_observation_from_task();

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_observation_from_task() TO authenticated, anon;

COMMENT ON FUNCTION create_observation_from_task() IS 'Feeds task completions to brain intelligence pipeline';
