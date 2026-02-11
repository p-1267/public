/*
  # Simplify seed by removing caregiver_assignments

  caregiver_assignments has complex schema with assigned_by, status, metadata.
  Removing it to focus on core data needed for regression fix.
*/

CREATE OR REPLACE FUNCTION seed_senior_family_scenario()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agency_id uuid := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_senior_user_id uuid := 'b0000000-0000-0000-0000-000000000001'::uuid;
  v_family_user_id uuid := 'b0000000-0000-0000-0000-000000000002'::uuid;
  v_caregiver1_id uuid := 'b0000000-0000-0000-0000-000000000003'::uuid;
  v_caregiver2_id uuid := 'b0000000-0000-0000-0000-000000000004'::uuid;
  v_supervisor_id uuid := 'b0000000-0000-0000-0000-000000000005'::uuid;
  
  -- Role IDs
  v_role_senior_id uuid := '7cd66d6a-0da0-4f68-ad91-88c10c3dff83'::uuid;
  v_role_family_admin_id uuid := '60013556-713b-498d-9a02-b560167b4975'::uuid;
  v_role_caregiver_id uuid := 'c834bce4-26ca-4805-8741-85c5616d3fb8'::uuid;
  v_role_supervisor_id uuid := '23011cf6-84f8-40a4-8634-fa0eaad6979b'::uuid;
  
  v_resident_id uuid;
  v_dept_nursing_id uuid;
  v_dept_housekeeping_id uuid;
  v_dept_dietary_id uuid;
  v_category_medication_id uuid;
  v_category_vitals_id uuid;
  v_category_adl_id uuid;
  v_category_housekeeping_id uuid;
  v_category_dietary_id uuid;
  v_device_id uuid;
  v_timestamp timestamptz;
  v_systolic int;
  v_diastolic int;
  i int;
BEGIN
  -- Delete existing showcase data in correct order
  DELETE FROM tasks WHERE resident_id IN (SELECT id FROM residents WHERE agency_id = v_agency_id);
  DELETE FROM caregiver_assignments WHERE agency_id = v_agency_id;
  DELETE FROM department_personnel WHERE agency_id = v_agency_id;
  DELETE FROM departments WHERE agency_id = v_agency_id;
  DELETE FROM resident_medications WHERE resident_id IN (SELECT id FROM residents WHERE agency_id = v_agency_id);
  DELETE FROM appointments WHERE resident_id IN (SELECT id FROM residents WHERE agency_id = v_agency_id);
  DELETE FROM lab_tests WHERE resident_id IN (SELECT id FROM residents WHERE agency_id = v_agency_id);
  DELETE FROM health_metrics WHERE resident_id IN (SELECT id FROM residents WHERE agency_id = v_agency_id);
  DELETE FROM device_registry WHERE resident_id IN (SELECT id FROM residents WHERE agency_id = v_agency_id);
  DELETE FROM task_categories WHERE agency_id = v_agency_id;
  DELETE FROM residents WHERE agency_id = v_agency_id;
  DELETE FROM user_profiles WHERE id IN (v_senior_user_id, v_family_user_id, v_caregiver1_id, v_caregiver2_id, v_supervisor_id);

  -- Create 5 users (senior, family, 2 caregivers, 1 supervisor)
  INSERT INTO user_profiles (id, role_id, display_name, is_active, agency_id)
  VALUES
    (v_senior_user_id, v_role_senior_id, 'Dorothy Miller', true, v_agency_id),
    (v_family_user_id, v_role_family_admin_id, 'Robert Miller', true, v_agency_id),
    (v_caregiver1_id, v_role_caregiver_id, 'Maria Garcia', true, v_agency_id),
    (v_caregiver2_id, v_role_caregiver_id, 'James Chen', true, v_agency_id),
    (v_supervisor_id, v_role_supervisor_id, 'Sarah Johnson', true, v_agency_id);

  -- Create 1 resident
  INSERT INTO residents (agency_id, full_name, date_of_birth, status, metadata)
  VALUES (
    v_agency_id, 
    'Dorothy Miller', 
    '1945-03-15', 
    'active',
    '{"room_number": "101", "care_level": "INDEPENDENT", "risk_level": "B"}'::jsonb
  )
  RETURNING id INTO v_resident_id;

  -- Create 3 departments
  INSERT INTO departments (agency_id, name, department_code, description, status)
  VALUES
    (v_agency_id, 'Nursing Care', 'NURSING', 'Personal care and health monitoring', 'normal')
  RETURNING id INTO v_dept_nursing_id;

  INSERT INTO departments (agency_id, name, department_code, description, status)
  VALUES
    (v_agency_id, 'Housekeeping', 'HOUSEKEEPING', 'Room maintenance and cleanliness', 'normal')
  RETURNING id INTO v_dept_housekeeping_id;

  INSERT INTO departments (agency_id, name, department_code, description, status)
  VALUES
    (v_agency_id, 'Dietary Services', 'DIETARY', 'Meal preparation and delivery', 'normal')
  RETURNING id INTO v_dept_dietary_id;

  -- Assign staff to departments
  INSERT INTO department_personnel (department_id, user_id, agency_id, employee_id, position_title, shift_pattern, status)
  VALUES
    (v_dept_nursing_id, v_caregiver1_id, v_agency_id, 'CG-SF-001', 'Personal Support Worker (PSW)', 'day', 'on_shift'),
    (v_dept_dietary_id, v_caregiver2_id, v_agency_id, 'CG-SF-002', 'Dietary Aide', 'day', 'on_shift'),
    (v_dept_nursing_id, v_supervisor_id, v_agency_id, 'SUP-SF-001', 'Nursing Supervisor', 'day', 'on_shift');

  -- Create 5 task categories
  INSERT INTO task_categories (agency_id, name, category_type, description, default_priority, default_risk_level, requires_evidence, allows_skip, is_active, sort_order)
  VALUES (v_agency_id, 'Medication Administration', 'clinical', 'Administer prescribed medications', 'high', 'B', true, false, true, 1)
  RETURNING id INTO v_category_medication_id;

  INSERT INTO task_categories (agency_id, name, category_type, description, default_priority, default_risk_level, requires_evidence, allows_skip, is_active, sort_order)
  VALUES (v_agency_id, 'Vital Signs Monitoring', 'monitoring', 'Check blood pressure, temperature, etc.', 'high', 'B', true, false, true, 2)
  RETURNING id INTO v_category_vitals_id;

  INSERT INTO task_categories (agency_id, name, category_type, description, default_priority, default_risk_level, requires_evidence, allows_skip, is_active, sort_order)
  VALUES (v_agency_id, 'Personal Care', 'hygiene', 'Assistance with daily activities', 'medium', 'B', true, false, true, 3)
  RETURNING id INTO v_category_adl_id;

  INSERT INTO task_categories (agency_id, name, category_type, description, default_priority, default_risk_level, requires_evidence, allows_skip, is_active, sort_order)
  VALUES (v_agency_id, 'Room Cleaning', 'housekeeping', 'Daily room maintenance', 'low', 'B', false, false, true, 4)
  RETURNING id INTO v_category_housekeeping_id;

  INSERT INTO task_categories (agency_id, name, category_type, description, default_priority, default_risk_level, requires_evidence, allows_skip, is_active, sort_order)
  VALUES (v_agency_id, 'Meal Service', 'nutrition', 'Deliver and assist with meals', 'medium', 'B', false, false, true, 5)
  RETURNING id INTO v_category_dietary_id;

  -- Create 7 tasks (3 completed, 4 scheduled)
  INSERT INTO tasks (agency_id, resident_id, category_id, task_name, description, priority, risk_level, state, scheduled_start, scheduled_end, created_by)
  VALUES
    (v_agency_id, v_resident_id, v_category_medication_id, 'Morning Medication - Lisinopril', 'Administer 10mg Lisinopril', 'high', 'B', 'completed', 
     CURRENT_DATE + interval '8 hours', CURRENT_DATE + interval '8 hours 15 minutes', NULL),
    (v_agency_id, v_resident_id, v_category_vitals_id, 'Morning Vitals Check', 'Blood pressure and temperature', 'high', 'B', 'completed',
     CURRENT_DATE + interval '8 hours 30 minutes', CURRENT_DATE + interval '8 hours 45 minutes', NULL),
    (v_agency_id, v_resident_id, v_category_adl_id, 'Morning Personal Care', 'Assistance with bathing and dressing', 'medium', 'B', 'completed',
     CURRENT_DATE + interval '9 hours', CURRENT_DATE + interval '9 hours 30 minutes', NULL),
    (v_agency_id, v_resident_id, v_category_medication_id, 'Lunch Medication - Metformin', 'Administer 500mg Metformin', 'high', 'B', 'scheduled',
     CURRENT_DATE + interval '12 hours', CURRENT_DATE + interval '12 hours 15 minutes', NULL),
    (v_agency_id, v_resident_id, v_category_dietary_id, 'Lunch Service', 'Deliver lunch tray', 'medium', 'B', 'scheduled',
     CURRENT_DATE + interval '12 hours 30 minutes', CURRENT_DATE + interval '13 hours', NULL),
    (v_agency_id, v_resident_id, v_category_housekeeping_id, 'Afternoon Room Cleaning', 'Clean and sanitize room', 'low', 'B', 'scheduled',
     CURRENT_DATE + interval '14 hours', CURRENT_DATE + interval '14 hours 30 minutes', NULL),
    (v_agency_id, v_resident_id, v_category_medication_id, 'Evening Medication - Lisinopril', 'Administer 10mg Lisinopril', 'high', 'B', 'scheduled',
     CURRENT_DATE + interval '20 hours', CURRENT_DATE + interval '20 hours 15 minutes', NULL);

  -- Create 2 medications
  INSERT INTO resident_medications (resident_id, medication_name, dosage, route, frequency, schedule, prescriber_name, is_prn, is_controlled, start_date, is_active, entered_by)
  VALUES
    (v_resident_id, 'Lisinopril', '10mg', 'ORAL', 'TWICE_DAILY', '{}'::jsonb, 'Dr. Johnson', false, false, CURRENT_DATE - interval '90 days', true, v_caregiver1_id),
    (v_resident_id, 'Metformin', '500mg', 'ORAL', 'DAILY', '{}'::jsonb, 'Dr. Johnson', false, false, CURRENT_DATE - interval '90 days', true, v_caregiver1_id);

  -- Create 3 appointments
  INSERT INTO appointments (resident_id, appointment_type, title, provider_name, scheduled_at, location, status, notes)
  VALUES
    (v_resident_id, 'DOCTOR_VISIT', 'Routine Checkup with Dr. Johnson', 'Dr. Johnson', 
     (CURRENT_DATE + interval '7 days')::timestamp + interval '10 hours', 'Medical Center - Room 205', 'SCHEDULED', 'Routine checkup'),
    (v_resident_id, 'SCREENING', 'Quarterly Blood Work', 'LabCorp', 
     (CURRENT_DATE + interval '14 days')::timestamp + interval '9 hours', 'LabCorp - Downtown', 'SCHEDULED', 'Quarterly blood work'),
    (v_resident_id, 'FOLLOW_UP', 'Medication Review', 'Dr. Johnson', 
     (CURRENT_DATE - interval '30 days')::timestamp + interval '14 hours', 'Medical Center - Room 205', 'COMPLETED', 'Medication review');

  -- Create 2 lab tests
  INSERT INTO lab_tests (resident_id, test_type, test_name, ordered_by, ordered_at, completed_at, status)
  VALUES
    (v_resident_id, 'BLOOD_WORK', 'HbA1c Test', 'Dr. Johnson', CURRENT_DATE - interval '30 days', CURRENT_DATE - interval '28 days', 'COMPLETED'),
    (v_resident_id, 'BLOOD_WORK', 'Lipid Panel', 'Dr. Johnson', CURRENT_DATE - interval '30 days', CURRENT_DATE - interval '28 days', 'COMPLETED');

  -- Create device (BLE_HEALTH_SENSOR for blood pressure monitor)
  INSERT INTO device_registry (device_id, resident_id, device_type, device_name, manufacturer, model, firmware_version, battery_level, trust_state, capabilities, pairing_actor, pairing_timestamp)
  VALUES (
    'OMRON-BP-' || substr(md5(v_resident_id::text), 1, 8), v_resident_id,
    'BLE_HEALTH_SENSOR', 'OMRON Evolv', 'OMRON', 'BP7900', '2.1.4', 85, 'TRUSTED',
    '{"supported_metrics": ["BLOOD_PRESSURE_SYSTOLIC", "BLOOD_PRESSURE_DIASTOLIC", "HEART_RATE"]}'::jsonb,
    v_senior_user_id, now() - interval '30 days'
  )
  RETURNING id INTO v_device_id;

  -- Create health metrics (11 days of BP readings)
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
    'success', true,
    'resident_id', v_resident_id,
    'device_id', v_device_id,
    'users_created', 5,
    'departments_created', 3,
    'tasks_created', 7,
    'medications_created', 2,
    'appointments_created', 3,
    'lab_tests_created', 2,
    'health_metrics_created', 33
  );
END;
$$;
