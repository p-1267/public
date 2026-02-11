-- Fix seed: use A/B/C for risk levels

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
  v_caregiver_user_id uuid;
  v_supervisor_user_id uuid;
  v_resident_id uuid;
  v_senior_role_id uuid;
  v_family_role_id uuid;
  v_caregiver_role_id uuid;
  v_supervisor_role_id uuid;
  v_device_id uuid;
  v_dept_nursing_id uuid;
  v_timestamp timestamptz;
  v_systolic int;
  v_diastolic int;
  v_cat_medication uuid;
  v_cat_vitals uuid;
  v_cat_wellness uuid;
  v_cat_clinical uuid;
BEGIN
  v_agency_id := 'a0000000-0000-0000-0000-000000000010'::uuid;
  v_senior_user_id := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_family_user_id := 'a0000000-0000-0000-0000-000000000002'::uuid;
  v_caregiver_user_id := 'a0000000-0000-0000-0000-000000000003'::uuid;
  v_supervisor_user_id := 'a0000000-0000-0000-0000-000000000005'::uuid;
  v_resident_id := 'b0000000-0000-0000-0000-000000000001'::uuid;

  SELECT id INTO v_senior_role_id FROM roles WHERE name = 'SENIOR' LIMIT 1;
  SELECT id INTO v_family_role_id FROM roles WHERE name = 'FAMILY_ADMIN' LIMIT 1;
  SELECT id INTO v_caregiver_role_id FROM roles WHERE name = 'CAREGIVER' LIMIT 1;
  SELECT id INTO v_supervisor_role_id FROM roles WHERE name = 'SUPERVISOR' LIMIT 1;

  INSERT INTO agencies (id, name, status)
  VALUES (v_agency_id, 'Showcase Living Community', 'active')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  INSERT INTO user_profiles (id, role_id, agency_id, display_name, is_active)
  VALUES
    (v_senior_user_id, v_senior_role_id, v_agency_id, 'Dorothy Miller', true),
    (v_family_user_id, v_family_role_id, v_agency_id, 'Robert Miller', true),
    (v_caregiver_user_id, v_caregiver_role_id, v_agency_id, 'Mike Chen', true),
    (v_supervisor_user_id, v_supervisor_role_id, v_agency_id, 'Sarah Johnson', true)
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

  INSERT INTO residents (id, agency_id, full_name, date_of_birth, status, metadata)
  VALUES (
    v_resident_id, v_agency_id, 'Dorothy Miller', '1946-03-15', 'active',
    '{"room": "A-101", "care_level": "INDEPENDENT"}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  INSERT INTO senior_resident_links (senior_user_id, resident_id)
  VALUES (v_senior_user_id, v_resident_id)
  ON CONFLICT (senior_user_id, resident_id) DO NOTHING;

  INSERT INTO family_resident_links (family_user_id, resident_id)
  VALUES (v_family_user_id, v_resident_id)
  ON CONFLICT (family_user_id, resident_id) DO NOTHING;

  DELETE FROM resident_medications WHERE resident_id = v_resident_id;
  INSERT INTO resident_medications (resident_id, medication_name, dosage, frequency, route, schedule, prescriber_name, is_active, start_date, entered_by)
  VALUES
    (v_resident_id, 'Lisinopril', '10mg', 'DAILY', 'ORAL', '{"times": ["08:00"]}'::jsonb, 'Dr. Johnson', true, CURRENT_DATE - 90, v_family_user_id),
    (v_resident_id, 'Metformin', '500mg', 'TWICE_DAILY', 'ORAL', '{"times": ["08:00", "18:00"]}'::jsonb, 'Dr. Johnson', true, CURRENT_DATE - 180, v_family_user_id);

  DELETE FROM appointments WHERE resident_id = v_resident_id;
  INSERT INTO appointments (resident_id, title, appointment_type, scheduled_at, location, provider_name, status)
  VALUES
    (v_resident_id, 'Follow-up with Dr. Johnson', 'DOCTOR_VISIT', CURRENT_DATE + 3 + interval '10 hours', 'Medical Center', 'Dr. Johnson', 'SCHEDULED'),
    (v_resident_id, 'Routine Lab Work', 'SCREENING', CURRENT_DATE + 7 + interval '9 hours', 'Quest Diagnostics', 'Lab Tech', 'SCHEDULED');

  INSERT INTO device_registry (id, device_id, resident_id, device_type, device_name, manufacturer, model, firmware_version, battery_level, trust_state, capabilities, pairing_actor, pairing_timestamp)
  VALUES (
    gen_random_uuid(), 'OMRON-BP-SHOWCASE', v_resident_id,
    'BLE_HEALTH_SENSOR', 'OMRON Evolv', 'OMRON', 'BP7900', '2.1.4', 85, 'TRUSTED',
    '{"supported_metrics": ["BLOOD_PRESSURE_SYSTOLIC", "BLOOD_PRESSURE_DIASTOLIC", "HEART_RATE"]}'::jsonb,
    v_senior_user_id, now() - interval '30 days'
  )
  ON CONFLICT (device_id) DO UPDATE SET battery_level = EXCLUDED.battery_level
  RETURNING id INTO v_device_id;

  DELETE FROM health_metrics WHERE resident_id = v_resident_id;
  FOR i IN 0..6 LOOP
    v_timestamp := now() - (i || ' days')::interval + interval '8 hours';
    v_systolic := 125 + (random() * 15)::int;
    v_diastolic := 78 + (random() * 10)::int;

    INSERT INTO health_metrics (resident_id, device_registry_id, metric_category, metric_type, value_numeric, unit, confidence_level, measurement_source, recorded_at)
    VALUES
      (v_resident_id, v_device_id, 'CARDIOVASCULAR', 'BLOOD_PRESSURE_SYSTOLIC', v_systolic, 'mmHg', 'HIGH', 'AUTOMATIC_DEVICE', v_timestamp),
      (v_resident_id, v_device_id, 'CARDIOVASCULAR', 'BLOOD_PRESSURE_DIASTOLIC', v_diastolic, 'mmHg', 'HIGH', 'AUTOMATIC_DEVICE', v_timestamp),
      (v_resident_id, v_device_id, 'CARDIOVASCULAR', 'HEART_RATE', 72 + (random() * 12)::int, 'bpm', 'HIGH', 'AUTOMATIC_DEVICE', v_timestamp);
  END LOOP;

  DELETE FROM health_metric_trends WHERE resident_id = v_resident_id;
  PERFORM calculate_health_metric_trends(v_resident_id, 'BLOOD_PRESSURE_SYSTOLIC');
  PERFORM calculate_health_metric_trends(v_resident_id, 'BLOOD_PRESSURE_DIASTOLIC');
  PERFORM calculate_health_metric_trends(v_resident_id, 'HEART_RATE');

  INSERT INTO departments (id, agency_id, name, department_code, supervisor_id)
  VALUES (gen_random_uuid(), v_agency_id, 'Nursing', 'NURSING', v_supervisor_user_id)
  ON CONFLICT (agency_id, department_code) DO UPDATE SET name = EXCLUDED.name, supervisor_id = EXCLUDED.supervisor_id
  RETURNING id INTO v_dept_nursing_id;

  INSERT INTO department_personnel (department_id, user_id, agency_id, employee_id, position_title)
  VALUES (v_dept_nursing_id, v_caregiver_user_id, v_agency_id, 'EMP003', 'Registered Nurse')
  ON CONFLICT (department_id, user_id) DO NOTHING;

  SELECT id INTO v_cat_medication FROM task_categories WHERE name = 'Medication Administration' AND agency_id = v_agency_id LIMIT 1;
  SELECT id INTO v_cat_vitals FROM task_categories WHERE name = 'Vital Signs Check' AND agency_id = v_agency_id LIMIT 1;
  SELECT id INTO v_cat_wellness FROM task_categories WHERE name = 'Wellness Check' AND agency_id = v_agency_id LIMIT 1;
  SELECT id INTO v_cat_clinical FROM task_categories WHERE name = 'Clinical Care' AND agency_id = v_agency_id LIMIT 1;

  DELETE FROM tasks WHERE resident_id = v_resident_id;

  -- NOW: 3 tasks IN_PROGRESS
  INSERT INTO tasks (agency_id, resident_id, category_id, task_name, description, priority, risk_level, state, scheduled_start, scheduled_end, actual_start, owner_user_id, requires_evidence, evidence_submitted, is_recurring, escalation_level, is_emergency, is_blocked)
  VALUES
    (v_agency_id, v_resident_id, v_cat_medication, 'Administer 8AM Medications', 'Lisinopril 10mg, Metformin 500mg', 'high', 'B', 'IN_PROGRESS', CURRENT_TIMESTAMP - interval '10 minutes', CURRENT_TIMESTAMP + interval '20 minutes', CURRENT_TIMESTAMP - interval '10 minutes', v_caregiver_user_id, true, false, false, 0, false, false),
    (v_agency_id, v_resident_id, v_cat_vitals, 'Morning Vital Signs', 'BP, HR, Temp, O2 sat', 'high', 'A', 'IN_PROGRESS', CURRENT_TIMESTAMP - interval '15 minutes', CURRENT_TIMESTAMP + interval '15 minutes', CURRENT_TIMESTAMP - interval '15 minutes', v_caregiver_user_id, true, false, false, 0, false, false),
    (v_agency_id, v_resident_id, v_cat_wellness, 'Wellness Check-in', 'Assess mood, pain level, sleep quality', 'medium', 'A', 'IN_PROGRESS', CURRENT_TIMESTAMP - interval '5 minutes', CURRENT_TIMESTAMP + interval '25 minutes', CURRENT_TIMESTAMP - interval '5 minutes', v_caregiver_user_id, false, false, false, 0, false, false);

  -- NOW: 2 tasks PENDING
  INSERT INTO tasks (agency_id, resident_id, category_id, task_name, description, priority, risk_level, state, scheduled_start, scheduled_end, owner_user_id, requires_evidence, evidence_submitted, is_recurring, escalation_level, is_emergency, is_blocked)
  VALUES
    (v_agency_id, v_resident_id, v_cat_clinical, 'Wound Care - Left Leg', 'Clean and redress surgical site', 'high', 'B', 'PENDING', CURRENT_TIMESTAMP + interval '30 minutes', CURRENT_TIMESTAMP + interval '50 minutes', v_caregiver_user_id, true, false, false, 0, false, false),
    (v_agency_id, v_resident_id, v_cat_wellness, 'Hydration Check', 'Ensure adequate fluid intake', 'medium', 'A', 'PENDING', CURRENT_TIMESTAMP + interval '1 hour', CURRENT_TIMESTAMP + interval '1 hour 15 minutes', v_caregiver_user_id, false, false, false, 0, false, false);

  -- NEXT: 2 tasks
  INSERT INTO tasks (agency_id, resident_id, category_id, task_name, description, priority, risk_level, state, scheduled_start, scheduled_end, owner_user_id, requires_evidence, evidence_submitted, is_recurring, escalation_level, is_emergency, is_blocked)
  VALUES
    (v_agency_id, v_resident_id, v_cat_medication, 'Administer 12PM Medications', 'As prescribed', 'high', 'B', 'PENDING', CURRENT_TIMESTAMP + interval '3 hours', CURRENT_TIMESTAMP + interval '3 hours 30 minutes', v_caregiver_user_id, true, false, false, 0, false, false),
    (v_agency_id, v_resident_id, v_cat_vitals, 'Afternoon Vital Check', 'BP, HR per care plan', 'medium', 'A', 'PENDING', CURRENT_TIMESTAMP + interval '3 hours 30 minutes', CURRENT_TIMESTAMP + interval '3 hours 45 minutes', v_caregiver_user_id, true, false, false, 0, false, false);

  -- LATER: 3 tasks
  INSERT INTO tasks (agency_id, resident_id, category_id, task_name, description, priority, risk_level, state, scheduled_start, scheduled_end, owner_user_id, requires_evidence, evidence_submitted, is_recurring, escalation_level, is_emergency, is_blocked)
  VALUES
    (v_agency_id, v_resident_id, v_cat_medication, 'Administer 6PM Medications', 'Evening dose Metformin 500mg', 'high', 'B', 'PENDING', CURRENT_TIMESTAMP + interval '9 hours', CURRENT_TIMESTAMP + interval '9 hours 30 minutes', v_caregiver_user_id, true, false, false, 0, false, false),
    (v_agency_id, v_resident_id, v_cat_vitals, 'Evening Vital Check', 'Final vitals before bed', 'medium', 'A', 'PENDING', CURRENT_TIMESTAMP + interval '10 hours', CURRENT_TIMESTAMP + interval '10 hours 15 minutes', v_caregiver_user_id, true, false, false, 0, false, false),
    (v_agency_id, v_resident_id, v_cat_wellness, 'Bedtime Routine', 'Prepare for sleep, ensure comfort', 'low', 'A', 'PENDING', CURRENT_TIMESTAMP + interval '12 hours', CURRENT_TIMESTAMP + interval '12 hours 30 minutes', v_caregiver_user_id, false, false, false, 0, false, false);

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'message', 'Showcase seeded with fixed IDs and caregiver tasks',
    'resident_id', v_resident_id,
    'tasks_created', 10
  );
END;
$$;

GRANT EXECUTE ON FUNCTION seed_senior_family_scenario() TO authenticated, anon;
