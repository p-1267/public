/*
  # Wire Task Evidence → Health Metrics

  1. Purpose
    - Automatically sync vital sign measurements from task evidence to health_metrics
    - Enable caregiver-measured vitals to appear in health dashboards
    - Cross-role visibility: caregiver work → family/senior health view

  2. Implementation
    - Trigger fires AFTER INSERT on task_evidence
    - Extracts vital signs (BP, HR, temp, weight, O2) from evidence_data
    - Creates corresponding health_metrics records
    - Triggers trend calculation automatically
*/

-- Create function to sync task evidence to health metrics
CREATE OR REPLACE FUNCTION sync_task_evidence_to_health_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task RECORD;
  v_metric_type text;
  v_value numeric;
BEGIN
  -- Get task details
  SELECT t.resident_id, t.agency_id, tc.category_name
  INTO v_task
  FROM tasks t
  LEFT JOIN task_categories tc ON tc.id = t.category_id
  WHERE t.id = NEW.task_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Extract and map vital signs from evidence_data
  -- Blood pressure
  IF NEW.evidence_data ? 'blood_pressure_systolic' THEN
    INSERT INTO health_metrics (
      resident_id,
      metric_type,
      value_numeric,
      unit,
      measurement_source,
      recorded_at,
      recorded_by
    ) VALUES (
      v_task.resident_id,
      'BLOOD_PRESSURE_SYSTOLIC',
      (NEW.evidence_data->>'blood_pressure_systolic')::numeric,
      'mmHg',
      'CAREGIVER_TASK',
      NEW.captured_at,
      NEW.captured_by
    );
  END IF;

  IF NEW.evidence_data ? 'blood_pressure_diastolic' THEN
    INSERT INTO health_metrics (
      resident_id,
      metric_type,
      value_numeric,
      unit,
      measurement_source,
      recorded_at,
      recorded_by
    ) VALUES (
      v_task.resident_id,
      'BLOOD_PRESSURE_DIASTOLIC',
      (NEW.evidence_data->>'blood_pressure_diastolic')::numeric,
      'mmHg',
      'CAREGIVER_TASK',
      NEW.captured_at,
      NEW.captured_by
    );
  END IF;

  -- Heart rate
  IF NEW.evidence_data ? 'heart_rate' THEN
    INSERT INTO health_metrics (
      resident_id,
      metric_type,
      value_numeric,
      unit,
      measurement_source,
      recorded_at,
      recorded_by
    ) VALUES (
      v_task.resident_id,
      'HEART_RATE',
      (NEW.evidence_data->>'heart_rate')::numeric,
      'bpm',
      'CAREGIVER_TASK',
      NEW.captured_at,
      NEW.captured_by
    );
  END IF;

  -- Temperature
  IF NEW.evidence_data ? 'temperature' THEN
    INSERT INTO health_metrics (
      resident_id,
      metric_type,
      value_numeric,
      unit,
      measurement_source,
      recorded_at,
      recorded_by
    ) VALUES (
      v_task.resident_id,
      'BODY_TEMPERATURE',
      (NEW.evidence_data->>'temperature')::numeric,
      'F',
      'CAREGIVER_TASK',
      NEW.captured_at,
      NEW.captured_by
    );
  END IF;

  -- Weight
  IF NEW.evidence_data ? 'weight' THEN
    INSERT INTO health_metrics (
      resident_id,
      metric_type,
      value_numeric,
      unit,
      measurement_source,
      recorded_at,
      recorded_by
    ) VALUES (
      v_task.resident_id,
      'WEIGHT',
      (NEW.evidence_data->>'weight')::numeric,
      'lbs',
      'CAREGIVER_TASK',
      NEW.captured_at,
      NEW.captured_by
    );
  END IF;

  -- Oxygen saturation
  IF NEW.evidence_data ? 'oxygen_saturation' THEN
    INSERT INTO health_metrics (
      resident_id,
      metric_type,
      value_numeric,
      unit,
      measurement_source,
      recorded_at,
      recorded_by
    ) VALUES (
      v_task.resident_id,
      'OXYGEN_SATURATION',
      (NEW.evidence_data->>'oxygen_saturation')::numeric,
      '%',
      'CAREGIVER_TASK',
      NEW.captured_at,
      NEW.captured_by
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_sync_task_evidence_to_health_metrics ON task_evidence;

-- Create trigger
CREATE TRIGGER trigger_sync_task_evidence_to_health_metrics
  AFTER INSERT ON task_evidence
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_evidence_to_health_metrics();

-- Grant permissions
GRANT EXECUTE ON FUNCTION sync_task_evidence_to_health_metrics() TO authenticated, anon;

COMMENT ON FUNCTION sync_task_evidence_to_health_metrics() IS 'Automatically syncs vital signs from task evidence to health_metrics table';
