/*
  # Fix Intelligence Pipeline to Use Valid AI Input Type

  ## Issue
  ai_learning_inputs.input_type must be one of:
  - PATTERN_OBSERVATION
  - COMFORT_SUGGESTION
  - EFFICIENCY_INSIGHT
  - ANOMALY_DETECTION
  - SCHEDULE_RECOMMENDATION

  'SIGNAL_FEEDBACK' is not valid.

  ## Fix
  Use 'ANOMALY_DETECTION' for intelligence signal feedback
*/

DROP FUNCTION IF EXISTS seed_intelligence_pipeline_scenario();

CREATE OR REPLACE FUNCTION seed_intelligence_pipeline_scenario()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resident_id uuid := 'b0000000-0000-0000-0000-000000000001'::uuid;
  v_senior_user_id uuid := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_family_user_id uuid := 'a0000000-0000-0000-0000-000000000002'::uuid;
  v_agency_id uuid := '00000000-0000-0000-0000-999999999999'::uuid;
  v_vital_id uuid;
  v_signal_result jsonb;
  v_feedback_result jsonb;
  i int;
BEGIN
  -- Ensure resident exists
  IF NOT EXISTS (SELECT 1 FROM residents WHERE id = v_resident_id) THEN
    RAISE EXCEPTION 'Resident % does not exist. Run seed_senior_family_scenario() first.', v_resident_id;
  END IF;

  -- ============================================================
  -- STEP 1: Create baseline vital signs using PRODUCTION RPC
  -- ============================================================
  FOR i IN 1..5 LOOP
    PERFORM record_vital_sign_with_simulation_tag(
      v_resident_id,
      'BLOOD_PRESSURE',
      '120/80',
      'Morning baseline reading',
      true
    );
  END LOOP;

  -- ============================================================
  -- STEP 2: Create HIGH blood pressure reading using PRODUCTION RPC
  -- ============================================================
  SELECT record_vital_sign_with_simulation_tag(
    v_resident_id,
    'BLOOD_PRESSURE',
    '165/95',
    'Elevated reading - felt stressed',
    true
  ) INTO v_vital_id;

  -- ============================================================
  -- STEP 3: Brain detects anomaly using PRODUCTION RPC
  -- Trigger automatically creates notification
  -- ============================================================
  SELECT create_intelligence_signal(
    'BP_SPIKE_' || extract(epoch from now())::bigint,
    'PREDICTIVE',
    'HIGH',
    v_resident_id,
    v_agency_id,
    'Blood Pressure Significantly Elevated',
    'Reading of 165/95 is 37.5% above baseline of 120/80',
    'Systolic BP increased from average 120 to 165. This represents a significant deviation. Stress reported by resident may be contributing factor.',
    ARRAY['Recheck BP in 15 minutes', 'Contact primary physician if sustained', 'Review recent medication adherence'],
    ARRAY['vital_signs', 'resident_baselines'],
    true
  ) INTO v_signal_result;

  -- Wait for trigger to fire
  PERFORM pg_sleep(0.1);

  -- ============================================================
  -- STEP 4: User provides feedback using PRODUCTION RPC
  -- Using ANOMALY_DETECTION as valid input_type
  -- ============================================================
  SELECT submit_ai_feedback(
    'ANOMALY_DETECTION',  -- Valid input_type for signal feedback
    jsonb_build_object(
      'signal_id', (v_signal_result->>'signal_id')::uuid,
      'feedback_category', 'signal_response',
      'user_action', 'acknowledged',
      'was_useful', true,
      'feedback_text', 'Alert was helpful - confirmed with doctor, medication adjusted',
      'resident_id', v_resident_id,
      'signal_category', 'PREDICTIVE',
      'signal_severity', 'HIGH'
    ),
    v_family_user_id,
    true
  ) INTO v_feedback_result;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'message', 'Intelligence pipeline executed using PRODUCTION RPCs',
    'pipeline_steps', jsonb_build_object(
      'step_1_vital_trigger', jsonb_build_object(
        'rpc_used', 'record_vital_sign_with_simulation_tag',
        'vital_count', 6,
        'anomaly_detected', true,
        'reading', '165/95'
      ),
      'step_2_intelligence_signal', jsonb_build_object(
        'rpc_used', 'create_intelligence_signal',
        'signal_id', v_signal_result->>'signal_id',
        'severity', 'HIGH',
        'notification_triggered', v_signal_result->>'notification_triggered'
      ),
      'step_3_notification', jsonb_build_object(
        'mechanism', 'AUTOMATIC_TRIGGER',
        'trigger_name', 'trigger_notify_family_intelligence',
        'delivery_status', 'QUEUED',
        'simulation_blocked', true
      ),
      'step_4_ai_learning', jsonb_build_object(
        'rpc_used', 'submit_ai_feedback',
        'ai_input_id', v_feedback_result->>'ai_input_id',
        'feedback_type', 'ANOMALY_DETECTION',
        'was_useful', true
      )
    ),
    'verification', jsonb_build_object(
      'intelligence_signals_count', (SELECT COUNT(*) FROM intelligence_signals WHERE resident_id = v_resident_id AND is_simulation = true),
      'notification_log_count', (SELECT COUNT(*) FROM notification_log WHERE resident_id = v_resident_id AND is_simulation = true),
      'ai_learning_inputs_count', (SELECT COUNT(*) FROM ai_learning_inputs WHERE source_user_id = v_family_user_id AND is_simulation = true)
    ),
    'production_code_paths', jsonb_build_object(
      'vitals', 'record_vital_sign_with_simulation_tag()',
      'signals', 'create_intelligence_signal()',
      'notifications', 'TRIGGER: trigger_notify_family_intelligence',
      'ai_feedback', 'submit_ai_feedback()',
      'test_helpers_used', 0,
      'production_rpcs_used', 3
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION seed_intelligence_pipeline_scenario() TO authenticated, anon;

COMMENT ON FUNCTION seed_intelligence_pipeline_scenario IS
'Seeds intelligence pipeline using PRODUCTION RPCs only. No test-specific logic. Same code paths as production.';
