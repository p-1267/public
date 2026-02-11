/*
  # Fix RPCs to Match Actual Database Schema
  
  Corrects all RPC implementations to match actual table schemas:
  - observation_events uses event_timestamp not observed_at
  - vital_signs uses value (text) not numeric with unit
  - Removes invalid columns and uses actual schema
*/

-- ============================================================================
-- FIX: SENIOR/FAMILY RPCS
-- ============================================================================

CREATE OR REPLACE FUNCTION log_senior_medication_self_report(
  p_resident_id UUID,
  p_medication_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
  v_agency_id UUID;
BEGIN
  -- Get agency_id
  SELECT agency_id INTO v_agency_id FROM residents WHERE id = p_resident_id;

  -- Insert medication administration log
  INSERT INTO medication_administration_log (
    resident_id,
    medication_id,
    administered_at,
    administered_by,
    administration_method,
    notes,
    self_reported
  ) VALUES (
    p_resident_id,
    p_medication_id,
    NOW(),
    NULL,
    'SELF_ADMINISTERED',
    p_notes,
    TRUE
  )
  RETURNING id INTO v_admin_id;

  -- Create observation event (matching actual schema)
  INSERT INTO observation_events (
    agency_id,
    resident_id,
    event_type,
    event_subtype,
    event_timestamp,
    event_data,
    observation_quality,
    source_table,
    idempotency_key
  ) VALUES (
    v_agency_id,
    p_resident_id,
    'MEDICATION_ADMINISTERED',
    'SELF_REPORT',
    NOW(),
    jsonb_build_object(
      'medication_id', p_medication_id,
      'notes', p_notes,
      'method', 'SELF_ADMINISTERED'
    ),
    85,
    'medication_administration_log',
    gen_random_uuid()
  );

  RETURN json_build_object(
    'success', TRUE,
    'admin_id', v_admin_id,
    'message', 'Medication logged successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION batch_submit_senior_health_inputs(
  p_resident_id UUID,
  p_inputs JSON
)
RETURNS JSON AS $$
DECLARE
  v_input JSON;
  v_count INT := 0;
  v_agency_id UUID;
BEGIN
  -- Get agency_id
  SELECT agency_id INTO v_agency_id FROM residents WHERE id = p_resident_id;

  -- Process each health input
  FOR v_input IN SELECT * FROM json_array_elements(p_inputs)
  LOOP
    -- Insert vital sign (matching actual schema: value is TEXT)
    INSERT INTO vital_signs (
      resident_id,
      vital_type,
      value,
      recorded_at,
      recorded_by,
      notes,
      idempotency_key
    ) VALUES (
      p_resident_id,
      (v_input->>'vital_type')::TEXT,
      (v_input->>'value')::TEXT,
      COALESCE((v_input->>'measured_at')::TIMESTAMPTZ, NOW()),
      NULL,
      v_input->>'notes',
      COALESCE(v_input->>'idempotency_key', gen_random_uuid()::TEXT)
    )
    ON CONFLICT (idempotency_key) DO NOTHING;

    -- Insert health metric
    INSERT INTO health_metrics (
      resident_id,
      metric_category,
      metric_name,
      metric_value,
      unit,
      recorded_at,
      data_source,
      confidence_level,
      idempotency_key
    ) VALUES (
      p_resident_id,
      COALESCE((v_input->>'category')::TEXT, 'VITAL_SIGNS'),
      (v_input->>'vital_type')::TEXT,
      (v_input->>'value')::NUMERIC,
      (v_input->>'unit')::TEXT,
      COALESCE((v_input->>'measured_at')::TIMESTAMPTZ, NOW()),
      'SENIOR_APP',
      90,
      COALESCE(v_input->>'idempotency_key', gen_random_uuid()::TEXT)
    )
    ON CONFLICT (idempotency_key) DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  RETURN json_build_object(
    'success', TRUE,
    'count', v_count,
    'message', format('%s health inputs recorded', v_count)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FIX: TRIGGERS TO MATCH ACTUAL SCHEMA
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_health_metrics_to_observations()
RETURNS TRIGGER AS $$
DECLARE
  v_agency_id UUID;
BEGIN
  -- Get agency_id
  SELECT agency_id INTO v_agency_id FROM residents WHERE id = NEW.resident_id;

  -- Create observation event (matching actual schema)
  IF NEW.metric_category IN ('VITAL_SIGNS', 'SYMPTOMS', 'CLINICAL_MEASUREMENTS') THEN
    INSERT INTO observation_events (
      agency_id,
      resident_id,
      event_type,
      event_subtype,
      event_timestamp,
      event_data,
      observation_quality,
      source_table,
      idempotency_key
    ) VALUES (
      v_agency_id,
      NEW.resident_id,
      'HEALTH_METRIC_RECORDED',
      NEW.metric_category,
      NEW.recorded_at,
      jsonb_build_object(
        'metric_name', NEW.metric_name,
        'metric_value', NEW.metric_value,
        'unit', NEW.unit,
        'data_source', NEW.data_source
      ),
      NEW.confidence_level,
      'health_metrics',
      gen_random_uuid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION trigger_task_to_observation()
RETURNS TRIGGER AS $$
DECLARE
  v_agency_id UUID;
BEGIN
  -- Only create observation when task is completed
  IF NEW.state = 'COMPLETED' AND (OLD.state IS NULL OR OLD.state != 'COMPLETED') THEN
    -- Get agency_id
    SELECT agency_id INTO v_agency_id FROM residents WHERE id = NEW.resident_id;

    INSERT INTO observation_events (
      agency_id,
      resident_id,
      caregiver_id,
      event_type,
      event_subtype,
      event_timestamp,
      event_data,
      observation_quality,
      source_table,
      source_id,
      idempotency_key
    ) VALUES (
      v_agency_id,
      NEW.resident_id,
      NEW.assigned_to,
      CASE
        WHEN NEW.category = 'MEDICATION' THEN 'MEDICATION_ADMINISTERED'
        WHEN NEW.category = 'VITAL_MONITORING' THEN 'VITAL_SIGNS_CHECKED'
        WHEN NEW.category = 'ADL' THEN 'ADL_ASSISTANCE_PROVIDED'
        ELSE 'CARE_ACTIVITY_COMPLETED'
      END,
      NEW.category,
      NEW.completed_at,
      jsonb_build_object(
        'task_title', NEW.title,
        'completion_notes', NEW.completion_notes,
        'evidence_submitted', NEW.evidence_submitted
      ),
      CASE WHEN NEW.evidence_submitted THEN 95 ELSE 75 END,
      'tasks',
      NEW.id,
      gen_random_uuid()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate triggers with fixed functions
DROP TRIGGER IF EXISTS health_metrics_to_observations ON health_metrics;
CREATE TRIGGER health_metrics_to_observations
  AFTER INSERT ON health_metrics
  FOR EACH ROW
  EXECUTE FUNCTION trigger_health_metrics_to_observations();

DROP TRIGGER IF EXISTS task_to_observation ON tasks;
CREATE TRIGGER task_to_observation
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION trigger_task_to_observation();
