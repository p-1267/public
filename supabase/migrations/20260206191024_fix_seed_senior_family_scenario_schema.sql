/*
  # Fix seed_senior_family_scenario Schema Match

  ## Changes
  - Fix family_notification_preferences columns
  - Fix notification_log columns
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
  v_senior_role_id uuid;
  v_family_role_id uuid;
  v_device_id uuid;
  i int;
  v_timestamp timestamptz;
  v_systolic int;
  v_diastolic int;
  v_vital_count int := 0;
  v_metric_type text;
BEGIN
  SELECT id INTO v_senior_role_id FROM roles WHERE name = 'SENIOR' LIMIT 1;
  SELECT id INTO v_family_role_id FROM roles WHERE name = 'FAMILY_ADMIN' LIMIT 1;

  v_agency_id := '00000000-0000-0000-0000-999999999999'::uuid;
  v_senior_user_id := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_family_user_id := 'a0000000-0000-0000-0000-000000000002'::uuid;
  v_resident_id := 'b0000000-0000-0000-0000-000000000001'::uuid;

  INSERT INTO agencies (id, name, status)
  VALUES (v_agency_id, 'Showcase Independent Living', 'active')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  INSERT INTO user_profiles (id, role_id, display_name, is_active)
  VALUES
    (v_senior_user_id, v_senior_role_id, 'Dorothy Miller', true),
    (v_family_user_id, v_family_role_id, 'Robert Miller', true)
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

  INSERT INTO residents (id, agency_id, full_name, date_of_birth, status, metadata)
  VALUES (
    v_resident_id, v_agency_id, 'Dorothy Miller', '1946-03-15', 'active',
    '{"room": "A-101", "care_level": "INDEPENDENT"}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  INSERT INTO senior_resident_links (senior_user_id, resident_id)
  VALUES (v_senior_user_id, v_resident_id)
  ON CONFLICT (senior_user_id, resident_id) DO NOTHING;

  INSERT INTO family_resident_links (family_user_id, resident_id)
  VALUES (v_family_user_id, v_resident_id)
  ON CONFLICT (family_user_id, resident_id) DO NOTHING;

  DELETE FROM resident_medications WHERE resident_id = v_resident_id;
  INSERT INTO resident_medications (resident_id, medication_name, dosage, frequency, route, schedule, prescriber_name, is_prn, is_controlled, is_active, start_date, entered_by)
  VALUES
    (v_resident_id, 'Lisinopril', '10mg', 'DAILY', 'ORAL', '{"times": ["08:00"]}'::jsonb, 'Dr. Sarah Johnson', false, false, true, CURRENT_DATE - interval '90 days', v_family_user_id),
    (v_resident_id, 'Metformin', '500mg', 'TWICE_DAILY', 'ORAL', '{"times": ["08:00", "18:00"]}'::jsonb, 'Dr. Sarah Johnson', false, false, true, CURRENT_DATE - interval '180 days', v_family_user_id);

  DELETE FROM appointments WHERE resident_id = v_resident_id;
  INSERT INTO appointments (resident_id, title, appointment_type, scheduled_at, location, provider_name, status)
  VALUES
    (v_resident_id, 'Follow-up with Dr. Johnson', 'DOCTOR_VISIT', CURRENT_DATE + interval '3 days' + interval '10 hours', 'Medical Center', 'Dr. Sarah Johnson', 'scheduled'),
    (v_resident_id, 'Routine Lab Work', 'LAB_WORK', CURRENT_DATE + interval '7 days' + interval '9 hours', 'Quest Diagnostics', 'Lab Tech', 'scheduled'),
    (v_resident_id, 'Quarterly Check-up', 'DOCTOR_VISIT', CURRENT_DATE - interval '30 days', 'Medical Center', 'Dr. Sarah Johnson', 'completed');

  DELETE FROM lab_tests WHERE resident_id = v_resident_id;
  INSERT INTO lab_tests (resident_id, test_name, test_category, ordered_date, completed_date, ordered_by, status, result_value, result_unit, reference_range)
  VALUES
    (v_resident_id, 'HbA1c', 'DIABETES', CURRENT_DATE - interval '30 days', CURRENT_DATE - interval '28 days', 'Dr. Johnson', 'completed', '6.8', '%', '4.0-5.6'),
    (v_resident_id, 'Total Cholesterol', 'CARDIOVASCULAR', CURRENT_DATE - interval '30 days', CURRENT_DATE - interval '28 days', 'Dr. Johnson', 'completed', '195', 'mg/dL', '<200'),
    (v_resident_id, 'Blood Pressure Check', 'CARDIOVASCULAR', CURRENT_DATE - interval '7 days', CURRENT_DATE - interval '7 days', 'Nurse', 'completed', '128/82', 'mmHg', '<120/80');

  DELETE FROM resident_documents WHERE resident_id = v_resident_id;
  INSERT INTO resident_documents (resident_id, document_name, document_type, upload_date, uploaded_by, file_size_bytes)
  VALUES
    (v_resident_id, 'Medical History Summary', 'MEDICAL_RECORD', CURRENT_DATE - interval '60 days', v_family_user_id, 245000),
    (v_resident_id, 'Insurance Card Front', 'INSURANCE', CURRENT_DATE - interval '120 days', v_family_user_id, 180000),
    (v_resident_id, 'Emergency Contact List', 'CARE_PLAN', CURRENT_DATE - interval '10 days', v_senior_user_id, 45000);

  INSERT INTO resident_care_plan_anchors (resident_id, care_focus_area, goals, interventions, review_frequency)
  VALUES (v_resident_id, 'Diabetes Management',
    '["Maintain HbA1c below 7.0%", "Monitor blood sugar daily"]',
    '["Take Metformin as prescribed", "Follow diabetic diet plan", "Regular exercise 30min/day"]',
    'MONTHLY')
  ON CONFLICT (resident_id, care_focus_area) DO UPDATE SET goals = EXCLUDED.goals;

  DELETE FROM resident_emergency_contacts WHERE resident_id = v_resident_id;
  INSERT INTO resident_emergency_contacts (resident_id, contact_name, relationship, phone_primary, phone_secondary, is_primary_contact, contact_order)
  VALUES
    (v_resident_id, 'Robert Miller', 'Son', '+1-555-0101', NULL, true, 1),
    (v_resident_id, 'Lisa Miller', 'Daughter', '+1-555-0102', NULL, false, 2),
    (v_resident_id, 'Dr. Sarah Johnson', 'Primary Physician', '+1-555-0200', '+1-555-0201', false, 3);

  INSERT INTO senior_accessibility_settings (user_id, font_size_multiplier, high_contrast_enabled, voice_navigation_enabled)
  VALUES (v_senior_user_id, 1.2, false, false)
  ON CONFLICT (user_id) DO UPDATE SET font_size_multiplier = EXCLUDED.font_size_multiplier;

  -- Correct family_notification_preferences schema
  INSERT INTO family_notification_preferences (user_id, resident_id, channel_in_app, channel_push, channel_sms, channel_email, summary_frequency)
  VALUES (v_family_user_id, v_resident_id, true, true, true, true, 'DAILY')
  ON CONFLICT (user_id, resident_id) DO UPDATE SET channel_email = true;

  -- Correct notification_log schema
  DELETE FROM notification_log WHERE resident_id = v_resident_id;
  INSERT INTO notification_log (resident_id, recipient_user_id, notification_type, alert_type, message, delivery_channels, is_simulation)
  VALUES
    (v_resident_id, v_family_user_id, 'HEALTH_ALERT', 'VITAL_SIGN_ELEVATED', 'Dorothy''s blood pressure reading was 142/88, slightly above normal', ARRAY['EMAIL'], true),
    (v_resident_id, v_family_user_id, 'APPOINTMENT_REMINDER', 'UPCOMING_APPOINTMENT', 'Appointment with Dr. Johnson in 3 days', ARRAY['SMS'], true),
    (v_resident_id, v_family_user_id, 'MEDICATION_ADHERENCE', 'ALL_TAKEN', 'Dorothy has taken all medications today', ARRAY['EMAIL'], true),
    (v_resident_id, v_senior_user_id, 'APPOINTMENT_REMINDER', 'UPCOMING_APPOINTMENT', 'Lab appointment at Quest Diagnostics tomorrow at 9 AM', ARRAY['SMS'], true),
    (v_resident_id, v_senior_user_id, 'HEALTH_REMINDER', 'MEDICATION_DUE', 'Please take your evening Lisinopril', ARRAY['IN_APP'], true);

  DELETE FROM device_registry WHERE resident_id = v_resident_id;
  INSERT INTO device_registry (id, device_id, resident_id, device_type, device_name, manufacturer, model, firmware_version, battery_level, trust_state, capabilities, pairing_actor, pairing_timestamp)
  VALUES (
    gen_random_uuid(), 'OMRON-BP-' || substr(md5(v_resident_id::text), 1, 8), v_resident_id,
    'BLOOD_PRESSURE_MONITOR', 'OMRON Evolv', 'OMRON', 'BP7900', '2.1.4', 85, 'TRUSTED',
    '{"supported_metrics": ["BLOOD_PRESSURE_SYSTOLIC", "BLOOD_PRESSURE_DIASTOLIC", "HEART_RATE"]}'::jsonb,
    v_senior_user_id, now() - interval '30 days'
  )
  RETURNING id INTO v_device_id;

  DELETE FROM health_metrics WHERE resident_id = v_resident_id;

  FOR i IN 1..11 LOOP
    v_timestamp := now() - (i || ' days')::interval + interval '8 hours';
    v_systolic := 125 + (random() * 15)::int;
    v_diastolic := 78 + (random() * 10)::int;

    INSERT INTO health_metrics (resident_id, device_registry_id, metric_category, metric_type, value_numeric, unit, confidence_level, measurement_source, recorded_at)
    VALUES
      (v_resident_id, v_device_id, 'CARDIOVASCULAR', 'BLOOD_PRESSURE_SYSTOLIC', v_systolic, 'mmHg', 'HIGH', 'AUTOMATIC_DEVICE', v_timestamp),
      (v_resident_id, v_device_id, 'CARDIOVASCULAR', 'BLOOD_PRESSURE_DIASTOLIC', v_diastolic, 'mmHg', 'HIGH', 'AUTOMATIC_DEVICE', v_timestamp),
      (v_resident_id, v_device_id, 'CARDIOVASCULAR', 'HEART_RATE', 72 + (random() * 12)::int, 'bpm', 'HIGH', 'AUTOMATIC_DEVICE', v_timestamp);
  END LOOP;

  DELETE FROM vital_signs WHERE resident_id = v_resident_id AND is_simulation = true;
  FOR i IN 0..6 LOOP
    v_timestamp := CURRENT_DATE - i + interval '8 hours';
    v_systolic := 124 + (random() * 14)::int;
    v_diastolic := 76 + (random() * 10)::int;
    INSERT INTO vital_signs (
      resident_id, vital_type, value, systolic, diastolic,
      recorded_at, recorded_by, notes, is_simulation
    ) VALUES (
      v_resident_id, 'BLOOD_PRESSURE', v_systolic || '/' || v_diastolic,
      v_systolic, v_diastolic, v_timestamp, v_senior_user_id, 'Morning', true
    );
    v_vital_count := v_vital_count + 1;
  END LOOP;

  DELETE FROM health_metric_trends WHERE resident_id = v_resident_id;

  FOR v_metric_type IN
    SELECT DISTINCT metric_type
    FROM health_metrics
    WHERE resident_id = v_resident_id
  LOOP
    PERFORM calculate_health_metric_trends(v_resident_id, v_metric_type);
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'message', 'Senior + Family data seeded',
    'resident_id', v_resident_id,
    'data', jsonb_build_object(
      'medications', 2,
      'appointments', 3,
      'lab_tests', 3,
      'documents', 3,
      'care_plan', 1,
      'emergency_contacts', 3,
      'notifications', 5,
      'vital_signs', v_vital_count,
      'health_metrics', (SELECT COUNT(*) FROM health_metrics WHERE resident_id = v_resident_id),
      'health_trends', (SELECT COUNT(*) FROM health_metric_trends WHERE resident_id = v_resident_id)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION seed_senior_family_scenario() TO authenticated, anon;
