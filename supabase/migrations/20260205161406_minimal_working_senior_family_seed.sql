/*
  # Minimal Working Senior/Family Seed
  
  Populate critical data only: medications, appointments, health metrics
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
  i int;
  v_timestamp timestamptz;
BEGIN
  -- Get role IDs
  SELECT id INTO v_senior_role_id FROM roles WHERE name = 'SENIOR' LIMIT 1;
  SELECT id INTO v_family_role_id FROM roles WHERE name = 'FAMILY_ADMIN' LIMIT 1;

  v_agency_id := '00000000-0000-0000-0000-999999999999'::uuid;
  v_senior_user_id := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_family_user_id := 'a0000000-0000-0000-0000-000000000002'::uuid;
  v_resident_id := 'b0000000-0000-0000-0000-000000000001'::uuid;

  -- Agency
  INSERT INTO agencies (id, name, status)
  VALUES (v_agency_id, 'Showcase Independent Living', 'active')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  -- Users
  INSERT INTO user_profiles (id, role_id, display_name, is_active)
  VALUES 
    (v_senior_user_id, v_senior_role_id, 'Dorothy Miller', true),
    (v_family_user_id, v_family_role_id, 'Robert Miller', true)
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;

  -- Resident
  INSERT INTO residents (id, agency_id, full_name, date_of_birth, status, metadata)
  VALUES (
    v_resident_id, v_agency_id, 'Dorothy Miller', '1946-03-15', 'active',
    '{"room": "A-101", "care_level": "INDEPENDENT"}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

  -- Links
  INSERT INTO senior_resident_links (senior_user_id, resident_id, status)
  VALUES (v_senior_user_id, v_resident_id, 'active')
  ON CONFLICT (senior_user_id, resident_id) DO NOTHING;

  INSERT INTO family_resident_links (family_user_id, resident_id, status)
  VALUES (v_family_user_id, v_resident_id, 'active')
  ON CONFLICT (family_user_id, resident_id) DO NOTHING;

  -- Operating mode
  UPDATE senior_operating_mode SET disabled_at = now() WHERE resident_id = v_resident_id AND disabled_at IS NULL;
  INSERT INTO senior_operating_mode (resident_id, mode, enabled_by, enabled_at, reason)
  VALUES (v_resident_id, 'SELF_MANAGE', v_senior_user_id, now(), 'Scenario setup');

  -- Medications (2)
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

  -- Appointments (3)
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

  -- Health Metrics (72 hours of readings)
  FOR i IN 0..71 LOOP
    v_timestamp := now() - (i || ' hours')::interval;
    
    IF extract(hour from v_timestamp) IN (8, 14, 20) THEN
      INSERT INTO health_metric_trends (
        resident_id, metric_type, metric_value, unit, recorded_at, source
      ) VALUES
        (v_resident_id, 'BLOOD_PRESSURE_SYSTOLIC', 118 + (random() * 20)::int, 'mmHg', v_timestamp, 'DEVICE'),
        (v_resident_id, 'BLOOD_PRESSURE_DIASTOLIC', 75 + (random() * 12)::int, 'mmHg', v_timestamp, 'DEVICE'),
        (v_resident_id, 'HEART_RATE', 68 + (random() * 15)::int, 'bpm', v_timestamp, 'DEVICE')
      ON CONFLICT DO NOTHING;
    END IF;
    
    IF extract(hour from v_timestamp) = 7 THEN
      INSERT INTO health_metric_trends (
        resident_id, metric_type, metric_value, unit, recorded_at, source
      ) VALUES
        (v_resident_id, 'BLOOD_GLUCOSE', 95 + (random() * 35)::int, 'mg/dL', v_timestamp, 'DEVICE')
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'message', 'Senior + Family minimal scenario seeded successfully',
    'resident_id', v_resident_id,
    'data', jsonb_build_object(
      'medications', 2,
      'appointments', 3,
      'health_metrics_approx', 288
    )
  );
END;
$$;
