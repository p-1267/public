/*
  # Fix Senior Family Scenario Seed Function
  
  Update to match actual table schemas (without relationship columns).
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

  -- Create user profiles (no auth.users FK now)
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

  -- Link senior to resident (using actual schema)
  INSERT INTO senior_resident_links (senior_user_id, resident_id, status)
  VALUES (v_senior_user_id, v_resident_id, 'active')
  ON CONFLICT (senior_user_id, resident_id) DO UPDATE SET status = 'active';

  -- Link family admin to resident (using actual schema)
  INSERT INTO family_resident_links (family_user_id, resident_id, status)
  VALUES (v_family_user_id, v_resident_id, 'active')
  ON CONFLICT (family_user_id, resident_id) DO UPDATE SET status = 'active';

  -- Set operating mode to SELF_MANAGE
  INSERT INTO resident_access_tokens (
    resident_id, 
    operating_mode, 
    mode_set_by, 
    mode_set_at,
    mode_reason
  )
  VALUES (
    v_resident_id,
    'SELF_MANAGE',
    v_senior_user_id,
    now(),
    'Initial scenario setup'
  )
  ON CONFLICT (resident_id) DO UPDATE SET
    operating_mode = 'SELF_MANAGE',
    mode_set_by = v_senior_user_id,
    mode_set_at = now();

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

  -- Add appointment (in the future)
  v_appointment_id := 'e0000000-0000-0000-0000-000000000001'::uuid;

  INSERT INTO appointments (
    id, resident_id, appointment_type, title, 
    scheduled_at, duration_minutes, status, provider_name, location
  )
  VALUES (
    v_appointment_id,
    v_resident_id,
    'DOCTOR_VISIT',
    'Annual Physical Exam',
    (now() + interval '7 days')::timestamp,
    60,
    'SCHEDULED',
    'Dr. Sarah Johnson',
    'Main Street Clinic'
  )
  ON CONFLICT (id) DO UPDATE SET status = 'SCHEDULED', scheduled_at = (now() + interval '7 days')::timestamp;

  -- Return scenario IDs
  RETURN jsonb_build_object(
    'agency_id', v_agency_id,
    'senior_user_id', v_senior_user_id,
    'family_user_id', v_family_user_id,
    'resident_id', v_resident_id,
    'medication_ids', jsonb_build_array(v_medication_1_id, v_medication_2_id),
    'appointment_id', v_appointment_id,
    'status', 'SUCCESS',
    'message', 'Senior + Family scenario seeded successfully'
  );
END;
$$;
