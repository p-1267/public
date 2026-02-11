/*
  # Wire Family Inputs to Brain Intelligence Pipeline

  1. Purpose
    - Feed family observations into observation_events
    - Enable brain pipeline to consume family context
    - Create signals from family-reported concerns

  2. Changes
    - Trigger: family_observations INSERT → observation_events INSERT
    - Trigger: task completion from family request → unified_timeline
    - Function: Populate unified timeline from existing sources

  3. Flow
    - Family submits observation
    - Observation_event created (as context signal)
    - Brain pipeline processes on next run
    - Anomaly detection considers family input
*/

-- ============================================================
-- Trigger: Family Observation → Observation Event
-- ============================================================

CREATE OR REPLACE FUNCTION trigger_family_observation_to_brain()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
BEGIN
  -- Get agency_id
  SELECT agency_id INTO v_agency_id
  FROM residents
  WHERE id = NEW.resident_id;

  -- Create observation event for brain pipeline
  INSERT INTO observation_events (
    resident_id,
    agency_id,
    caregiver_id,
    event_timestamp,
    event_type,
    event_subtype,
    event_data,
    evidence_quality_score,
    requires_review
  ) VALUES (
    NEW.resident_id,
    v_agency_id,
    NEW.family_user_id, -- Family member as "observer"
    NEW.submitted_at,
    'FAMILY_OBSERVATION',
    NEW.concern_level,
    jsonb_build_object(
      'observation_text', NEW.observation_text,
      'category', NEW.observation_category,
      'concern_level', NEW.concern_level,
      'source', 'family_input'
    ),
    CASE NEW.concern_level
      WHEN 'URGENT' THEN 0.9
      WHEN 'MODERATE' THEN 0.7
      WHEN 'MINOR' THEN 0.5
      ELSE 0.3
    END,
    NEW.concern_level IN ('MODERATE', 'URGENT')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_family_observation_to_brain ON family_observations;
CREATE TRIGGER auto_family_observation_to_brain
  AFTER INSERT ON family_observations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_family_observation_to_brain();

-- ============================================================
-- Function: Populate Unified Timeline from All Sources
-- ============================================================

CREATE OR REPLACE FUNCTION populate_unified_timeline_from_tasks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caregiver_name text;
BEGIN
  -- Only process completed tasks
  IF NEW.state = 'completed' AND (OLD.state IS NULL OR OLD.state != 'completed') THEN
    -- Get caregiver name
    SELECT display_name INTO v_caregiver_name
    FROM user_profiles
    WHERE id = NEW.completed_by;

    -- Add to unified timeline
    INSERT INTO unified_timeline_events (
      resident_id,
      event_timestamp,
      actor_type,
      actor_id,
      actor_name,
      event_category,
      event_type,
      event_summary,
      event_details,
      source_table,
      source_id,
      evidence_count
    ) VALUES (
      NEW.resident_id,
      COALESCE(NEW.completed_at, now()),
      'CAREGIVER',
      NEW.completed_by,
      COALESCE(v_caregiver_name, 'Caregiver'),
      'CARE_DELIVERY',
      'TASK_COMPLETED',
      format('%s: %s', NEW.category, NEW.task_name),
      jsonb_build_object(
        'task_id', NEW.id,
        'outcome', NEW.outcome,
        'notes', NEW.notes,
        'priority', NEW.priority
      ),
      'tasks',
      NEW.id,
      (SELECT COUNT(*) FROM task_evidence WHERE task_id = NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_populate_timeline_from_tasks ON tasks;
CREATE TRIGGER auto_populate_timeline_from_tasks
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION populate_unified_timeline_from_tasks();

-- ============================================================
-- Trigger: Medication Administration → Unified Timeline
-- ============================================================

CREATE OR REPLACE FUNCTION populate_unified_timeline_from_medication()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_med_name text;
  v_actor_name text;
  v_actor_type text;
BEGIN
  -- Get medication name
  SELECT medication_name INTO v_med_name
  FROM resident_medications
  WHERE id = NEW.medication_id;

  -- Determine actor type (could be senior self-admin or caregiver)
  IF NEW.administered_by = NEW.resident_id THEN
    v_actor_type := 'SENIOR';
    SELECT first_name || ' ' || last_name INTO v_actor_name
    FROM residents
    WHERE id = NEW.resident_id;
  ELSE
    v_actor_type := 'CAREGIVER';
    SELECT display_name INTO v_actor_name
    FROM user_profiles
    WHERE id = NEW.administered_by;
  END IF;

  -- Add to unified timeline
  INSERT INTO unified_timeline_events (
    resident_id,
    event_timestamp,
    actor_type,
    actor_id,
    actor_name,
    event_category,
    event_type,
    event_summary,
    event_details,
    source_table,
    source_id,
    requires_review
  ) VALUES (
    NEW.resident_id,
    NEW.administered_at,
    v_actor_type,
    NEW.administered_by,
    COALESCE(v_actor_name, 'Unknown'),
    'MEDICATION',
    'MEDICATION_' || NEW.status,
    format('%s: %s', NEW.status, v_med_name),
    jsonb_build_object(
      'medication_id', NEW.medication_id,
      'medication_name', v_med_name,
      'status', NEW.status,
      'reason', NEW.reason_for_skip
    ),
    'medication_administration_log',
    NEW.id,
    NEW.status IN ('MISSED', 'REFUSED')
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_populate_timeline_from_medication ON medication_administration_log;
CREATE TRIGGER auto_populate_timeline_from_medication
  AFTER INSERT ON medication_administration_log
  FOR EACH ROW
  EXECUTE FUNCTION populate_unified_timeline_from_medication();

-- ============================================================
-- Trigger: Health Metrics → Unified Timeline
-- ============================================================

CREATE OR REPLACE FUNCTION populate_unified_timeline_from_health_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_name text;
  v_actor_type text;
BEGIN
  -- Determine actor type
  IF NEW.source = 'device' THEN
    v_actor_type := 'DEVICE';
    v_actor_name := 'Device';
  ELSIF NEW.entered_by = NEW.resident_id THEN
    v_actor_type := 'SENIOR';
    SELECT first_name || ' ' || last_name INTO v_actor_name
    FROM residents
    WHERE id = NEW.resident_id;
  ELSE
    v_actor_type := 'CAREGIVER';
    SELECT display_name INTO v_actor_name
    FROM user_profiles
    WHERE id = NEW.entered_by;
  END IF;

  -- Add to unified timeline
  INSERT INTO unified_timeline_events (
    resident_id,
    event_timestamp,
    actor_type,
    actor_id,
    actor_name,
    event_category,
    event_type,
    event_summary,
    event_details,
    source_table,
    source_id
  ) VALUES (
    NEW.resident_id,
    NEW.recorded_at,
    v_actor_type,
    NEW.entered_by,
    COALESCE(v_actor_name, 'Unknown'),
    'HEALTH',
    'METRIC_RECORDED',
    format('%s: %s %s', NEW.metric_type, NEW.value, COALESCE(NEW.unit, '')),
    jsonb_build_object(
      'metric_type', NEW.metric_type,
      'value', NEW.value,
      'unit', NEW.unit,
      'source', NEW.source
    ),
    'health_metrics',
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_populate_timeline_from_health_metrics ON health_metrics;
CREATE TRIGGER auto_populate_timeline_from_health_metrics
  AFTER INSERT ON health_metrics
  FOR EACH ROW
  EXECUTE FUNCTION populate_unified_timeline_from_health_metrics();
