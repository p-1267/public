/*
  # Step 7 - Fix health_metrics to include data_source
*/

DROP FUNCTION IF EXISTS seed_senior_family_scenario();

CREATE OR REPLACE FUNCTION seed_senior_family_scenario()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agency_id uuid := 'a0000000-0000-0000-0000-000000000001';
  v_senior_resident_id uuid;
  v_family_user_id uuid;
  v_caregiver_user_id uuid;
  v_med1_id uuid;
  v_med2_id uuid;
  v_task1_id uuid;
  v_task2_id uuid;
  v_task3_id uuid;
  v_category_id uuid;
  v_senior_role_id uuid;
  v_family_role_id uuid;
  v_caregiver_role_id uuid;
BEGIN
  SELECT id INTO v_senior_role_id FROM roles WHERE name = 'SENIOR' LIMIT 1;
  SELECT id INTO v_family_role_id FROM roles WHERE name = 'FAMILY_ADMIN' LIMIT 1;
  SELECT id INTO v_caregiver_role_id FROM roles WHERE name = 'CAREGIVER' LIMIT 1;

  INSERT INTO residents (id, agency_id, full_name, date_of_birth, status, metadata, created_at, updated_at)
  VALUES (gen_random_uuid(), v_agency_id, 'Eleanor Martinez', '1945-03-15', 'active', '{"room": "215B", "floor": 2}'::jsonb, now(), now())
  ON CONFLICT DO NOTHING RETURNING id INTO v_senior_resident_id;
  IF v_senior_resident_id IS NULL THEN SELECT id INTO v_senior_resident_id FROM residents WHERE full_name = 'Eleanor Martinez' LIMIT 1; END IF;

  INSERT INTO user_profiles (id, role_id, display_name, is_active, agency_id, created_at, updated_at)
  VALUES (gen_random_uuid(), v_family_role_id, 'Michael Martinez', true, v_agency_id, now(), now())
  ON CONFLICT DO NOTHING RETURNING id INTO v_family_user_id;
  IF v_family_user_id IS NULL THEN SELECT id INTO v_family_user_id FROM user_profiles WHERE display_name = 'Michael Martinez' LIMIT 1; END IF;

  INSERT INTO user_profiles (id, role_id, display_name, is_active, agency_id, created_at, updated_at)
  VALUES (gen_random_uuid(), v_caregiver_role_id, 'Sarah Johnson', true, v_agency_id, now(), now())
  ON CONFLICT DO NOTHING RETURNING id INTO v_caregiver_user_id;
  IF v_caregiver_user_id IS NULL THEN SELECT id INTO v_caregiver_user_id FROM user_profiles WHERE display_name = 'Sarah Johnson' LIMIT 1; END IF;

  INSERT INTO resident_medications (id, resident_id, medication_name, dosage, frequency, route, schedule, prescriber_name, is_prn, is_controlled, start_date, is_active, entered_by, language_context, created_at, updated_at)
  VALUES (gen_random_uuid(), v_senior_resident_id, 'Lisinopril', '10mg', 'Once daily', 'ORAL', '{"times": ["09:00"]}'::jsonb, 'Dr. Smith', false, false, CURRENT_DATE, true, v_caregiver_user_id, 'en-US', now(), now())
  ON CONFLICT DO NOTHING RETURNING id INTO v_med1_id;
  IF v_med1_id IS NULL THEN SELECT id INTO v_med1_id FROM resident_medications WHERE resident_id = v_senior_resident_id AND medication_name = 'Lisinopril' LIMIT 1; END IF;

  INSERT INTO resident_medications (id, resident_id, medication_name, dosage, frequency, route, schedule, prescriber_name, is_prn, is_controlled, start_date, is_active, entered_by, language_context, created_at, updated_at)
  VALUES (gen_random_uuid(), v_senior_resident_id, 'Metformin', '500mg', 'Twice daily', 'ORAL', '{"times": ["08:00", "20:00"]}'::jsonb, 'Dr. Smith', false, false, CURRENT_DATE, true, v_caregiver_user_id, 'en-US', now(), now())
  ON CONFLICT DO NOTHING RETURNING id INTO v_med2_id;
  IF v_med2_id IS NULL THEN SELECT id INTO v_med2_id FROM resident_medications WHERE resident_id = v_senior_resident_id AND medication_name = 'Metformin' LIMIT 1; END IF;

  INSERT INTO appointments (id, resident_id, appointment_type, title, scheduled_at, status, provider_name, created_at, updated_at)
  VALUES (gen_random_uuid(), v_senior_resident_id, 'FOLLOW_UP', 'Cardiology Follow-up', now() + interval '3 days', 'SCHEDULED', 'Dr. Johnson', now(), now())
  ON CONFLICT DO NOTHING;

  INSERT INTO resident_emergency_contacts (id, resident_id, contact_name, relationship, phone_primary, is_primary, contact_order, entered_by, language_context, created_at, updated_at)
  VALUES (gen_random_uuid(), v_senior_resident_id, 'Michael Martinez', 'Son', '+1-555-0123', true, 1, v_caregiver_user_id, 'en-US', now(), now())
  ON CONFLICT DO NOTHING;

  SELECT id INTO v_category_id FROM task_categories WHERE category_type = 'clinical' AND agency_id = v_agency_id LIMIT 1;
  IF v_category_id IS NULL THEN
    INSERT INTO task_categories (id, agency_id, name, category_type, default_priority, default_risk_level, requires_evidence, allows_skip, is_active, sort_order, created_at, updated_at)
    VALUES (gen_random_uuid(), v_agency_id, 'Medication Administration', 'clinical', 'high', 'A', true, false, true, 1, now(), now())
    RETURNING id INTO v_category_id;
  END IF;

  DELETE FROM tasks WHERE resident_id = v_senior_resident_id AND state = 'in_progress';

  INSERT INTO tasks (id, agency_id, resident_id, category_id, task_name, description, priority, risk_level, state, scheduled_start, scheduled_end, owner_user_id, requires_evidence, evidence_submitted, is_recurring, escalation_level, is_emergency, is_blocked, supervisor_acknowledged, is_simulation, created_at, updated_at)
  VALUES (gen_random_uuid(), v_agency_id, v_senior_resident_id, v_category_id, 'Morning Medication Round', 'Administer morning medications', 'high', 'A', 'in_progress', date_trunc('hour', now()), date_trunc('hour', now()) + interval '30 minutes', v_caregiver_user_id, true, false, false, 0, false, false, false, false, now(), now())
  RETURNING id INTO v_task1_id;

  INSERT INTO tasks (id, agency_id, resident_id, category_id, task_name, description, priority, risk_level, state, scheduled_start, scheduled_end, owner_user_id, requires_evidence, evidence_submitted, is_recurring, escalation_level, is_emergency, is_blocked, supervisor_acknowledged, is_simulation, created_at, updated_at)
  VALUES (gen_random_uuid(), v_agency_id, v_senior_resident_id, v_category_id, 'Vital Signs Check', 'Record blood pressure and temperature', 'medium', 'B', 'in_progress', date_trunc('hour', now()), date_trunc('hour', now()) + interval '15 minutes', v_caregiver_user_id, true, false, false, 0, false, false, false, false, now(), now())
  RETURNING id INTO v_task2_id;

  INSERT INTO tasks (id, agency_id, resident_id, category_id, task_name, description, priority, risk_level, state, scheduled_start, scheduled_end, owner_user_id, requires_evidence, evidence_submitted, is_recurring, escalation_level, is_emergency, is_blocked, supervisor_acknowledged, is_simulation, created_at, updated_at)
  VALUES (gen_random_uuid(), v_agency_id, v_senior_resident_id, v_category_id, 'Afternoon Check-in', 'Wellness check and assistance', 'medium', 'C', 'in_progress', date_trunc('hour', now()) + interval '3 hours', date_trunc('hour', now()) + interval '3 hours 20 minutes', v_caregiver_user_id, false, false, false, 0, false, false, false, false, now(), now())
  RETURNING id INTO v_task3_id;

  INSERT INTO tasks (id, agency_id, resident_id, category_id, task_name, description, priority, risk_level, state, scheduled_start, scheduled_end, owner_user_id, requires_evidence, evidence_submitted, is_recurring, escalation_level, is_emergency, is_blocked, supervisor_acknowledged, is_simulation, created_at, updated_at)
  VALUES (gen_random_uuid(), v_agency_id, v_senior_resident_id, v_category_id, 'Lunch Assistance', 'Help with meal service', 'medium', 'C', 'in_progress', date_trunc('hour', now()) + interval '4 hours', date_trunc('hour', now()) + interval '4 hours 30 minutes', v_caregiver_user_id, false, false, false, 0, false, false, false, false, now(), now());

  INSERT INTO tasks (id, agency_id, resident_id, category_id, task_name, description, priority, risk_level, state, scheduled_start, scheduled_end, owner_user_id, requires_evidence, evidence_submitted, is_recurring, escalation_level, is_emergency, is_blocked, supervisor_acknowledged, is_simulation, created_at, updated_at)
  VALUES (gen_random_uuid(), v_agency_id, v_senior_resident_id, v_category_id, 'Evening Medication', 'Administer evening medications', 'high', 'A', 'in_progress', date_trunc('hour', now()) + interval '10 hours', date_trunc('hour', now()) + interval '10 hours 30 minutes', v_caregiver_user_id, true, false, false, 0, false, false, false, false, now(), now());

  -- Add health metrics with data_source='manual'
  INSERT INTO health_metrics (id, resident_id, metric_category, metric_type, value_numeric, unit, confidence_level, measurement_source, recorded_at, synced_at, created_at, data_source)
  VALUES (gen_random_uuid(), v_senior_resident_id, 'vitals', 'blood_pressure_systolic', 128, 'mmHg', 'high', 'manual', now() - interval '2 hours', now(), now(), 'manual');

  INSERT INTO health_metrics (id, resident_id, metric_category, metric_type, value_numeric, unit, confidence_level, measurement_source, recorded_at, synced_at, created_at, data_source)
  VALUES (gen_random_uuid(), v_senior_resident_id, 'vitals', 'blood_pressure_diastolic', 82, 'mmHg', 'high', 'manual', now() - interval '2 hours', now(), now(), 'manual');

  INSERT INTO health_metrics (id, resident_id, metric_category, metric_type, value_numeric, unit, confidence_level, measurement_source, recorded_at, synced_at, created_at, data_source)
  VALUES (gen_random_uuid(), v_senior_resident_id, 'vitals', 'heart_rate', 72, 'bpm', 'high', 'manual', now() - interval '2 hours', now(), now(), 'manual');

  RETURN jsonb_build_object('status', 'success', 'resident_id', v_senior_resident_id, 'family_user_id', v_family_user_id, 'caregiver_id', v_caregiver_user_id, 'medication_ids', jsonb_build_array(v_med1_id, v_med2_id), 'task_ids', jsonb_build_array(v_task1_id, v_task2_id, v_task3_id));
END;
$$;

GRANT EXECUTE ON FUNCTION seed_senior_family_scenario() TO anon, authenticated;