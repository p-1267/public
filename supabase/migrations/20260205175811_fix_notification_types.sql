/*
  # Fix Notification Types
  
  Valid types: EMERGENCY, CRITICAL, IMPORTANT, INFORMATIONAL
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
  v_thread_id uuid;
  i int;
  v_timestamp timestamptz;
  v_systolic int;
  v_diastolic int;
  v_vital_count int := 0;
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

  INSERT INTO senior_resident_links (senior_user_id, resident_id, status)
  VALUES (v_senior_user_id, v_resident_id, 'active')
  ON CONFLICT (senior_user_id, resident_id) DO NOTHING;

  INSERT INTO family_resident_links (family_user_id, resident_id, status)
  VALUES (v_family_user_id, v_resident_id, 'active')
  ON CONFLICT (family_user_id, resident_id) DO NOTHING;

  UPDATE senior_operating_mode SET disabled_at = now() WHERE resident_id = v_resident_id AND disabled_at IS NULL;
  INSERT INTO senior_operating_mode (resident_id, mode, enabled_by, enabled_at, reason)
  VALUES (v_resident_id, 'SELF_MANAGE', v_senior_user_id, now(), 'Scenario setup');

  INSERT INTO resident_medications (
    id, resident_id, medication_name, dosage, frequency, route, 
    schedule, prescriber_name, is_prn, is_controlled, start_date, 
    special_instructions, is_active, entered_by
  )
  VALUES
    ('d0000000-0000-0000-0000-000000000001'::uuid, v_resident_id, 'Lisinopril', '10mg', 'Once daily', 'ORAL',
     '{"times": ["09:00"]}'::jsonb, 'Dr. Sarah Johnson', false, false, CURRENT_DATE,
     'Take with food', true, v_senior_user_id),
    ('d0000000-0000-0000-0000-000000000002'::uuid, v_resident_id, 'Metformin', '500mg', 'Twice daily', 'ORAL',
     '{"times": ["09:00", "21:00"]}'::jsonb, 'Dr. Sarah Johnson', false, false, CURRENT_DATE,
     'Take with meals', true, v_senior_user_id)
  ON CONFLICT (id) DO UPDATE SET is_active = true;

  INSERT INTO appointments (
    id, resident_id, appointment_type, title, scheduled_at, duration_minutes, 
    status, provider_name, location
  )
  VALUES 
    ('e0000000-0000-0000-0000-000000000001'::uuid, v_resident_id, 'DOCTOR_VISIT', 'Annual Physical Exam',
     (now() + interval '7 days')::timestamp, 60, 'SCHEDULED', 'Dr. Sarah Johnson', 'Main Street Clinic'),
    ('e0000000-0000-0000-0000-000000000002'::uuid, v_resident_id, 'PROCEDURE', 'Routine Blood Work',
     (now() + interval '14 days')::timestamp, 30, 'SCHEDULED', 'LabCorp', 'Downtown Lab'),
    ('e0000000-0000-0000-0000-000000000003'::uuid, v_resident_id, 'CONSULTATION', 'Cardiology Follow-up',
     (now() + interval '21 days')::timestamp, 45, 'SCHEDULED', 'Dr. Michael Chen', 'Heart Center')
  ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

  INSERT INTO lab_tests (
    resident_id, test_type, test_name, ordered_by, ordered_at, 
    scheduled_at, completed_at, status, lab_name, notes
  )
  VALUES
    (v_resident_id, 'BLOOD_WORK', 'Complete Blood Count (CBC)', 'Dr. Sarah Johnson',
     now() - interval '30 days', now() - interval '23 days', now() - interval '21 days',
     'COMPLETED', 'LabCorp', 'Annual wellness check'),
    (v_resident_id, 'BLOOD_WORK', 'Lipid Panel', 'Dr. Sarah Johnson',
     now() - interval '30 days', now() - interval '23 days', now() - interval '21 days',
     'COMPLETED', 'LabCorp', 'Cholesterol monitoring'),
    (v_resident_id, 'BLOOD_WORK', 'HbA1c Test', 'Dr. Sarah Johnson',
     now() - interval '7 days', now() + interval '7 days', NULL,
     'SCHEDULED', 'LabCorp', 'Diabetes monitoring');

  INSERT INTO resident_documents (
    resident_id, title, description, file_name, storage_path, uploaded_by
  )
  VALUES
    (v_resident_id, 'Annual Physical Results 2025', 
     'Complete results from annual physical examination',
     'annual_physical_2025.pdf', '/documents/dorothy_miller/annual_physical_2025.pdf', v_senior_user_id),
    (v_resident_id, 'Medicare Card', 
     'Scanned Medicare Part B insurance card',
     'medicare_card.jpg', '/documents/dorothy_miller/medicare_card.jpg', v_family_user_id),
    (v_resident_id, 'Advanced Directive', 
     'Healthcare power of attorney and living will',
     'advanced_directive.pdf', '/documents/dorothy_miller/advanced_directive.pdf', v_family_user_id);

  INSERT INTO resident_care_plan_anchors (
    resident_id, care_frequency, mobility_assistance_needs, sleep_patterns,
    language_context, dietary_restrictions, dietary_preferences, 
    activity_preferences, special_considerations, entered_by
  )
  VALUES
    (v_resident_id, 'DAILY', ARRAY['HANDRAILS', 'NON_SLIP_FOOTWEAR'], 
     '{"bedtime": "22:00", "wake_time": "07:00", "naps": false}'::jsonb,
     'ENGLISH', ARRAY['LOW_SODIUM'], ARRAY['VEGETABLES', 'FISH'],
     ARRAY['WALKING', 'READING'], 
     'Medication management: Lisinopril 10mg daily, Metformin 500mg twice daily. Monitors BP and glucose at home daily. Prefers morning activities and social engagement.', 
     v_family_user_id)
  ON CONFLICT (resident_id) DO UPDATE SET
    care_frequency = EXCLUDED.care_frequency,
    special_considerations = EXCLUDED.special_considerations;

  INSERT INTO resident_emergency_contacts (
    resident_id, contact_name, relationship, phone_primary, phone_secondary,
    email, is_primary, contact_order, notes, language_context, entered_by
  )
  VALUES
    (v_resident_id, 'Robert Miller', 'SON', '+1-555-0201', NULL,
     'robert.miller@email.com', true, 1, 
     'Lives 10 minutes away, available 24/7', 'ENGLISH', v_senior_user_id),
    (v_resident_id, 'Jennifer Miller', 'DAUGHTER', '+1-555-0202', '+1-555-0203',
     'jennifer.miller@email.com', false, 2,
     'Works weekdays, available evenings and weekends', 'ENGLISH', v_senior_user_id),
    (v_resident_id, 'Dr. Sarah Johnson', 'PRIMARY_PHYSICIAN', '+1-555-0100', NULL,
     'dr.johnson@healthcenter.com', false, 3,
     'Primary care physician for 15 years', 'ENGLISH', v_senior_user_id);

  -- FIXED: Use valid notification types
  INSERT INTO notification_log (
    resident_id, recipient_user_id, notification_type, alert_type, message,
    delivery_channels, suppressed_by_preference, overridden_by_policy, delivered_at
  )
  VALUES
    (v_resident_id, v_senior_user_id, 'IMPORTANT', 'INFO',
     'Time for morning medications: Lisinopril 10mg and Metformin 500mg',
     ARRAY['PUSH'], false, false, now() - interval '2 hours'),
    (v_resident_id, v_family_user_id, 'INFORMATIONAL', 'INFO',
     'Upcoming appointment: Annual Physical Exam with Dr. Sarah Johnson tomorrow at 10:00 AM',
     ARRAY['EMAIL', 'PUSH'], false, false, now() - interval '1 day'),
    (v_resident_id, v_senior_user_id, 'CRITICAL', 'MEDIUM',
     'Blood pressure reading of 142/88 is above target. Please rest and recheck in 30 minutes.',
     ARRAY['PUSH'], false, false, now() - interval '3 days'),
    (v_resident_id, v_senior_user_id, 'INFORMATIONAL', 'INFO',
     'Your recent lab test results from LabCorp are now available for review.',
     ARRAY['EMAIL'], false, false, now() - interval '7 days'),
    (v_resident_id, v_family_user_id, 'INFORMATIONAL', 'INFO',
     'Care plan has been reviewed and updated by care team.',
     ARRAY['EMAIL'], false, false, now() - interval '15 days');

  v_thread_id := 'g0000000-0000-0000-0000-000000000001'::uuid;
  INSERT INTO message_threads (
    id, agency_id, context_type, context_id, subject, created_by, 
    last_message_at, is_active, metadata
  )
  VALUES
    (v_thread_id, v_agency_id, 'FAMILY', v_resident_id, 'Weekly Check-in',
     v_family_user_id, now() - interval '2 hours', true, '{}'::jsonb),
    ('g0000000-0000-0000-0000-000000000002'::uuid, v_agency_id, 'FAMILY', v_resident_id, 
     'Medication Questions', v_senior_user_id, now() - interval '3 days', true, '{}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET last_message_at = EXCLUDED.last_message_at;

  INSERT INTO messages (
    thread_id, topic, sender_id, sender_role, extension, message_type, content, sent_at
  )
  VALUES
    (v_thread_id, 'FAMILY', v_family_user_id, 'FAMILY_ADMIN', 'text', 'TEXT',
     'Hi Mom! Just checking in. How are you feeling today?', now() - interval '2 hours 30 minutes'),
    (v_thread_id, 'FAMILY', v_senior_user_id, 'SENIOR', 'text', 'TEXT',
     'Hi Robert! I''m doing well. Just finished my morning walk and took my medications.', now() - interval '2 hours'),
    ('g0000000-0000-0000-0000-000000000002'::uuid, 'FAMILY', v_senior_user_id, 'SENIOR', 'text', 'TEXT',
     'I noticed my new Metformin bottle says to take with meals. Is morning and evening okay?', now() - interval '3 days 2 hours'),
    ('g0000000-0000-0000-0000-000000000002'::uuid, 'FAMILY', v_family_user_id, 'FAMILY_ADMIN', 'text', 'TEXT',
     'Yes, that''s perfect! Morning with breakfast and evening with dinner is ideal timing.', now() - interval '3 days');

  FOR i IN 0..71 LOOP
    v_timestamp := now() - (i || ' hours')::interval;
    
    IF extract(hour from v_timestamp) = 8 THEN
      v_systolic := 118 + (random() * 20)::int;
      v_diastolic := 75 + (random() * 12)::int;
      INSERT INTO vital_signs (
        resident_id, vital_type, value, systolic, diastolic, 
        recorded_at, recorded_by, notes
      ) VALUES (
        v_resident_id, 'BLOOD_PRESSURE', v_systolic || '/' || v_diastolic,
        v_systolic, v_diastolic, v_timestamp, v_senior_user_id, 'Morning'
      );
      v_vital_count := v_vital_count + 1;
    ELSIF extract(hour from v_timestamp) = 14 THEN
      v_systolic := 122 + (random() * 18)::int;
      v_diastolic := 78 + (random() * 10)::int;
      INSERT INTO vital_signs (
        resident_id, vital_type, value, systolic, diastolic, 
        recorded_at, recorded_by, notes
      ) VALUES (
        v_resident_id, 'BLOOD_PRESSURE', v_systolic || '/' || v_diastolic,
        v_systolic, v_diastolic, v_timestamp, v_senior_user_id, 'Afternoon'
      );
      v_vital_count := v_vital_count + 1;
    ELSIF extract(hour from v_timestamp) = 20 THEN
      v_systolic := 120 + (random() * 16)::int;
      v_diastolic := 76 + (random() * 10)::int;
      INSERT INTO vital_signs (
        resident_id, vital_type, value, systolic, diastolic, 
        recorded_at, recorded_by, notes
      ) VALUES (
        v_resident_id, 'BLOOD_PRESSURE', v_systolic || '/' || v_diastolic,
        v_systolic, v_diastolic, v_timestamp, v_senior_user_id, 'Evening'
      );
      v_vital_count := v_vital_count + 1;
    END IF;
    
    IF extract(hour from v_timestamp) = 7 THEN
      INSERT INTO vital_signs (
        resident_id, vital_type, value, recorded_at, recorded_by, notes
      ) VALUES (
        v_resident_id, 'GLUCOSE', (95 + (random() * 35)::int)::text,
        v_timestamp, v_senior_user_id, 'Fasting'
      );
      v_vital_count := v_vital_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'message', 'Senior + Family scenario COMPLETE',
    'resident_id', v_resident_id,
    'data', jsonb_build_object(
      'medications', 2,
      'appointments', 3,
      'lab_tests', 3,
      'documents', 3,
      'care_plan', 1,
      'emergency_contacts', 3,
      'notifications', 5,
      'message_threads', 2,
      'messages', 4,
      'vital_signs', v_vital_count
    )
  );
END;
$$;
