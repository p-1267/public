/*
  # Simplified Senior Family Scenario Seed
  
  Creates minimal data needed for showcase mode to work.
  Removes operating_mode logic that doesn't match schema.
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
  v_resident_id uuid;
  v_medication_1_id uuid;
  v_medication_2_id uuid;
  v_appointment_id uuid;
  v_senior_role_id uuid;
  v_family_role_id uuid;
BEGIN
  -- Get role IDs
  SELECT id INTO v_senior_role_id FROM roles WHERE name = 'SENIOR' LIMIT 1;
  SELECT id INTO v_family_role_id FROM roles WHERE name = 'FAMILY_ADMIN' LIMIT 1;

  -- Create agency
  v_agency_id := '00000000-0000-0000-0000-999999999999'::uuid;
  INSERT INTO agencies (id, name, status)
  VALUES (v_agency_id, 'Showcase Independent Living', 'active')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  -- Create user profiles
  v_senior_user_id := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_family_user_id := 'a0000000-0000-0000-0000-000000000002'::uuid;

  INSERT INTO user_profiles (id, role_id, display_name, is_active, agency_id)
  VALUES 
    (v_senior_user_id, v_senior_role_id, 'Dorothy Miller', true, v_agency_id),
    (v_family_user_id, v_family_role_id, 'Robert Miller', true, v_agency_id)
  ON CONFLICT (id) DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    role_id = EXCLUDED.role_id,
    agency_id = EXCLUDED.agency_id;

  -- Create resident
  v_resident_id := 'b0000000-0000-0000-0000-000000000001'::uuid;
  INSERT INTO residents (id, agency_id, full_name, date_of_birth, status, metadata)
  VALUES (
    v_resident_id,
    v_agency_id,
    'Dorothy Miller',
    '1946-03-15',
    'active',
    '{"room": "A-101", "phone": "+1-555-0101"}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, agency_id = EXCLUDED.agency_id;

  -- Link senior to resident
  INSERT INTO senior_resident_links (senior_user_id, resident_id, status)
  VALUES (v_senior_user_id, v_resident_id, 'active')
  ON CONFLICT (senior_user_id, resident_id) DO UPDATE SET status = 'active';

  -- Link family admin to resident
  INSERT INTO family_resident_links (family_user_id, resident_id, status)
  VALUES (v_family_user_id, v_resident_id, 'active')
  ON CONFLICT (family_user_id, resident_id) DO UPDATE SET status = 'active';

  -- Add medications
  v_medication_1_id := 'd0000000-0000-0000-0000-000000000001'::uuid;
  v_medication_2_id := 'd0000000-0000-0000-0000-000000000002'::uuid;

  INSERT INTO resident_medications (
    id, resident_id, medication_name, dosage, dosage_unit, 
    frequency, scheduled_time, status, instructions, prescribed_by
  )
  VALUES
    (
      v_medication_1_id,
      v_resident_id,
      'Lisinopril',
      '10',
      'mg',
      'Once daily',
      '09:00',
      'ACTIVE',
      'Take with food',
      'Dr. Sarah Johnson'
    ),
    (
      v_medication_2_id,
      v_resident_id,
      'Metformin',
      '500',
      'mg',
      'Twice daily',
      '09:00',
      'ACTIVE',
      'Take with meals',
      'Dr. Sarah Johnson'
    )
  ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE';

  -- Add appointments (2 in the future, 1 today)
  v_appointment_id := 'e0000000-0000-0000-0000-000000000001'::uuid;

  INSERT INTO appointments (
    id, resident_id, appointment_type, title, 
    scheduled_at, duration_minutes, status, provider_name, location
  )
  VALUES 
    (
      v_appointment_id,
      v_resident_id,
      'DOCTOR_VISIT',
      'Annual Physical Exam',
      (now() + interval '7 days')::timestamp,
      60,
      'SCHEDULED',
      'Dr. Sarah Johnson',
      'Main Street Clinic'
    ),
    (
      'e0000000-0000-0000-0000-000000000002'::uuid,
      v_resident_id,
      'LAB_WORK',
      'Blood Work',
      (date_trunc('day', now()) + interval '14 hours')::timestamp,
      30,
      'SCHEDULED',
      'LabCorp',
      'Downtown Lab Center'
    ),
    (
      'e0000000-0000-0000-0000-000000000003'::uuid,
      v_resident_id,
      'FOLLOW_UP',
      'Cardiology Follow-up',
      (now() + interval '14 days')::timestamp,
      45,
      'SCHEDULED',
      'Dr. Michael Chen',
      'Heart & Vascular Center'
    )
  ON CONFLICT (id) DO UPDATE SET 
    status = EXCLUDED.status, 
    scheduled_at = EXCLUDED.scheduled_at;

  -- Add a device
  INSERT INTO device_registry (
    id, resident_id, device_type, device_id, device_name,
    manufacturer, model, firmware_version, trust_state,
    battery_level, last_seen_at
  )
  VALUES (
    'f0000000-0000-0000-0000-000000000001'::uuid,
    v_resident_id,
    'BLE_HEALTH_SENSOR',
    'apple-watch-001',
    'Dorothy''s Apple Watch',
    'Apple',
    'Apple Watch Series 9',
    '10.2',
    'TRUSTED',
    85,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    battery_level = EXCLUDED.battery_level,
    last_seen_at = EXCLUDED.last_seen_at;

  -- Return scenario IDs
  RETURN jsonb_build_object(
    'agency_id', v_agency_id,
    'senior_user_id', v_senior_user_id,
    'family_user_id', v_family_user_id,
    'resident_id', v_resident_id,
    'medication_ids', jsonb_build_array(v_medication_1_id, v_medication_2_id),
    'appointment_ids', jsonb_build_array(v_appointment_id, 'e0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000003'),
    'status', 'SUCCESS',
    'message', 'Senior + Family scenario seeded successfully'
  );
END;
$$;
