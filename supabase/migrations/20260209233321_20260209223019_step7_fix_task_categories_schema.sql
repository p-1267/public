/*
  # Step 7: Fix task_categories schema
  
  Changes:
  - Use name instead of category_name
  - Add default_priority (lowercase: 'low', 'medium', 'high', 'critical')
  - Add default_risk_level ('A', 'B', 'C')
  - Add requires_evidence, allows_skip, is_active (booleans)
  - Add sort_order (integer)
*/

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
  v_category_id uuid;
  v_senior_role_id uuid;
  v_family_role_id uuid;
  v_caregiver_role_id uuid;
BEGIN
  -- Get role IDs
  SELECT id INTO v_senior_role_id FROM roles WHERE name = 'SENIOR';
  SELECT id INTO v_family_role_id FROM roles WHERE name = 'FAMILY_ADMIN';
  SELECT id INTO v_caregiver_role_id FROM roles WHERE name = 'CAREGIVER';

  -- Create resident
  INSERT INTO residents (id, agency_id, full_name, date_of_birth, status, metadata)
  VALUES (gen_random_uuid(), v_agency_id, 'Eleanor Martinez', '1945-03-15', 'active', '{"room_number": "201"}'::jsonb)
  RETURNING id INTO v_senior_resident_id;

  -- Create family user
  INSERT INTO user_profiles (id, role_id, agency_id, display_name)
  VALUES (gen_random_uuid(), v_family_role_id, v_agency_id, 'Michael Martinez')
  RETURNING id INTO v_family_user_id;

  -- Create caregiver user
  INSERT INTO user_profiles (id, role_id, agency_id, display_name)
  VALUES (gen_random_uuid(), v_caregiver_role_id, v_agency_id, 'Sarah Johnson')
  RETURNING id INTO v_caregiver_user_id;

  -- Link family to resident
  INSERT INTO family_resident_links (family_user_id, resident_id, status)
  VALUES (v_family_user_id, v_senior_resident_id, 'active');

  -- Add medications
  INSERT INTO resident_medications (
    id, resident_id, medication_name, dosage, frequency, route, 
    schedule, prescriber_name, is_prn, is_controlled, 
    start_date, is_active, entered_by
  )
  VALUES (
    gen_random_uuid(), v_senior_resident_id, 'Lisinopril', '10mg', 'once daily', 'ORAL',
    '{"times": ["08:00"]}'::jsonb, 'Dr. Smith', false, false,
    CURRENT_DATE - INTERVAL '30 days', true, v_caregiver_user_id
  )
  RETURNING id INTO v_med1_id;

  INSERT INTO resident_medications (
    id, resident_id, medication_name, dosage, frequency, route,
    schedule, prescriber_name, is_prn, is_controlled,
    start_date, is_active, entered_by
  )
  VALUES (
    gen_random_uuid(), v_senior_resident_id, 'Metformin', '500mg', 'twice daily', 'ORAL',
    '{"times": ["08:00", "20:00"]}'::jsonb, 'Dr. Smith', false, false,
    CURRENT_DATE - INTERVAL '30 days', true, v_caregiver_user_id
  )
  RETURNING id INTO v_med2_id;

  -- Create task category
  INSERT INTO task_categories (
    id, agency_id, name, category_type, default_priority, default_risk_level,
    requires_evidence, allows_skip, is_active, sort_order
  )
  VALUES (
    gen_random_uuid(), v_agency_id, 'Clinical Care', 'clinical', 'medium', 'B',
    true, false, true, 1
  )
  RETURNING id INTO v_category_id;

  -- Create in_progress tasks
  INSERT INTO tasks (resident_id, category_id, title, description, priority, risk_level, state, scheduled_for, assigned_to, created_by)
  VALUES 
    (v_senior_resident_id, v_category_id, 'Morning Medication', 'Administer morning meds', 'high', 'A', 'in_progress', NOW() - INTERVAL '1 hour', v_caregiver_user_id, NULL),
    (v_senior_resident_id, v_category_id, 'Blood Pressure Check', 'Monitor BP', 'medium', 'B', 'in_progress', NOW() - INTERVAL '30 minutes', v_caregiver_user_id, NULL),
    (v_senior_resident_id, v_category_id, 'Vital Signs', 'Full vitals assessment', 'high', 'A', 'in_progress', NOW() - INTERVAL '45 minutes', v_caregiver_user_id, NULL),
    (v_senior_resident_id, v_category_id, 'Mobility Check', 'Assess walking ability', 'medium', 'B', 'in_progress', NOW() - INTERVAL '20 minutes', v_caregiver_user_id, NULL),
    (v_senior_resident_id, v_category_id, 'Hydration', 'Ensure adequate fluid intake', 'low', 'C', 'in_progress', NOW() - INTERVAL '10 minutes', v_caregiver_user_id, NULL);

  -- Add health metrics with correct metric_category
  INSERT INTO health_metrics (resident_id, metric_category, metric_name, metric_value, unit_of_measure, measurement_source, data_source, confidence_level, recorded_at)
  VALUES (v_senior_resident_id, 'BLOOD_PRESSURE', 'blood_pressure_systolic', 135, 'mmHg', 'MANUAL_ENTRY', 'MANUAL_ENTRY', 'HIGH', NOW() - INTERVAL '2 hours');

  INSERT INTO health_metrics (resident_id, metric_category, metric_name, metric_value, unit_of_measure, measurement_source, data_source, confidence_level, recorded_at)
  VALUES (v_senior_resident_id, 'BLOOD_PRESSURE', 'blood_pressure_diastolic', 85, 'mmHg', 'MANUAL_ENTRY', 'MANUAL_ENTRY', 'HIGH', NOW() - INTERVAL '2 hours');

  INSERT INTO health_metrics (resident_id, metric_category, metric_name, metric_value, unit_of_measure, measurement_source, data_source, confidence_level, recorded_at)
  VALUES (v_senior_resident_id, 'CARDIOVASCULAR', 'heart_rate', 72, 'bpm', 'MANUAL_ENTRY', 'MANUAL_ENTRY', 'HIGH', NOW() - INTERVAL '2 hours');

  -- Create appointment
  INSERT INTO appointments (resident_id, appointment_type, appointment_date, provider_name, location, status)
  VALUES (v_senior_resident_id, 'FOLLOW_UP', CURRENT_DATE + INTERVAL '7 days', 'Dr. Smith', 'Cardiology Clinic', 'SCHEDULED');

  RETURN jsonb_build_object(
    'senior_resident_id', v_senior_resident_id,
    'family_user_id', v_family_user_id,
    'caregiver_user_id', v_caregiver_user_id,
    'medication_1_id', v_med1_id,
    'medication_2_id', v_med2_id
  );
END;
$$;