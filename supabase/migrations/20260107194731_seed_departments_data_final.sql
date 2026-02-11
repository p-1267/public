/*
  # Seed Departments Data - Final
  
  Seeds departments with personnel data for showcase mode.
  All data stored in department tables without requiring user_profiles.
*/

DO $$
DECLARE
  v_agency_id uuid := 'a0000000-0000-0000-0000-000000000001';
  
  v_dept_nursing uuid;
  v_dept_housekeeping uuid;
  v_dept_kitchen uuid;
  v_dept_hygiene uuid;
  v_dept_mobility uuid;
  v_dept_nutrition uuid;
  v_dept_monitoring uuid;
  
  v_today date := CURRENT_DATE;
BEGIN
  
  -- Create 7 departments
  INSERT INTO departments (id, agency_id, name, department_code, icon, description, status, staff_count, supervisor_id, created_at, updated_at)
  VALUES
    (gen_random_uuid(), v_agency_id, 'Nursing', 'NURSING', '💊', 'Clinical nursing care, medication management, vital signs monitoring', 'normal', 12, NULL, now(), now()),
    (gen_random_uuid(), v_agency_id, 'Housekeeping', 'HOUSEKEEPING', '🧹', 'Room cleaning, sanitization, and environmental services', 'normal', 8, NULL, now(), now()),
    (gen_random_uuid(), v_agency_id, 'Kitchen', 'KITCHEN', '🍽️', 'Meal preparation, delivery, and nutrition services', 'understaffed', 6, NULL, now(), now()),
    (gen_random_uuid(), v_agency_id, 'Hygiene', 'HYGIENE', '🚿', 'Personal care, bathing assistance, and grooming', 'normal', 5, NULL, now(), now()),
    (gen_random_uuid(), v_agency_id, 'Mobility', 'MOBILITY', '🚶', 'Physical therapy, transfers, and mobility support', 'normal', 4, NULL, now(), now()),
    (gen_random_uuid(), v_agency_id, 'Nutrition', 'NUTRITION', '🥗', 'Dietary planning, supplements, and nutrition monitoring', 'normal', 3, NULL, now(), now()),
    (gen_random_uuid(), v_agency_id, 'Monitoring', 'MONITORING', '📊', 'Safety monitoring, device management, and alert response', 'alerts', 4, NULL, now(), now())
  ON CONFLICT (agency_id, department_code) DO UPDATE
  SET staff_count = EXCLUDED.staff_count,
      icon = EXCLUDED.icon,
      description = EXCLUDED.description,
      status = EXCLUDED.status;
  
  -- Get department IDs
  SELECT id INTO v_dept_nursing FROM departments WHERE agency_id = v_agency_id AND department_code = 'NURSING' LIMIT 1;
  SELECT id INTO v_dept_housekeeping FROM departments WHERE agency_id = v_agency_id AND department_code = 'HOUSEKEEPING' LIMIT 1;
  SELECT id INTO v_dept_kitchen FROM departments WHERE agency_id = v_agency_id AND department_code = 'KITCHEN' LIMIT 1;
  SELECT id INTO v_dept_hygiene FROM departments WHERE agency_id = v_agency_id AND department_code = 'HYGIENE' LIMIT 1;
  SELECT id INTO v_dept_mobility FROM departments WHERE agency_id = v_agency_id AND department_code = 'MOBILITY' LIMIT 1;
  SELECT id INTO v_dept_nutrition FROM departments WHERE agency_id = v_agency_id AND department_code = 'NUTRITION' LIMIT 1;
  SELECT id INTO v_dept_monitoring FROM departments WHERE agency_id = v_agency_id AND department_code = 'MONITORING' LIMIT 1;
  
  -- 12 nursing personnel
  FOR i IN 1..12 LOOP
    INSERT INTO department_personnel (
      id, agency_id, department_id, user_id,
      first_name, last_name, display_name,
      employee_id, position_title, shift_pattern,
      is_primary_department, skills, status,
      work_phone, work_email, workload_indicator,
      created_at, updated_at
    )
    VALUES (
      gen_random_uuid(), v_agency_id, v_dept_nursing, NULL,
      'Nurse', 'Staff' || i, 'Nurse ' || i,
      'RN-' || LPAD(i::text, 3, '0'),
      CASE WHEN i <= 4 THEN 'Registered Nurse (RN)' ELSE 'Personal Support Worker (PSW)' END,
      CASE WHEN i % 3 = 0 THEN 'day' WHEN i % 3 = 1 THEN 'evening' ELSE 'night' END,
      true,
      ARRAY['medication_administration', 'vital_signs', 'wound_care', 'documentation'],
      CASE WHEN i % 4 = 0 THEN 'on_shift' WHEN i % 4 = 1 THEN 'off_shift' WHEN i % 4 = 2 THEN 'on_break' ELSE 'on_call' END,
      '555-01' || LPAD(i::text, 2, '0'),
      'nurse' || i || '@demo.com',
      (i % 5) + 2,
      now(), now()
    ) ON CONFLICT (department_id, user_id) DO NOTHING;
  END LOOP;
  
  -- 8 housekeeping personnel
  FOR i IN 1..8 LOOP
    INSERT INTO department_personnel (
      id, agency_id, department_id, user_id,
      first_name, last_name, display_name,
      employee_id, position_title, shift_pattern,
      is_primary_department, skills, status,
      work_phone, work_email, workload_indicator,
      created_at, updated_at
    )
    VALUES (
      gen_random_uuid(), v_agency_id, v_dept_housekeeping, NULL,
      'Housekeeper', 'Staff' || i, 'Housekeeper ' || i,
      'HK-' || LPAD(i::text, 3, '0'),
      'Housekeeper',
      CASE WHEN i % 2 = 0 THEN 'day' ELSE 'evening' END,
      true,
      ARRAY['cleaning', 'sanitization', 'laundry', 'restocking'],
      CASE WHEN i % 3 = 0 THEN 'on_shift' ELSE 'off_shift' END,
      '555-02' || LPAD(i::text, 2, '0'),
      'housekeeper' || i || '@demo.com',
      (i % 4) + 1,
      now(), now()
    ) ON CONFLICT (department_id, user_id) DO NOTHING;
  END LOOP;
  
  -- 6 kitchen personnel
  FOR i IN 1..6 LOOP
    INSERT INTO department_personnel (
      id, agency_id, department_id, user_id,
      first_name, last_name, display_name,
      employee_id, position_title, shift_pattern,
      is_primary_department, skills, status,
      work_phone, work_email, workload_indicator,
      created_at, updated_at
    )
    VALUES (
      gen_random_uuid(), v_agency_id, v_dept_kitchen, NULL,
      'Cook', 'Staff' || i, 'Kitchen Staff ' || i,
      'CK-' || LPAD(i::text, 3, '0'),
      CASE WHEN i <= 2 THEN 'Head Cook' ELSE 'Kitchen Assistant' END,
      CASE WHEN i % 3 = 0 THEN 'day' WHEN i % 3 = 1 THEN 'evening' ELSE 'day' END,
      true,
      ARRAY['meal_prep', 'dietary_restrictions', 'food_safety', 'nutrition'],
      CASE WHEN i % 2 = 0 THEN 'on_shift' ELSE 'off_shift' END,
      '555-03' || LPAD(i::text, 2, '0'),
      'cook' || i || '@demo.com',
      (i % 3) + 2,
      now(), now()
    ) ON CONFLICT (department_id, user_id) DO NOTHING;
  END LOOP;
  
  -- Sample assignments
  INSERT INTO department_assignments (
    id, agency_id, department_id, title, description,
    assigned_to_id, created_by_id,
    shift_type, shift_start, shift_end,
    priority, status, acceptance_state,
    checklist_tasks, location_area, notes,
    created_at, updated_at
  )
  VALUES 
    (gen_random_uuid(), v_agency_id, v_dept_nursing,
     'Morning Medication Round - Wing A',
     'Administer morning medications to residents in Wing A, rooms 101-110',
     NULL, NULL,
     'day', v_today + time '07:00', v_today + time '09:00',
     'high', 'in_progress', 'accepted',
     '[
       {"task": "Review medication list", "completed": true},
       {"task": "Check resident allergies", "completed": true},
       {"task": "Administer scheduled medications", "completed": false},
       {"task": "Monitor for adverse reactions", "completed": false},
       {"task": "Document administration", "completed": false}
     ]'::jsonb,
     'Wing A, Rooms 101-110',
     'Assigned to: Nurse 1 (RN-001)',
     now(), now()),
    (gen_random_uuid(), v_agency_id, v_dept_housekeeping,
     'Deep Clean - Common Areas',
     'Deep cleaning of all common areas',
     NULL, NULL,
     'day', v_today + time '08:00', v_today + time '12:00',
     'medium', 'not_started', 'pending',
     '[
       {"task": "Dust all surfaces", "completed": false},
       {"task": "Vacuum carpets", "completed": false},
       {"task": "Mop hard floors", "completed": false},
       {"task": "Sanitize surfaces", "completed": false}
     ]'::jsonb,
     'Common Areas',
     'Assigned to: Housekeeper 1 (HK-001)',
     now(), now())
  ON CONFLICT DO NOTHING;
  
  -- Sample schedules
  FOR i IN 1..6 LOOP
    INSERT INTO department_schedules (
      id, agency_id, department_id, user_id,
      shift_date, shift_type, shift_start, shift_end,
      status, assignments_count, metadata,
      created_at
    )
    VALUES (
      gen_random_uuid(), v_agency_id, v_dept_nursing, NULL,
      v_today,
      CASE WHEN i % 3 = 0 THEN 'day' WHEN i % 3 = 1 THEN 'evening' ELSE 'night' END,
      v_today + CASE WHEN i % 3 = 0 THEN time '07:00' WHEN i % 3 = 1 THEN time '15:00' ELSE time '23:00' END,
      v_today + CASE WHEN i % 3 = 0 THEN time '15:00' WHEN i % 3 = 1 THEN time '23:00' ELSE time '07:00' END + interval '1 day',
      CASE WHEN i % 4 = 0 THEN 'in_progress' ELSE 'scheduled' END,
      (i % 3) + 1,
      jsonb_build_object(
        'user_name', 'Nurse ' || i,
        'employee_id', 'RN-' || LPAD(i::text, 3, '0'),
        'position_title', CASE WHEN i <= 4 THEN 'Registered Nurse (RN)' ELSE 'Personal Support Worker (PSW)' END
      ),
      now()
    ) ON CONFLICT DO NOTHING;
  END LOOP;
  
  RAISE NOTICE 'Departments showcase data seeded successfully';
END $$;
