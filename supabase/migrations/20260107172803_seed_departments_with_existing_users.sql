/*
  # Seed Departments with Existing Users
  
  Uses existing user_profiles to populate departments
*/

CREATE OR REPLACE FUNCTION seed_showcase_departments_with_existing_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid := 'a0000000-0000-0000-0000-000000000001';
  v_supervisor1_id uuid;
  v_supervisor2_id uuid;
  v_supervisor3_id uuid;
  v_dept_nursing_id uuid;
  v_dept_housekeeping_id uuid;
  v_dept_kitchen_id uuid;
  v_dept_hygiene_id uuid;
  v_dept_mobility_id uuid;
  v_dept_nutrition_id uuid;
  v_dept_monitoring_id uuid;
  v_user_ids uuid[];
  v_today date := CURRENT_DATE;
BEGIN
  -- Get existing user IDs
  SELECT ARRAY_AGG(id) INTO v_user_ids
  FROM user_profiles 
  WHERE agency_id = v_agency_id
  LIMIT 10;

  IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) >= 3 THEN
    v_supervisor1_id := v_user_ids[1];
    v_supervisor2_id := v_user_ids[2];
    v_supervisor3_id := v_user_ids[3];
  ELSE
    RAISE NOTICE 'Not enough users found in agency';
    RETURN;
  END IF;

  -- Create departments
  INSERT INTO departments (agency_id, name, department_code, description, icon, supervisor_id, status, staff_count, metadata)
  VALUES 
    (v_agency_id, 'Nursing', 'NURSING', 'Medical care, medications, and vital signs monitoring', '💊', v_supervisor1_id, 'normal', 12, jsonb_build_object('shift_types', ARRAY['day', 'evening', 'night'])),
    (v_agency_id, 'Housekeeping', 'HOUSEKEEPING', 'Room cleaning, hygiene maintenance, and facility upkeep', '🧹', v_supervisor2_id, 'normal', 8, jsonb_build_object('shift_types', ARRAY['day', 'evening'])),
    (v_agency_id, 'Kitchen', 'KITCHEN', 'Meal preparation, delivery, and nutrition management', '🍽️', v_supervisor3_id, 'understaffed', 6, jsonb_build_object('shift_types', ARRAY['day', 'evening', 'night'])),
    (v_agency_id, 'Hygiene', 'HYGIENE', 'Personal care, bathing, and grooming assistance', '🚿', NULL, 'normal', 5, jsonb_build_object('shift_types', ARRAY['day', 'evening'])),
    (v_agency_id, 'Mobility', 'MOBILITY', 'Movement assistance, transfers, and fall prevention', '🚶', NULL, 'normal', 4, jsonb_build_object('shift_types', ARRAY['day'])),
    (v_agency_id, 'Nutrition', 'NUTRITION', 'Dietary planning, supplements, and intake monitoring', '🥗', NULL, 'normal', 3, jsonb_build_object('shift_types', ARRAY['day'])),
    (v_agency_id, 'Monitoring', 'MONITORING', 'Safety monitoring, device management, and observations', '📊', NULL, 'alerts', 4, jsonb_build_object('shift_types', ARRAY['day', 'evening', 'night']))
  ON CONFLICT (agency_id, department_code) DO UPDATE
  SET 
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon = EXCLUDED.icon,
    supervisor_id = COALESCE(departments.supervisor_id, EXCLUDED.supervisor_id),
    status = EXCLUDED.status,
    staff_count = EXCLUDED.staff_count,
    metadata = EXCLUDED.metadata,
    updated_at = now();

  -- Get department IDs
  SELECT id INTO v_dept_nursing_id FROM departments WHERE agency_id = v_agency_id AND department_code = 'NURSING';
  SELECT id INTO v_dept_housekeeping_id FROM departments WHERE agency_id = v_agency_id AND department_code = 'HOUSEKEEPING';
  SELECT id INTO v_dept_kitchen_id FROM departments WHERE agency_id = v_agency_id AND department_code = 'KITCHEN';

  -- Add personnel to departments (using available users)
  FOR i IN 1..LEAST(array_length(v_user_ids, 1), 10) LOOP
    IF i <= 4 THEN
      -- Add to Nursing
      INSERT INTO department_personnel (department_id, user_id, agency_id, employee_id, position_title, shift_pattern, skills_tags, work_phone, work_email, status, workload_indicator, is_primary_department, metadata)
      VALUES 
        (v_dept_nursing_id, v_user_ids[i], v_agency_id, 'EMP100'||i, 
         CASE WHEN i = 1 THEN 'Nursing Supervisor' WHEN i = 2 THEN 'Registered Nurse (RN)' ELSE 'Personal Support Worker (PSW)' END,
         'day', 
         CASE WHEN i <= 2 THEN '["medication_admin", "vitals", "wound_care"]'::jsonb ELSE '["personal_care", "vitals"]'::jsonb END,
         '555-010'||i, 'nurse'||i||'@demo.com', 
         CASE WHEN i <= 3 THEN 'on_shift' ELSE 'off_shift' END,
         CASE WHEN i = 1 THEN 0 WHEN i = 2 THEN 5 ELSE 3 END,
         true, 
         jsonb_build_object('first_name', 'Staff', 'last_name', 'Member'||i, 'certifications', ARRAY['RN', 'BLS']))
      ON CONFLICT (department_id, user_id) DO NOTHING;
    ELSIF i <= 7 THEN
      -- Add to Housekeeping
      INSERT INTO department_personnel (department_id, user_id, agency_id, employee_id, position_title, shift_pattern, skills_tags, work_phone, work_email, status, workload_indicator, is_primary_department, metadata)
      VALUES 
        (v_dept_housekeeping_id, v_user_ids[i], v_agency_id, 'EMP200'||(i-4), 
         CASE WHEN i = 5 THEN 'Housekeeping Supervisor' ELSE 'Housekeeper' END,
         'day', '["cleaning", "sanitization"]'::jsonb,
         '555-020'||(i-4), 'housekeeper'||(i-4)||'@demo.com', 
         CASE WHEN i <= 6 THEN 'on_shift' ELSE 'off_shift' END,
         CASE WHEN i = 5 THEN 0 ELSE 4 END,
         true, 
         jsonb_build_object('first_name', 'Staff', 'last_name', 'Member'||i, 'certifications', ARRAY['Sanitation']))
      ON CONFLICT (department_id, user_id) DO NOTHING;
    ELSE
      -- Add to Kitchen
      INSERT INTO department_personnel (department_id, user_id, agency_id, employee_id, position_title, shift_pattern, skills_tags, work_phone, work_email, status, workload_indicator, is_primary_department, metadata)
      VALUES 
        (v_dept_kitchen_id, v_user_ids[i], v_agency_id, 'EMP300'||(i-7), 
         CASE WHEN i = 8 THEN 'Kitchen Supervisor' WHEN i = 9 THEN 'Cook' ELSE 'Kitchen Assistant' END,
         'day', '["food_prep", "nutrition"]'::jsonb,
         '555-030'||(i-7), 'kitchen'||(i-7)||'@demo.com', 
         CASE WHEN i <= 9 THEN 'on_shift' ELSE 'off_shift' END,
         CASE WHEN i = 8 THEN 0 ELSE 3 END,
         true, 
         jsonb_build_object('first_name', 'Staff', 'last_name', 'Member'||i, 'certifications', ARRAY['Food Safety']))
      ON CONFLICT (department_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  -- Create sample assignments
  IF array_length(v_user_ids, 1) >= 4 THEN
    -- Nursing assignment
    INSERT INTO department_assignments (
      agency_id, department_id, title, description, created_by_id, assigned_to_id,
      shift_type, shift_start, shift_end, priority, location_area, status, acceptance_state,
      checklist_tasks, metadata
    )
    VALUES 
      (
        v_agency_id, v_dept_nursing_id, 'Morning Medication Round', 
        'Administer scheduled medications to residents in Wing A',
        v_user_ids[1], v_user_ids[2],
        'day', v_today + interval '7 hours', v_today + interval '9 hours',
        'high', 'Wing A', 'in_progress', 'acknowledged',
        '[
          {"task": "Review medication list", "completed": true},
          {"task": "Check resident allergies", "completed": true},
          {"task": "Administer medications Room 101-105", "completed": false},
          {"task": "Administer medications Room 106-110", "completed": false},
          {"task": "Document administration in system", "completed": false},
          {"task": "Report any adverse reactions", "completed": false}
        ]'::jsonb,
        jsonb_build_object('residents_count', 10, 'medications_count', 25)
      ),
      (
        v_agency_id, v_dept_nursing_id, 'Vital Signs Monitoring',
        'Check and record vital signs for high-risk residents',
        v_user_ids[1], v_user_ids[2],
        'day', v_today + interval '10 hours', v_today + interval '11 hours',
        'urgent', 'All Wings', 'not_started', 'pending',
        '[
          {"task": "Blood pressure checks - Priority residents", "completed": false},
          {"task": "Temperature readings", "completed": false},
          {"task": "Oxygen saturation monitoring", "completed": false},
          {"task": "Document readings in care plans", "completed": false},
          {"task": "Escalate abnormal readings to physician", "completed": false}
        ]'::jsonb,
        jsonb_build_object('priority_residents', 5)
      )
    ON CONFLICT DO NOTHING;
  END IF;

  IF array_length(v_user_ids, 1) >= 7 THEN
    -- Housekeeping assignment
    INSERT INTO department_assignments (
      agency_id, department_id, title, description, created_by_id, assigned_to_id,
      shift_type, shift_start, shift_end, priority, location_area, status, acceptance_state,
      checklist_tasks, metadata
    )
    VALUES 
      (
        v_agency_id, v_dept_housekeeping_id, 'Deep Clean - Rooms 101-105',
        'Full room cleaning including bathroom sanitization',
        v_user_ids[5], v_user_ids[6],
        'day', v_today + interval '8 hours', v_today + interval '12 hours',
        'medium', 'Wing A', 'in_progress', 'accepted',
        '[
          {"task": "Dust surfaces and furniture", "completed": true},
          {"task": "Vacuum floors and carpets", "completed": true},
          {"task": "Clean and sanitize bathroom", "completed": false},
          {"task": "Change linens", "completed": false},
          {"task": "Empty trash and replace liners", "completed": false},
          {"task": "Restock supplies", "completed": false},
          {"task": "Final inspection and room ready check", "completed": false}
        ]'::jsonb,
        jsonb_build_object('rooms_count', 5)
      )
    ON CONFLICT DO NOTHING;
  END IF;

  -- Create schedules
  IF array_length(v_user_ids, 1) >= 4 THEN
    INSERT INTO department_schedules (agency_id, department_id, user_id, shift_date, shift_type, shift_start, shift_end, assignments_count, status)
    VALUES 
      (v_agency_id, v_dept_nursing_id, v_user_ids[2], v_today, 'day', v_today + interval '7 hours', v_today + interval '15 hours', 2, 'in_progress'),
      (v_agency_id, v_dept_nursing_id, v_user_ids[3], v_today, 'day', v_today + interval '7 hours', v_today + interval '15 hours', 1, 'confirmed')
    ON CONFLICT (department_id, user_id, shift_date, shift_type) DO UPDATE
    SET assignments_count = EXCLUDED.assignments_count, status = EXCLUDED.status;
  END IF;

  IF array_length(v_user_ids, 1) >= 7 THEN
    INSERT INTO department_schedules (agency_id, department_id, user_id, shift_date, shift_type, shift_start, shift_end, assignments_count, status)
    VALUES 
      (v_agency_id, v_dept_housekeeping_id, v_user_ids[6], v_today, 'day', v_today + interval '8 hours', v_today + interval '16 hours', 1, 'in_progress')
    ON CONFLICT (department_id, user_id, shift_date, shift_type) DO UPDATE
    SET assignments_count = EXCLUDED.assignments_count, status = EXCLUDED.status;
  END IF;

END $$;

-- Run the seed function
SELECT seed_showcase_departments_with_existing_users();
