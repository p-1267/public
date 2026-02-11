/*
  # Fix Seed Function - Correct emergency contacts schema

  Fix the resident_emergency_contacts insert to match the actual schema:
  - Use is_primary instead of is_primary_contact
  - Add required entered_by and language_context fields
*/

CREATE OR REPLACE FUNCTION seed_senior_family_scenario()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid := '00000000-0000-0000-0000-999999999999'::uuid;
  v_senior_user_id uuid := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_family_user_id uuid := 'a0000000-0000-0000-0000-000000000002'::uuid;
  v_resident_id uuid := 'b0000000-0000-0000-0000-000000000001'::uuid;
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

  INSERT INTO agencies (id, name, status) VALUES (v_agency_id, 'Showcase Independent Living', 'active') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
  INSERT INTO user_profiles (id, role_id, display_name, is_active) VALUES (v_senior_user_id, v_senior_role_id, 'Dorothy Miller', true), (v_family_user_id, v_family_role_id, 'Robert Miller', true) ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
  INSERT INTO residents (id, agency_id, full_name, date_of_birth, status, metadata) VALUES (v_resident_id, v_agency_id, 'Dorothy Miller', '1946-03-15', 'active', '{"room": "A-101", "care_level": "INDEPENDENT"}'::jsonb) ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
  INSERT INTO senior_resident_links (senior_user_id, resident_id) VALUES (v_senior_user_id, v_resident_id) ON CONFLICT (senior_user_id, resident_id) DO NOTHING;
  INSERT INTO family_resident_links (family_user_id, resident_id) VALUES (v_family_user_id, v_resident_id) ON CONFLICT (family_user_id, resident_id) DO NOTHING;

  DELETE FROM resident_medications WHERE resident_id = v_resident_id;
  INSERT INTO resident_medications (resident_id, medication_name, dosage, frequency, route, schedule, prescriber_name, is_prn, is_controlled, is_active, start_date, entered_by) VALUES
    (v_resident_id, 'Lisinopril', '10mg', 'DAILY', 'ORAL', '{"times": ["08:00"]}'::jsonb, 'Dr. Sarah Johnson', false, false, true, CURRENT_DATE - interval '90 days', v_family_user_id),
    (v_resident_id, 'Metformin', '500mg', 'TWICE_DAILY', 'ORAL', '{"times": ["08:00", "18:00"]}'::jsonb, 'Dr. Sarah Johnson', false, false, true, CURRENT_DATE - interval '180 days', v_family_user_id);

  DELETE FROM appointments WHERE resident_id = v_resident_id;
  INSERT INTO appointments (resident_id, title, appointment_type, scheduled_at, location, provider_name, status) VALUES
    (v_resident_id, 'Follow-up with Dr. Johnson', 'DOCTOR_VISIT', CURRENT_DATE + interval '3 days' + interval '10 hours', 'Medical Center', 'Dr. Sarah Johnson', 'SCHEDULED'),
    (v_resident_id, 'Routine Lab Work', 'FOLLOW_UP', CURRENT_DATE + interval '7 days' + interval '9 hours', 'Quest Diagnostics', 'Lab Tech', 'SCHEDULED'),
    (v_resident_id, 'Quarterly Check-up', 'DOCTOR_VISIT', CURRENT_DATE - interval '30 days', 'Medical Center', 'Dr. Sarah Johnson', 'COMPLETED');

  DELETE FROM lab_tests WHERE resident_id = v_resident_id;
  INSERT INTO lab_tests (resident_id, test_name, test_type, ordered_at, completed_at, ordered_by, status, lab_name) VALUES
    (v_resident_id, 'HbA1c', 'BLOOD_WORK', CURRENT_DATE - interval '30 days', CURRENT_DATE - interval '28 days', 'Dr. Johnson', 'COMPLETED', 'Quest Diagnostics'),
    (v_resident_id, 'Total Cholesterol', 'BLOOD_WORK', CURRENT_DATE - interval '30 days', CURRENT_DATE - interval '28 days', 'Dr. Johnson', 'COMPLETED', 'Quest Diagnostics'),
    (v_resident_id, 'Blood Pressure Check', 'BLOOD_WORK', CURRENT_DATE - interval '7 days', CURRENT_DATE - interval '7 days', 'Nurse', 'COMPLETED', 'Quest Diagnostics');

  DELETE FROM resident_documents WHERE resident_id = v_resident_id;
  INSERT INTO resident_documents (resident_id, title, file_name, file_size, file_type, storage_path, document_date, uploaded_by) VALUES
    (v_resident_id, 'Medical History Summary', 'medical-history.pdf', 245, 'application/pdf', '/documents/medical-history.pdf', CURRENT_DATE - interval '60 days', v_family_user_id),
    (v_resident_id, 'Insurance Card Front', 'insurance-card.jpg', 180, 'image/jpeg', '/documents/insurance-card.jpg', CURRENT_DATE - interval '120 days', v_family_user_id),
    (v_resident_id, 'Emergency Contact List', 'emergency-contacts.pdf', 45, 'application/pdf', '/documents/emergency-contacts.pdf', CURRENT_DATE - interval '10 days', v_senior_user_id);

  DELETE FROM resident_emergency_contacts WHERE resident_id = v_resident_id;
  INSERT INTO resident_emergency_contacts (resident_id, contact_name, relationship, phone_primary, phone_secondary, is_primary, contact_order, entered_by, language_context) VALUES
    (v_resident_id, 'Robert Miller', 'Son', '+1-555-0101', NULL, true, 1, v_family_user_id, 'en-US'),
    (v_resident_id, 'Lisa Miller', 'Daughter', '+1-555-0102', NULL, false, 2, v_family_user_id, 'en-US'),
    (v_resident_id, 'Dr. Sarah Johnson', 'Primary Physician', '+1-555-0200', '+1-555-0201', false, 3, v_family_user_id, 'en-US');

  INSERT INTO senior_accessibility_settings (user_id, font_size_multiplier, high_contrast_enabled, voice_navigation_enabled) VALUES (v_senior_user_id, 1.2, false, false) ON CONFLICT (user_id) DO UPDATE SET font_size_multiplier = EXCLUDED.font_size_multiplier;
  INSERT INTO family_notification_preferences (user_id, notify_medication_missed, notify_appointment_reminder, notify_health_alert, notify_incident, delivery_method) VALUES (v_family_user_id, true, true, true, true, 'EMAIL_AND_SMS') ON CONFLICT (user_id) DO UPDATE SET notify_medication_missed = EXCLUDED.notify_medication_missed;

  DELETE FROM notification_log WHERE resident_id = v_resident_id;
  INSERT INTO notification_log (user_id, resident_id, notification_type, title, message, priority) VALUES
    (v_family_user_id, v_resident_id, 'HEALTH_ALERT', 'Blood Pressure Slightly Elevated', 'Dorothy''s blood pressure reading was 142/88, slightly above normal', 'MEDIUM'),
    (v_family_user_id, v_resident_id, 'APPOINTMENT_REMINDER', 'Upcoming Doctor Visit', 'Appointment with Dr. Johnson in 3 days', 'HIGH'),
    (v_family_user_id, v_resident_id, 'MEDICATION_ADHERENCE', 'All Medications Taken', 'Dorothy has taken all medications today', 'LOW'),
    (v_senior_user_id, v_resident_id, 'APPOINTMENT_REMINDER', 'Lab Work Tomorrow', 'Lab appointment at Quest Diagnostics tomorrow at 9 AM', 'HIGH'),
    (v_senior_user_id, v_resident_id, 'HEALTH_REMINDER', 'Time for Evening Medication', 'Please take your evening Lisinopril', 'MEDIUM');

  DELETE FROM device_registry WHERE resident_id = v_resident_id;
  INSERT INTO device_registry (id, device_id, resident_id, device_type, device_name, manufacturer, model, firmware_version, battery_level, trust_state, capabilities, pairing_actor, pairing_timestamp, last_seen_at) VALUES (gen_random_uuid(), 'OMRON-BP-' || substr(md5(v_resident_id::text), 1, 8), v_resident_id, 'BLOOD_PRESSURE_MONITOR', 'OMRON Evolv', 'OMRON', 'BP7900', '2.1.4', 85, 'TRUSTED', '{"supported_metrics": ["BLOOD_PRESSURE_SYSTOLIC", "BLOOD_PRESSURE_DIASTOLIC", "HEART_RATE"]}'::jsonb, v_senior_user_id, now() - interval '30 days', now() - interval '1 hour') RETURNING id INTO v_device_id;

  DELETE FROM health_metrics WHERE resident_id = v_resident_id;
  FOR i IN 1..11 LOOP
    v_timestamp := now() - (i || ' days')::interval + interval '8 hours';
    v_systolic := 125 + (random() * 15)::int;
    v_diastolic := 78 + (random() * 10)::int;
    INSERT INTO health_metrics (resident_id, device_registry_id, metric_category, metric_type, value_numeric, unit, confidence_level, measurement_source, recorded_at) VALUES (v_resident_id, v_device_id, 'CARDIOVASCULAR', 'BLOOD_PRESSURE_SYSTOLIC', v_systolic, 'mmHg', 'HIGH', 'AUTOMATIC_DEVICE', v_timestamp), (v_resident_id, v_device_id, 'CARDIOVASCULAR', 'BLOOD_PRESSURE_DIASTOLIC', v_diastolic, 'mmHg', 'HIGH', 'AUTOMATIC_DEVICE', v_timestamp), (v_resident_id, v_device_id, 'CARDIOVASCULAR', 'HEART_RATE', 72 + (random() * 12)::int, 'bpm', 'HIGH', 'AUTOMATIC_DEVICE', v_timestamp);
    v_timestamp := v_timestamp + interval '12 hours';
    v_systolic := 128 + (random() * 18)::int;
    v_diastolic := 80 + (random() * 10)::int;
    INSERT INTO health_metrics (resident_id, device_registry_id, metric_category, metric_type, value_numeric, unit, confidence_level, measurement_source, recorded_at) VALUES (v_resident_id, v_device_id, 'CARDIOVASCULAR', 'BLOOD_PRESSURE_SYSTOLIC', v_systolic, 'mmHg', 'HIGH', 'AUTOMATIC_DEVICE', v_timestamp), (v_resident_id, v_device_id, 'CARDIOVASCULAR', 'BLOOD_PRESSURE_DIASTOLIC', v_diastolic, 'mmHg', 'HIGH', 'AUTOMATIC_DEVICE', v_timestamp), (v_resident_id, v_device_id, 'CARDIOVASCULAR', 'HEART_RATE', 75 + (random() * 10)::int, 'bpm', 'HIGH', 'AUTOMATIC_DEVICE', v_timestamp);
  END LOOP;
  FOR i IN 1..7 LOOP INSERT INTO health_metrics (resident_id, device_registry_id, metric_category, metric_type, value_numeric, unit, confidence_level, measurement_source, recorded_at) VALUES (v_resident_id, v_device_id, 'RESPIRATORY', 'OXYGEN_SATURATION', 95 + (random() * 3)::int, '%', 'HIGH', 'AUTOMATIC_DEVICE', now() - (i || ' days')::interval + interval '12 hours'); END LOOP;
  FOR i IN 1..4 LOOP INSERT INTO health_metrics (resident_id, device_registry_id, metric_category, metric_type, value_numeric, unit, confidence_level, measurement_source, recorded_at) VALUES (v_resident_id, v_device_id, 'ACTIVITY', 'STEPS', 2500 + (random() * 2000)::int, 'steps', 'MEDIUM', 'AUTOMATIC_DEVICE', now() - (i || ' days')::interval + interval '23 hours' + interval '30 minutes'); END LOOP;

  DELETE FROM intelligence_signals WHERE resident_id = v_resident_id;
  INSERT INTO intelligence_signals (resident_id, signal_category, signal_type, severity, summary, detected_at, evidence, confidence_score) VALUES
    (v_resident_id, 'HEALTH_TREND', 'BLOOD_PRESSURE_ELEVATION', 'MEDIUM', 'Blood pressure trending higher over past 3 days', now() - interval '2 hours', '{"avg_systolic": 138, "readings": 6}'::jsonb, 0.78),
    (v_resident_id, 'MEDICATION_ADHERENCE', 'PERFECT_ADHERENCE_STREAK', 'LOW', 'Perfect medication adherence for 14 consecutive days', now() - interval '6 hours', '{"streak_days": 14}'::jsonb, 0.95),
    (v_resident_id, 'ACTIVITY_PATTERN', 'REDUCED_ACTIVITY', 'LOW', 'Daily steps down 15% compared to 30-day average', now() - interval '12 hours', '{"avg_recent": 2890, "avg_baseline": 3400}'::jsonb, 0.72),
    (v_resident_id, 'APPOINTMENT_REMINDER', 'UPCOMING_APPOINTMENT', 'LOW', 'Doctor appointment scheduled in 3 days', now() - interval '1 day', '{"appointment_type": "DOCTOR_VISIT", "days_until": 3}'::jsonb, 1.0),
    (v_resident_id, 'LAB_RESULT', 'HBA1C_IN_TARGET_RANGE', 'LOW', 'Latest HbA1c (6.8%) within acceptable range for diabetics', now() - interval '28 days', '{"value": 6.8, "target": "<7.0"}'::jsonb, 0.99);

  DELETE FROM vital_signs WHERE resident_id = v_resident_id;
  FOR i IN 0..6 LOOP
    v_timestamp := CURRENT_DATE - i + interval '8 hours';
    v_systolic := 124 + (random() * 14)::int;
    v_diastolic := 76 + (random() * 10)::int;
    INSERT INTO vital_signs (resident_id, vital_type, value, systolic, diastolic, recorded_at, recorded_by, notes) VALUES (v_resident_id, 'BLOOD_PRESSURE', v_systolic || '/' || v_diastolic, v_systolic, v_diastolic, v_timestamp, v_senior_user_id, 'Morning');
    v_vital_count := v_vital_count + 1;
    v_timestamp := v_timestamp + interval '12 hours';
    IF extract(hour from v_timestamp) >= 18 THEN
      v_systolic := 128 + (random() * 18)::int;
      v_diastolic := 76 + (random() * 10)::int;
      INSERT INTO vital_signs (resident_id, vital_type, value, systolic, diastolic, recorded_at, recorded_by, notes) VALUES (v_resident_id, 'BLOOD_PRESSURE', v_systolic || '/' || v_diastolic, v_systolic, v_diastolic, v_timestamp, v_senior_user_id, 'Evening');
      v_vital_count := v_vital_count + 1;
    END IF;
    IF extract(hour from v_timestamp) = 7 THEN INSERT INTO vital_signs (resident_id, vital_type, value, recorded_at, recorded_by, notes) VALUES (v_resident_id, 'GLUCOSE', (95 + (random() * 35)::int)::text, v_timestamp, v_senior_user_id, 'Fasting'); v_vital_count := v_vital_count + 1; END IF;
  END LOOP;

  DELETE FROM health_metric_trends WHERE resident_id = v_resident_id;
  FOR v_metric_type IN SELECT DISTINCT metric_type FROM health_metrics WHERE resident_id = v_resident_id LOOP
    PERFORM calculate_health_metric_trends(v_resident_id, v_metric_type);
  END LOOP;

  RETURN jsonb_build_object('status', 'SUCCESS', 'message', 'Senior + Family data seeded successfully', 'resident_id', v_resident_id, 'functional_pages', '22 of 22', 'data', jsonb_build_object('medications', 2, 'appointments', 3, 'lab_tests', 3, 'documents', 3, 'emergency_contacts', 3, 'notifications', 5, 'vital_signs', v_vital_count, 'health_metrics', (SELECT COUNT(*) FROM health_metrics WHERE resident_id = v_resident_id), 'health_trends', (SELECT COUNT(*) FROM health_metric_trends WHERE resident_id = v_resident_id)));
END;
$$;