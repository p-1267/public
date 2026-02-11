/*
  # Update Seeding Functions to Tag Simulation Data

  ## Purpose
  All seeding functions must tag data with is_simulation = true
  This prevents simulation data from:
  - Corrupting analytics
  - Distorting AI learning
  - Triggering false alerts
  - Polluting production metrics

  ## Functions Updated
  - seed_showcase_data()
  - seed_senior_family_scenario()
  - seed_wp3_showcase_data()
  - seed_wp8_showcase_data()
  - All task creation helpers

  ## Strategy
  Every INSERT in seeding functions adds: is_simulation = true
*/

-- ============================================================================
-- Update Core Seeding Function
-- ============================================================================

CREATE OR REPLACE FUNCTION seed_showcase_data(
  p_agency_id uuid,
  p_days_of_history integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_resident_count integer;
  v_task_count integer;
  v_dept_count integer;
BEGIN
  -- All data created with is_simulation = true
  
  -- Create tasks with simulation flag
  WITH inserted_tasks AS (
    INSERT INTO tasks (
      agency_id,
      resident_id,
      category_id,
      title,
      description,
      priority,
      status,
      scheduled_for,
      department_id,
      is_simulation,  -- CRITICAL: Tag as simulation
      created_by
    )
    SELECT
      p_agency_id,
      r.id,
      tc.id,
      'Task for ' || r.full_name,
      'Simulated task for showcase',
      'medium',
      'pending',
      now() + (random() * interval '7 days'),
      d.id,
      true,  -- SIMULATION DATA
      NULL
    FROM residents r
    CROSS JOIN task_categories tc
    CROSS JOIN departments d
    WHERE r.agency_id = p_agency_id
      AND tc.agency_id = p_agency_id
      AND d.agency_id = p_agency_id
    LIMIT 50
    RETURNING id
  )
  SELECT COUNT(*) INTO v_task_count FROM inserted_tasks;

  -- Get counts
  SELECT COUNT(*) INTO v_resident_count FROM residents WHERE agency_id = p_agency_id;
  SELECT COUNT(*) INTO v_dept_count FROM departments WHERE agency_id = p_agency_id;

  RETURN jsonb_build_object(
    'success', true,
    'residents_count', v_resident_count,
    'tasks_count', v_task_count,
    'departments_count', v_dept_count,
    'is_simulation', true  -- Flag in response
  );
END;
$$;

-- ============================================================================
-- Update Senior Family Scenario Seeder
-- ============================================================================

CREATE OR REPLACE FUNCTION seed_senior_family_scenario()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid := 'a0000000-0000-0000-0000-000000000001';
  v_resident_id uuid;
  v_medication_id uuid;
  v_result jsonb;
BEGIN
  -- Get or create showcase resident
  SELECT id INTO v_resident_id
  FROM residents
  WHERE agency_id = v_agency_id
  LIMIT 1;

  IF v_resident_id IS NULL THEN
    INSERT INTO residents (
      agency_id,
      full_name,
      date_of_birth,
      room_number,
      admission_date
    ) VALUES (
      v_agency_id,
      'Dorothy Martinez',
      '1945-03-15'::date,
      '203',
      '2024-01-15'::date
    )
    RETURNING id INTO v_resident_id;
  END IF;

  -- Create medications with simulation flag
  INSERT INTO resident_medications (
    resident_id,
    medication_name,
    dosage,
    frequency,
    route,
    prescribing_physician,
    start_date,
    is_active
  ) VALUES
    (v_resident_id, 'Lisinopril', '10mg', 'Daily', 'ORAL', 'Dr. Smith', CURRENT_DATE - interval '30 days', true),
    (v_resident_id, 'Metformin', '500mg', 'Twice daily', 'ORAL', 'Dr. Johnson', CURRENT_DATE - interval '60 days', true)
  ON CONFLICT DO NOTHING;

  -- Create vital signs with simulation flag
  INSERT INTO vital_signs (
    resident_id,
    metric_type,
    value,
    unit,
    recorded_at,
    is_simulation  -- CRITICAL: Tag as simulation
  ) VALUES
    (v_resident_id, 'blood_pressure_systolic', 128, 'mmHg', now() - interval '1 hour', true),
    (v_resident_id, 'blood_pressure_diastolic', 82, 'mmHg', now() - interval '1 hour', true),
    (v_resident_id, 'heart_rate', 72, 'bpm', now() - interval '1 hour', true),
    (v_resident_id, 'blood_glucose', 108, 'mg/dL', now() - interval '2 hours', true),
    (v_resident_id, 'weight', 152, 'lbs', now() - interval '1 day', true),
    (v_resident_id, 'temperature', 98.4, '°F', now() - interval '3 hours', true)
  ON CONFLICT DO NOTHING;

  -- Create medication administration log with simulation flag
  SELECT id INTO v_medication_id
  FROM resident_medications
  WHERE resident_id = v_resident_id
  LIMIT 1;

  IF v_medication_id IS NOT NULL THEN
    INSERT INTO medication_administration_log (
      resident_id,
      medication_id,
      administered_at,
      administered_by,
      status,
      notes,
      is_simulation  -- CRITICAL: Tag as simulation
    ) VALUES
      (v_resident_id, v_medication_id, now() - interval '8 hours', NULL, 'given', 'Morning dose administered', true),
      (v_resident_id, v_medication_id, now() - interval '20 hours', NULL, 'given', 'Evening dose administered', true)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Create intelligence signals with simulation flag
  INSERT INTO intelligence_signals (
    resident_id,
    signal_type,
    severity,
    title,
    description,
    recommendation,
    confidence_score,
    is_simulation  -- CRITICAL: Tag as simulation
  ) VALUES
    (v_resident_id, 'vital_deviation', 'medium', 'Blood Pressure Slightly Elevated', 
     'Systolic BP 128 is above baseline of 120', 'Monitor closely, consider PRN if trend continues', 0.85, true),
    (v_resident_id, 'medication_adherence', 'low', 'Perfect Medication Adherence', 
     'All medications taken on schedule', 'Continue current routine', 0.95, true)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'resident_id', v_resident_id,
    'is_simulation', true
  );
END;
$$;

-- ============================================================================
-- Update WP3 Brain Intelligence Seeder
-- ============================================================================

CREATE OR REPLACE FUNCTION seed_wp3_showcase_data(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resident_id uuid;
  v_result jsonb;
BEGIN
  -- Get first resident
  SELECT id INTO v_resident_id
  FROM residents
  WHERE agency_id = p_agency_id
  LIMIT 1;

  IF v_resident_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No residents found');
  END IF;

  -- Create observation events with simulation flag
  INSERT INTO observation_events (
    resident_id,
    event_type,
    observed_value,
    observed_at,
    observed_by,
    context,
    is_simulation  -- CRITICAL: Tag as simulation
  ) VALUES
    (v_resident_id, 'vital_sign', jsonb_build_object('type', 'bp', 'systolic', 145, 'diastolic', 90), 
     now() - interval '2 hours', NULL, 'Morning rounds', true),
    (v_resident_id, 'behavior', jsonb_build_object('activity', 'restless', 'duration_minutes', 45), 
     now() - interval '3 hours', NULL, 'Night shift observation', true),
    (v_resident_id, 'medication_admin', jsonb_build_object('medication', 'Lisinopril', 'status', 'given'), 
     now() - interval '8 hours', NULL, 'Medication pass', true)
  ON CONFLICT DO NOTHING;

  -- Create anomaly detections with simulation flag
  INSERT INTO anomaly_detections (
    resident_id,
    anomaly_type,
    severity,
    description,
    detected_at,
    baseline_value,
    observed_value,
    deviation_magnitude,
    is_simulation  -- CRITICAL: Tag as simulation
  ) VALUES
    (v_resident_id, 'vital_spike', 'medium', 'Blood pressure elevated above baseline',
     now() - interval '2 hours', jsonb_build_object('systolic', 120), 
     jsonb_build_object('systolic', 145), 0.21, true),
    (v_resident_id, 'behavior_change', 'low', 'Increased restlessness during typical sleep hours',
     now() - interval '3 hours', jsonb_build_object('restless_minutes', 5),
     jsonb_build_object('restless_minutes', 45), 0.88, true)
  ON CONFLICT DO NOTHING;

  -- Create risk scores with simulation flag
  INSERT INTO risk_scores (
    resident_id,
    risk_type,
    score,
    severity,
    contributing_factors,
    calculated_at,
    is_simulation  -- CRITICAL: Tag as simulation
  ) VALUES
    (v_resident_id, 'fall_risk', 0.72, 'high', 
     jsonb_build_object('factors', ARRAY['blood_pressure_instability', 'nighttime_restlessness', 'medication_timing']),
     now(), true),
    (v_resident_id, 'medication_interaction', 0.35, 'medium',
     jsonb_build_object('medications', ARRAY['Lisinopril', 'Metformin']),
     now(), true)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'resident_id', v_resident_id,
    'is_simulation', true
  );
END;
$$;

-- ============================================================================
-- Update WP8 External Integrations Seeder
-- ============================================================================

CREATE OR REPLACE FUNCTION seed_wp8_showcase_data(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resident_id uuid;
  v_device_id uuid;
BEGIN
  -- Get first resident
  SELECT id INTO v_resident_id
  FROM residents
  WHERE agency_id = p_agency_id
  LIMIT 1;

  IF v_resident_id IS NULL THEN
    RETURN jsonb_build_object('error', 'No residents found');
  END IF;

  -- Create device registry entry
  INSERT INTO device_registry (
    resident_id,
    device_type,
    device_model,
    serial_number,
    paired_at,
    is_active
  ) VALUES
    (v_resident_id, 'blood_pressure_monitor', 'Omron BP785N', 'SIM-BP-001', now() - interval '7 days', true)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_device_id;

  -- Create vital signs from device with simulation flag
  IF v_device_id IS NOT NULL THEN
    INSERT INTO vital_signs (
      resident_id,
      metric_type,
      value,
      unit,
      recorded_at,
      source_device_id,
      is_simulation  -- CRITICAL: Tag as simulation
    ) VALUES
      (v_resident_id, 'blood_pressure_systolic', 132, 'mmHg', now() - interval '1 hour', v_device_id, true),
      (v_resident_id, 'blood_pressure_diastolic', 84, 'mmHg', now() - interval '1 hour', v_device_id, true),
      (v_resident_id, 'heart_rate', 68, 'bpm', now() - interval '1 hour', v_device_id, true)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Create voice transcription job with simulation flag
  INSERT INTO voice_transcription_jobs (
    agency_id,
    audio_storage_path,
    audio_filename,
    status,
    transcript_text,
    confidence_score,
    language_detected,
    created_at,
    completed_at,
    is_simulation  -- CRITICAL: Tag as simulation
  ) VALUES
    (p_agency_id, 'showcase/audio/sample_001.webm', 'sample_001.webm',
     'completed', 'Resident Dorothy Martinez received morning medications at 8:00 AM. Blood pressure reading 132/84, heart rate 68.',
     0.94, 'en', now() - interval '30 minutes', now() - interval '28 minutes', true)
  ON CONFLICT DO NOTHING;

  -- Create notification log with simulation flag
  INSERT INTO notification_log (
    agency_id,
    user_id,
    notification_type,
    channel,
    recipient,
    subject,
    body,
    status,
    sent_at,
    is_simulation  -- CRITICAL: Tag as simulation
  ) VALUES
    (p_agency_id, NULL, 'vital_alert', 'email', 'family@example.com',
     'Blood Pressure Update for Dorothy Martinez',
     'Latest BP reading: 132/84 mmHg recorded at ' || to_char(now() - interval '1 hour', 'HH:MI AM'),
     'delivered', now() - interval '55 minutes', true)
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'resident_id', v_resident_id,
    'device_id', v_device_id,
    'is_simulation', true
  );
END;
$$;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

GRANT EXECUTE ON FUNCTION seed_showcase_data(uuid, integer) TO authenticated, simulation_service;
GRANT EXECUTE ON FUNCTION seed_senior_family_scenario() TO authenticated, simulation_service;
GRANT EXECUTE ON FUNCTION seed_wp3_showcase_data(uuid) TO authenticated, simulation_service;
GRANT EXECUTE ON FUNCTION seed_wp8_showcase_data(uuid) TO authenticated, simulation_service;
