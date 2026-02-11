/*
  # Fix RPCs to Match ACTUAL Database Schema (Final)
  
  Corrects RPCs based on real schema inspection:
  - medication_administration_log: uses status, dosage_given, route_used (no administration_method)
  - vital_signs: no unique constraint on idempotency_key (composite PK)
  - health_metrics: idempotency_key unique constraint exists
*/

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
  SELECT agency_id INTO v_agency_id FROM residents WHERE id = p_resident_id;

  -- Insert using ACTUAL schema
  INSERT INTO medication_administration_log (
    resident_id,
    medication_id,
    administered_at,
    administered_by,
    status,
    route_used,
    resident_response,
    idempotency_key
  ) VALUES (
    p_resident_id,
    p_medication_id,
    NOW(),
    NULL,
    'ADMINISTERED',
    'SELF_ADMINISTERED',
    p_notes,
    gen_random_uuid()
  )
  RETURNING id INTO v_admin_id;

  -- Create observation event
  INSERT INTO observation_events (
    agency_id,
    resident_id,
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
    p_resident_id,
    'MEDICATION_ADMINISTERED',
    'SELF_REPORT',
    NOW(),
    jsonb_build_object(
      'medication_id', p_medication_id,
      'notes', p_notes,
      'route', 'SELF_ADMINISTERED'
    ),
    85,
    'medication_administration_log',
    v_admin_id,
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
BEGIN
  FOR v_input IN SELECT * FROM json_array_elements(p_inputs)
  LOOP
    -- Insert vital sign (no idempotency constraint, so check manually)
    IF NOT EXISTS (
      SELECT 1 FROM vital_signs
      WHERE idempotency_key = COALESCE(v_input->>'idempotency_key', gen_random_uuid()::TEXT)
    ) THEN
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
      );
    END IF;

    -- Insert health metric (has unique idempotency constraint)
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

GRANT EXECUTE ON FUNCTION log_senior_medication_self_report TO anon, authenticated;
GRANT EXECUTE ON FUNCTION batch_submit_senior_health_inputs TO anon, authenticated;
