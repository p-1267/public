/*
  # Fix Seed - Lowercase shift_pattern

  Changes shift_pattern to lowercase to match check constraint
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

  v_today timestamptz := date_trunc('day', now());
  i int;
  j int;
BEGIN

  SELECT id INTO v_caregiver_role_id FROM roles WHERE name = 'CAREGIVER' LIMIT 1;
  SELECT id INTO v_supervisor_role_id FROM roles WHERE name = 'SUPERVISOR' LIMIT 1;
  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'AGENCY_ADMIN' LIMIT 1;
  SELECT id INTO v_senior_role_id FROM roles WHERE name = 'SENIOR' LIMIT 1;
  SELECT id INTO v_family_role_id FROM roles WHERE name = 'FAMILY_ADMIN' LIMIT 1;

  -- Delete showcase data
  DELETE FROM conflict_test_scenarios WHERE agency_id = v_agency_id;
  DELETE FROM task_evidence WHERE task_id IN (SELECT id FROM tasks WHERE agency_id = v_agency_id);
  DELETE FROM supervisor_reviews WHERE task_id IN (SELECT id FROM tasks WHERE agency_id = v_agency_id);
  DELETE FROM tasks WHERE agency_id = v_agency_id;
  DELETE FROM task_categories WHERE agency_id = v_agency_id;
  DELETE FROM department_personnel WHERE agency_id = v_agency_id;
  DELETE FROM departments WHERE agency_id = v_agency_id;
  DELETE FROM user_profiles WHERE agency_id = v_agency_id OR id IN (v_senior_id, v_family_id);
  DELETE FROM residents WHERE id = ANY(v_residents);
  DELETE FROM agencies WHERE id = v_agency_id;

  -- Create agency
  INSERT INTO agencies (id, name, status, operating_mode, metadata)
  VALUES (v_agency_id, 'Sunrise Senior Care', 'active', 'AGENCY', '{}'::jsonb);

  -- Create departments
  INSERT INTO departments (id, agency_id, name, department_code, description, icon, status, staff_count)
  VALUES
    (v_dept_nursing, v_agency_id, 'Nursing', 'NURSING', 'Clinical nursing care, medication management, vital signs monitoring', '💊', 'normal', 12),
    (v_dept_housekeeping, v_agency_id, 'Housekeeping', 'HOUSEKEEPING', 'Room cleaning, sanitization, environmental services', '🧹', 'normal', 8),
    (v_dept_kitchen, v_agency_id, 'Kitchen', 'KITCHEN', 'Meal preparation, delivery, nutrition services', '🍽️', 'understaffed', 6);

  -- Create caregivers (10)
  FOR i IN 1..10 LOOP
    INSERT INTO user_profiles (id, role_id, agency_id, display_name, is_active)
    VALUES (v_caregivers[i], v_caregiver_role_id, v_agency_id, 'Caregiver ' || i, true);

    INSERT INTO department_personnel (agency_id, department_id, user_id, employee_id, first_name, last_name, display_name, position_title, shift_pattern, is_primary_department, status)
    VALUES (
      v_agency_id,
      CASE WHEN i <= 6 THEN v_dept_nursing WHEN i <= 8 THEN v_dept_housekeeping ELSE v_dept_kitchen END,
      v_caregivers[i],
      'EMP-' || lpad(i::text, 4, '0'),
      'Staff', 'Member' || i, 'Caregiver ' || i,
      CASE WHEN i <= 6 THEN 'Registered Nurse' WHEN i <= 8 THEN 'Housekeeping Staff' ELSE 'Dietary Aide' END,
      'day', true, 'active'
    );
  END LOOP;

  -- Create supervisors (2)
  FOR i IN 1..2 LOOP
    INSERT INTO user_profiles (id, role_id, agency_id, display_name, is_active)
    VALUES (v_supervisors[i], v_supervisor_role_id, v_agency_id, 'Supervisor ' || i, true);
  END LOOP;

  -- Create admin (1)
  INSERT INTO user_profiles (id, role_id, agency_id, display_name, is_active)
  VALUES (v_admin_id, v_admin_role_id, v_agency_id, 'Admin', true);

  -- Create residents (8)
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

  -- Create senior/family users (2)
  INSERT INTO user_profiles (id, role_id, display_name, is_active)
  VALUES
    (v_senior_id, v_senior_role_id, 'Dorothy Miller', true),
    (v_family_id, v_family_role_id, 'Robert Miller Jr', true);

  INSERT INTO senior_resident_links (senior_user_id, resident_id, relationship, is_primary)
  VALUES (v_senior_id, v_residents[1], 'SELF', true)
  ON CONFLICT DO NOTHING;

  INSERT INTO family_resident_links (family_user_id, resident_id, relationship, can_manage_medications, can_manage_appointments, can_view_documents)
  VALUES (v_family_id, v_residents[1], 'SON', true, true, true)
  ON CONFLICT DO NOTHING;

  -- Create task categories (2)
  INSERT INTO task_categories (id, agency_id, name, category_type, description, default_priority, requires_evidence)
  VALUES
    (gen_random_uuid(), v_agency_id, 'Medication Administration', 'NURSING', 'Administer scheduled medications per care plan', 'HIGH', true),
    (gen_random_uuid(), v_agency_id, 'Vital Signs Check', 'NURSING', 'Record temperature, blood pressure, pulse, respiration', 'MEDIUM', true);

  SELECT id INTO v_cat_meds FROM task_categories WHERE agency_id = v_agency_id AND name = 'Medication Administration';
  SELECT id INTO v_cat_vitals FROM task_categories WHERE agency_id = v_agency_id AND name = 'Vital Signs Check';

  -- Create tasks (16 today)
  FOR i IN 1..8 LOOP
    INSERT INTO tasks (agency_id, department_id, category_id, resident_id, title, description, priority, status, scheduled_start, scheduled_end, created_at)
    VALUES (v_agency_id, v_dept_nursing, v_cat_meds, v_residents[i], 'Morning Medications - Resident ' || i, 'Administer scheduled morning medications', 'HIGH', CASE WHEN i <= 3 THEN 'COMPLETED' WHEN i <= 5 THEN 'IN_PROGRESS' ELSE 'PENDING' END, v_today + interval '9 hours', v_today + interval '10 hours', v_today);

    INSERT INTO tasks (agency_id, department_id, category_id, resident_id, title, description, priority, status, scheduled_start, scheduled_end, created_at)
    VALUES (v_agency_id, v_dept_nursing, v_cat_vitals, v_residents[i], 'Vital Signs - Resident ' || i, 'Record vital signs (BP, temp, pulse, O2)', 'MEDIUM', CASE WHEN i <= 4 THEN 'COMPLETED' ELSE 'PENDING' END, v_today + interval '8 hours', v_today + interval '9 hours', v_today);
  END LOOP;

  -- Create medications (4)
  INSERT INTO resident_medications (resident_id, medication_name, dosage, dosage_unit, frequency, route, scheduled_time, status, instructions, prescribed_by, start_date)
  VALUES
    (v_residents[1], 'Lisinopril', '10', 'mg', 'Once daily', 'ORAL', '09:00', 'ACTIVE', 'Take with food', 'Dr. Johnson', v_today - interval '30 days'),
    (v_residents[1], 'Metformin', '500', 'mg', 'Twice daily', 'ORAL', '09:00', 'ACTIVE', 'Take with meals', 'Dr. Johnson', v_today - interval '30 days'),
    (v_residents[2], 'Atorvastatin', '20', 'mg', 'Once daily', 'ORAL', '20:00', 'ACTIVE', 'Take at bedtime', 'Dr. Chen', v_today - interval '60 days'),
    (v_residents[3], 'Insulin Glargine', '20', 'units', 'Once daily', 'SUBCUTANEOUS', '08:00', 'ACTIVE', 'Inject subcutaneously', 'Dr. Rodriguez', v_today - interval '90 days');

  -- Create appointments (3)
  INSERT INTO appointments (resident_id, appointment_type, title, scheduled_at, duration_minutes, status, provider_name, location, notes)
  VALUES
    (v_residents[1], 'DOCTOR_VISIT', 'Annual Physical Exam', v_today + interval '3 days' + interval '10 hours', 60, 'SCHEDULED', 'Dr. Johnson', 'Portland Medical Center', 'Bring current medication list'),
    (v_residents[2], 'CARDIOLOGY', 'Cardiology Follow-up', v_today + interval '5 days' + interval '14 hours', 45, 'SCHEDULED', 'Dr. Chen', 'Heart Specialists Clinic', 'Post-procedure checkup'),
    (v_residents[1], 'LAB_WORK', 'Blood Work', v_today - interval '5 days', 30, 'COMPLETED', 'Lab Services', 'Sunrise Lab', 'Results available for review');

  -- Create lab results (2)
  INSERT INTO lab_test_results (resident_id, test_type, test_name, test_date, result_value, result_unit, reference_range, status, ordered_by, notes)
  VALUES
    (v_residents[1], 'BLOOD_WORK', 'HbA1c', v_today - interval '5 days', '6.8', '%', '4.0-5.6', 'FINAL', 'Dr. Johnson', 'Slightly elevated, monitor diet'),
    (v_residents[1], 'BLOOD_WORK', 'Glucose (Fasting)', v_today - interval '5 days', '128', 'mg/dL', '70-100', 'FINAL', 'Dr. Johnson', 'Elevated but improving');

  -- Create devices (2)
  INSERT INTO device_registry (resident_id, device_type, manufacturer, model_name, serial_number, pairing_status, paired_at, last_sync_at, trust_level)
  VALUES
    (v_residents[1], 'BLOOD_PRESSURE_MONITOR', 'Omron', 'Evolv BP7000', 'OM-BP-001', 'PAIRED', v_today - interval '30 days', v_today - interval '2 hours', 'VERIFIED'),
    (v_residents[1], 'GLUCOSE_METER', 'OneTouch', 'Verio Flex', 'OT-GM-001', 'PAIRED', v_today - interval '45 days', v_today - interval '4 hours', 'VERIFIED');

  -- Create health metrics (182 readings)
  FOR i IN 1..8 LOOP
    FOR j IN 0..6 LOOP
      INSERT INTO health_metric_trends (resident_id, metric_type, metric_value, metric_unit, recorded_at, data_source)
      VALUES (v_residents[i], 'BLOOD_PRESSURE_SYSTOLIC', 120 + (random() * 20)::int, 'mmHg', v_today - (j || ' days')::interval + interval '9 hours', CASE WHEN i = 1 THEN 'DEVICE' ELSE 'MANUAL_ENTRY' END);
      
      INSERT INTO health_metric_trends (resident_id, metric_type, metric_value, metric_unit, recorded_at, data_source)
      VALUES (v_residents[i], 'BLOOD_PRESSURE_DIASTOLIC', 75 + (random() * 15)::int, 'mmHg', v_today - (j || ' days')::interval + interval '9 hours', CASE WHEN i = 1 THEN 'DEVICE' ELSE 'MANUAL_ENTRY' END);
      
      INSERT INTO health_metric_trends (resident_id, metric_type, metric_value, metric_unit, recorded_at, data_source)
      VALUES (v_residents[i], 'HEART_RATE', 70 + (random() * 15)::int, 'bpm', v_today - (j || ' days')::interval + interval '9 hours', 'MANUAL_ENTRY');
    END LOOP;
  END LOOP;

  FOR j IN 0..13 LOOP
    INSERT INTO health_metric_trends (resident_id, metric_type, metric_value, metric_unit, recorded_at, data_source)
    VALUES (v_residents[1], 'BLOOD_GLUCOSE', 95 + (random() * 50)::int, 'mg/dL', v_today - (j || ' days')::interval + interval '8 hours', 'DEVICE');
  END LOOP;

  -- Create care plans (2)
  INSERT INTO care_plan_anchors (resident_id, plan_type, title, description, goals, interventions, status, effective_date, review_date, created_by_name)
  VALUES
    (v_residents[1], 'CHRONIC_DISEASE', 'Diabetes & Hypertension Management', 'Comprehensive care plan for managing diabetes and high blood pressure', '["Maintain HbA1c below 7.0%", "Keep blood pressure below 140/90"]'::jsonb, '["Daily blood glucose monitoring", "Weekly blood pressure checks"]'::jsonb, 'ACTIVE', v_today - interval '60 days', v_today + interval '30 days', 'Dr. Johnson'),
    (v_residents[2], 'CHRONIC_DISEASE', 'Cardiovascular Health', 'Post-cardiac event management and prevention plan', '["Maintain cholesterol levels within range", "Regular exercise program"]'::jsonb, '["Monthly cardiology follow-up visits", "Daily low-dose aspirin"]'::jsonb, 'ACTIVE', v_today - interval '90 days', v_today + interval '60 days', 'Dr. Chen');

  -- Create documents (2)
  INSERT INTO documents (resident_id, document_type, title, description, file_size, mime_type, uploaded_by_name, uploaded_at, status)
  VALUES
    (v_residents[1], 'MEDICAL_RECORD', 'Physical Exam - February 2026', 'Annual physical examination results and assessment', 245000, 'application/pdf', 'Dr. Johnson', v_today - interval '10 days', 'ACTIVE'),
    (v_residents[1], 'LAB_RESULT', 'Blood Work - January 2026', 'HbA1c and glucose panel results', 128000, 'application/pdf', 'Lab Services', v_today - interval '5 days', 'ACTIVE');

  -- Create notifications (2)
  INSERT INTO notification_log (recipient_user_id, notification_type, channel, title, message, priority, status, sent_at, metadata)
  VALUES
    (v_family_id, 'LAB_RESULT', 'IN_APP', 'New Lab Results Available', 'Lab results from January 30 blood work are now available for review in the Documents section', 'MEDIUM', 'DELIVERED', v_today - interval '5 days', '{"resident_name": "Dorothy Miller"}'::jsonb),
    (v_senior_id, 'MEDICATION_REMINDER', 'IN_APP', 'Medication Reminder', 'Time to take your morning medications: Lisinopril 10mg and Metformin 500mg', 'HIGH', 'DELIVERED', v_today + interval '9 hours', '{"medications": ["Lisinopril", "Metformin"]}'::jsonb);

  -- Create brain state (1)
  INSERT INTO brain_state (agency_id, state_type, global_status, emergency_count, high_priority_count, active_alerts, computed_at, metadata)
  VALUES (v_agency_id, 'OPERATIONAL', 'ALL_CLEAR', 0, 0, '[]'::jsonb, now(), '{"residents_monitored": 8, "tasks_pending": 8}'::jsonb);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Comprehensive showcase data seeded successfully',
    'summary', jsonb_build_object(
      'residents', 8,
      'caregivers', 10,
      'supervisors', 2,
      'admin', 1,
      'senior_family', 2,
      'total_users', 15,
      'medications', (SELECT count(*) FROM resident_medications WHERE resident_id = ANY(v_residents)),
      'appointments', (SELECT count(*) FROM appointments WHERE resident_id = ANY(v_residents)),
      'lab_results', (SELECT count(*) FROM lab_test_results WHERE resident_id = ANY(v_residents)),
      'devices', (SELECT count(*) FROM device_registry WHERE resident_id = ANY(v_residents)),
      'tasks', (SELECT count(*) FROM tasks WHERE agency_id = v_agency_id),
      'health_metrics', (SELECT count(*) FROM health_metric_trends WHERE resident_id = ANY(v_residents)),
      'care_plans', (SELECT count(*) FROM care_plan_anchors WHERE resident_id = ANY(v_residents)),
      'documents', (SELECT count(*) FROM documents WHERE resident_id = ANY(v_residents)),
      'notifications', 2
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION seed_comprehensive_showcase_data() TO anon, authenticated;
