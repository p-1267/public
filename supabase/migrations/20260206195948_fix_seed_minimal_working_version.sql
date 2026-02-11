/*
  # Minimal Working Seed Function

  ## Fix
  - Remove emergency_contacts (schema mismatch)
  - Focus on critical data for UI testing
  - All schema constraints verified
*/

CREATE OR REPLACE FUNCTION seed_senior_family_scenario()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
  v_senior_user_id uuid;
  v_family_user_id uuid;
  v_caregiver1_id uuid;
  v_caregiver2_id uuid;
  v_supervisor_id uuid;
  v_resident_id uuid;
  v_senior_role_id uuid;
  v_family_role_id uuid;
  v_caregiver_role_id uuid;
  v_supervisor_role_id uuid;
  v_device_id uuid;
  v_dept_nursing_id uuid;
  v_dept_housekeeping_id uuid;
  v_dept_dietary_id uuid;
  v_category_medication_id uuid;
  v_category_vitals_id uuid;
  v_category_meal_id uuid;
  v_category_cleaning_id uuid;
  v_category_safety_id uuid;
  i int;
  v_timestamp timestamptz;
  v_systolic int;
  v_diastolic int;
BEGIN
  SELECT id INTO v_senior_role_id FROM roles WHERE name = 'SENIOR' LIMIT 1;
  SELECT id INTO v_family_role_id FROM roles WHERE name = 'FAMILY_ADMIN' LIMIT 1;
  SELECT id INTO v_caregiver_role_id FROM roles WHERE name = 'CAREGIVER' LIMIT 1;
  SELECT id INTO v_supervisor_role_id FROM roles WHERE name = 'SUPERVISOR' LIMIT 1;

  v_agency_id := '00000000-0000-0000-0000-999999999999'::uuid;
  v_senior_user_id := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_family_user_id := 'a0000000-0000-0000-0000-000000000002'::uuid;
  v_caregiver1_id := 'a0000000-0000-0000-0000-000000000003'::uuid;
  v_caregiver2_id := 'a0000000-0000-0000-0000-000000000004'::uuid;
  v_supervisor_id := 'a0000000-0000-0000-0000-000000000005'::uuid;
  v_resident_id := 'b0000000-0000-0000-0000-000000000001'::uuid;

  v_dept_nursing_id := 'd0000000-0000-0000-0000-999999999901'::uuid;
  v_dept_housekeeping_id := 'd0000000-0000-0000-0000-999999999902'::uuid;
  v_dept_dietary_id := 'd0000000-0000-0000-0000-999999999903'::uuid;

  -- Agency
  INSERT INTO agencies (id, name, status)
  VALUES (v_agency_id, 'Showcase Independent Living', 'active')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  -- Users
  INSERT INTO user_profiles (id, role_id, display_name, is_active, agency_id)
  VALUES
    (v_supervisor_id, v_supervisor_role_id, 'Sarah Johnson', true, v_agency_id),
    (v_caregiver1_id, v_caregiver_role_id, 'Maria Garcia', true, v_agency_id),
    (v_caregiver2_id, v_caregiver_role_id, 'James Chen', true, v_agency_id),
    (v_senior_user_id, v_senior_role_id, 'Dorothy Miller', true, NULL),
    (v_family_user_id, v_family_role_id, 'Robert Miller', true, NULL)
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name, agency_id = EXCLUDED.agency_id;

  -- Resident
  INSERT INTO residents (id, agency_id, full_name, date_of_birth, status, metadata)
  VALUES (
    v_resident_id, v_agency_id, 'Dorothy Miller', '1946-03-15', 'active',
    '{"room": "A-101", "care_level": "INDEPENDENT"}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  -- Links
  INSERT INTO senior_resident_links (senior_user_id, resident_id)
  VALUES (v_senior_user_id, v_resident_id)
  ON CONFLICT (senior_user_id, resident_id) DO NOTHING;

  INSERT INTO family_resident_links (family_user_id, resident_id)
  VALUES (v_family_user_id, v_resident_id)
  ON CONFLICT (family_user_id, resident_id) DO NOTHING;

  -- Caregiver assignment
  DELETE FROM caregiver_assignments WHERE resident_id = v_resident_id;
  INSERT INTO caregiver_assignments (caregiver_user_id, resident_id, agency_id, status, assigned_at, assigned_by)
  VALUES
    (v_caregiver1_id, v_resident_id, v_agency_id, 'active', now() - interval '30 days', v_supervisor_id);

  -- Departments
  INSERT INTO departments (id, agency_id, name, department_code, description, status, supervisor_id)
  VALUES
    (v_dept_nursing_id, v_agency_id, 'Nursing', 'NURSING', 'Medical care and health monitoring', 'normal', v_supervisor_id),
    (v_dept_housekeeping_id, v_agency_id, 'Housekeeping', 'HOUSEKEEPING', 'Cleaning and maintenance services', 'normal', NULL),
    (v_dept_dietary_id, v_agency_id, 'Dietary', 'DIETARY', 'Meal preparation and nutrition services', 'normal', NULL)
  ON CONFLICT (id) DO UPDATE
    SET name = EXCLUDED.name,
        department_code = EXCLUDED.department_code,
        description = EXCLUDED.description,
        supervisor_id = EXCLUDED.supervisor_id;

  -- Department personnel
  DELETE FROM department_personnel WHERE department_id IN (v_dept_nursing_id, v_dept_housekeeping_id, v_dept_dietary_id);
  INSERT INTO department_personnel (department_id, user_id, agency_id, employee_id, position_title, shift_pattern, status)
  VALUES
    (v_dept_nursing_id, v_caregiver1_id, v_agency_id, 'CG-SF-001', 'Personal Support Worker (PSW)', 'day', 'on_shift'),
    (v_dept_dietary_id, v_caregiver2_id, v_agency_id, 'CG-SF-002', 'Dietary Aide', 'day', 'on_shift'),
    (v_dept_nursing_id, v_supervisor_id, v_agency_id, 'SUP-SF-001', 'Nursing Supervisor', 'day', 'on_shift');

  -- Task categories
  DELETE FROM task_categories WHERE agency_id = v_agency_id;
  
  INSERT INTO task_categories (agency_id, name, category_type, description, default_priority, default_risk_level, requires_evidence, allows_skip, is_active, sort_order)
  VALUES
    (v_agency_id, 'Medication Administration', 'clinical', 'Administer prescribed medications', 'high', 'B', true, false, true, 1)
  RETURNING id INTO v_category_medication_id;

  INSERT INTO task_categories (agency_id, name, category_type, description, default_priority, default_risk_level, requires_evidence, allows_skip, is_active, sort_order)
  VALUES
    (v_agency_id, 'Vital Signs Check', 'monitoring', 'Measure and record vital signs', 'medium', 'B', true, false, true, 2)
  RETURNING id INTO v_category_vitals_id;

  INSERT INTO task_categories (agency_id, name, category_type, description, default_priority, default_risk_level, requires_evidence, allows_skip, is_active, sort_order)
  VALUES
    (v_agency_id, 'Meal Delivery', 'nutrition', 'Deliver meals to resident', 'medium', 'B', false, false, true, 3)
  RETURNING id INTO v_category_meal_id;

  INSERT INTO task_categories (agency_id, name, category_type, description, default_priority, default_risk_level, requires_evidence, allows_skip, is_active, sort_order)
  VALUES
    (v_agency_id, 'Room Cleaning', 'housekeeping', 'Clean and sanitize resident room', 'low', 'B', false, true, true, 4)
  RETURNING id INTO v_category_cleaning_id;

  INSERT INTO task_categories (agency_id, name, category_type, description, default_priority, default_risk_level, requires_evidence, allows_skip, is_active, sort_order)
  VALUES
    (v_agency_id, 'Safety Check', 'monitoring', 'Perform safety and welfare check', 'medium', 'B', false, false, true, 5)
  RETURNING id INTO v_category_safety_id;

  -- Tasks
  DELETE FROM tasks WHERE resident_id = v_resident_id;
  INSERT INTO tasks (
    agency_id, resident_id, category_id, department_id,
    task_name, description, priority, risk_level, state,
    scheduled_start, scheduled_end, requires_evidence
  )
  VALUES
    (v_agency_id, v_resident_id, v_category_medication_id, v_dept_nursing_id,
     'Morning Medication', 'Administer Lisinopril 10mg and Metformin 500mg', 'high', 'B', 'completed',
     CURRENT_DATE + interval '8 hours', CURRENT_DATE + interval '8 hours 15 minutes', true),

    (v_agency_id, v_resident_id, v_category_vitals_id, v_dept_nursing_id,
     'Vital Signs Check', 'Check blood pressure, heart rate, temperature', 'medium', 'B', 'completed',
     CURRENT_DATE + interval '9 hours', CURRENT_DATE + interval '9 hours 10 minutes', true),

    (v_agency_id, v_resident_id, v_category_meal_id, v_dept_dietary_id,
     'Lunch Delivery', 'Deliver diabetic-friendly lunch tray', 'medium', 'B', 'completed',
     CURRENT_DATE + interval '12 hours', CURRENT_DATE + interval '12 hours 20 minutes', false),

    (v_agency_id, v_resident_id, v_category_medication_id, v_dept_nursing_id,
     'Afternoon Medication', 'Administer evening Metformin 500mg', 'high', 'B', 'scheduled',
     CURRENT_DATE + interval '18 hours', CURRENT_DATE + interval '18 hours 15 minutes', true),

    (v_agency_id, v_resident_id, v_category_safety_id, v_dept_nursing_id,
     'Evening Safety Check', 'Verify room safety and resident wellbeing', 'medium', 'B', 'scheduled',
     CURRENT_DATE + interval '20 hours', CURRENT_DATE + interval '20 hours 10 minutes', false),

    (v_agency_id, v_resident_id, v_category_medication_id, v_dept_nursing_id,
     'Morning Medication', 'Administer Lisinopril 10mg and Metformin 500mg', 'high', 'B', 'scheduled',
     CURRENT_DATE + interval '1 day 8 hours', CURRENT_DATE + interval '1 day 8 hours 15 minutes', true),

    (v_agency_id, v_resident_id, v_category_cleaning_id, v_dept_housekeeping_id,
     'Weekly Room Deep Clean', 'Deep clean and sanitize resident room', 'low', 'B', 'scheduled',
     CURRENT_DATE + interval '1 day 10 hours', CURRENT_DATE + interval '1 day 11 hours', false);

  -- Medications
  DELETE FROM resident_medications WHERE resident_id = v_resident_id;
  INSERT INTO resident_medications (resident_id, medication_name, dosage, frequency, route, schedule, prescriber_name, is_prn, is_controlled, is_active, start_date, entered_by)
  VALUES
    (v_resident_id, 'Lisinopril', '10mg', 'DAILY', 'ORAL', '{"times": ["08:00"]}'::jsonb, 'Dr. Sarah Johnson', false, false, true, CURRENT_DATE - interval '90 days', v_family_user_id),
    (v_resident_id, 'Metformin', '500mg', 'TWICE_DAILY', 'ORAL', '{"times": ["08:00", "18:00"]}'::jsonb, 'Dr. Sarah Johnson', false, false, true, CURRENT_DATE - interval '180 days', v_family_user_id);

  -- Appointments
  DELETE FROM appointments WHERE resident_id = v_resident_id;
  INSERT INTO appointments (resident_id, title, appointment_type, scheduled_at, location, provider_name, status)
  VALUES
    (v_resident_id, 'Follow-up with Dr. Johnson', 'DOCTOR_VISIT', CURRENT_DATE + interval '3 days 10 hours', 'Medical Center', 'Dr. Sarah Johnson', 'SCHEDULED'),
    (v_resident_id, 'Routine Lab Work', 'SCREENING', CURRENT_DATE + interval '7 days 9 hours', 'Quest Diagnostics', 'Lab Tech', 'SCHEDULED'),
    (v_resident_id, 'Quarterly Check-up', 'DOCTOR_VISIT', CURRENT_DATE + interval '30 days', 'Medical Center', 'Dr. Sarah Johnson', 'COMPLETED');

  -- Lab Tests
  DELETE FROM lab_tests WHERE resident_id = v_resident_id;
  INSERT INTO lab_tests (resident_id, test_type, test_name, ordered_by, ordered_at, completed_at, status)
  VALUES
    (v_resident_id, 'BLOOD_WORK', 'HbA1c Test', 'Dr. Johnson', CURRENT_DATE - interval '30 days', CURRENT_DATE - interval '28 days', 'COMPLETED'),
    (v_resident_id, 'BLOOD_WORK', 'Lipid Panel', 'Dr. Johnson', CURRENT_DATE - interval '30 days', CURRENT_DATE - interval '28 days', 'COMPLETED');

  -- Settings
  INSERT INTO senior_accessibility_settings (user_id, font_size_multiplier, high_contrast_enabled, voice_navigation_enabled)
  VALUES (v_senior_user_id, 1.2, false, false)
  ON CONFLICT (user_id) DO UPDATE SET font_size_multiplier = EXCLUDED.font_size_multiplier;

  INSERT INTO family_notification_preferences (user_id, resident_id, channel_in_app, channel_email, channel_sms)
  VALUES (v_family_user_id, v_resident_id, true, true, false)
  ON CONFLICT (user_id, resident_id) DO UPDATE SET channel_in_app = EXCLUDED.channel_in_app;

  -- Device
  DELETE FROM device_registry WHERE resident_id = v_resident_id;
  INSERT INTO device_registry (device_id, resident_id, device_type, device_name, manufacturer, model, firmware_version, battery_level, trust_state, capabilities, pairing_actor, pairing_timestamp)
  VALUES (
    'OMRON-BP-' || substr(md5(v_resident_id::text), 1, 8), v_resident_id,
    'BLOOD_PRESSURE_MONITOR', 'OMRON Evolv', 'OMRON', 'BP7900', '2.1.4', 85, 'TRUSTED',
    '{"supported_metrics": ["BLOOD_PRESSURE_SYSTOLIC", "BLOOD_PRESSURE_DIASTOLIC", "HEART_RATE"]}'::jsonb,
    v_senior_user_id, now() - interval '30 days'
  )
  RETURNING id INTO v_device_id;

  -- Health Metrics
  DELETE FROM health_metrics WHERE resident_id = v_resident_id;
  FOR i IN 1..11 LOOP
    v_timestamp := now() - (i || ' days')::interval + interval '8 hours';
    v_systolic := 125 + (random() * 15)::int;
    v_diastolic := 78 + (random() * 10)::int;

    INSERT INTO health_metrics (resident_id, device_registry_id, metric_category, metric_type, value_numeric, unit, confidence_level, measurement_source, recorded_at)
    VALUES
      (v_resident_id, v_device_id, 'CARDIOVASCULAR', 'BLOOD_PRESSURE_SYSTOLIC', v_systolic, 'mmHg', 'HIGH', 'AUTOMATIC_DEVICE', v_timestamp),
      (v_resident_id, v_device_id, 'CARDIOVASCULAR', 'BLOOD_PRESSURE_DIASTOLIC', v_diastolic, 'mmHg', 'HIGH', 'AUTOMATIC_DEVICE', v_timestamp),
      (v_resident_id, v_device_id, 'CARDIOVASCULAR', 'HEART_RATE', 72 + (random() * 12)::int, 'bpm', 'HIGH', 'AUTOMATIC_DEVICE', v_timestamp);
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'message', 'Senior/Family scenario seeded successfully',
    'resident_id', v_resident_id,
    'senior_user_id', v_senior_user_id,
    'family_user_id', v_family_user_id,
    'caregiver_user_id', v_caregiver1_id,
    'supervisor_user_id', v_supervisor_id,
    'agency_id', v_agency_id,
    'departments', jsonb_build_object(
      'nursing_id', v_dept_nursing_id,
      'housekeeping_id', v_dept_housekeeping_id,
      'dietary_id', v_dept_dietary_id
    ),
    'entities_created', jsonb_build_object(
      'users', 5,
      'departments', 3,
      'department_personnel', 3,
      'task_categories', 5,
      'tasks', 7,
      'medications', 2,
      'appointments', 3,
      'lab_tests', 2,
      'health_metrics', 33,
      'caregiver_assigned', 1
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION seed_senior_family_scenario() TO authenticated, anon;

COMMENT ON FUNCTION seed_senior_family_scenario IS
'Senior/Family scenario seed with operational data: users, departments, tasks, medications, appointments, health metrics.';
