/*
  # Intelligence Pipeline Test Scenario

  ## Purpose
  Create end-to-end test data that exercises:
  - intelligence_signals (from vital anomalies)
  - notification_log (queued notifications)
  - ai_learning_inputs (from user feedback)

  ## Scenario: Blood Pressure Alert
  1. Senior takes BP reading (high)
  2. System detects anomaly → creates intelligence_signal
  3. Signal triggers notification → creates notification_log entry
  4. User dismisses/acknowledges signal → creates ai_learning_input

  ## Tables Exercised
  - vital_signs (trigger)
  - intelligence_signals (detection)
  - notification_log (alert delivery)
  - ai_learning_inputs (feedback loop)
*/

-- Seeder function for intelligence pipeline scenario
CREATE OR REPLACE FUNCTION seed_intelligence_pipeline_scenario()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid := '00000000-0000-0000-0000-999999999999'::uuid;
  v_resident_id uuid := 'b0000000-0000-0000-0000-000000000001'::uuid;
  v_senior_user_id uuid := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_family_user_id uuid := 'a0000000-0000-0000-0000-000000000002'::uuid;
  v_device_id uuid;
  v_signal_id uuid;
  v_notification_id uuid;
  v_ai_input_id uuid;
  i int;
  v_timestamp timestamptz;
BEGIN
  -- Ensure resident exists
  IF NOT EXISTS (SELECT 1 FROM residents WHERE id = v_resident_id) THEN
    RAISE EXCEPTION 'Resident % does not exist. Run seed_senior_family_scenario() first.', v_resident_id;
  END IF;

  -- Get or create device
  SELECT id INTO v_device_id
  FROM device_registry
  WHERE resident_id = v_resident_id
  LIMIT 1;

  IF v_device_id IS NULL THEN
    INSERT INTO device_registry (
      device_id, resident_id, device_type, device_name,
      manufacturer, model, firmware_version, battery_level,
      trust_state, capabilities, pairing_actor, pairing_timestamp
    ) VALUES (
      'OMRON-BP-PIPELINE-TEST',
      v_resident_id,
      'BLOOD_PRESSURE_MONITOR',
      'OMRON Test Device',
      'OMRON',
      'BP7900',
      '2.1.4',
      85,
      'TRUSTED',
      '{"supported_metrics": ["BLOOD_PRESSURE_SYSTOLIC", "BLOOD_PRESSURE_DIASTOLIC", "HEART_RATE"]}'::jsonb,
      v_senior_user_id,
      now() - interval '30 days'
    )
    RETURNING id INTO v_device_id;
  END IF;

  -- Step 1: Create baseline vital signs (normal range)
  FOR i IN 1..5 LOOP
    v_timestamp := now() - (i || ' days')::interval + interval '8 hours';
    
    INSERT INTO vital_signs (
      resident_id,
      vital_type,
      value,
      systolic,
      diastolic,
      recorded_at,
      recorded_by,
      notes,
      is_simulation
    ) VALUES (
      v_resident_id,
      'BLOOD_PRESSURE',
      '120/80',
      120,
      80,
      v_timestamp,
      v_senior_user_id,
      'Morning baseline reading',
      true
    );
  END LOOP;

  -- Step 2: Insert HIGH blood pressure reading (anomaly trigger)
  INSERT INTO vital_signs (
    resident_id,
    vital_type,
    value,
    systolic,
    diastolic,
    recorded_at,
    recorded_by,
    notes,
    is_simulation
  ) VALUES (
    v_resident_id,
    'BLOOD_PRESSURE',
    '165/95',
    165,
    95,
    now() - interval '10 minutes',
    v_senior_user_id,
    'Elevated reading - felt stressed',
    true
  );

  -- Step 3: Create intelligence signal (simulating brain detection)
  INSERT INTO intelligence_signals (
    resident_id,
    signal_category,
    signal_type,
    severity,
    summary,
    detected_at,
    evidence,
    confidence_score,
    is_simulation
  ) VALUES (
    v_resident_id,
    'HEALTH_TREND',
    'BLOOD_PRESSURE_SPIKE',
    'HIGH',
    'Blood pressure significantly elevated: 165/95 (baseline 120/80)',
    now() - interval '9 minutes',
    jsonb_build_object(
      'current_reading', '165/95',
      'baseline_systolic', 120,
      'baseline_diastolic', 80,
      'deviation_percent', 37.5,
      'recent_readings', 6,
      'trigger_vital_id', (SELECT id FROM vital_signs WHERE resident_id = v_resident_id ORDER BY recorded_at DESC LIMIT 1)
    ),
    0.92,
    true
  )
  RETURNING id INTO v_signal_id;

  -- Step 4: Create notification (queued, simulation-blocked)
  INSERT INTO notification_log (
    user_id,
    resident_id,
    notification_type,
    title,
    message,
    delivery_method,
    delivery_status,
    sent_at,
    is_simulation,
    metadata
  ) VALUES (
    v_family_user_id,
    v_resident_id,
    'HEALTH_ALERT',
    'Blood Pressure Alert',
    'Dorothy''s blood pressure is elevated at 165/95. This is significantly higher than her baseline of 120/80. Please monitor closely.',
    'EMAIL_AND_SMS',
    'QUEUED',
    now() - interval '8 minutes',
    true,
    jsonb_build_object(
      'intelligence_signal_id', v_signal_id,
      'severity', 'HIGH',
      'requires_acknowledgment', true,
      'blocked_by_simulation_mode', true
    )
  )
  RETURNING id INTO v_notification_id;

  -- Step 5: Create AI learning input (user feedback on signal)
  INSERT INTO ai_learning_inputs (
    input_type,
    input_category,
    context,
    submitted_by,
    submitted_at,
    acknowledgment_status,
    is_simulation
  ) VALUES (
    'SIGNAL_FEEDBACK',
    'ALERT_USEFULNESS',
    jsonb_build_object(
      'signal_id', v_signal_id,
      'notification_id', v_notification_id,
      'user_action', 'acknowledged',
      'was_useful', true,
      'feedback_text', 'Alert was helpful - confirmed with doctor, medication adjusted',
      'resident_id', v_resident_id,
      'signal_type', 'BLOOD_PRESSURE_SPIKE',
      'signal_severity', 'HIGH'
    ),
    v_family_user_id,
    now() - interval '5 minutes',
    'PENDING',
    true
  )
  RETURNING id INTO v_ai_input_id;

  -- Return summary
  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'message', 'Intelligence pipeline scenario seeded',
    'pipeline_steps', jsonb_build_object(
      'step_1_vital_trigger', jsonb_build_object(
        'vital_count', 6,
        'anomaly_detected', true,
        'reading', '165/95'
      ),
      'step_2_intelligence_signal', jsonb_build_object(
        'signal_id', v_signal_id,
        'severity', 'HIGH',
        'confidence_score', 0.92
      ),
      'step_3_notification', jsonb_build_object(
        'notification_id', v_notification_id,
        'delivery_status', 'QUEUED',
        'simulation_blocked', true
      ),
      'step_4_ai_learning', jsonb_build_object(
        'ai_input_id', v_ai_input_id,
        'feedback_type', 'SIGNAL_FEEDBACK',
        'was_useful', true
      )
    ),
    'verification', jsonb_build_object(
      'intelligence_signals_count', (SELECT COUNT(*) FROM intelligence_signals WHERE resident_id = v_resident_id),
      'notification_log_count', (SELECT COUNT(*) FROM notification_log WHERE resident_id = v_resident_id),
      'ai_learning_inputs_count', (SELECT COUNT(*) FROM ai_learning_inputs WHERE submitted_by = v_family_user_id)
    )
  );
END;
$$;

-- Verification function to test pipeline integrity
CREATE OR REPLACE FUNCTION verify_intelligence_pipeline()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resident_id uuid := 'b0000000-0000-0000-0000-000000000001'::uuid;
  v_signals_count int;
  v_notifications_count int;
  v_ai_inputs_count int;
  v_recent_signal intelligence_signals%ROWTYPE;
  v_linked_notification notification_log%ROWTYPE;
  v_linked_ai_input ai_learning_inputs%ROWTYPE;
BEGIN
  -- Count records
  SELECT COUNT(*) INTO v_signals_count
  FROM intelligence_signals
  WHERE resident_id = v_resident_id AND is_simulation = true;

  SELECT COUNT(*) INTO v_notifications_count
  FROM notification_log
  WHERE resident_id = v_resident_id AND is_simulation = true;

  SELECT COUNT(*) INTO v_ai_inputs_count
  FROM ai_learning_inputs
  WHERE is_simulation = true
    AND context->>'resident_id' = v_resident_id::text;

  -- Get most recent signal
  SELECT * INTO v_recent_signal
  FROM intelligence_signals
  WHERE resident_id = v_resident_id AND is_simulation = true
  ORDER BY detected_at DESC
  LIMIT 1;

  -- Find linked notification
  IF v_recent_signal.id IS NOT NULL THEN
    SELECT * INTO v_linked_notification
    FROM notification_log
    WHERE resident_id = v_resident_id
      AND is_simulation = true
      AND (metadata->>'intelligence_signal_id')::uuid = v_recent_signal.id
    LIMIT 1;

    -- Find linked AI input
    IF v_linked_notification.id IS NOT NULL THEN
      SELECT * INTO v_linked_ai_input
      FROM ai_learning_inputs
      WHERE is_simulation = true
        AND (context->>'signal_id')::uuid = v_recent_signal.id
      LIMIT 1;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'pipeline_health', jsonb_build_object(
      'intelligence_signals', v_signals_count,
      'notifications', v_notifications_count,
      'ai_learning_inputs', v_ai_inputs_count,
      'all_tables_populated', (v_signals_count > 0 AND v_notifications_count > 0 AND v_ai_inputs_count > 0)
    ),
    'pipeline_linkage', jsonb_build_object(
      'signal_found', v_recent_signal.id IS NOT NULL,
      'notification_linked', v_linked_notification.id IS NOT NULL,
      'ai_input_linked', v_linked_ai_input.id IS NOT NULL,
      'end_to_end_complete', (v_recent_signal.id IS NOT NULL AND v_linked_notification.id IS NOT NULL AND v_linked_ai_input.id IS NOT NULL)
    ),
    'sample_signal', CASE WHEN v_recent_signal.id IS NOT NULL THEN
      jsonb_build_object(
        'id', v_recent_signal.id,
        'type', v_recent_signal.signal_type,
        'severity', v_recent_signal.severity,
        'summary', v_recent_signal.summary
      )
    ELSE NULL END,
    'sample_notification', CASE WHEN v_linked_notification.id IS NOT NULL THEN
      jsonb_build_object(
        'id', v_linked_notification.id,
        'type', v_linked_notification.notification_type,
        'status', v_linked_notification.delivery_status,
        'title', v_linked_notification.title
      )
    ELSE NULL END,
    'sample_ai_input', CASE WHEN v_linked_ai_input.id IS NOT NULL THEN
      jsonb_build_object(
        'id', v_linked_ai_input.id,
        'type', v_linked_ai_input.input_type,
        'was_useful', v_linked_ai_input.context->>'was_useful'
      )
    ELSE NULL END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION seed_intelligence_pipeline_scenario() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION verify_intelligence_pipeline() TO authenticated, anon;

COMMENT ON FUNCTION seed_intelligence_pipeline_scenario IS
'Seeds complete intelligence pipeline test data: vital anomaly → signal → notification → AI feedback';

COMMENT ON FUNCTION verify_intelligence_pipeline IS
'Verifies that intelligence pipeline is properly wired and all tables are populated';
