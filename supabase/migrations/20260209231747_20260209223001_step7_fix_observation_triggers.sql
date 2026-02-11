/*
  # Step 7 - Fix observation event triggers to match actual schema

  Updates triggers to use correct observation_events schema:
  - event_type, event_subtype, caregiver_id, observation_quality, event_timestamp, event_data
*/

-- Drop old triggers if they exist
DROP TRIGGER IF EXISTS trigger_task_completion_to_observation ON tasks;
DROP FUNCTION IF EXISTS create_observation_from_task();

-- Create observation from task completion
CREATE OR REPLACE FUNCTION create_observation_from_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_evidence_quality int;
  v_event_data jsonb;
BEGIN
  -- Only create observation when task moves to completed state
  IF NEW.state = 'completed' AND (OLD.state IS NULL OR OLD.state != 'completed') THEN

    -- Calculate quality based on evidence
    v_evidence_quality := CASE
      WHEN NEW.evidence_submitted THEN 85
      ELSE 60
    END;

    -- Build event data
    v_event_data := jsonb_build_object(
      'task_name', NEW.task_name,
      'outcome', COALESCE(NEW.outcome, 'completed'),
      'duration_minutes', NEW.duration_minutes,
      'evidence_submitted', NEW.evidence_submitted,
      'priority', NEW.priority,
      'risk_level', NEW.risk_level
    );

    -- Insert observation event
    INSERT INTO observation_events (
      id,
      agency_id,
      event_type,
      event_subtype,
      resident_id,
      caregiver_id,
      event_timestamp,
      event_data,
      observation_quality,
      source_table,
      source_id,
      is_simulation,
      idempotency_key
    )
    VALUES (
      gen_random_uuid(),
      NEW.agency_id,
      'task_completion',
      'care_task',
      NEW.resident_id,
      COALESCE(NEW.completed_by, NEW.owner_user_id),
      COALESCE(NEW.actual_end, now()),
      v_event_data,
      v_evidence_quality,
      'tasks',
      NEW.id,
      NEW.is_simulation,
      gen_random_uuid()
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_task_completion_to_observation
AFTER UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION create_observation_from_task();

-- Family observation to observation_events
DROP TRIGGER IF EXISTS trigger_family_observation_to_events ON family_observations;
DROP FUNCTION IF EXISTS create_observation_from_family();

CREATE OR REPLACE FUNCTION create_observation_from_family()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_quality int;
BEGIN
  v_quality := CASE NEW.concern_level
    WHEN 'high' THEN 75
    WHEN 'medium' THEN 65
    ELSE 55
  END;

  INSERT INTO observation_events (
    id,
    agency_id,
    event_type,
    event_subtype,
    resident_id,
    caregiver_id,
    event_timestamp,
    event_data,
    observation_quality,
    source_table,
    source_id,
    is_simulation,
    idempotency_key
  )
  VALUES (
    gen_random_uuid(),
    (SELECT agency_id FROM residents WHERE id = NEW.resident_id),
    'family_input',
    'observation',
    NEW.resident_id,
    NEW.family_user_id,
    NEW.submitted_at,
    jsonb_build_object(
      'observation_text', NEW.observation_text,
      'concern_level', NEW.concern_level,
      'category', NEW.observation_category
    ),
    v_quality,
    'family_observations',
    NEW.id,
    false,
    gen_random_uuid()
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_family_observation_to_events
AFTER INSERT ON family_observations
FOR EACH ROW
EXECUTE FUNCTION create_observation_from_family();

-- Health metrics to observation_events
DROP TRIGGER IF EXISTS trigger_health_metric_to_observation ON health_metrics;
DROP FUNCTION IF EXISTS create_observation_from_health_metric();

CREATE OR REPLACE FUNCTION create_observation_from_health_metric()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO observation_events (
    id,
    agency_id,
    event_type,
    event_subtype,
    resident_id,
    caregiver_id,
    event_timestamp,
    event_data,
    observation_quality,
    source_table,
    source_id,
    is_simulation,
    idempotency_key
  )
  VALUES (
    gen_random_uuid(),
    (SELECT agency_id FROM residents WHERE id = NEW.resident_id),
    'health_data',
    'metric_recorded',
    NEW.resident_id,
    NULL,
    NEW.recorded_at,
    jsonb_build_object(
      'metric_type', NEW.metric_type,
      'value', NEW.value_numeric,
      'unit', NEW.unit,
      'source', NEW.measurement_source
    ),
    CASE NEW.confidence_level
      WHEN 'high' THEN 90
      WHEN 'medium' THEN 75
      ELSE 60
    END,
    'health_metrics',
    NEW.id,
    false,
    gen_random_uuid()
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_health_metric_to_observation
AFTER INSERT ON health_metrics
FOR EACH ROW
EXECUTE FUNCTION create_observation_from_health_metric();