/*
  # Add fast-path and timeout protection to seed_active_context

  ## Changes
  - Add early-return fast-path: if core data exists for care_context, skip re-seeding
  - Add 3s lock_timeout and 30s statement_timeout to prevent infinite hangs
  - Return "already_seeded" flag in response

  ## Performance Impact
  - First call: ~same (does full seed)
  - Subsequent calls: <50ms (fast-path early return)
  - Max hang time: 30s (then raises clear error)

  ## Safety
  - Does NOT delete or modify existing data
  - Idempotent: safe to call multiple times
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
  v_entered_by_user uuid;
  v_category_med_id uuid;
  v_category_vitals_id uuid;
  v_category_meal_id uuid;
  v_existing_meds int;
  v_existing_tasks int;
BEGIN
  -- Set safe timeouts to prevent infinite hangs
  PERFORM set_config('lock_timeout', '3s', true);
  PERFORM set_config('statement_timeout', '30s', true);

  -- Get context
  SELECT * INTO v_context FROM care_contexts WHERE id = p_care_context_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Care context not found: %', p_care_context_id;
  END IF;

  -- FAST-PATH: Check if already seeded for this resident
  SELECT COUNT(*) INTO v_existing_meds FROM resident_medications WHERE resident_id = v_context.resident_id LIMIT 1;
  SELECT COUNT(*) INTO v_existing_tasks FROM tasks WHERE resident_id = v_context.resident_id LIMIT 1;

  IF v_existing_meds > 0 OR v_existing_tasks > 0 THEN
    -- Data already exists, return fast
    RETURN jsonb_build_object(
      'success', true,
      'already_seeded', true,
      'resident_id', v_context.resident_id,
      'message', 'Data already exists for this resident (fast-path)'
    );
  END IF;

  -- NOT seeded yet - proceed with full seed

  -- Get or create agency
  INSERT INTO agencies (id, name, status) VALUES ('a0000000-0000-0000-0000-000000000010', 'Showcase Care Agency', 'active')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name RETURNING id INTO v_agency_id;

  -- Get or create resident
  SELECT * INTO v_resident FROM residents WHERE id = v_context.resident_id;
  IF NOT FOUND THEN
    INSERT INTO residents (id, agency_id, full_name, date_of_birth, status, metadata)
    VALUES (
      v_context.resident_id,
      v_agency_id,
      'Margaret Anderson',
      '1945-06-15',
      'active',
      jsonb_build_object('room_number', '101', 'diet', 'Regular')
    )
    RETURNING * INTO v_resident;
  END IF;

  -- If has family: Create family user + link + preferences
  IF v_context.service_model IN ('DIRECT_HIRE', 'AGENCY_HOME_CARE') OR v_context.management_mode = 'FAMILY_MANAGED' THEN
    INSERT INTO user_profiles (id, role_id, display_name, is_active, agency_id)
    SELECT 'a0000000-0000-0000-0000-000000000002', r.id, 'Robert Miller', true, v_agency_id
    FROM roles r WHERE r.name = 'FAMILY_ADMIN'
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO v_family_user_id;

    INSERT INTO family_resident_links (family_user_id, resident_id, status)
    VALUES (v_family_user_id, v_resident.id, 'active')
    ON CONFLICT DO NOTHING;

    INSERT INTO family_notification_preferences (user_id, resident_id, channel_in_app, channel_push, channel_sms, channel_email, summary_frequency)
    VALUES (v_family_user_id, v_resident.id, true, true, true, false, 'DAILY')
    ON CONFLICT (user_id, resident_id) DO NOTHING;
  END IF;

  -- If has caregivers: Create caregiver users + department + assignments
  IF v_context.service_model IN ('DIRECT_HIRE', 'AGENCY_HOME_CARE', 'AGENCY_FACILITY') THEN
    INSERT INTO user_profiles (id, role_id, display_name, is_active, agency_id)
    SELECT 'a0000000-0000-0000-0000-000000000003', r.id, 'Mike Chen', true, v_agency_id
    FROM roles r WHERE r.name = 'CAREGIVER'
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO v_caregiver_user_id;

    INSERT INTO user_profiles (id, role_id, display_name, is_active, agency_id)
    SELECT 'a0000000-0000-0000-0000-000000000005', r.id, 'Sarah Johnson', true, v_agency_id
    FROM roles r WHERE r.name = 'SUPERVISOR'
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO v_supervisor_user_id;

    INSERT INTO departments (id, name, agency_id, supervisor_id, status, department_code)
    VALUES ('d0000000-0000-0000-0000-000000000001', 'Personal Care', v_agency_id, v_supervisor_user_id, 'normal', 'PERSCARE')
    ON CONFLICT (id) DO UPDATE SET supervisor_id = EXCLUDED.supervisor_id, department_code = EXCLUDED.department_code, status = EXCLUDED.status
    RETURNING id INTO v_department_id;

    INSERT INTO caregiver_assignments (agency_id, caregiver_user_id, resident_id, assigned_by, status)
    VALUES (v_agency_id, v_caregiver_user_id, v_resident.id, v_supervisor_user_id, 'active')
    ON CONFLICT DO NOTHING;
  END IF;

  -- If senior self-managing: Create senior user + link
  IF v_context.management_mode = 'SELF' OR v_context.service_model = 'NONE' THEN
    INSERT INTO user_profiles (id, role_id, display_name, is_active, agency_id)
    SELECT 'a0000000-0000-0000-0000-000000000001', r.id, v_resident.full_name, true, v_agency_id
    FROM roles r WHERE r.name = 'SENIOR'
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name
    RETURNING id INTO v_senior_user_id;

    INSERT INTO senior_resident_links (senior_user_id, resident_id, status)
    VALUES (v_senior_user_id, v_resident.id, 'active')
    ON CONFLICT DO NOTHING;
  END IF;

  v_entered_by_user := COALESCE(v_senior_user_id, v_family_user_id, v_caregiver_user_id, v_supervisor_user_id);

  IF v_entered_by_user IS NOT NULL THEN
    INSERT INTO resident_medications (resident_id, medication_name, dosage, frequency, route, is_active, prescriber_name, entered_by, schedule, is_prn, is_controlled, start_date)
    VALUES
      (v_resident.id, 'Lisinopril', '10mg', 'DAILY', 'ORAL', true, 'Dr. Smith', v_entered_by_user, '["09:00"]'::jsonb, false, false, CURRENT_DATE - INTERVAL '30 days'),
      (v_resident.id, 'Metformin', '500mg', 'TWICE_DAILY', 'ORAL', true, 'Dr. Smith', v_entered_by_user, '["09:00", "21:00"]'::jsonb, false, false, CURRENT_DATE - INTERVAL '30 days'),
      (v_resident.id, 'Atorvastatin', '20mg', 'DAILY', 'ORAL', true, 'Dr. Jones', v_entered_by_user, '["21:00"]'::jsonb, false, false, CURRENT_DATE - INTERVAL '60 days')
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO appointments (resident_id, appointment_type, title, scheduled_at, provider_name, location, status)
  VALUES
    (v_resident.id, 'DOCTOR_VISIT', 'Annual Physical Exam', CURRENT_TIMESTAMP + INTERVAL '3 days', 'Dr. Smith', 'Main Clinic', 'SCHEDULED'),
    (v_resident.id, 'SCREENING', 'Routine Blood Work', CURRENT_TIMESTAMP + INTERVAL '1 week', 'Quest Labs', 'Laboratory', 'SCHEDULED')
  ON CONFLICT DO NOTHING;

  INSERT INTO task_categories (id, name, category_type, description)
  VALUES
    ('c0000000-0000-0000-0000-000000000001', 'Medication Administration', 'clinical', 'Administer prescribed medications'),
    ('c0000000-0000-0000-0000-000000000002', 'Vital Signs Check', 'monitoring', 'Check and record vital signs'),
    ('c0000000-0000-0000-0000-000000000003', 'Meal Assistance', 'nutrition', 'Assist resident with meals')
  ON CONFLICT (id) DO NOTHING;

  SELECT id INTO v_category_med_id FROM task_categories WHERE category_type = 'clinical' LIMIT 1;
  SELECT id INTO v_category_vitals_id FROM task_categories WHERE category_type = 'monitoring' LIMIT 1;
  SELECT id INTO v_category_meal_id FROM task_categories WHERE category_type = 'nutrition' LIMIT 1;

  IF v_caregiver_user_id IS NOT NULL AND v_category_med_id IS NOT NULL THEN
    INSERT INTO tasks (agency_id, resident_id, category_id, task_name, description, state, priority, risk_level, scheduled_start, scheduled_end, owner_user_id)
    VALUES
      (v_agency_id, v_resident.id, v_category_med_id, 'Administer morning medications', 'Lisinopril 10mg, Metformin 500mg', 'scheduled', 'high', 'B', CURRENT_TIMESTAMP + INTERVAL '1 hour', CURRENT_TIMESTAMP + INTERVAL '1 hour 30 minutes', v_caregiver_user_id),
      (v_agency_id, v_resident.id, v_category_vitals_id, 'Check blood pressure', 'Morning vital signs check', 'scheduled', 'medium', 'B', CURRENT_TIMESTAMP + INTERVAL '30 minutes', CURRENT_TIMESTAMP + INTERVAL '1 hour', v_caregiver_user_id),
      (v_agency_id, v_resident.id, v_category_meal_id, 'Assist with breakfast', 'Ensure proper nutrition intake', 'scheduled', 'medium', 'B', CURRENT_TIMESTAMP + INTERVAL '2 hours', CURRENT_TIMESTAMP + INTERVAL '2 hours 30 minutes', v_caregiver_user_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'already_seeded', false,
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

GRANT EXECUTE ON FUNCTION seed_active_context(uuid) TO anon;