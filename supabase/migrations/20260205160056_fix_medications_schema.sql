/*
  # Fix Medications Schema in Seed Function
  
  Correct schema for resident_medications:
  - dosage (text) - e.g., "10mg"
  - route (text, required) - e.g., "ORAL"  
  - schedule (jsonb, required) - e.g., {"times": ["09:00"]}
  - prescriber_name (not prescribed_by)
  - is_prn, is_controlled (boolean)
  - start_date (date)
  - is_active (boolean, not status text)
  - entered_by (uuid, required)
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
  v_device_result jsonb;
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
    '{"room": "A-101", "phone": "+1-555-0101", "care_level": "INDEPENDENT"}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  -- Link senior to resident
  INSERT INTO senior_resident_links (senior_user_id, resident_id, status)
  VALUES (v_senior_user_id, v_resident_id, 'active')
  ON CONFLICT (senior_user_id, resident_id) DO NOTHING;

  -- Link family admin to resident
  INSERT INTO family_resident_links (family_user_id, resident_id, status)
  VALUES (v_family_user_id, v_resident_id, 'active')
  ON CONFLICT (family_user_id, resident_id) DO NOTHING;

  -- Set operating mode
  UPDATE senior_operating_mode 
  SET disabled_at = now()
  WHERE resident_id = v_resident_id 
    AND disabled_at IS NULL;
  
  INSERT INTO senior_operating_mode (
    resident_id, 
    mode, 
    enabled_by, 
    enabled_at,
    reason
  )
  VALUES (
    v_resident_id,
    'SELF_MANAGE',
    v_senior_user_id,
    now(),
    'Initial scenario setup'
  );

  -- Add medications (correct schema)
  v_medication_1_id := 'd0000000-0000-0000-0000-000000000001'::uuid;
  v_medication_2_id := 'd0000000-0000-0000-0000-000000000002'::uuid;

  INSERT INTO resident_medications (
    id, resident_id, medication_name, dosage, frequency, route, 
    schedule, prescriber_name, is_prn, is_controlled, start_date, 
    special_instructions, is_active, entered_by
  )
  VALUES
    (
      v_medication_1_id,
      v_resident_id,
      'Lisinopril',
      '10mg',
      'Once daily',
      'ORAL',
      '{"times": ["09:00"]}'::jsonb,
      'Dr. Sarah Johnson',
      false,
      false,
      CURRENT_DATE,
      'Take with food',
      true,
      v_senior_user_id
    ),
    (
      v_medication_2_id,
      v_resident_id,
      'Metformin',
      '500mg',
      'Twice daily',
      'ORAL',
      '{"times": ["09:00", "21:00"]}'::jsonb,
      'Dr. Sarah Johnson',
      false,
      false,
      CURRENT_DATE,
      'Take with meals',
      true,
      v_senior_user_id
    )
  ON CONFLICT (id) DO UPDATE SET is_active = true;

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

  -- Seed device integration and health metrics
  BEGIN
    SELECT seed_device_integration_showcase(v_resident_id) INTO v_device_result;
  EXCEPTION WHEN OTHERS THEN
    v_device_result := jsonb_build_object('error', SQLERRM, 'success', false);
  END;

  -- Return scenario IDs
  RETURN jsonb_build_object(
    'agency_id', v_agency_id,
    'senior_user_id', v_senior_user_id,
    'family_user_id', v_family_user_id,
    'resident_id', v_resident_id,
    'medication_ids', jsonb_build_array(v_medication_1_id, v_medication_2_id),
    'appointment_id', v_appointment_id,
    'device_integration', v_device_result,
    'status', 'SUCCESS',
    'message', 'Senior + Family scenario seeded successfully with health metrics'
  );
END;
$$;
