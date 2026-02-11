/*
  # Fix UUID Format in Comprehensive Seed

  Corrects UUID format to proper 8-4-4-4-12 pattern
*/

CREATE OR REPLACE FUNCTION seed_comprehensive_showcase_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_dept_nursing uuid := 'd0000000-0000-0000-0000-000000000001'::uuid;
  v_dept_housekeeping uuid := 'd0000000-0000-0000-0000-000000000002'::uuid;
  v_dept_kitchen uuid := 'd0000000-0000-0000-0000-000000000003'::uuid;

  v_caregiver_role_id uuid;
  v_supervisor_role_id uuid;
  v_admin_role_id uuid;
  v_senior_role_id uuid;
  v_family_role_id uuid;

  v_residents uuid[] := ARRAY[
    '10000000-0000-0000-0000-000000000001'::uuid,
    '10000000-0000-0000-0000-000000000002'::uuid,
    '10000000-0000-0000-0000-000000000003'::uuid,
    '10000000-0000-0000-0000-000000000004'::uuid,
    '10000000-0000-0000-0000-000000000005'::uuid,
    '10000000-0000-0000-0000-000000000006'::uuid,
    '10000000-0000-0000-0000-000000000007'::uuid,
    '10000000-0000-0000-0000-000000000008'::uuid
  ];

  v_caregivers uuid[] := ARRAY[
    '20000000-0000-0000-0000-000000000001'::uuid,
    '20000000-0000-0000-0000-000000000002'::uuid,
    '20000000-0000-0000-0000-000000000003'::uuid,
    '20000000-0000-0000-0000-000000000004'::uuid,
    '20000000-0000-0000-0000-000000000005'::uuid,
    '20000000-0000-0000-0000-000000000006'::uuid,
    '20000000-0000-0000-0000-000000000007'::uuid,
    '20000000-0000-0000-0000-000000000008'::uuid,
    '20000000-0000-0000-0000-000000000009'::uuid,
    '20000000-0000-0000-0000-000000000010'::uuid
  ];

  v_supervisors uuid[] := ARRAY[
    '30000000-0000-0000-0000-000000000001'::uuid,
    '30000000-0000-0000-0000-000000000002'::uuid
  ];

  v_admin_id uuid := '40000000-0000-0000-0000-000000000001'::uuid;
  v_senior_id uuid := '50000000-0000-0000-0000-000000000001'::uuid;
  v_family_id uuid := '60000000-0000-0000-0000-000000000001'::uuid;

  v_cat_meds uuid;
  v_cat_vitals uuid;
  v_cat_housekeeping uuid;
  v_cat_meals uuid;

  v_today timestamptz := date_trunc('day', now());
  i int;
  v_resident_id uuid;
  j int;
BEGIN

  -- Get role IDs
  SELECT id INTO v_caregiver_role_id FROM roles WHERE name = 'CAREGIVER' LIMIT 1;
  SELECT id INTO v_supervisor_role_id FROM roles WHERE name = 'SUPERVISOR' LIMIT 1;
  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'AGENCY_ADMIN' LIMIT 1;
  SELECT id INTO v_senior_role_id FROM roles WHERE name = 'SENIOR' LIMIT 1;
  SELECT id INTO v_family_role_id FROM roles WHERE name = 'FAMILY_ADMIN' LIMIT 1;

  -- Clean existing
  DELETE FROM health_metric_trends WHERE resident_id = ANY(v_residents);
  DELETE FROM vital_signs WHERE resident_id = ANY(v_residents);
  DELETE FROM device_data_events WHERE device_id IN (SELECT id FROM device_registry WHERE resident_id = ANY(v_residents));
  DELETE FROM device_registry WHERE resident_id = ANY(v_residents);
  DELETE FROM lab_test_results WHERE resident_id = ANY(v_residents);
  DELETE FROM appointment_reminders WHERE appointment_id IN (SELECT id FROM appointments WHERE resident_id = ANY(v_residents));
  DELETE FROM appointments WHERE resident_id = ANY(v_residents);
  DELETE FROM medication_administration WHERE medication_id IN (SELECT id FROM resident_medications WHERE resident_id = ANY(v_residents));
  DELETE FROM resident_medications WHERE resident_id = ANY(v_residents);
  DELETE FROM care_plan_anchors WHERE resident_id = ANY(v_residents);
  DELETE FROM documents WHERE resident_id = ANY(v_residents);
  DELETE FROM task_evidence WHERE task_id IN (SELECT id FROM tasks WHERE agency_id = v_agency_id);
  DELETE FROM supervisor_reviews WHERE task_id IN (SELECT id FROM tasks WHERE agency_id = v_agency_id);
  DELETE FROM tasks WHERE agency_id = v_agency_id;
  DELETE FROM department_personnel WHERE agency_id = v_agency_id;
  DELETE FROM senior_resident_links WHERE resident_id = ANY(v_residents);
  DELETE FROM family_resident_links WHERE resident_id = ANY(v_residents);
  DELETE FROM user_profiles WHERE agency_id = v_agency_id OR id IN (v_senior_id, v_family_id);
  DELETE FROM departments WHERE agency_id = v_agency_id;
  DELETE FROM residents WHERE id = ANY(v_residents);
  DELETE FROM task_categories WHERE agency_id = v_agency_id;
  DELETE FROM agencies WHERE id = v_agency_id;

  -- Create agency
  INSERT INTO agencies (id, name, status, operating_mode, metadata)
  VALUES (v_agency_id, 'Sunrise Senior Care', 'active', 'AGENCY', '{"capacity": 50}'::jsonb);

  -- Create departments
  INSERT INTO departments (id, agency_id, name, department_code, description, icon, status, staff_count)
  VALUES
    (v_dept_nursing, v_agency_id, 'Nursing', 'NURSING', 'Clinical care', '💊', 'normal', 12),
    (v_dept_housekeeping, v_agency_id, 'Housekeeping', 'HOUSEKEEPING', 'Environmental services', '🧹', 'normal', 8),
    (v_dept_kitchen, v_agency_id, 'Kitchen', 'KITCHEN', 'Meal services', '🍽️', 'understaffed', 6);

  -- Create caregivers
  FOR i IN 1..10 LOOP
    INSERT INTO user_profiles (id, role_id, agency_id, display_name, full_name, is_active)
    VALUES (v_caregivers[i], v_caregiver_role_id, v_agency_id, 'Caregiver ' || i, 'Staff Member ' || i, true);

    INSERT INTO department_personnel (agency_id, department_id, user_id, first_name, last_name, display_name, position_title, shift_pattern, is_primary_department, status)
    VALUES (
      v_agency_id,
      CASE WHEN i <= 6 THEN v_dept_nursing WHEN i <= 8 THEN v_dept_housekeeping ELSE v_dept_kitchen END,
      v_caregivers[i],
      'Staff', 'Member' || i, 'Caregiver ' || i,
      CASE WHEN i <= 6 THEN 'RN' WHEN i <= 8 THEN 'Housekeeper' ELSE 'Dietary' END,
      'DAY', true, 'active'
    );
  END LOOP;

  -- Create supervisors
  FOR i IN 1..2 LOOP
    INSERT INTO user_profiles (id, role_id, agency_id, display_name, full_name, is_active)
    VALUES (v_supervisors[i], v_supervisor_role_id, v_agency_id, 'Supervisor ' || i, 'Supervisor ' || i, true);
  END LOOP;

  -- Create admin
  INSERT INTO user_profiles (id, role_id, agency_id, display_name, full_name, is_active)
  VALUES (v_admin_id, v_admin_role_id, v_agency_id, 'Admin', 'Admin User', true);

  -- Create residents
  INSERT INTO residents (id, agency_id, full_name, date_of_birth, status, room_number, care_level, metadata)
  VALUES
    (v_residents[1], v_agency_id, 'Dorothy Miller', '1946-03-15', 'active', 'A-101', 'INDEPENDENT', '{}'::jsonb),
    (v_residents[2], v_agency_id, 'Robert Johnson', '1943-07-22', 'active', 'A-102', 'ASSISTED', '{}'::jsonb),
    (v_residents[3], v_agency_id, 'Margaret Davis', '1948-11-08', 'active', 'A-103', 'INDEPENDENT', '{}'::jsonb),
    (v_residents[4], v_agency_id, 'William Anderson', '1942-02-14', 'active', 'B-201', 'ASSISTED', '{}'::jsonb),
    (v_residents[5], v_agency_id, 'Barbara Wilson', '1950-05-30', 'active', 'B-202', 'MEMORY_CARE', '{}'::jsonb),
    (v_residents[6], v_agency_id, 'James Brown', '1945-09-17', 'active', 'B-203', 'ASSISTED', '{}'::jsonb),
    (v_residents[7], v_agency_id, 'Patricia Taylor', '1947-12-25', 'active', 'C-301', 'INDEPENDENT', '{}'::jsonb),
    (v_residents[8], v_agency_id, 'Charles Martinez', '1944-04-03', 'active', 'C-302', 'SKILLED_NURSING', '{}'::jsonb);

  -- Create senior and family users
  INSERT INTO user_profiles (id, role_id, display_name, full_name, is_active)
  VALUES
    (v_senior_id, v_senior_role_id, 'Dorothy Miller', 'Dorothy Miller', true),
    (v_family_id, v_family_role_id, 'Robert Miller Jr', 'Robert Miller Jr', true);

  INSERT INTO senior_resident_links (senior_user_id, resident_id, relationship, is_primary)
  VALUES (v_senior_id, v_residents[1], 'SELF', true);

  INSERT INTO family_resident_links (family_user_id, resident_id, relationship, can_manage_medications, can_manage_appointments, can_view_documents)
  VALUES (v_family_id, v_residents[1], 'SON', true, true, true);

  -- Create task categories
  INSERT INTO task_categories (id, agency_id, name, category_type, description, default_priority, requires_evidence)
  VALUES
    (gen_random_uuid(), v_agency_id, 'Medication Administration', 'NURSING', 'Meds', 'HIGH', true),
    (gen_random_uuid(), v_agency_id, 'Vital Signs Check', 'NURSING', 'Vitals', 'MEDIUM', true),
    (gen_random_uuid(), v_agency_id, 'Room Cleaning', 'HOUSEKEEPING', 'Clean', 'MEDIUM', false),
    (gen_random_uuid(), v_agency_id, 'Meal Delivery', 'KITCHEN', 'Meals', 'HIGH', false);

  SELECT id INTO v_cat_meds FROM task_categories WHERE agency_id = v_agency_id AND name = 'Medication Administration';
  SELECT id INTO v_cat_vitals FROM task_categories WHERE agency_id = v_agency_id AND name = 'Vital Signs Check';
  SELECT id INTO v_cat_housekeeping FROM task_categories WHERE agency_id = v_agency_id AND name = 'Room Cleaning';
  SELECT id INTO v_cat_meals FROM task_categories WHERE agency_id = v_agency_id AND name = 'Meal Delivery';

  -- Create tasks (med pass + vitals)
  FOR i IN 1..8 LOOP
    INSERT INTO tasks (agency_id, department_id, category_id, resident_id, title, description, priority, status, scheduled_start, scheduled_end, created_at)
    VALUES (v_agency_id, v_dept_nursing, v_cat_meds, v_residents[i], 'Morning Meds - Res ' || i, 'Administer meds', 'HIGH', CASE WHEN i <= 3 THEN 'COMPLETED' WHEN i <= 5 THEN 'IN_PROGRESS' ELSE 'PENDING' END, v_today + interval '9 hours', v_today + interval '10 hours', v_today);

    INSERT INTO tasks (agency_id, department_id, category_id, resident_id, title, description, priority, status, scheduled_start, scheduled_end, created_at)
    VALUES (v_agency_id, v_dept_nursing, v_cat_vitals, v_residents[i], 'Vitals - Res ' || i, 'Record vitals', 'MEDIUM', CASE WHEN i <= 4 THEN 'COMPLETED' ELSE 'PENDING' END, v_today + interval '8 hours', v_today + interval '9 hours', v_today);
  END LOOP;

  -- Create medications
  INSERT INTO resident_medications (id, resident_id, medication_name, dosage, dosage_unit, frequency, route, scheduled_time, status, instructions, prescribed_by, start_date)
  VALUES
    (gen_random_uuid(), v_residents[1], 'Lisinopril', '10', 'mg', 'Once daily', 'ORAL', '09:00', 'ACTIVE', 'With food', 'Dr. Johnson', v_today - interval '30 days'),
    (gen_random_uuid(), v_residents[1], 'Metformin', '500', 'mg', 'Twice daily', 'ORAL', '09:00', 'ACTIVE', 'With meals', 'Dr. Johnson', v_today - interval '30 days'),
    (gen_random_uuid(), v_residents[2], 'Atorvastatin', '20', 'mg', 'Once daily', 'ORAL', '20:00', 'ACTIVE', 'Bedtime', 'Dr. Chen', v_today - interval '60 days'),
    (gen_random_uuid(), v_residents[3], 'Insulin', '20', 'units', 'Once daily', 'SUBCUTANEOUS', '08:00', 'ACTIVE', 'Subcutaneous', 'Dr. Rodriguez', v_today - interval '90 days');

  -- Create appointments
  INSERT INTO appointments (resident_id, appointment_type, title, scheduled_at, duration_minutes, status, provider_name, location, notes)
  VALUES
    (v_residents[1], 'DOCTOR_VISIT', 'Annual Physical', v_today + interval '3 days' + interval '10 hours', 60, 'SCHEDULED', 'Dr. Johnson', 'Medical Center', 'Bring meds'),
    (v_residents[2], 'CARDIOLOGY', 'Follow-up', v_today + interval '5 days' + interval '14 hours', 45, 'SCHEDULED', 'Dr. Chen', 'Heart Clinic', 'Post-procedure'),
    (v_residents[1], 'LAB_WORK', 'Blood Work', v_today - interval '5 days', 30, 'COMPLETED', 'Lab Services', 'Lab', 'Results ready');

  -- Create lab results
  INSERT INTO lab_test_results (resident_id, test_type, test_name, test_date, result_value, result_unit, reference_range, status, ordered_by, notes)
  VALUES
    (v_residents[1], 'BLOOD_WORK', 'HbA1c', v_today - interval '5 days', '6.8', '%', '4.0-5.6', 'FINAL', 'Dr. Johnson', 'Elevated'),
    (v_residents[1], 'BLOOD_WORK', 'Glucose', v_today - interval '5 days', '128', 'mg/dL', '70-100', 'FINAL', 'Dr. Johnson', 'Elevated');

  -- Create devices
  INSERT INTO device_registry (resident_id, device_type, manufacturer, model_name, serial_number, pairing_status, paired_at, last_sync_at, trust_level)
  VALUES
    (v_residents[1], 'BLOOD_PRESSURE_MONITOR', 'Omron', 'BP7000', 'OM-001', 'PAIRED', v_today - interval '30 days', v_today - interval '2 hours', 'VERIFIED'),
    (v_residents[1], 'GLUCOSE_METER', 'OneTouch', 'Verio', 'OT-001', 'PAIRED', v_today - interval '45 days', v_today - interval '4 hours', 'VERIFIED');

  -- Create health metrics (7 days for all residents)
  FOR i IN 1..8 LOOP
    v_resident_id := v_residents[i];
    FOR j IN 0..6 LOOP
      INSERT INTO health_metric_trends (resident_id, metric_type, metric_value, metric_unit, recorded_at, data_source)
      VALUES (v_resident_id, 'BLOOD_PRESSURE_SYSTOLIC', 120 + (random() * 20)::int, 'mmHg', v_today - (j || ' days')::interval + interval '9 hours', CASE WHEN i = 1 THEN 'DEVICE' ELSE 'MANUAL_ENTRY' END);
      
      INSERT INTO health_metric_trends (resident_id, metric_type, metric_value, metric_unit, recorded_at, data_source)
      VALUES (v_resident_id, 'BLOOD_PRESSURE_DIASTOLIC', 75 + (random() * 15)::int, 'mmHg', v_today - (j || ' days')::interval + interval '9 hours', CASE WHEN i = 1 THEN 'DEVICE' ELSE 'MANUAL_ENTRY' END);
      
      INSERT INTO health_metric_trends (resident_id, metric_type, metric_value, metric_unit, recorded_at, data_source)
      VALUES (v_resident_id, 'HEART_RATE', 70 + (random() * 15)::int, 'bpm', v_today - (j || ' days')::interval + interval '9 hours', 'MANUAL_ENTRY');
    END LOOP;
  END LOOP;

  -- Glucose metrics
  FOR j IN 0..13 LOOP
    INSERT INTO health_metric_trends (resident_id, metric_type, metric_value, metric_unit, recorded_at, data_source)
    VALUES (v_residents[1], 'BLOOD_GLUCOSE', 95 + (random() * 50)::int, 'mg/dL', v_today - (j || ' days')::interval + interval '8 hours', 'DEVICE');
  END LOOP;

  -- Create care plans
  INSERT INTO care_plan_anchors (resident_id, plan_type, title, description, goals, interventions, status, effective_date, review_date, created_by_name)
  VALUES
    (v_residents[1], 'CHRONIC_DISEASE', 'Diabetes Management', 'Plan', '["Control HbA1c"]'::jsonb, '["Monitor glucose"]'::jsonb, 'ACTIVE', v_today - interval '60 days', v_today + interval '30 days', 'Dr. Johnson'),
    (v_residents[2], 'CHRONIC_DISEASE', 'Cardiac Care', 'Plan', '["Heart health"]'::jsonb, '["Medications"]'::jsonb, 'ACTIVE', v_today - interval '90 days', v_today + interval '60 days', 'Dr. Chen');

  -- Create documents
  INSERT INTO documents (resident_id, document_type, title, description, file_size, mime_type, uploaded_by_name, uploaded_at, status)
  VALUES
    (v_residents[1], 'MEDICAL_RECORD', 'Physical Exam', 'Annual exam', 245000, 'application/pdf', 'Dr. Johnson', v_today - interval '10 days', 'ACTIVE'),
    (v_residents[1], 'LAB_RESULT', 'Lab Results', 'Blood work', 128000, 'application/pdf', 'Lab', v_today - interval '5 days', 'ACTIVE');

  -- Create notifications
  INSERT INTO notification_log (recipient_user_id, notification_type, channel, title, message, priority, status, sent_at, metadata)
  VALUES
    (v_family_id, 'LAB_RESULT', 'IN_APP', 'Lab Results', 'Results available', 'MEDIUM', 'DELIVERED', v_today - interval '5 days', '{}'::jsonb),
    (v_senior_id, 'MEDICATION_REMINDER', 'IN_APP', 'Medication Time', 'Morning meds', 'HIGH', 'DELIVERED', v_today + interval '9 hours', '{}'::jsonb);

  -- Create brain state
  INSERT INTO brain_state (agency_id, state_type, global_status, emergency_count, high_priority_count, active_alerts, computed_at, metadata)
  VALUES (v_agency_id, 'OPERATIONAL', 'ALL_CLEAR', 0, 0, '[]'::jsonb, now(), '{}'::jsonb);

  RETURN jsonb_build_object(
    'success', true,
    'summary', jsonb_build_object(
      'residents', 8,
      'caregivers', 10,
      'medications', (SELECT count(*) FROM resident_medications WHERE resident_id = ANY(v_residents)),
      'appointments', (SELECT count(*) FROM appointments WHERE resident_id = ANY(v_residents)),
      'tasks', (SELECT count(*) FROM tasks WHERE agency_id = v_agency_id),
      'health_metrics', (SELECT count(*) FROM health_metric_trends WHERE resident_id = ANY(v_residents))
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION seed_comprehensive_showcase_data() TO anon, authenticated;
