/*
  # Fix seed_active_context schema mismatches

  Aligns INSERT statements with actual table schemas:
  - senior_resident_links: remove relationship, is_primary
  - family_resident_links: remove relationship, can_manage_*, can_view_*
  - resident_medications: fix dosage_unit→dosage, scheduled_time→schedule, prescribed_by→prescriber_name
*/

CREATE OR REPLACE FUNCTION seed_active_context(p_care_context_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_context RECORD;
  v_resident RECORD;
  v_agency_id uuid;
  v_senior_user_id uuid;
  v_family_user_id uuid;
  v_caregiver_user_id uuid;
  v_supervisor_user_id uuid;
  v_admin_user_id uuid;
  i INTEGER;
BEGIN
  SELECT * INTO v_context FROM care_contexts WHERE id = p_care_context_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Care context % not found', p_care_context_id;
  END IF;

  SELECT * INTO v_resident FROM residents WHERE id = v_context.resident_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resident % not found', v_context.resident_id;
  END IF;

  v_agency_id := COALESCE(v_context.agency_id, v_resident.agency_id);

  IF v_context.management_mode IN ('SELF', 'FAMILY_MANAGED') THEN
    INSERT INTO user_profiles (id, role_id, display_name, is_active, agency_id)
    SELECT gen_random_uuid(), r.id, v_resident.full_name, true, v_agency_id
    FROM roles r WHERE r.name = 'SENIOR'
    ON CONFLICT DO NOTHING RETURNING id INTO v_senior_user_id;

    IF v_senior_user_id IS NULL THEN
      SELECT up.id INTO v_senior_user_id FROM user_profiles up
      JOIN roles r ON up.role_id = r.id
      WHERE r.name = 'SENIOR' AND up.agency_id = v_agency_id LIMIT 1;
    END IF;

    INSERT INTO senior_resident_links (senior_user_id, resident_id, status)
    VALUES (v_senior_user_id, v_resident.id, 'active')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_context.management_mode = 'FAMILY_MANAGED' THEN
    INSERT INTO user_profiles (id, role_id, display_name, is_active, agency_id)
    SELECT gen_random_uuid(), r.id, 'Family Admin', true, v_agency_id
    FROM roles r WHERE r.name = 'FAMILY_ADMIN'
    ON CONFLICT DO NOTHING RETURNING id INTO v_family_user_id;

    IF v_family_user_id IS NULL THEN
      SELECT up.id INTO v_family_user_id FROM user_profiles up
      JOIN roles r ON up.role_id = r.id
      WHERE r.name = 'FAMILY_ADMIN' AND up.agency_id = v_agency_id LIMIT 1;
    END IF;

    INSERT INTO family_resident_links (family_user_id, resident_id, status)
    VALUES (v_family_user_id, v_resident.id, 'active')
    ON CONFLICT DO NOTHING;

    INSERT INTO family_notification_preferences (family_user_id, notify_medication_due, notify_vitals_abnormal, notify_appointment_reminder, notification_method)
    VALUES (v_family_user_id, true, true, true, 'EMAIL') ON CONFLICT (family_user_id) DO NOTHING;
  END IF;

  IF v_context.supervision_enabled OR v_context.service_model IN ('AGENCY_HOME_CARE', 'AGENCY_FACILITY') THEN
    INSERT INTO user_profiles (id, role_id, display_name, is_active, agency_id)
    SELECT gen_random_uuid(), r.id, 'Maria Garcia', true, v_agency_id
    FROM roles r WHERE r.name = 'SUPERVISOR'
    ON CONFLICT DO NOTHING RETURNING id INTO v_supervisor_user_id;

    IF v_supervisor_user_id IS NULL THEN
      SELECT up.id INTO v_supervisor_user_id FROM user_profiles up
      JOIN roles r ON up.role_id = r.id
      WHERE r.name = 'SUPERVISOR' AND up.agency_id = v_agency_id LIMIT 1;
    END IF;
  END IF;

  IF v_context.management_mode = 'AGENCY_MANAGED' THEN
    INSERT INTO user_profiles (id, role_id, display_name, is_active, agency_id)
    SELECT gen_random_uuid(), r.id, 'Sarah Chen', true, v_agency_id
    FROM roles r WHERE r.name = 'AGENCY_ADMIN'
    ON CONFLICT DO NOTHING RETURNING id INTO v_admin_user_id;

    IF v_admin_user_id IS NULL THEN
      SELECT up.id INTO v_admin_user_id FROM user_profiles up
      JOIN roles r ON up.role_id = r.id
      WHERE r.name = 'AGENCY_ADMIN' AND up.agency_id = v_agency_id LIMIT 1;
    END IF;
  END IF;

  IF v_context.care_setting = 'FACILITY' OR v_context.service_model = 'AGENCY_FACILITY' THEN
    INSERT INTO departments (agency_id, name, department_code, description, status)
    VALUES
      (v_agency_id, 'Nursing Care', 'NURSING', 'Personal care and health monitoring', 'normal'),
      (v_agency_id, 'Kitchen Services', 'KITCHEN', 'Meal preparation and dietary', 'normal'),
      (v_agency_id, 'Housekeeping', 'HOUSEKEEPING', 'Facility maintenance and cleaning', 'normal')
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_context.service_model IN ('DIRECT_HIRE', 'AGENCY_HOME_CARE', 'AGENCY_FACILITY') THEN
    INSERT INTO user_profiles (id, role_id, display_name, is_active, agency_id)
    SELECT gen_random_uuid(), r.id, 'Jordan Lee', true, v_agency_id
    FROM roles r WHERE r.name = 'CAREGIVER'
    ON CONFLICT DO NOTHING RETURNING id INTO v_caregiver_user_id;

    IF v_caregiver_user_id IS NULL THEN
      SELECT up.id INTO v_caregiver_user_id FROM user_profiles up
      JOIN roles r ON up.role_id = r.id
      WHERE r.name = 'CAREGIVER' AND up.agency_id = v_agency_id LIMIT 1;
    END IF;

    INSERT INTO caregiver_assignments (agency_id, resident_id, caregiver_user_id, assigned_by, status)
    VALUES (v_agency_id, v_resident.id, v_caregiver_user_id, COALESCE(v_supervisor_user_id, v_admin_user_id, v_caregiver_user_id), 'active')
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO resident_medications (
    resident_id,
    medication_name,
    dosage,
    frequency,
    route,
    schedule,
    prescriber_name,
    is_prn,
    is_controlled,
    start_date,
    is_active,
    entered_by,
    language_context
  )
  VALUES
    (
      v_resident.id,
      'Lisinopril',
      '10 mg',
      'Once daily',
      'ORAL',
      '{"times": ["09:00"]}'::jsonb,
      'Dr. Sarah Johnson',
      false,
      false,
      CURRENT_DATE,
      true,
      COALESCE(v_caregiver_user_id, v_admin_user_id, v_supervisor_user_id),
      'Clinical medication order'
    ),
    (
      v_resident.id,
      'Metformin',
      '500 mg',
      'Twice daily',
      'ORAL',
      '{"times": ["09:00", "21:00"]}'::jsonb,
      'Dr. Sarah Johnson',
      false,
      false,
      CURRENT_DATE,
      true,
      COALESCE(v_caregiver_user_id, v_admin_user_id, v_supervisor_user_id),
      'Clinical medication order'
    )
  ON CONFLICT DO NOTHING;

  FOR i IN 0..4 LOOP
    INSERT INTO vital_signs (resident_id, measurement_type, value, unit, measured_at, measured_by, data_source)
    VALUES
      (v_resident.id, 'BLOOD_PRESSURE_SYSTOLIC', 120 + (i * 2), 'mmHg', now() - (i || ' days')::interval, v_caregiver_user_id, 'MANUAL'),
      (v_resident.id, 'HEART_RATE', 72 + i, 'bpm', now() - (i || ' days')::interval, v_caregiver_user_id, 'MANUAL')
    ON CONFLICT DO NOTHING;

    INSERT INTO health_metrics (resident_id, metric_category, metric_type, value, unit, recorded_at, data_source)
    VALUES
      (v_resident.id, 'VITAL', 'blood_pressure_systolic', 120 + (i * 2), 'mmHg', now() - (i || ' days')::interval, 'MANUAL'),
      (v_resident.id, 'VITAL', 'heart_rate', 72 + i, 'bpm', now() - (i || ' days')::interval, 'MANUAL')
    ON CONFLICT DO NOTHING;
  END LOOP;

  INSERT INTO health_metric_trends (resident_id, metric_type, trend_direction, change_rate, confidence_level, computed_at)
  VALUES
    (v_resident.id, 'blood_pressure_systolic', 'STABLE', 0.5, 0.85, now()),
    (v_resident.id, 'heart_rate', 'INCREASING', 1.2, 0.90, now())
  ON CONFLICT DO NOTHING;

  INSERT INTO appointments (resident_id, appointment_type, title, scheduled_at, duration_minutes, status, provider_name, location)
  VALUES
    (v_resident.id, 'DOCTOR_VISIT', 'Annual Physical', now() + interval '7 days', 60, 'SCHEDULED', 'Dr. Sarah Johnson', 'Main Clinic'),
    (v_resident.id, 'LAB_TEST', 'Blood Work', now() + interval '14 days', 30, 'SCHEDULED', 'LabCorp', 'Lab Center')
  ON CONFLICT DO NOTHING;

  INSERT INTO intelligence_signals (resident_id, signal_category, signal_type, signal_summary, severity, confidence_score, detected_at)
  VALUES
    (v_resident.id, 'HEALTH', 'vital_trend', 'Blood pressure trending upward', 'MEDIUM', 0.85, now()),
    (v_resident.id, 'BEHAVIOR', 'activity_change', 'Decreased daily activity', 'LOW', 0.70, now())
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'care_context_id', p_care_context_id,
    'resident_id', v_resident.id,
    'management_mode', v_context.management_mode,
    'seed_complete', true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION seed_active_context(uuid) TO authenticated, anon;