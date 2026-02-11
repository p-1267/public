/*
  # Wire Caregiver Vitals Recording to Senior Health Dashboard

  1. Purpose
    - When caregivers record vitals as task evidence, copy to health_metrics
    - Enable real-time updates to Senior health dashboard
    - Create CAREGIVER_MEASURED source for manual vitals

  2. Changes
    - Create trigger to copy task_evidence metrics to health_metrics
    - Add helper function for manual vitals entry
    - Enable cross-scenario data flow
*/

-- ============================================================
-- Helper function for caregivers to record vitals manually
-- ============================================================

CREATE OR REPLACE FUNCTION record_manual_vital(
  p_resident_id uuid,
  p_metric_type text,
  p_value_numeric decimal,
  p_unit text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_metric_id uuid;
  v_metric_category text;
BEGIN
  -- Map metric type to category
  v_metric_category := CASE
    WHEN p_metric_type IN ('blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate') THEN 'VITALS'
    WHEN p_metric_type IN ('blood_glucose', 'oxygen_saturation', 'temperature') THEN 'VITALS'
    WHEN p_metric_type IN ('weight', 'height', 'bmi') THEN 'BODY_METRICS'
    WHEN p_metric_type IN ('steps', 'distance', 'calories') THEN 'ACTIVITY'
    ELSE 'OTHER'
  END;

  -- Insert into health_metrics
  INSERT INTO health_metrics (
    resident_id,
    metric_category,
    metric_type,
    value_numeric,
    unit,
    confidence_level,
    measurement_source,
    recorded_at,
    device_name
  ) VALUES (
    p_resident_id,
    v_metric_category,
    p_metric_type,
    p_value_numeric,
    p_unit,
    'HIGH',
    'CAREGIVER_MEASURED',
    now(),
    'Manual Entry'
  )
  RETURNING id INTO v_metric_id;

  -- Write audit log
  INSERT INTO audit_log (
    action_type,
    actor_id,
    target_type,
    target_id,
    metadata,
    created_at
  ) VALUES (
    'vital.recorded',
    auth.uid(),
    'resident',
    p_resident_id,
    jsonb_build_object(
      'metric_id', v_metric_id,
      'metric_type', p_metric_type,
      'value', p_value_numeric,
      'unit', p_unit,
      'notes', p_notes
    ),
    now()
  );

  RETURN jsonb_build_object(
    'success', true,
    'metric_id', v_metric_id
  );
END;
$$;

-- ============================================================
-- Trigger to sync task evidence metrics to health_metrics
-- ============================================================

CREATE OR REPLACE FUNCTION sync_task_evidence_to_health_metrics()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_resident_id uuid;
  v_metric_category text;
BEGIN
  -- Only process metric evidence
  IF NEW.evidence_type != 'metric' THEN
    RETURN NEW;
  END IF;

  -- Get resident_id from task
  SELECT resident_id INTO v_resident_id
  FROM tasks
  WHERE id = NEW.task_id;

  IF v_resident_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Map metric name to category
  v_metric_category := CASE
    WHEN NEW.metric_name IN ('blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate', 'blood_glucose', 'oxygen_saturation', 'temperature') THEN 'VITALS'
    WHEN NEW.metric_name IN ('weight', 'height', 'bmi') THEN 'BODY_METRICS'
    WHEN NEW.metric_name IN ('steps', 'distance', 'calories') THEN 'ACTIVITY'
    ELSE 'OTHER'
  END;

  -- Insert into health_metrics
  INSERT INTO health_metrics (
    resident_id,
    metric_category,
    metric_type,
    value_numeric,
    unit,
    confidence_level,
    measurement_source,
    recorded_at,
    device_name
  ) VALUES (
    v_resident_id,
    v_metric_category,
    NEW.metric_name,
    NEW.metric_value,
    NEW.metric_unit,
    'HIGH',
    'CAREGIVER_MEASURED',
    NEW.captured_at,
    'Task Evidence'
  );

  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_sync_evidence_to_health_metrics ON task_evidence;

-- Create trigger
CREATE TRIGGER trigger_sync_evidence_to_health_metrics
  AFTER INSERT ON task_evidence
  FOR EACH ROW
  EXECUTE FUNCTION sync_task_evidence_to_health_metrics();

-- Grant permissions
GRANT EXECUTE ON FUNCTION record_manual_vital(uuid, text, decimal, text, text) TO authenticated, anon;
