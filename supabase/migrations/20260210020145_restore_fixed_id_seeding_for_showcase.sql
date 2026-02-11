/*
  # Restore Fixed ID Seeding for Showcase

  ## Purpose
  Use fixed UUIDs for showcase data to ensure:
  - Idempotent seeding (can run multiple times)
  - ShowcaseContext mock IDs match database IDs
  - Consistent experience across page refreshes

  ## Changes
  - Use fixed agency ID: a0000000-0000-0000-0000-000000000010
  - Use fixed user IDs matching ShowcaseContext
  - Use fixed resident ID: b0000000-0000-0000-0000-000000000001
  - Make all inserts idempotent with ON CONFLICT
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
BEGIN
  -- Fixed IDs matching ShowcaseContext
  v_agency_id := 'a0000000-0000-0000-0000-000000000010'::uuid;
  v_senior_user_id := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_family_user_id := 'a0000000-0000-0000-0000-000000000002'::uuid;
  v_caregiver_user_id := 'a0000000-0000-0000-0000-000000000003'::uuid;
  v_supervisor_user_id := 'a0000000-0000-0000-0000-000000000005'::uuid;
  v_resident_id := 'b0000000-0000-0000-0000-000000000001'::uuid;

  -- Get role IDs
  SELECT id INTO v_senior_role_id FROM roles WHERE name = 'SENIOR' LIMIT 1;
  SELECT id INTO v_family_role_id FROM roles WHERE name = 'FAMILY_ADMIN' LIMIT 1;
  SELECT id INTO v_caregiver_role_id FROM roles WHERE name = 'CAREGIVER' LIMIT 1;
  SELECT id INTO v_supervisor_role_id FROM roles WHERE name = 'SUPERVISOR' LIMIT 1;

  -- Agency
  INSERT INTO agencies (id, name, status)
  VALUES (v_agency_id, 'Showcase Living Community', 'active')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  -- User Profiles
  INSERT INTO user_profiles (id, role_id, agency_id, display_name, is_active)
  VALUES
    (v_senior_user_id, v_senior_role_id, v_agency_id, 'Dorothy Miller', true),
    (v_family_user_id, v_family_role_id, v_agency_id, 'Robert Miller', true),
    (v_caregiver_user_id, v_caregiver_role_id, v_agency_id, 'Mike Chen', true),
    (v_supervisor_user_id, v_supervisor_role_id, v_agency_id, 'Sarah Johnson', true)
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

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

  -- Medications
  DELETE FROM resident_medications WHERE resident_id = v_resident_id;
  INSERT INTO resident_medications (resident_id, medication_name, dosage, frequency, route, schedule, prescriber_name, is_active, start_date, entered_by)
  VALUES
    (v_resident_id, 'Lisinopril', '10mg', 'DAILY', 'ORAL', '{"times": ["08:00"]}'::jsonb, 'Dr. Johnson', true, CURRENT_DATE - 90, v_family_user_id),
    (v_resident_id, 'Metformin', '500mg', 'TWICE_DAILY', 'ORAL', '{"times": ["08:00", "18:00"]}'::jsonb, 'Dr. Johnson', true, CURRENT_DATE - 180, v_family_user_id);

  -- Appointments
  DELETE FROM appointments WHERE resident_id = v_resident_id;
  INSERT INTO appointments (resident_id, title, appointment_type, scheduled_at, location, provider_name, status)
  VALUES
    (v_resident_id, 'Follow-up with Dr. Johnson', 'DOCTOR_VISIT', CURRENT_DATE + 3 + interval '10 hours', 'Medical Center', 'Dr. Johnson', 'scheduled'),
    (v_resident_id, 'Routine Lab Work', 'LAB_WORK', CURRENT_DATE + 7 + interval '9 hours', 'Quest Diagnostics', 'Lab Tech', 'scheduled');

  -- Device
  INSERT INTO device_registry (id, device_id, resident_id, device_type, device_name, manufacturer, model, firmware_version, battery_level, trust_state, capabilities, pairing_actor, pairing_timestamp)
  VALUES (
    gen_random_uuid(), 'OMRON-BP-SHOWCASE', v_resident_id,
    'BLOOD_PRESSURE_MONITOR', 'OMRON Evolv', 'OMRON', 'BP7900', '2.1.4', 85, 'TRUSTED',
    '{"supported_metrics": ["BLOOD_PRESSURE_SYSTOLIC", "BLOOD_PRESSURE_DIASTOLIC", "HEART_RATE"]}'::jsonb,
    v_senior_user_id, now() - interval '30 days'
  )
  ON CONFLICT (device_id) DO UPDATE SET battery_level = EXCLUDED.battery_level
  RETURNING id INTO v_device_id;

  -- Health Metrics (last 7 days)
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

  -- Calculate trends
  DELETE FROM health_metric_trends WHERE resident_id = v_resident_id;
  PERFORM calculate_health_metric_trends(v_resident_id, 'BLOOD_PRESSURE_SYSTOLIC');
  PERFORM calculate_health_metric_trends(v_resident_id, 'BLOOD_PRESSURE_DIASTOLIC');
  PERFORM calculate_health_metric_trends(v_resident_id, 'HEART_RATE');

  -- Department
  INSERT INTO departments (id, agency_id, name, category)
  VALUES (gen_random_uuid(), v_agency_id, 'NURSING', 'CARE')
  ON CONFLICT (agency_id, name) DO UPDATE SET name = EXCLUDED.name
  RETURNING id INTO v_dept_nursing_id;

  -- Assign caregiver to department
  INSERT INTO department_personnel (department_id, user_id, role_in_department)
  VALUES (v_dept_nursing_id, v_caregiver_user_id, 'staff_member')
  ON CONFLICT (department_id, user_id) DO NOTHING;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'message', 'Showcase seeded with fixed IDs',
    'resident_id', v_resident_id,
    'senior_user_id', v_senior_user_id,
    'family_user_id', v_family_user_id,
    'caregiver_user_id', v_caregiver_user_id,
    'supervisor_user_id', v_supervisor_user_id,
    'agency_id', v_agency_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION seed_senior_family_scenario() TO authenticated, anon;
