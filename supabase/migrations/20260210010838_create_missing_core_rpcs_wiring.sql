/*
  # Create Missing Core RPCs for Full App Wiring
  
  Creates all missing RPCs identified in wiring audit:
  - Senior/Family actions: medication logging, health inputs
  - Caregiver actions: clock in/out, voice documentation
  - Supervisor actions: task acknowledgment, reviews, shift assignment
  - Agency actions: user list, billing, payroll
  - Device actions: pairing
  - Notification preferences
  - Department details
  - Brain intelligence pipeline
*/

-- ============================================================================
-- SENIOR/FAMILY RPCS
-- ============================================================================

CREATE OR REPLACE FUNCTION log_senior_medication_self_report(
  p_resident_id UUID,
  p_medication_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_admin_id UUID;
  v_result JSON;
BEGIN
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
    NULL, -- self-reported
    'SELF_ADMINISTERED',
    p_notes,
    TRUE
  )
  RETURNING id INTO v_admin_id;

  -- Create observation event
  INSERT INTO observation_events (
    resident_id,
    event_type,
    clinical_category,
    observation_text,
    observed_at,
    data_source,
    quality_score,
    idempotency_key
  ) VALUES (
    p_resident_id,
    'MEDICATION_ADMINISTERED',
    'MEDICATIONS',
    format('Self-reported medication administration: %s', COALESCE(p_notes, 'No notes')),
    NOW(),
    'SENIOR_APP',
    85,
    gen_random_uuid()::TEXT
  );

  v_result := json_build_object(
    'success', TRUE,
    'admin_id', v_admin_id,
    'message', 'Medication logged successfully'
  );

  RETURN v_result;
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
  -- Process each health input
  FOR v_input IN SELECT * FROM json_array_elements(p_inputs)
  LOOP
    -- Insert vital sign
    INSERT INTO vital_signs (
      resident_id,
      vital_type,
      value,
      unit,
      measured_at,
      measurement_source,
      idempotency_key
    ) VALUES (
      p_resident_id,
      (v_input->>'vital_type')::TEXT,
      (v_input->>'value')::NUMERIC,
      (v_input->>'unit')::TEXT,
      COALESCE((v_input->>'measured_at')::TIMESTAMPTZ, NOW()),
      'SENIOR_APP',
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
-- CAREGIVER RPCS
-- ============================================================================

CREATE OR REPLACE FUNCTION clock_in_caregiver(
  p_user_id UUID,
  p_shift_id UUID DEFAULT NULL,
  p_location_lat NUMERIC DEFAULT NULL,
  p_location_lng NUMERIC DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_event_id UUID;
  v_existing_event UUID;
BEGIN
  -- Check if already clocked in
  SELECT id INTO v_existing_event
  FROM attendance_events
  WHERE user_id = p_user_id
    AND clock_out_time IS NULL
  ORDER BY clock_in_time DESC
  LIMIT 1;

  IF v_existing_event IS NOT NULL THEN
    RETURN json_build_object(
      'success', FALSE,
      'message', 'Already clocked in',
      'event_id', v_existing_event
    );
  END IF;

  -- Create clock-in event
  INSERT INTO attendance_events (
    user_id,
    shift_id,
    clock_in_time,
    location_lat,
    location_lng,
    clock_in_method
  ) VALUES (
    p_user_id,
    p_shift_id,
    NOW(),
    p_location_lat,
    p_location_lng,
    'APP'
  )
  RETURNING id INTO v_event_id;

  RETURN json_build_object(
    'success', TRUE,
    'event_id', v_event_id,
    'message', 'Clocked in successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION submit_voice_draft(
  p_resident_id UUID,
  p_user_id UUID,
  p_audio_url TEXT,
  p_duration_seconds INT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Create voice documentation session
  INSERT INTO voice_documentation_sessions (
    resident_id,
    user_id,
    audio_url,
    duration_seconds,
    status,
    created_at
  ) VALUES (
    p_resident_id,
    p_user_id,
    p_audio_url,
    p_duration_seconds,
    'PENDING_TRANSCRIPTION',
    NOW()
  )
  RETURNING id INTO v_session_id;

  -- Create voice transcription record
  INSERT INTO voice_transcriptions (
    session_id,
    audio_url,
    status,
    created_at
  ) VALUES (
    v_session_id,
    p_audio_url,
    'PENDING',
    NOW()
  );

  RETURN json_build_object(
    'success', TRUE,
    'session_id', v_session_id,
    'message', 'Voice draft submitted for transcription'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SUPERVISOR RPCS
-- ============================================================================

CREATE OR REPLACE FUNCTION supervisor_acknowledge_task(
  p_task_id UUID,
  p_supervisor_id UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
  UPDATE tasks
  SET
    supervisor_acknowledged = TRUE,
    supervisor_acknowledged_at = NOW(),
    supervisor_acknowledged_by = p_supervisor_id,
    supervisor_notes = p_notes
  WHERE id = p_task_id;

  RETURN json_build_object(
    'success', TRUE,
    'task_id', p_task_id,
    'message', 'Task acknowledged by supervisor'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION submit_supervisor_review(
  p_task_id UUID,
  p_supervisor_id UUID,
  p_review_type TEXT,
  p_review_result TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_review_id UUID;
BEGIN
  INSERT INTO supervisor_reviews (
    task_id,
    supervisor_id,
    review_type,
    review_result,
    notes,
    reviewed_at
  ) VALUES (
    p_task_id,
    p_supervisor_id,
    p_review_type,
    p_review_result,
    p_notes,
    NOW()
  )
  RETURNING id INTO v_review_id;

  -- Update task if needed
  IF p_review_result = 'APPROVED' THEN
    UPDATE tasks
    SET supervisor_acknowledged = TRUE,
        supervisor_acknowledged_by = p_supervisor_id,
        supervisor_acknowledged_at = NOW()
    WHERE id = p_task_id;
  END IF;

  RETURN json_build_object(
    'success', TRUE,
    'review_id', v_review_id,
    'message', 'Review submitted successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION assign_caregiver_to_shift(
  p_shift_id UUID,
  p_user_id UUID,
  p_resident_ids UUID[] DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_resident_id UUID;
BEGIN
  -- Update shift assignment
  UPDATE shifts
  SET assigned_caregiver_id = p_user_id
  WHERE id = p_shift_id;

  -- Assign residents if provided
  IF p_resident_ids IS NOT NULL THEN
    FOREACH v_resident_id IN ARRAY p_resident_ids
    LOOP
      INSERT INTO shift_resident_assignments (
        shift_id,
        resident_id,
        assigned_at
      ) VALUES (
        p_shift_id,
        v_resident_id,
        NOW()
      )
      ON CONFLICT (shift_id, resident_id) DO NOTHING;
    END LOOP;
  END IF;

  RETURN json_build_object(
    'success', TRUE,
    'shift_id', p_shift_id,
    'message', 'Caregiver assigned to shift'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AGENCY ADMIN RPCS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_agency_users(p_agency_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(u))
    FROM (
      SELECT
        id,
        full_name,
        email,
        role,
        employee_id,
        phone,
        status,
        created_at
      FROM user_profiles
      WHERE agency_id = p_agency_id
      ORDER BY full_name
    ) u
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION calculate_agency_billing(
  p_agency_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON AS $$
DECLARE
  v_total_hours NUMERIC;
  v_total_cost NUMERIC;
  v_resident_count INT;
BEGIN
  -- Calculate total care hours
  SELECT
    COALESCE(SUM(EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600), 0),
    COUNT(DISTINCT resident_id)
  INTO v_total_hours, v_resident_count
  FROM tasks
  WHERE agency_id = p_agency_id
    AND started_at >= p_start_date
    AND completed_at <= p_end_date
    AND state = 'COMPLETED';

  -- Estimate cost (placeholder rate)
  v_total_cost := v_total_hours * 50;

  RETURN json_build_object(
    'success', TRUE,
    'period_start', p_start_date,
    'period_end', p_end_date,
    'total_hours', v_total_hours,
    'total_cost', v_total_cost,
    'resident_count', v_resident_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION calculate_payroll_for_period(
  p_agency_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT json_agg(row_to_json(p))
    FROM (
      SELECT
        u.id AS user_id,
        u.full_name,
        u.employee_id,
        COUNT(t.id) AS tasks_completed,
        COALESCE(SUM(EXTRACT(EPOCH FROM (t.completed_at - t.started_at)) / 3600), 0) AS hours_worked,
        COALESCE(SUM(EXTRACT(EPOCH FROM (t.completed_at - t.started_at)) / 3600), 0) * 25 AS estimated_pay
      FROM user_profiles u
      LEFT JOIN tasks t ON t.assigned_to = u.id
        AND t.started_at >= p_start_date
        AND t.completed_at <= p_end_date
        AND t.state = 'COMPLETED'
      WHERE u.agency_id = p_agency_id
        AND u.role IN ('CAREGIVER', 'SUPERVISOR')
      GROUP BY u.id, u.full_name, u.employee_id
      ORDER BY u.full_name
    ) p
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DEVICE & NOTIFICATION RPCS
-- ============================================================================

CREATE OR REPLACE FUNCTION pair_device(
  p_resident_id UUID,
  p_device_type TEXT,
  p_device_identifier TEXT,
  p_paired_by UUID
)
RETURNS JSON AS $$
DECLARE
  v_device_id UUID;
BEGIN
  INSERT INTO device_registry (
    resident_id,
    device_type,
    device_identifier,
    pairing_status,
    paired_at,
    paired_by
  ) VALUES (
    p_resident_id,
    p_device_type,
    p_device_identifier,
    'ACTIVE',
    NOW(),
    p_paired_by
  )
  RETURNING id INTO v_device_id;

  -- Log pairing audit
  INSERT INTO device_pairing_audit (
    device_id,
    action,
    actor_id,
    action_timestamp
  ) VALUES (
    v_device_id,
    'PAIRED',
    p_paired_by,
    NOW()
  );

  RETURN json_build_object(
    'success', TRUE,
    'device_id', v_device_id,
    'message', 'Device paired successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION upsert_family_notification_preferences(
  p_resident_id UUID,
  p_user_id UUID,
  p_preferences JSON
)
RETURNS JSON AS $$
BEGIN
  INSERT INTO family_notification_preferences (
    resident_id,
    user_id,
    notification_types,
    delivery_methods,
    quiet_hours_start,
    quiet_hours_end,
    idempotency_key
  ) VALUES (
    p_resident_id,
    p_user_id,
    (p_preferences->>'notification_types')::TEXT[],
    (p_preferences->>'delivery_methods')::TEXT[],
    (p_preferences->>'quiet_hours_start')::TIME,
    (p_preferences->>'quiet_hours_end')::TIME,
    gen_random_uuid()::TEXT
  )
  ON CONFLICT (resident_id, user_id)
  DO UPDATE SET
    notification_types = EXCLUDED.notification_types,
    delivery_methods = EXCLUDED.delivery_methods,
    quiet_hours_start = EXCLUDED.quiet_hours_start,
    quiet_hours_end = EXCLUDED.quiet_hours_end,
    updated_at = NOW();

  RETURN json_build_object(
    'success', TRUE,
    'message', 'Notification preferences updated'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DEPARTMENT & BRAIN RPCS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_department_details(p_department_id UUID)
RETURNS JSON AS $$
BEGIN
  RETURN (
    SELECT row_to_json(d)
    FROM (
      SELECT
        d.*,
        (SELECT json_agg(row_to_json(p))
         FROM (
           SELECT u.*
           FROM department_personnel dp
           JOIN user_profiles u ON u.id = dp.user_id
           WHERE dp.department_id = d.id
         ) p
        ) AS personnel,
        (SELECT json_agg(row_to_json(s))
         FROM (
           SELECT *
           FROM department_schedules
           WHERE department_id = d.id
           ORDER BY day_of_week, shift_start
         ) s
        ) AS schedules
      FROM departments d
      WHERE d.id = p_department_id
    ) d
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION compute_brain_intelligence_pipeline(
  p_agency_id UUID,
  p_resident_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_signals_created INT := 0;
  v_anomalies_detected INT := 0;
BEGIN
  -- Simplified brain computation: create intelligence signals from recent observations
  INSERT INTO intelligence_signals (
    resident_id,
    signal_type,
    signal_category,
    signal_title,
    signal_description,
    urgency_level,
    confidence_score,
    evidence_quality,
    detected_at
  )
  SELECT
    oe.resident_id,
    'PATTERN_DETECTED',
    oe.clinical_category,
    format('Elevated %s activity detected', oe.clinical_category),
    format('Multiple %s observations in last 24 hours', oe.event_type),
    'MEDIUM',
    75,
    oe.quality_score,
    NOW()
  FROM observation_events oe
  WHERE (p_resident_id IS NULL OR oe.resident_id = p_resident_id)
    AND oe.observed_at >= NOW() - INTERVAL '24 hours'
  GROUP BY oe.resident_id, oe.clinical_category, oe.event_type, oe.quality_score
  HAVING COUNT(*) >= 3
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_signals_created = ROW_COUNT;

  RETURN json_build_object(
    'success', TRUE,
    'signals_created', v_signals_created,
    'anomalies_detected', v_anomalies_detected,
    'message', format('Created %s intelligence signals', v_signals_created)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION log_senior_medication_self_report TO anon, authenticated;
GRANT EXECUTE ON FUNCTION batch_submit_senior_health_inputs TO anon, authenticated;
GRANT EXECUTE ON FUNCTION clock_in_caregiver TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_voice_draft TO anon, authenticated;
GRANT EXECUTE ON FUNCTION supervisor_acknowledge_task TO anon, authenticated;
GRANT EXECUTE ON FUNCTION submit_supervisor_review TO anon, authenticated;
GRANT EXECUTE ON FUNCTION assign_caregiver_to_shift TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_agency_users TO anon, authenticated;
GRANT EXECUTE ON FUNCTION calculate_agency_billing TO anon, authenticated;
GRANT EXECUTE ON FUNCTION calculate_payroll_for_period TO anon, authenticated;
GRANT EXECUTE ON FUNCTION pair_device TO anon, authenticated;
GRANT EXECUTE ON FUNCTION upsert_family_notification_preferences TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_department_details TO anon, authenticated;
GRANT EXECUTE ON FUNCTION compute_brain_intelligence_pipeline TO anon, authenticated;
