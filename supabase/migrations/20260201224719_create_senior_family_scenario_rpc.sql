/*
  # Senior + Family Scenario Automated Seeding

  Creates RPC function to seed complete scenario data:
  - Senior user + resident profile
  - Family admin user + links
  - Medications, appointments
  - Operating mode
  
  Returns scenario IDs for testing.
*/

CREATE OR REPLACE FUNCTION seed_senior_family_scenario()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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

  INSERT INTO user_profiles (id, role_id, display_name, is_active)
  VALUES 
    (v_senior_user_id, v_senior_role_id, 'Dorothy Miller', true),
    (v_family_user_id, v_family_role_id, 'Robert Miller', true)
  ON CONFLICT (id) DO UPDATE SET 
    display_name = EXCLUDED.display_name,
    role_id = EXCLUDED.role_id;

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
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  -- Link senior to resident
  INSERT INTO senior_resident_links (senior_user_id, resident_id, relationship, is_primary)
  VALUES (v_senior_user_id, v_resident_id, 'SELF', true)
  ON CONFLICT (senior_user_id, resident_id) DO NOTHING;

  -- Link family admin to resident
  INSERT INTO family_resident_links (
    family_user_id, 
    resident_id, 
    relationship, 
    can_manage_medications, 
    can_manage_appointments, 
    can_view_documents
  )
  VALUES (v_family_user_id, v_resident_id, 'SON', true, true, true)
  ON CONFLICT (family_user_id, resident_id) DO NOTHING;

  -- Set operating mode to SELF_MANAGE
  INSERT INTO resident_access_tokens (
    id, 
    resident_id, 
    operating_mode, 
    mode_set_by, 
    mode_set_at,
    mode_reason
  )
  VALUES (
    'c0000000-0000-0000-0000-000000000001'::uuid,
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

  -- Add appointment
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
  ON CONFLICT (id) DO UPDATE SET status = 'SCHEDULED';

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
