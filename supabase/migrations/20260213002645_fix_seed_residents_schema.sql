/*
  # Fix seed_active_context residents schema mismatch
  
  ## Changes
  - Remove invalid columns: gender, room_number, admission_date
  - Use metadata jsonb field for these values instead
  - Align with actual residents table schema
*/

CREATE OR REPLACE FUNCTION seed_active_context(p_care_context_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_context RECORD;
  v_agency_id uuid;
  v_resident RECORD;
  v_family_user_id uuid;
  v_caregiver_user_id uuid;
  v_supervisor_user_id uuid;
  v_senior_user_id uuid;
  v_role_id uuid;
  v_department_id uuid;
BEGIN
  -- Get context
  SELECT * INTO v_context FROM care_contexts WHERE id = p_care_context_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Care context not found: %', p_care_context_id;
  END IF;

  -- Get or create agency
  INSERT INTO agencies (id, name, status) VALUES ('a0000000-0000-0000-0000-000000000010', 'Showcase Care Agency', 'active')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_agency_id;

  -- Create resident (using valid columns only)
  INSERT INTO residents (id, full_name, date_of_birth, status, agency_id, metadata)
  VALUES (
    'b0000000-0000-0000-0000-000000000001',
    COALESCE(v_context.resident_name, 'Dorothy Parker'),
    COALESCE(v_context.resident_dob, '1940-01-01'::date),
    'active',
    v_agency_id,
    jsonb_build_object(
      'gender', 'FEMALE',
      'room_number', '101A',
      'admission_date', CURRENT_DATE - INTERVAL '6 months'
    )
  )
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, metadata = EXCLUDED.metadata
  RETURNING * INTO v_resident;

  -- If has family: Create family user + link + preferences
  IF v_context.has_family THEN
    -- Create family user
    INSERT INTO user_profiles (id, role_id, display_name, is_active, agency_id)
    SELECT 'a0000000-0000-0000-0000-000000000002', r.id, 'Robert Miller', true, v_agency_id
    FROM roles r WHERE r.name = 'FAMILY_ADMIN'
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO v_family_user_id;

    -- Link family to resident
    INSERT INTO family_resident_links (family_user_id, resident_id, status)
    VALUES (v_family_user_id, v_resident.id, 'active')
    ON CONFLICT DO NOTHING;

    -- Create notification preferences (using correct columns)
    INSERT INTO family_notification_preferences (user_id, resident_id, channel_in_app, channel_push, channel_sms, channel_email, summary_frequency)
    VALUES (v_family_user_id, v_resident.id, true, true, true, false, 'DAILY')
    ON CONFLICT (user_id, resident_id) DO NOTHING;
  END IF;

  -- If has caregivers: Create caregiver users + department + assignments
  IF v_context.service_model IN ('DIRECT_HIRE', 'AGENCY_HOME_CARE', 'AGENCY_FACILITY') THEN
    -- Create caregiver user
    INSERT INTO user_profiles (id, role_id, display_name, is_active, agency_id)
    SELECT 'a0000000-0000-0000-0000-000000000003', r.id, 'Mike Chen', true, v_agency_id
    FROM roles r WHERE r.name = 'CAREGIVER'
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO v_caregiver_user_id;

    -- Create supervisor user
    INSERT INTO user_profiles (id, role_id, display_name, is_active, agency_id)
    SELECT 'a0000000-0000-0000-0000-000000000005', r.id, 'Sarah Johnson', true, v_agency_id
    FROM roles r WHERE r.name = 'SUPERVISOR'
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO v_supervisor_user_id;

    -- Create department
    INSERT INTO departments (id, name, agency_id, supervisor_id, status)
    VALUES ('d0000000-0000-0000-0000-000000000001', 'Personal Care', v_agency_id, v_supervisor_user_id, 'active')
    ON CONFLICT (id) DO UPDATE SET supervisor_id = EXCLUDED.supervisor_id
    RETURNING id INTO v_department_id;

    -- Assign caregiver to resident
    INSERT INTO caregiver_assignments (caregiver_user_id, resident_id, assigned_by, status)
    VALUES (v_caregiver_user_id, v_resident.id, v_supervisor_user_id, 'active')
    ON CONFLICT DO NOTHING;
  END IF;

  -- If senior self-managing: Create senior user + link
  IF v_context.operating_mode = 'INDEPENDENT' THEN
    -- Create senior user
    INSERT INTO user_profiles (id, role_id, display_name, is_active, agency_id)
    SELECT 'a0000000-0000-0000-0000-000000000001', r.id, COALESCE(v_context.resident_name, 'Dorothy Parker'), true, v_agency_id
    FROM roles r WHERE r.name = 'SENIOR'
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO v_senior_user_id;

    -- Link senior to resident
    INSERT INTO senior_resident_links (senior_user_id, resident_id, status)
    VALUES (v_senior_user_id, v_resident.id, 'active')
    ON CONFLICT DO NOTHING;
  END IF;

  -- Create sample medications
  INSERT INTO resident_medications (resident_id, medication_name, dosage, frequency, route, is_active, prescribed_by)
  VALUES
    (v_resident.id, 'Lisinopril', '10mg', 'DAILY', 'ORAL', true, 'Dr. Smith'),
    (v_resident.id, 'Metformin', '500mg', 'TWICE_DAILY', 'ORAL', true, 'Dr. Smith'),
    (v_resident.id, 'Atorvastatin', '20mg', 'DAILY', 'ORAL', true, 'Dr. Jones')
  ON CONFLICT DO NOTHING;

  -- Create sample appointments
  INSERT INTO appointments (resident_id, appointment_type, scheduled_at, provider_name, location, status)
  VALUES
    (v_resident.id, 'CHECKUP', CURRENT_TIMESTAMP + INTERVAL '3 days', 'Dr. Smith', 'Main Clinic', 'SCHEDULED'),
    (v_resident.id, 'LABWORK', CURRENT_TIMESTAMP + INTERVAL '1 week', 'Quest Labs', 'Laboratory', 'SCHEDULED')
  ON CONFLICT DO NOTHING;

  -- Create sample tasks for caregiver
  IF v_caregiver_user_id IS NOT NULL THEN
    INSERT INTO tasks (resident_id, category, title, description, state, priority, scheduled_for, owner_user_id)
    VALUES
      (v_resident.id, 'medication', 'Administer morning medications', 'Lisinopril 10mg, Metformin 500mg', 'ready', 'high', CURRENT_TIMESTAMP + INTERVAL '1 hour', v_caregiver_user_id),
      (v_resident.id, 'vital_signs', 'Check blood pressure', 'Morning vital signs check', 'ready', 'medium', CURRENT_TIMESTAMP + INTERVAL '30 minutes', v_caregiver_user_id),
      (v_resident.id, 'meal', 'Assist with breakfast', 'Ensure proper nutrition intake', 'ready', 'medium', CURRENT_TIMESTAMP + INTERVAL '2 hours', v_caregiver_user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Create sample health metrics
  INSERT INTO health_metrics (resident_id, metric_category, metric_type, value, unit, recorded_at, data_source, confidence_level)
  VALUES
    (v_resident.id, 'VITALS', 'blood_pressure_systolic', 128, 'mmHg', CURRENT_TIMESTAMP - INTERVAL '1 hour', 'DEVICE', 'HIGH'),
    (v_resident.id, 'VITALS', 'blood_pressure_diastolic', 82, 'mmHg', CURRENT_TIMESTAMP - INTERVAL '1 hour', 'DEVICE', 'HIGH'),
    (v_resident.id, 'VITALS', 'heart_rate', 72, 'bpm', CURRENT_TIMESTAMP - INTERVAL '1 hour', 'DEVICE', 'HIGH'),
    (v_resident.id, 'ACTIVITY', 'steps', 3245, 'steps', CURRENT_TIMESTAMP - INTERVAL '2 hours', 'DEVICE', 'HIGH')
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'success', true,
    'agency_id', v_agency_id,
    'resident_id', v_resident.id,
    'family_user_id', v_family_user_id,
    'caregiver_user_id', v_caregiver_user_id,
    'supervisor_user_id', v_supervisor_user_id,
    'senior_user_id', v_senior_user_id,
    'department_id', v_department_id
  );
END;
$$;

-- Grant execute to anon for showcase mode
GRANT EXECUTE ON FUNCTION seed_active_context(uuid) TO anon, authenticated;
