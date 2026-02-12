/*
  # Fix observation_events INSERT schema

  Changes observation_events INSERT to match actual schema:
  - Use observation_quality instead of quality_score
  - Add required agency_id field
  - Add required event_subtype field
  - Use event_timestamp instead of captured_at
  - Use caregiver_id instead of captured_by
*/

CREATE OR REPLACE FUNCTION seed_active_context(p_care_context_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_context RECORD;
  v_resident RECORD;
  v_admin_user_id uuid;
  v_supervisor_user_id uuid;
  v_caregiver_user_id uuid;
  v_family_user_id uuid;
  v_senior_user_id uuid;
  v_nursing_dept_id uuid;
  v_kitchen_dept_id uuid;
  v_housekeeping_dept_id uuid;
  v_med_category_id uuid;
  v_meal_category_id uuid;
  v_hygiene_category_id uuid;
  i integer;
BEGIN
  SELECT * INTO v_context FROM care_contexts WHERE id = p_care_context_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'care_context_not_found');
  END IF;

  SELECT * INTO v_resident FROM residents WHERE id = v_context.resident_id;

  -- Create user profiles
  INSERT INTO user_profiles (id, email, full_name, agency_id, phone_number, employee_id, emergency_contact_name, emergency_contact_phone)
  VALUES 
    (gen_random_uuid(), 'admin@agency.com', 'Agency Admin', v_context.agency_id, '555-0001', 'EMP001', 'Emergency Contact', '555-9999'),
    (gen_random_uuid(), 'supervisor@agency.com', 'Supervisor Smith', v_context.agency_id, '555-0002', 'EMP002', 'Emergency Contact', '555-9999'),
    (gen_random_uuid(), 'caregiver@agency.com', 'Caregiver Jones', v_context.agency_id, '555-0003', 'EMP003', 'Emergency Contact', '555-9999'),
    (gen_random_uuid(), 'family@example.com', 'Family Member', NULL, '555-0004', NULL, NULL, NULL),
    (gen_random_uuid(), 'senior@example.com', 'Senior Self', NULL, '555-0005', NULL, NULL, NULL)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_admin_user_id;

  SELECT id INTO v_admin_user_id FROM user_profiles WHERE email = 'admin@agency.com' LIMIT 1;
  SELECT id INTO v_supervisor_user_id FROM user_profiles WHERE email = 'supervisor@agency.com' LIMIT 1;
  SELECT id INTO v_caregiver_user_id FROM user_profiles WHERE email = 'caregiver@agency.com' LIMIT 1;
  SELECT id INTO v_family_user_id FROM user_profiles WHERE email = 'family@example.com' LIMIT 1;
  SELECT id INTO v_senior_user_id FROM user_profiles WHERE email = 'senior@example.com' LIMIT 1;

  -- Create departments
  INSERT INTO departments (id, agency_id, name, description, is_active)
  VALUES
    (gen_random_uuid(), v_context.agency_id, 'Nursing', 'Nursing department', true),
    (gen_random_uuid(), v_context.agency_id, 'Kitchen', 'Kitchen department', true),
    (gen_random_uuid(), v_context.agency_id, 'Housekeeping', 'Housekeeping department', true)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_nursing_dept_id FROM departments WHERE agency_id = v_context.agency_id AND name = 'Nursing' LIMIT 1;
  SELECT id INTO v_kitchen_dept_id FROM departments WHERE agency_id = v_context.agency_id AND name = 'Kitchen' LIMIT 1;
  SELECT id INTO v_housekeeping_dept_id FROM departments WHERE agency_id = v_context.agency_id AND name = 'Housekeeping' LIMIT 1;

  -- Create task categories
  INSERT INTO task_categories (id, agency_id, name, description, department_id)
  VALUES
    (gen_random_uuid(), v_context.agency_id, 'Medication Administration', 'Medication tasks', v_nursing_dept_id),
    (gen_random_uuid(), v_context.agency_id, 'Meal Service', 'Meal tasks', v_kitchen_dept_id),
    (gen_random_uuid(), v_context.agency_id, 'Personal Hygiene', 'Hygiene tasks', v_nursing_dept_id)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_med_category_id FROM task_categories WHERE agency_id = v_context.agency_id AND name = 'Medication Administration' LIMIT 1;
  SELECT id INTO v_meal_category_id FROM task_categories WHERE agency_id = v_context.agency_id AND name = 'Meal Service' LIMIT 1;
  SELECT id INTO v_hygiene_category_id FROM task_categories WHERE agency_id = v_context.agency_id AND name = 'Personal Hygiene' LIMIT 1;

  -- Create tasks
  INSERT INTO tasks (resident_id, agency_id, category_id, title, description, state, priority, risk_level, scheduled_for, department_id, owner_user_id)
  VALUES
    (v_resident.id, v_context.agency_id, v_med_category_id, 'Morning Medication', 'Administer morning meds', 'due', 'high', 'B', now() + interval '1 hour', v_nursing_dept_id, v_caregiver_user_id),
    (v_resident.id, v_context.agency_id, v_meal_category_id, 'Breakfast Service', 'Serve breakfast', 'in_progress', 'medium', 'C', now() + interval '30 minutes', v_kitchen_dept_id, v_caregiver_user_id),
    (v_resident.id, v_context.agency_id, v_hygiene_category_id, 'Morning Hygiene', 'Assist with hygiene', 'completed', 'medium', 'C', now() - interval '1 hour', v_nursing_dept_id, v_caregiver_user_id),
    (v_resident.id, v_context.agency_id, v_med_category_id, 'Afternoon Medication', 'Administer afternoon meds', 'due', 'high', 'B', now() + interval '4 hours', v_nursing_dept_id, v_caregiver_user_id),
    (v_resident.id, v_context.agency_id, v_meal_category_id, 'Lunch Service', 'Serve lunch', 'due', 'medium', 'C', now() + interval '3 hours', v_kitchen_dept_id, v_caregiver_user_id)
  ON CONFLICT DO NOTHING;

  -- Create medications
  INSERT INTO resident_medications (resident_id, medication_name, dosage, frequency, route, prescribing_physician, start_date, is_active, entered_by)
  VALUES
    (v_resident.id, 'Lisinopril', '10mg', 'Once daily', 'ORAL', 'Dr. Smith', now() - interval '30 days', true, COALESCE(v_caregiver_user_id, v_admin_user_id, v_senior_user_id, v_family_user_id)),
    (v_resident.id, 'Metformin', '500mg', 'Twice daily', 'ORAL', 'Dr. Smith', now() - interval '30 days', true, COALESCE(v_caregiver_user_id, v_admin_user_id, v_senior_user_id, v_family_user_id))
  ON CONFLICT DO NOTHING;

  -- Create vital signs
  FOR i IN 1..5 LOOP
    INSERT INTO vital_signs (resident_id, vital_type, value, unit, measured_at, measured_by, device_id)
    VALUES
      (v_resident.id, 'blood_pressure', 120 + i, 'mmHg', now() - (i || ' days')::interval, COALESCE(v_caregiver_user_id, v_senior_user_id), NULL),
      (v_resident.id, 'heart_rate', 70 + i, 'bpm', now() - (i || ' days')::interval, COALESCE(v_caregiver_user_id, v_senior_user_id), NULL)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Create health metrics
  INSERT INTO health_metrics (resident_id, metric_type, metric_category, value, unit, measurement_source, data_source, confidence_level, recorded_at)
  VALUES
    (v_resident.id, 'systolic_bp', 'BLOOD_PRESSURE', 125, 'mmHg', 'MANUAL_ENTRY', 'MANUAL_ENTRY', 'MEDIUM', now() - interval '1 day'),
    (v_resident.id, 'diastolic_bp', 'BLOOD_PRESSURE', 80, 'mmHg', 'MANUAL_ENTRY', 'MANUAL_ENTRY', 'MEDIUM', now() - interval '1 day'),
    (v_resident.id, 'heart_rate', 'CARDIOVASCULAR', 72, 'bpm', 'MANUAL_ENTRY', 'MANUAL_ENTRY', 'MEDIUM', now() - interval '1 day'),
    (v_resident.id, 'weight', 'BLOOD_PRESSURE', 150, 'lbs', 'MANUAL_ENTRY', 'MANUAL_ENTRY', 'MEDIUM', now() - interval '2 days'),
    (v_resident.id, 'temperature', 'CARDIOVASCULAR', 98.6, 'F', 'MANUAL_ENTRY', 'MANUAL_ENTRY', 'MEDIUM', now() - interval '1 day')
  ON CONFLICT DO NOTHING;

  -- Create health metric trends
  INSERT INTO health_metric_trends (resident_id, metric_type, period, avg_value, min_value, max_value, sample_count, last_calculated_at, trend_direction)
  VALUES
    (v_resident.id, 'systolic_bp', 'DAY_7', 123.5, 120, 127, 5, now(), 'stable'),
    (v_resident.id, 'heart_rate', 'DAY_7', 71.8, 70, 74, 5, now(), 'stable')
  ON CONFLICT DO NOTHING;

  -- Create appointments
  INSERT INTO appointments (resident_id, appointment_type, provider_name, scheduled_at, status, location, notes)
  VALUES
    (v_resident.id, 'FOLLOW_UP', 'Dr. Smith', now() + interval '7 days', 'SCHEDULED', 'Medical Center', 'Regular checkup'),
    (v_resident.id, 'LAB_WORK', 'Lab Services', now() + interval '14 days', 'SCHEDULED', 'Lab Center', 'Blood work')
  ON CONFLICT DO NOTHING;

  -- Create documents
  INSERT INTO resident_documents (resident_id, document_type, file_name, file_url, uploaded_by, uploaded_at)
  VALUES
    (v_resident.id, 'care_plan', 'care-plan.pdf', 'https://example.com/care-plan.pdf', COALESCE(v_admin_user_id, v_caregiver_user_id), now() - interval '30 days'),
    (v_resident.id, 'medical_history', 'medical-history.pdf', 'https://example.com/medical-history.pdf', COALESCE(v_admin_user_id, v_caregiver_user_id), now() - interval '60 days')
  ON CONFLICT DO NOTHING;

  -- Create care plan
  INSERT INTO resident_care_plan_anchors (resident_id, care_frequency, dietary_restrictions, mobility_assistance_needs, language_context, created_by, last_updated_by)
  VALUES
    (v_resident.id, 'DAILY', ARRAY['Low sodium'], ARRAY['Walker assistance'], 'Care plan established', COALESCE(v_admin_user_id, v_caregiver_user_id), COALESCE(v_admin_user_id, v_caregiver_user_id))
  ON CONFLICT DO NOTHING;

  -- Create device
  INSERT INTO device_registry (device_id, resident_id, device_type, device_name, manufacturer, model, firmware_version, trust_state, pairing_actor)
  VALUES
    ('DEVICE001', v_resident.id, 'blood_pressure_monitor', 'BP Monitor', 'Omron', 'BP7200', '1.0.0', 'TRUSTED', COALESCE(v_caregiver_user_id, v_admin_user_id))
  ON CONFLICT DO NOTHING;

  -- Create observation events (intelligence pipeline input)
  FOR i IN 1..5 LOOP
    INSERT INTO observation_events (agency_id, resident_id, caregiver_id, event_type, event_subtype, event_data, observation_quality, event_timestamp)
    VALUES
      (v_context.agency_id, v_resident.id, v_caregiver_user_id, 'task_completion', 'medication', jsonb_build_object('task_type', 'medication', 'completed', true), 80 + i, now() - (i || ' hours')::interval)
    ON CONFLICT DO NOTHING;
  END LOOP;

  -- Create intelligence signals
  INSERT INTO intelligence_signals (agency_id, resident_id, signal_type, signal_category, severity, title, description, confidence_score, source_table, source_id, detected_at)
  VALUES
    (v_context.agency_id, v_resident.id, 'vital_deviation', 'health_monitoring', 'medium', 'Blood Pressure Elevated', 'Systolic BP trending upward', 85, 'health_metrics', gen_random_uuid(), now() - interval '2 hours'),
    (v_context.agency_id, v_resident.id, 'task_pattern', 'care_delivery', 'low', 'Medication Compliance Good', 'All medications taken on time', 90, 'tasks', gen_random_uuid(), now() - interval '1 hour')
  ON CONFLICT DO NOTHING;

  -- Create risk scores
  INSERT INTO risk_scores (agency_id, resident_id, risk_type, risk_level, score, factors, computed_at)
  VALUES
    (v_context.agency_id, v_resident.id, 'fall_risk', 'medium', 65, jsonb_build_object('mobility', 'walker_user', 'history', 'no_recent_falls'), now())
  ON CONFLICT DO NOTHING;

  -- Create notifications
  INSERT INTO notification_log (user_id, notification_type, title, message, priority, status, created_at)
  VALUES
    (COALESCE(v_family_user_id, v_senior_user_id, v_admin_user_id), 'health_alert', 'Blood Pressure Update', 'Recent BP reading shows elevation', 'medium', 'delivered', now() - interval '3 hours'),
    (COALESCE(v_family_user_id, v_senior_user_id, v_admin_user_id), 'care_update', 'Medication Completed', 'Morning medication administered', 'low', 'delivered', now() - interval '2 hours'),
    (COALESCE(v_family_user_id, v_senior_user_id, v_admin_user_id), 'appointment_reminder', 'Upcoming Appointment', 'Checkup scheduled in 7 days', 'medium', 'delivered', now() - interval '1 hour')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'care_context_id', p_care_context_id,
    'resident_id', v_resident.id,
    'agency_id', v_context.agency_id,
    'seeded_at', now()
  );
END;
$$;
