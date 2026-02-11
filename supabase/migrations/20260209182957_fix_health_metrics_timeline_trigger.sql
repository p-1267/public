/*
  # Fix Health Metrics Timeline Trigger

  1. Issue
    - Trigger references NEW.source but column is measurement_source
    - Also references NEW.entered_by but column doesn't exist

  2. Fix
    - Use correct column names
    - Handle device vs manual entry properly
*/

CREATE OR REPLACE FUNCTION populate_unified_timeline_from_health_metrics()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_name text;
  v_actor_type text;
  v_actor_id uuid;
BEGIN
  -- Determine actor type based on measurement_source
  IF NEW.measurement_source IN ('AUTOMATIC_DEVICE', 'WEARABLE', 'SENSOR') THEN
    v_actor_type := 'DEVICE';
    v_actor_name := 'Device';
    v_actor_id := NEW.device_registry_id;
  ELSE
    -- Manual entry - try to determine who entered it
    -- For now default to SYSTEM since we don't track entered_by in health_metrics
    v_actor_type := 'SYSTEM';
    v_actor_name := 'System';
    v_actor_id := NULL;
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
    v_actor_id,
    v_actor_name,
    'HEALTH',
    'METRIC_RECORDED',
    format('%s: %s %s', NEW.metric_type, NEW.value_numeric, COALESCE(NEW.unit, '')),
    jsonb_build_object(
      'metric_type', NEW.metric_type,
      'value', NEW.value_numeric,
      'unit', NEW.unit,
      'source', NEW.measurement_source
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
