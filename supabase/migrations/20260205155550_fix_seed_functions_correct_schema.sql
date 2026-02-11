/*
  # Fix Seed Functions with Correct Schema
  
  ## Purpose
  Fix senior_family_scenario and create master seed that works with actual schema.
  
  ## Schema Corrections
  - senior_resident_links: only has senior_user_id, resident_id, status, created_at, created_by
  - family_resident_links: only has family_user_id, resident_id, status, created_at, created_by
  - No relationship, is_primary, or permission fields exist
  - residents: room and care_level go in metadata JSONB
*/

-- Fix senior_family_scenario to use correct schema
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

  -- Create user profiles (no agency_id for senior/family, no full_name)
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

  -- Link senior to resident (correct schema: no relationship or is_primary)
  INSERT INTO senior_resident_links (senior_user_id, resident_id, status)
  VALUES (v_senior_user_id, v_resident_id, 'active')
  ON CONFLICT (senior_user_id, resident_id) DO NOTHING;

  -- Link family admin to resident (correct schema: no relationship or permissions)
  INSERT INTO family_resident_links (family_user_id, resident_id, status)
  VALUES (v_family_user_id, v_resident_id, 'active')
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

-- Create master seed that combines both scenarios
CREATE OR REPLACE FUNCTION seed_all_showcase_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operational_result jsonb;
  v_senior_family_result jsonb;
BEGIN
  -- Seed operational scenario (agency with departments, caregivers, supervisors, tasks)
  SELECT seed_showcase_scenario() INTO v_operational_result;
  
  -- Seed senior/family scenario (independent living with health metrics)
  SELECT seed_senior_family_scenario() INTO v_senior_family_result;
  
  -- Return combined results
  RETURN jsonb_build_object(
    'success', true,
    'operational_scenario', v_operational_result,
    'senior_family_scenario', v_senior_family_result,
    'message', 'All showcase data seeded successfully - both operational and senior/family scenarios ready'
  );
END;
$$;

-- Grant execute to anon for showcase mode
GRANT EXECUTE ON FUNCTION seed_senior_family_scenario() TO anon;
GRANT EXECUTE ON FUNCTION seed_all_showcase_data() TO anon;
