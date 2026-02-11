/*
  # Fix Appointment Types
  
  Valid types: DOCTOR_VISIT, FOLLOW_UP, PROCEDURE, CONSULTATION, THERAPY, SCREENING, OTHER
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
  v_doc_1_id uuid;
  v_doc_2_id uuid;
  v_doc_3_id uuid;
  v_thread_1_id uuid;
  v_thread_2_id uuid;
  v_device_bp_id uuid;
  v_device_glucose_id uuid;
  i int;
  v_timestamp timestamptz;
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
  
  INSERT INTO senior_operating_mode (resident_id, mode, enabled_by, enabled_at, reason)
  VALUES (v_resident_id, 'SELF_MANAGE', v_senior_user_id, now(), 'Initial scenario setup');

  -- Add medications
  v_medication_1_id := 'd0000000-0000-0000-0000-000000000001'::uuid;
  v_medication_2_id := 'd0000000-0000-0000-0000-000000000002'::uuid;

  INSERT INTO resident_medications (
    id, resident_id, medication_name, dosage, frequency, route, 
    schedule, prescriber_name, is_prn, is_controlled, start_date, 
    special_instructions, is_active, entered_by
  )
  VALUES
    (
      v_medication_1_id, v_resident_id, 'Lisinopril', '10mg', 'Once daily', 'ORAL',
      '{"times": ["09:00"]}'::jsonb, 'Dr. Sarah Johnson', false, false, CURRENT_DATE,
      'Take with food', true, v_senior_user_id
    ),
    (
      v_medication_2_id, v_resident_id, 'Metformin', '500mg', 'Twice daily', 'ORAL',
      '{"times": ["09:00", "21:00"]}'::jsonb, 'Dr. Sarah Johnson', false, false, CURRENT_DATE,
      'Take with meals', true, v_senior_user_id
    )
  ON CONFLICT (id) DO UPDATE SET is_active = true;

  -- Add appointments (FIXED: Use valid appointment types)
  v_appointment_id := 'e0000000-0000-0000-0000-000000000001'::uuid;
  INSERT INTO appointments (
    id, resident_id, appointment_type, title, scheduled_at, duration_minutes, 
    status, provider_name, location
  )
  VALUES 
    (v_appointment_id, v_resident_id, 'DOCTOR_VISIT', 'Annual Physical Exam',
     (now() + interval '7 days')::timestamp, 60, 'SCHEDULED', 'Dr. Sarah Johnson', 'Main Street Clinic'),
    ('e0000000-0000-0000-0000-000000000002'::uuid, v_resident_id, 'PROCEDURE', 'Routine Blood Work',
     (now() + interval '14 days')::timestamp, 30, 'SCHEDULED', 'LabCorp', 'Downtown Lab'),
    ('e0000000-0000-0000-0000-000000000003'::uuid, v_resident_id, 'CONSULTATION', 'Cardiology Follow-up',
     (now() + interval '21 days')::timestamp, 45, 'SCHEDULED', 'Dr. Michael Chen', 'Heart Center')
  ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status;

  -- Add lab tests
  INSERT INTO lab_tests (
    resident_id, test_name, test_type, ordered_by, ordered_at, 
    scheduled_date, status, priority, notes
  )
  VALUES
    (v_resident_id, 'Complete Blood Count (CBC)', 'BLOOD_WORK', 'Dr. Sarah Johnson',
     now() - interval '30 days', (now() - interval '23 days')::date, 'COMPLETED', 'ROUTINE', 
     'Annual wellness check'),
    (v_resident_id, 'Lipid Panel', 'BLOOD_WORK', 'Dr. Sarah Johnson',
     now() - interval '30 days', (now() - interval '23 days')::date, 'COMPLETED', 'ROUTINE',
     'Cholesterol monitoring'),
    (v_resident_id, 'HbA1c Test', 'BLOOD_WORK', 'Dr. Sarah Johnson',
     now() - interval '7 days', (now() + interval '7 days')::date, 'SCHEDULED', 'ROUTINE',
     'Diabetes monitoring')
  ON CONFLICT DO NOTHING;

  -- Add documents
  v_doc_1_id := 'f0000000-0000-0000-0000-000000000001'::uuid;
  v_doc_2_id := 'f0000000-0000-0000-0000-000000000002'::uuid;
  v_doc_3_id := 'f0000000-0000-0000-0000-000000000003'::uuid;

  INSERT INTO documents (
    id, resident_id, document_type, title, description, 
    uploaded_by, uploaded_at, file_size_bytes, mime_type, storage_path
  )
  VALUES
    (v_doc_1_id, v_resident_id, 'MEDICAL_RECORD', 'Annual Physical Results', 
     'Results from 2025 annual physical examination',
     v_senior_user_id, now() - interval '60 days', 245760, 'application/pdf', '/documents/annual_physical_2025.pdf'),
    (v_doc_2_id, v_resident_id, 'INSURANCE', 'Insurance Card - Front', 
     'Medicare Part B insurance card',
     v_family_user_id, now() - interval '90 days', 102400, 'image/jpeg', '/documents/insurance_card_front.jpg'),
    (v_doc_3_id, v_resident_id, 'LEGAL', 'Advanced Directive', 
     'Healthcare power of attorney and living will',
     v_family_user_id, now() - interval '180 days', 524288, 'application/pdf', '/documents/advanced_directive.pdf')
  ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

  -- Add care plan anchors
  INSERT INTO resident_care_plan_anchors (
    resident_id, category, priority, goal, interventions, 
    review_frequency, last_reviewed, status, created_by
  )
  VALUES
    (v_resident_id, 'MEDICATION_MANAGEMENT', 'HIGH',
     'Maintain blood pressure below 130/80 and blood sugar below 140 mg/dL',
     '["Take Lisinopril 10mg daily at 9 AM", "Take Metformin 500mg twice daily with meals", "Monitor BP weekly", "Check glucose daily"]'::jsonb,
     'MONTHLY', now() - interval '15 days', 'ACTIVE', v_family_user_id),
    (v_resident_id, 'MOBILITY', 'MEDIUM',
     'Maintain independence with daily activities and prevent falls',
     '["Daily 20-minute walk", "Use handrail on stairs", "Wear non-slip shoes", "Keep walkways clear"]'::jsonb,
     'QUARTERLY', now() - interval '45 days', 'ACTIVE', v_family_user_id)
  ON CONFLICT DO NOTHING;

  -- Add emergency contacts
  INSERT INTO resident_emergency_contacts (
    resident_id, contact_type, full_name, relationship, 
    phone_primary, phone_secondary, email, address, 
    is_primary, notes, created_by
  )
  VALUES
    (v_resident_id, 'FAMILY', 'Robert Miller', 'SON',
     '+1-555-0201', NULL, 'robert.miller@email.com', '123 Oak Street, Springfield, IL 62701',
     true, 'Lives 10 minutes away, available 24/7', v_senior_user_id),
    (v_resident_id, 'FAMILY', 'Jennifer Miller', 'DAUGHTER',
     '+1-555-0202', '+1-555-0203', 'jennifer.miller@email.com', '456 Elm Avenue, Chicago, IL 60601',
     false, 'Works weekdays, available evenings and weekends', v_senior_user_id),
    (v_resident_id, 'MEDICAL', 'Dr. Sarah Johnson', 'PRIMARY_PHYSICIAN',
     '+1-555-0100', NULL, 'dr.johnson@healthcenter.com', 'Main Street Clinic, 789 Main St, Springfield, IL 62701',
     false, 'Primary care physician for 15 years', v_senior_user_id)
  ON CONFLICT DO NOTHING;

  -- Add notifications
  INSERT INTO notification_log (
    resident_id, notification_type, title, message, priority,
    sent_at, delivery_method, sent_to, status
  )
  VALUES
    (v_resident_id, 'MEDICATION_REMINDER', 'Time for morning medication',
     'Please take your Lisinopril 10mg and Metformin 500mg with breakfast', 'HIGH',
     now() - interval '2 hours', 'PUSH', v_senior_user_id, 'DELIVERED'),
    (v_resident_id, 'APPOINTMENT_REMINDER', 'Upcoming appointment tomorrow',
     'Annual Physical Exam with Dr. Sarah Johnson at 10:00 AM', 'MEDIUM',
     now() - interval '1 day', 'EMAIL', ARRAY[v_senior_user_id, v_family_user_id], 'DELIVERED'),
    (v_resident_id, 'HEALTH_ALERT', 'Blood pressure reading high',
     'Your morning BP reading of 142/88 is above target. Please rest and recheck in 30 minutes', 'HIGH',
     now() - interval '3 days', 'PUSH', ARRAY[v_senior_user_id, v_family_user_id], 'DELIVERED'),
    (v_resident_id, 'LAB_RESULT', 'Lab results available',
     'Your recent lab test results are now available for review', 'MEDIUM',
     now() - interval '7 days', 'EMAIL', v_senior_user_id, 'DELIVERED'),
    (v_resident_id, 'CARE_PLAN_UPDATE', 'Care plan reviewed',
     'Your medication management care plan has been reviewed and updated', 'LOW',
     now() - interval '15 days', 'PUSH', ARRAY[v_senior_user_id, v_family_user_id], 'DELIVERED')
  ON CONFLICT DO NOTHING;

  -- Add message threads
  v_thread_1_id := 'g0000000-0000-0000-0000-000000000001'::uuid;
  v_thread_2_id := 'g0000000-0000-0000-0000-000000000002'::uuid;

  INSERT INTO message_threads (
    id, thread_type, subject, participants, 
    last_message_at, message_count, agency_id
  )
  VALUES
    (v_thread_1_id, 'FAMILY', 'Weekly Check-in',
     jsonb_build_array(v_senior_user_id, v_family_user_id),
     now() - interval '2 hours', 2, v_agency_id),
    (v_thread_2_id, 'PROVIDER', 'Medication Questions',
     jsonb_build_array(v_senior_user_id, v_family_user_id),
     now() - interval '3 days', 2, v_agency_id)
  ON CONFLICT (id) DO UPDATE SET last_message_at = EXCLUDED.last_message_at;

  -- Add messages
  INSERT INTO messages (
    thread_id, sender_id, message_text, sent_at
  )
  VALUES
    (v_thread_1_id, v_family_user_id, 'Hi Mom! Just checking in. How are you feeling today?', now() - interval '2 hours 30 minutes'),
    (v_thread_1_id, v_senior_user_id, 'Hi Robert! I''m doing well. Just finished my morning walk and took my medications.', now() - interval '2 hours'),
    (v_thread_2_id, v_senior_user_id, 'I noticed my new Metformin bottle says to take with meals. Is morning and evening okay?', now() - interval '3 days 2 hours'),
    (v_thread_2_id, v_family_user_id, 'Yes, that''s perfect! Morning with breakfast and evening with dinner is ideal timing.', now() - interval '3 days')
  ON CONFLICT DO NOTHING;

  -- Add health metrics (72 hours, 3 readings per day for BP, 1 for glucose)
  FOR i IN 0..71 LOOP
    v_timestamp := now() - (i || ' hours')::interval;
    
    -- Morning BP reading (8 AM)
    IF extract(hour from v_timestamp) = 8 THEN
      INSERT INTO health_metric_trends (
        resident_id, metric_type, metric_value, unit, recorded_at, source
      ) VALUES
        (v_resident_id, 'BLOOD_PRESSURE_SYSTOLIC', 118 + (random() * 20)::int, 'mmHg', v_timestamp, 'DEVICE'),
        (v_resident_id, 'BLOOD_PRESSURE_DIASTOLIC', 75 + (random() * 10)::int, 'mmHg', v_timestamp, 'DEVICE'),
        (v_resident_id, 'HEART_RATE', 68 + (random() * 12)::int, 'bpm', v_timestamp, 'DEVICE')
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Afternoon BP reading (2 PM)
    IF extract(hour from v_timestamp) = 14 THEN
      INSERT INTO health_metric_trends (
        resident_id, metric_type, metric_value, unit, recorded_at, source
      ) VALUES
        (v_resident_id, 'BLOOD_PRESSURE_SYSTOLIC', 122 + (random() * 18)::int, 'mmHg', v_timestamp, 'DEVICE'),
        (v_resident_id, 'BLOOD_PRESSURE_DIASTOLIC', 78 + (random() * 10)::int, 'mmHg', v_timestamp, 'DEVICE'),
        (v_resident_id, 'HEART_RATE', 72 + (random() * 14)::int, 'bpm', v_timestamp, 'DEVICE')
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Evening BP reading (8 PM)
    IF extract(hour from v_timestamp) = 20 THEN
      INSERT INTO health_metric_trends (
        resident_id, metric_type, metric_value, unit, recorded_at, source
      ) VALUES
        (v_resident_id, 'BLOOD_PRESSURE_SYSTOLIC', 120 + (random() * 16)::int, 'mmHg', v_timestamp, 'DEVICE'),
        (v_resident_id, 'BLOOD_PRESSURE_DIASTOLIC', 76 + (random() * 10)::int, 'mmHg', v_timestamp, 'DEVICE'),
        (v_resident_id, 'HEART_RATE', 70 + (random() * 12)::int, 'bpm', v_timestamp, 'DEVICE')
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Fasting glucose (7 AM daily)
    IF extract(hour from v_timestamp) = 7 THEN
      INSERT INTO health_metric_trends (
        resident_id, metric_type, metric_value, unit, recorded_at, source
      ) VALUES
        (v_resident_id, 'BLOOD_GLUCOSE', 95 + (random() * 30)::int, 'mg/dL', v_timestamp, 'DEVICE')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- Add devices (without pairing_actor to avoid FK constraint)
  v_device_bp_id := 'h0000000-0000-0000-0000-000000000001'::uuid;
  v_device_glucose_id := 'h0000000-0000-0000-0000-000000000002'::uuid;

  INSERT INTO device_registry (
    id, resident_id, device_type, brand, model, 
    serial_number, pairing_status, last_sync_at
  )
  VALUES
    (v_device_bp_id, v_resident_id, 'BLOOD_PRESSURE_MONITOR', 'Omron', 'BP7250',
     'BP7250-12345', 'PAIRED', now() - interval '1 hour'),
    (v_device_glucose_id, v_resident_id, 'GLUCOSE_METER', 'OneTouch', 'Verio Flex',
     'VF-67890', 'PAIRED', now() - interval '2 hours')
  ON CONFLICT (id) DO UPDATE SET last_sync_at = EXCLUDED.last_sync_at;

  -- Return comprehensive result
  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'message', 'Senior + Family scenario fully seeded with all data',
    'agency_id', v_agency_id,
    'senior_user_id', v_senior_user_id,
    'family_user_id', v_family_user_id,
    'resident_id', v_resident_id,
    'data_summary', jsonb_build_object(
      'resident', 1,
      'medications', 2,
      'appointments', 3,
      'lab_tests', 3,
      'documents', 3,
      'care_plan_anchors', 2,
      'emergency_contacts', 3,
      'notifications', 5,
      'message_threads', 2,
      'messages', 4,
      'health_metrics', '~650 (72h × 3 BP readings + 72 glucose readings)',
      'devices', 2
    )
  );
END;
$$;
