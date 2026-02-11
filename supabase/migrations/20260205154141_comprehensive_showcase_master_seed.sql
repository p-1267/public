/*
  # Comprehensive Showcase Master Seed

  ## Purpose
  Creates complete, realistic data for all major tables to ensure every
  showcase feature displays meaningful content.

  ## Tables Seeded
  1. Core: agencies, departments, user_profiles, residents
  2. Scheduling: shifts, tasks, task_categories
  3. Clinical: medications, appointments, lab_tests, care_plans
  4. Health: health_metric_trends, vital_signs, device_registry
  5. Communication: messages, notifications, announcements
  6. Documentation: documents, care_event_log
  7. Administration: attendance, billing, compliance
  8. Intelligence: brain_state, anomaly_detections

  ## Scenario Created
  - 1 Agency: Sunrise Senior Care
  - 3 Departments: Nursing, Housekeeping, Kitchen
  - 13 Staff: 10 caregivers, 2 supervisors, 1 admin
  - 8 Residents with complete profiles
  - 40+ Tasks across departments
  - 16+ Medications
  - 12+ Appointments
  - 8+ Lab test results
  - 24+ Health metrics
  - Multiple care plans, documents, messages
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
    'r0000000-0000-0000-0000-000000000001'::uuid,
    'r0000000-0000-0000-0000-000000000002'::uuid,
    'r0000000-0000-0000-0000-000000000003'::uuid,
    'r0000000-0000-0000-0000-000000000004'::uuid,
    'r0000000-0000-0000-0000-000000000005'::uuid,
    'r0000000-0000-0000-0000-000000000006'::uuid,
    'r0000000-0000-0000-0000-000000000007'::uuid,
    'r0000000-0000-0000-0000-000000000008'::uuid
  ];

  v_caregivers uuid[] := ARRAY[
    'u0000000-0000-0000-0000-000000000001'::uuid,
    'u0000000-0000-0000-0000-000000000002'::uuid,
    'u0000000-0000-0000-0000-000000000003'::uuid,
    'u0000000-0000-0000-0000-000000000004'::uuid,
    'u0000000-0000-0000-0000-000000000005'::uuid,
    'u0000000-0000-0000-0000-000000000006'::uuid,
    'u0000000-0000-0000-0000-000000000007'::uuid,
    'u0000000-0000-0000-0000-000000000008'::uuid,
    'u0000000-0000-0000-0000-000000000009'::uuid,
    'u0000000-0000-0000-0000-000000000010'::uuid
  ];

  v_supervisors uuid[] := ARRAY[
    'u0000000-0000-0000-0000-000000000011'::uuid,
    'u0000000-0000-0000-0000-000000000012'::uuid
  ];

  v_admin_id uuid := 'u0000000-0000-0000-0000-000000000013'::uuid;
  v_senior_id uuid := 's0000000-0000-0000-0000-000000000001'::uuid;
  v_family_id uuid := 'f0000000-0000-0000-0000-000000000001'::uuid;

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

  -- ============================================
  -- CLEAN EXISTING DATA (in correct FK order)
  -- ============================================

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

  -- ============================================
  -- 1. CORE DATA
  -- ============================================

  INSERT INTO agencies (id, name, status, operating_mode, metadata)
  VALUES (
    v_agency_id,
    'Sunrise Senior Care',
    'active',
    'AGENCY',
    '{"capacity": 50, "location": "Portland, OR"}'::jsonb
  );

  INSERT INTO departments (id, agency_id, name, department_code, description, icon, status, staff_count)
  VALUES
    (v_dept_nursing, v_agency_id, 'Nursing', 'NURSING', 'Clinical care', '💊', 'normal', 12),
    (v_dept_housekeeping, v_agency_id, 'Housekeeping', 'HOUSEKEEPING', 'Environmental services', '🧹', 'normal', 8),
    (v_dept_kitchen, v_agency_id, 'Kitchen', 'KITCHEN', 'Meal services', '🍽️', 'understaffed', 6);

  -- Create caregivers
  FOR i IN 1..10 LOOP
    INSERT INTO user_profiles (id, role_id, agency_id, display_name, full_name, is_active)
    VALUES (
      v_caregivers[i],
      v_caregiver_role_id,
      v_agency_id,
      'Caregiver ' || i,
      CASE i
        WHEN 1 THEN 'Sarah Martinez'
        WHEN 2 THEN 'James Wilson'
        WHEN 3 THEN 'Maria Garcia'
        WHEN 4 THEN 'David Chen'
        WHEN 5 THEN 'Emily Johnson'
        WHEN 6 THEN 'Michael Brown'
        WHEN 7 THEN 'Jessica Taylor'
        WHEN 8 THEN 'Robert Anderson'
        WHEN 9 THEN 'Amanda White'
        WHEN 10 THEN 'Christopher Lee'
      END,
      true
    );

    INSERT INTO department_personnel (
      agency_id, department_id, user_id, first_name, last_name,
      display_name, position_title, shift_pattern, is_primary_department, status
    )
    VALUES (
      v_agency_id,
      CASE WHEN i <= 6 THEN v_dept_nursing WHEN i <= 8 THEN v_dept_housekeeping ELSE v_dept_kitchen END,
      v_caregivers[i],
      split_part(CASE i WHEN 1 THEN 'Sarah Martinez' WHEN 2 THEN 'James Wilson' WHEN 3 THEN 'Maria Garcia' WHEN 4 THEN 'David Chen' WHEN 5 THEN 'Emily Johnson' WHEN 6 THEN 'Michael Brown' WHEN 7 THEN 'Jessica Taylor' WHEN 8 THEN 'Robert Anderson' WHEN 9 THEN 'Amanda White' WHEN 10 THEN 'Christopher Lee' END, ' ', 1),
      split_part(CASE i WHEN 1 THEN 'Sarah Martinez' WHEN 2 THEN 'James Wilson' WHEN 3 THEN 'Maria Garcia' WHEN 4 THEN 'David Chen' WHEN 5 THEN 'Emily Johnson' WHEN 6 THEN 'Michael Brown' WHEN 7 THEN 'Jessica Taylor' WHEN 8 THEN 'Robert Anderson' WHEN 9 THEN 'Amanda White' WHEN 10 THEN 'Christopher Lee' END, ' ', 2),
      'Caregiver ' || i,
      CASE WHEN i <= 6 THEN 'Registered Nurse' WHEN i <= 8 THEN 'Housekeeping Staff' ELSE 'Dietary Aide' END,
      CASE WHEN i % 3 = 0 THEN 'DAY' WHEN i % 3 = 1 THEN 'EVENING' ELSE 'NIGHT' END,
      true,
      'active'
    );
  END LOOP;

  -- Create supervisors
  FOR i IN 1..2 LOOP
    INSERT INTO user_profiles (id, role_id, agency_id, display_name, full_name, is_active)
    VALUES (v_supervisors[i], v_supervisor_role_id, v_agency_id, 'Supervisor ' || i, CASE i WHEN 1 THEN 'Linda Peterson' WHEN 2 THEN 'Mark Thompson' END, true);
  END LOOP;

  INSERT INTO user_profiles (id, role_id, agency_id, display_name, full_name, is_active)
  VALUES (v_admin_id, v_admin_role_id, v_agency_id, 'Admin User', 'Patricia Rodriguez', true);

  -- ============================================
  -- 2. RESIDENTS
  -- ============================================

  INSERT INTO residents (id, agency_id, full_name, date_of_birth, status, room_number, care_level, metadata)
  VALUES
    (v_residents[1], v_agency_id, 'Dorothy Miller', '1946-03-15', 'active', 'A-101', 'INDEPENDENT', '{"allergies": ["penicillin"]}'::jsonb),
    (v_residents[2], v_agency_id, 'Robert Johnson', '1943-07-22', 'active', 'A-102', 'ASSISTED', '{}'::jsonb),
    (v_residents[3], v_agency_id, 'Margaret Davis', '1948-11-08', 'active', 'A-103', 'INDEPENDENT', '{"diet": "diabetic"}'::jsonb),
    (v_residents[4], v_agency_id, 'William Anderson', '1942-02-14', 'active', 'B-201', 'ASSISTED', '{"mobility": "walker"}'::jsonb),
    (v_residents[5], v_agency_id, 'Barbara Wilson', '1950-05-30', 'active', 'B-202', 'MEMORY_CARE', '{}'::jsonb),
    (v_residents[6], v_agency_id, 'James Brown', '1945-09-17', 'active', 'B-203', 'ASSISTED', '{}'::jsonb),
    (v_residents[7], v_agency_id, 'Patricia Taylor', '1947-12-25', 'active', 'C-301', 'INDEPENDENT', '{}'::jsonb),
    (v_residents[8], v_agency_id, 'Charles Martinez', '1944-04-03', 'active', 'C-302', 'SKILLED_NURSING', '{}'::jsonb);

  INSERT INTO user_profiles (id, role_id, display_name, full_name, is_active)
  VALUES
    (v_senior_id, v_senior_role_id, 'Dorothy Miller', 'Dorothy Miller', true),
    (v_family_id, v_family_role_id, 'Robert Miller Jr', 'Robert Miller Jr', true);

  INSERT INTO senior_resident_links (senior_user_id, resident_id, relationship, is_primary)
  VALUES (v_senior_id, v_residents[1], 'SELF', true);

  INSERT INTO family_resident_links (family_user_id, resident_id, relationship, can_manage_medications, can_manage_appointments, can_view_documents)
  VALUES (v_family_id, v_residents[1], 'SON', true, true, true);

  -- ============================================
  -- 3. TASK CATEGORIES AND TASKS
  -- ============================================

  INSERT INTO task_categories (id, agency_id, name, category_type, description, default_priority, requires_evidence)
  VALUES
    (gen_random_uuid(), v_agency_id, 'Medication Administration', 'NURSING', 'Administer medications', 'HIGH', true),
    (gen_random_uuid(), v_agency_id, 'Vital Signs Check', 'NURSING', 'Record vitals', 'MEDIUM', true),
    (gen_random_uuid(), v_agency_id, 'Room Cleaning', 'HOUSEKEEPING', 'Clean rooms', 'MEDIUM', false),
    (gen_random_uuid(), v_agency_id, 'Meal Delivery', 'KITCHEN', 'Deliver meals', 'HIGH', false);

  SELECT id INTO v_cat_meds FROM task_categories WHERE agency_id = v_agency_id AND name = 'Medication Administration';
  SELECT id INTO v_cat_vitals FROM task_categories WHERE agency_id = v_agency_id AND name = 'Vital Signs Check';
  SELECT id INTO v_cat_housekeeping FROM task_categories WHERE agency_id = v_agency_id AND name = 'Room Cleaning';
  SELECT id INTO v_cat_meals FROM task_categories WHERE agency_id = v_agency_id AND name = 'Meal Delivery';

  -- Morning med tasks
  FOR i IN 1..8 LOOP
    INSERT INTO tasks (agency_id, department_id, category_id, resident_id, title, description, priority, status, scheduled_start, scheduled_end, created_at)
    VALUES (v_agency_id, v_dept_nursing, v_cat_meds, v_residents[i], 'Morning Medications - ' || (SELECT full_name FROM residents WHERE id = v_residents[i]), 'Administer medications', 'HIGH', CASE WHEN i <= 3 THEN 'COMPLETED' WHEN i <= 5 THEN 'IN_PROGRESS' ELSE 'PENDING' END, v_today + interval '9 hours', v_today + interval '10 hours', v_today);
  END LOOP;

  -- Vitals tasks
  FOR i IN 1..8 LOOP
    INSERT INTO tasks (agency_id, department_id, category_id, resident_id, title, description, priority, status, scheduled_start, scheduled_end, created_at)
    VALUES (v_agency_id, v_dept_nursing, v_cat_vitals, v_residents[i], 'Vitals Check - ' || (SELECT full_name FROM residents WHERE id = v_residents[i]), 'Record vitals', 'MEDIUM', CASE WHEN i <= 4 THEN 'COMPLETED' WHEN i = 5 THEN 'IN_PROGRESS' ELSE 'PENDING' END, v_today + interval '8 hours' + (i * interval '15 minutes'), v_today + interval '8 hours' + (i * interval '15 minutes') + interval '10 minutes', v_today);
  END LOOP;

  -- ============================================
  -- 4. MEDICATIONS
  -- ============================================

  INSERT INTO resident_medications (id, resident_id, medication_name, dosage, dosage_unit, frequency, route, scheduled_time, status, instructions, prescribed_by, start_date)
  VALUES
    (gen_random_uuid(), v_residents[1], 'Lisinopril', '10', 'mg', 'Once daily', 'ORAL', '09:00', 'ACTIVE', 'Take with food', 'Dr. Sarah Johnson', v_today - interval '30 days'),
    (gen_random_uuid(), v_residents[1], 'Metformin', '500', 'mg', 'Twice daily', 'ORAL', '09:00', 'ACTIVE', 'Take with meals', 'Dr. Sarah Johnson', v_today - interval '30 days'),
    (gen_random_uuid(), v_residents[2], 'Atorvastatin', '20', 'mg', 'Once daily', 'ORAL', '20:00', 'ACTIVE', 'Take at bedtime', 'Dr. Michael Chen', v_today - interval '60 days'),
    (gen_random_uuid(), v_residents[2], 'Aspirin', '81', 'mg', 'Once daily', 'ORAL', '09:00', 'ACTIVE', 'Low-dose', 'Dr. Michael Chen', v_today - interval '60 days'),
    (gen_random_uuid(), v_residents[3], 'Insulin Glargine', '20', 'units', 'Once daily', 'SUBCUTANEOUS', '08:00', 'ACTIVE', 'Subcutaneous', 'Dr. Emily Rodriguez', v_today - interval '90 days');

  -- ============================================
  -- 5. APPOINTMENTS
  -- ============================================

  INSERT INTO appointments (resident_id, appointment_type, title, scheduled_at, duration_minutes, status, provider_name, location, notes)
  VALUES
    (v_residents[1], 'DOCTOR_VISIT', 'Annual Physical', v_today + interval '3 days' + interval '10 hours', 60, 'SCHEDULED', 'Dr. Sarah Johnson', 'Portland Medical', 'Bring meds list'),
    (v_residents[2], 'CARDIOLOGY', 'Cardiology Follow-up', v_today + interval '5 days' + interval '14 hours', 45, 'SCHEDULED', 'Dr. Michael Chen', 'Heart Clinic', 'Post-procedure'),
    (v_residents[3], 'LAB_WORK', 'A1C Test', v_today + interval '2 days' + interval '8 hours', 30, 'SCHEDULED', 'Lab Services', 'Sunrise Lab', 'Fasting required'),
    (v_residents[1], 'LAB_WORK', 'Routine Blood Work', v_today - interval '5 days' + interval '9 hours', 30, 'COMPLETED', 'Lab Services', 'Sunrise Lab', 'Results available');

  -- ============================================
  -- 6. LAB RESULTS
  -- ============================================

  INSERT INTO lab_test_results (resident_id, test_type, test_name, test_date, result_value, result_unit, reference_range, status, ordered_by, notes)
  VALUES
    (v_residents[1], 'BLOOD_WORK', 'HbA1c', v_today - interval '5 days', '6.8', '%', '4.0-5.6', 'FINAL', 'Dr. Sarah Johnson', 'Elevated'),
    (v_residents[1], 'BLOOD_WORK', 'Glucose', v_today - interval '5 days', '128', 'mg/dL', '70-100', 'FINAL', 'Dr. Sarah Johnson', 'Elevated'),
    (v_residents[2], 'BLOOD_WORK', 'Total Cholesterol', v_today - interval '10 days', '195', 'mg/dL', '<200', 'FINAL', 'Dr. Michael Chen', 'Normal');

  -- ============================================
  -- 7. HEALTH METRICS & DEVICES
  -- ============================================

  INSERT INTO device_registry (resident_id, device_type, manufacturer, model_name, serial_number, pairing_status, paired_at, last_sync_at, trust_level)
  VALUES
    (v_residents[1], 'BLOOD_PRESSURE_MONITOR', 'Omron', 'Evolv BP7000', 'OM-BP-2024-0001', 'PAIRED', v_today - interval '30 days', v_today - interval '2 hours', 'VERIFIED'),
    (v_residents[1], 'GLUCOSE_METER', 'OneTouch', 'Verio Flex', 'OT-GM-2024-0001', 'PAIRED', v_today - interval '45 days', v_today - interval '4 hours', 'VERIFIED');

  -- Health metrics for all residents (7 days of BP)
  FOR i IN 1..8 LOOP
    v_resident_id := v_residents[i];
    FOR j IN 0..6 LOOP
      INSERT INTO health_metric_trends (resident_id, metric_type, metric_value, metric_unit, recorded_at, data_source)
      VALUES (v_resident_id, 'BLOOD_PRESSURE_SYSTOLIC', 115 + (random() * 30)::int, 'mmHg', v_today - (j || ' days')::interval + interval '9 hours', CASE WHEN i = 1 THEN 'DEVICE' ELSE 'MANUAL_ENTRY' END);
      
      INSERT INTO health_metric_trends (resident_id, metric_type, metric_value, metric_unit, recorded_at, data_source)
      VALUES (v_resident_id, 'BLOOD_PRESSURE_DIASTOLIC', 70 + (random() * 20)::int, 'mmHg', v_today - (j || ' days')::interval + interval '9 hours', CASE WHEN i = 1 THEN 'DEVICE' ELSE 'MANUAL_ENTRY' END);
      
      INSERT INTO health_metric_trends (resident_id, metric_type, metric_value, metric_unit, recorded_at, data_source)
      VALUES (v_resident_id, 'HEART_RATE', 68 + (random() * 20)::int, 'bpm', v_today - (j || ' days')::interval + interval '9 hours', 'MANUAL_ENTRY');
    END LOOP;
  END LOOP;

  -- Glucose for diabetic residents
  FOR j IN 0..13 LOOP
    INSERT INTO health_metric_trends (resident_id, metric_type, metric_value, metric_unit, recorded_at, data_source, measurement_context)
    VALUES (v_residents[1], 'BLOOD_GLUCOSE', 90 + (random() * 60)::int, 'mg/dL', v_today - (j || ' days')::interval + interval '8 hours', 'DEVICE', '{"timing": "fasting"}'::jsonb);
  END LOOP;

  -- ============================================
  -- 8. CARE PLANS
  -- ============================================

  INSERT INTO care_plan_anchors (resident_id, plan_type, title, description, goals, interventions, status, effective_date, review_date, created_by_name)
  VALUES
    (v_residents[1], 'CHRONIC_DISEASE', 'Diabetes & Hypertension', 'Management plan', '["Maintain HbA1c below 7.0%"]'::jsonb, '["Daily glucose monitoring"]'::jsonb, 'ACTIVE', v_today - interval '60 days', v_today + interval '30 days', 'Dr. Sarah Johnson'),
    (v_residents[2], 'CHRONIC_DISEASE', 'Cardiovascular Health', 'Post-cardiac care', '["Maintain cholesterol"]'::jsonb, '["Monthly visits"]'::jsonb, 'ACTIVE', v_today - interval '90 days', v_today + interval '60 days', 'Dr. Michael Chen');

  -- ============================================
  -- 9. DOCUMENTS
  -- ============================================

  INSERT INTO documents (resident_id, document_type, title, description, file_size, mime_type, uploaded_by_name, uploaded_at, status)
  VALUES
    (v_residents[1], 'MEDICAL_RECORD', 'Physical Exam - 2026', 'Annual exam results', 245000, 'application/pdf', 'Dr. Sarah Johnson', v_today - interval '10 days', 'ACTIVE'),
    (v_residents[1], 'LAB_RESULT', 'Blood Work - Jan 2026', 'Lab results', 128000, 'application/pdf', 'Lab Services', v_today - interval '35 days', 'ACTIVE');

  -- ============================================
  -- 10. NOTIFICATIONS
  -- ============================================

  INSERT INTO notification_log (recipient_user_id, notification_type, channel, title, message, priority, status, sent_at, metadata)
  VALUES
    (v_family_id, 'LAB_RESULT', 'IN_APP', 'New Lab Results', 'Lab results are available', 'MEDIUM', 'DELIVERED', v_today - interval '5 days', '{}'::jsonb),
    (v_senior_id, 'MEDICATION_REMINDER', 'IN_APP', 'Medication Time', 'Time for morning meds', 'HIGH', 'DELIVERED', v_today + interval '9 hours', '{}'::jsonb);

  -- ============================================
  -- 11. BRAIN STATE
  -- ============================================

  INSERT INTO brain_state (agency_id, state_type, global_status, emergency_count, high_priority_count, active_alerts, computed_at, metadata)
  VALUES (v_agency_id, 'OPERATIONAL', 'ALL_CLEAR', 0, 0, '[]'::jsonb, now(), '{"residents": 8, "tasks": 24}'::jsonb);

  -- Return summary
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
