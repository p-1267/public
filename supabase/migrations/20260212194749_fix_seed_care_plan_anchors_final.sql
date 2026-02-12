/*
  # Fix resident_care_plan_anchors columns

  Changes:
  - Use entered_by instead of created_by/last_updated_by
  - Add required sleep_patterns as jsonb
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
  v_admin_role_id uuid;
  v_supervisor_role_id uuid;
  v_caregiver_role_id uuid;
  v_family_role_id uuid;
  v_senior_role_id uuid;
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

  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'AGENCY_ADMIN' LIMIT 1;
  SELECT id INTO v_supervisor_role_id FROM roles WHERE name = 'SUPERVISOR' LIMIT 1;
  SELECT id INTO v_caregiver_role_id FROM roles WHERE name = 'CAREGIVER' LIMIT 1;
  SELECT id INTO v_family_role_id FROM roles WHERE name = 'FAMILY_ADMIN' LIMIT 1;
  SELECT id INTO v_senior_role_id FROM roles WHERE name = 'SENIOR' LIMIT 1;

  IF v_context.agency_id IS NOT NULL THEN
    INSERT INTO user_profiles (id, role_id, display_name, agency_id, is_active)
    VALUES 
      (gen_random_uuid(), v_admin_role_id, 'Agency Admin', v_context.agency_id, true),
      (gen_random_uuid(), v_supervisor_role_id, 'Supervisor Smith', v_context.agency_id, true),
      (gen_random_uuid(), v_caregiver_role_id, 'Caregiver Jones', v_context.agency_id, true)
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_admin_user_id FROM user_profiles WHERE display_name = 'Agency Admin' AND agency_id = v_context.agency_id LIMIT 1;
    SELECT id INTO v_supervisor_user_id FROM user_profiles WHERE display_name = 'Supervisor Smith' AND agency_id = v_context.agency_id LIMIT 1;
    SELECT id INTO v_caregiver_user_id FROM user_profiles WHERE display_name = 'Caregiver Jones' AND agency_id = v_context.agency_id LIMIT 1;
  END IF;

  INSERT INTO user_profiles (id, role_id, display_name, agency_id, is_active)
  VALUES 
    (gen_random_uuid(), v_family_role_id, 'Family Member', NULL, true),
    (gen_random_uuid(), v_senior_role_id, 'Senior Self', NULL, true)
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_family_user_id FROM user_profiles WHERE display_name = 'Family Member' LIMIT 1;
  SELECT id INTO v_senior_user_id FROM user_profiles WHERE display_name = 'Senior Self' LIMIT 1;

  IF v_context.agency_id IS NOT NULL THEN
    INSERT INTO departments (id, agency_id, name, department_code, description, status)
    VALUES
      (gen_random_uuid(), v_context.agency_id, 'Nursing', 'NURSING', 'Nursing department', 'active'),
      (gen_random_uuid(), v_context.agency_id, 'Kitchen', 'KITCHEN', 'Kitchen department', 'active'),
      (gen_random_uuid(), v_context.agency_id, 'Housekeeping', 'HOUSEKEEPING', 'Housekeeping department', 'active')
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_nursing_dept_id FROM departments WHERE agency_id = v_context.agency_id AND name = 'Nursing' LIMIT 1;
    SELECT id INTO v_kitchen_dept_id FROM departments WHERE agency_id = v_context.agency_id AND name = 'Kitchen' LIMIT 1;
    SELECT id INTO v_housekeeping_dept_id FROM departments WHERE agency_id = v_context.agency_id AND name = 'Housekeeping' LIMIT 1;

    INSERT INTO task_categories (id, agency_id, name, category_type, description)
    VALUES
      (gen_random_uuid(), v_context.agency_id, 'Medication Administration', 'CLINICAL', 'Medication tasks'),
      (gen_random_uuid(), v_context.agency_id, 'Meal Service', 'NUTRITION', 'Meal tasks'),
      (gen_random_uuid(), v_context.agency_id, 'Personal Hygiene', 'PERSONAL_CARE', 'Hygiene tasks')
    ON CONFLICT DO NOTHING;

    SELECT id INTO v_med_category_id FROM task_categories WHERE agency_id = v_context.agency_id AND name = 'Medication Administration' LIMIT 1;
    SELECT id INTO v_meal_category_id FROM task_categories WHERE agency_id = v_context.agency_id AND name = 'Meal Service' LIMIT 1;
    SELECT id INTO v_hygiene_category_id FROM task_categories WHERE agency_id = v_context.agency_id AND name = 'Personal Hygiene' LIMIT 1;

    INSERT INTO tasks (resident_id, agency_id, category_id, title, description, state, priority, risk_level, scheduled_for, department_id, owner_user_id)
    VALUES
      (v_resident.id, v_context.agency_id, v_med_category_id, 'Morning Medication', 'Administer morning meds', 'due', 'high', 'B', now() + interval '1 hour', v_nursing_dept_id, v_caregiver_user_id),
      (v_resident.id, v_context.agency_id, v_meal_category_id, 'Breakfast Service', 'Serve breakfast', 'in_progress', 'medium', 'C', now() + interval '30 minutes', v_kitchen_dept_id, v_caregiver_user_id),
      (v_resident.id, v_context.agency_id, v_hygiene_category_id, 'Morning Hygiene', 'Assist with hygiene', 'completed', 'medium', 'C', now() - interval '1 hour', v_nursing_dept_id, v_caregiver_user_id)
    ON CONFLICT DO NOTHING;

    FOR i IN 1..5 LOOP
      INSERT INTO observation_events (agency_id, resident_id, caregiver_id, event_type, event_subtype, event_data, observation_quality, event_timestamp)
      VALUES
        (v_context.agency_id, v_resident.id, v_caregiver_user_id, 'task_completion', 'medication', jsonb_build_object('task_type', 'medication', 'completed', true), 80 + i, now() - (i || ' hours')::interval)
      ON CONFLICT DO NOTHING;
    END LOOP;

    INSERT INTO intelligence_signals (agency_id, resident_id, signal_type, signal_category, severity, title, description, confidence_score, source_table, source_id, detected_at)
    VALUES
      (v_context.agency_id, v_resident.id, 'vital_deviation', 'health_monitoring', 'medium', 'Blood Pressure Elevated', 'Systolic BP trending upward', 85, 'health_metrics', gen_random_uuid(), now() - interval '2 hours'),
      (v_context.agency_id, v_resident.id, 'task_pattern', 'care_delivery', 'low', 'Medication Compliance Good', 'All medications taken on time', 90, 'tasks', gen_random_uuid(), now() - interval '1 hour')
    ON CONFLICT DO NOTHING;

    INSERT INTO risk_scores (agency_id, resident_id, risk_type, risk_level, score, factors, computed_at)
    VALUES
      (v_context.agency_id, v_resident.id, 'fall_risk', 'medium', 65, jsonb_build_object('mobility', 'walker_user', 'history', 'no_recent_falls'), now())
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO resident_medications (resident_id, medication_name, dosage, frequency, route, schedule, prescriber_name, start_date, is_active, entered_by)
  VALUES
    (v_resident.id, 'Lisinopril', '10mg', 'Once daily', 'ORAL', '{}'::jsonb, 'Dr. Smith', now() - interval '30 days', true, COALESCE(v_caregiver_user_id, v_admin_user_id, v_senior_user_id, v_family_user_id)),
    (v_resident.id, 'Metformin', '500mg', 'Twice daily', 'ORAL', '{}'::jsonb, 'Dr. Smith', now() - interval '30 days', true, COALESCE(v_caregiver_user_id, v_admin_user_id, v_senior_user_id, v_family_user_id))
  ON CONFLICT DO NOTHING;

  FOR i IN 1..5 LOOP
    INSERT INTO vital_signs (resident_id, vital_type, value, recorded_at, recorded_by)
    VALUES
      (v_resident.id, 'blood_pressure', (120 + i)::text, now() - (i || ' days')::interval, COALESCE(v_caregiver_user_id, v_senior_user_id)),
      (v_resident.id, 'heart_rate', (70 + i)::text, now() - (i || ' days')::interval, COALESCE(v_caregiver_user_id, v_senior_user_id))
    ON CONFLICT DO NOTHING;
  END LOOP;

  INSERT INTO health_metrics (resident_id, metric_type, metric_category, value_numeric, unit, measurement_source, data_source, confidence_level, recorded_at, synced_at)
  VALUES
    (v_resident.id, 'systolic_bp', 'BLOOD_PRESSURE', 125, 'mmHg', 'MANUAL_ENTRY', 'MANUAL_ENTRY', 'MEDIUM', now() - interval '1 day', now() - interval '1 day'),
    (v_resident.id, 'diastolic_bp', 'BLOOD_PRESSURE', 80, 'mmHg', 'MANUAL_ENTRY', 'MANUAL_ENTRY', 'MEDIUM', now() - interval '1 day', now() - interval '1 day'),
    (v_resident.id, 'heart_rate', 'CARDIOVASCULAR', 72, 'bpm', 'MANUAL_ENTRY', 'MANUAL_ENTRY', 'MEDIUM', now() - interval '1 day', now() - interval '1 day')
  ON CONFLICT DO NOTHING;

  INSERT INTO health_metric_trends (resident_id, metric_type, period, avg_value, min_value, max_value, sample_count, last_calculated_at, trend_direction)
  VALUES
    (v_resident.id, 'systolic_bp', 'DAY_7', 123.5, 120, 127, 5, now(), 'STABLE'),
    (v_resident.id, 'heart_rate', 'DAY_7', 71.8, 70, 74, 5, now(), 'STABLE')
  ON CONFLICT DO NOTHING;

  INSERT INTO appointments (resident_id, appointment_type, title, provider_name, scheduled_at, status, location, notes)
  VALUES
    (v_resident.id, 'FOLLOW_UP', 'Regular Checkup', 'Dr. Smith', now() + interval '7 days', 'SCHEDULED', 'Medical Center', 'Regular checkup'),
    (v_resident.id, 'SCREENING', 'Blood Work', 'Lab Services', now() + interval '14 days', 'SCHEDULED', 'Lab Center', 'Blood work')
  ON CONFLICT DO NOTHING;

  INSERT INTO resident_documents (resident_id, title, file_name, storage_path, uploaded_by, uploaded_at)
  VALUES
    (v_resident.id, 'Care Plan', 'care-plan.pdf', '/documents/care-plan.pdf', COALESCE(v_admin_user_id, v_caregiver_user_id, v_family_user_id, v_senior_user_id), now() - interval '30 days'),
    (v_resident.id, 'Medical History', 'medical-history.pdf', '/documents/medical-history.pdf', COALESCE(v_admin_user_id, v_caregiver_user_id, v_family_user_id, v_senior_user_id), now() - interval '60 days')
  ON CONFLICT DO NOTHING;

  INSERT INTO resident_care_plan_anchors (resident_id, care_frequency, dietary_restrictions, mobility_assistance_needs, sleep_patterns, language_context, entered_by)
  VALUES
    (v_resident.id, 'DAILY', ARRAY['Low sodium'], ARRAY['Walker assistance'], '{"bedtime": "21:00", "wake_time": "07:00"}'::jsonb, 'Care plan established', COALESCE(v_admin_user_id, v_caregiver_user_id, v_family_user_id, v_senior_user_id))
  ON CONFLICT DO NOTHING;

  INSERT INTO device_registry (device_id, resident_id, device_type, device_name, manufacturer, model, firmware_version, trust_state, pairing_actor)
  VALUES
    ('DEVICE001', v_resident.id, 'blood_pressure_monitor', 'BP Monitor', 'Omron', 'BP7200', '1.0.0', 'TRUSTED', COALESCE(v_caregiver_user_id, v_admin_user_id, v_senior_user_id))
  ON CONFLICT DO NOTHING;

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
    'management_mode', v_context.management_mode,
    'seeded_at', now()
  );
END;
$$;
