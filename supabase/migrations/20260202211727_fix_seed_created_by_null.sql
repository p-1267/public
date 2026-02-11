/*
  # Fix Seed Function - Set created_by to NULL

  Updates the seed function to set created_by = NULL instead of a non-existent user ID.
*/

CREATE OR REPLACE FUNCTION seed_showcase_scenario()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_resident_ids uuid[];
  v_cat_nursing_med uuid;
  v_cat_nursing_vitals uuid;
  v_cat_housekeeping uuid;
  v_cat_kitchen_delivery uuid;
  v_result jsonb;
  v_resident_id uuid;
  v_dept_nursing uuid := 'd0000000-0000-0000-0000-000000000001'::uuid;
  v_dept_housekeeping uuid := 'd0000000-0000-0000-0000-000000000002'::uuid;
  v_dept_kitchen uuid := 'd0000000-0000-0000-0000-000000000003'::uuid;
  v_time_slot timestamptz;
  v_task_counter int := 0;
BEGIN
  
  -- Delete existing showcase data
  DELETE FROM department_personnel WHERE agency_id = v_agency_id;
  DELETE FROM departments WHERE agency_id = v_agency_id;
  DELETE FROM tasks WHERE agency_id = v_agency_id;
  DELETE FROM residents WHERE agency_id = v_agency_id;
  DELETE FROM task_categories WHERE agency_id = v_agency_id;
  DELETE FROM agencies WHERE id = v_agency_id;
  
  -- Create showcase agency
  INSERT INTO agencies (id, name, status, operating_mode, metadata)
  VALUES (
    v_agency_id,
    'Sunrise Senior Care',
    'active',
    'AGENCY',
    '{"capacity": 20, "departments": ["NURSING", "HOUSEKEEPING", "KITCHEN", "MANAGEMENT"]}'::jsonb
  );
  
  -- Create departments
  INSERT INTO departments (id, agency_id, name, department_code, description, icon, status, staff_count, created_at, updated_at)
  VALUES 
    (v_dept_nursing, v_agency_id, 'Nursing', 'NURSING', 'Clinical nursing care, medication management, vital signs monitoring', '💊', 'normal', 12, now(), now()),
    (v_dept_housekeeping, v_agency_id, 'Housekeeping', 'HOUSEKEEPING', 'Room cleaning, sanitization, and environmental services', '🧹', 'normal', 8, now(), now()),
    (v_dept_kitchen, v_agency_id, 'Kitchen', 'KITCHEN', 'Meal preparation, delivery, and nutrition services', '🍽️', 'understaffed', 6, now(), now());
  
  -- Create department personnel
  INSERT INTO department_personnel (agency_id, department_id, user_id, first_name, last_name, display_name, employee_id, position_title, shift_pattern, is_primary_department, skills, status, work_phone, work_email, workload_indicator)
  SELECT 
    v_agency_id, v_dept_nursing, NULL,
    'Nurse', 'Staff' || i::text, 'Nurse ' || i::text,
    'RN-' || LPAD(i::text, 3, '0'), 'Registered Nurse (RN)', 'day',
    true, ARRAY['medication_administration', 'vital_signs'],
    'on_shift', '555-01' || LPAD(i::text, 2, '0'), 'nurse' || i::text || '@demo.com', 3
  FROM generate_series(1, 5) AS i;
  
  -- Create 20 Residents
  INSERT INTO residents (agency_id, full_name, date_of_birth, status, metadata)
  VALUES 
    (v_agency_id, 'Alice Anderson', '1940-03-15', 'active', '{"room": "101", "nursing_acuity": "medium"}'::jsonb),
    (v_agency_id, 'Bob Baker', '1938-07-22', 'active', '{"room": "102", "nursing_acuity": "low"}'::jsonb),
    (v_agency_id, 'Carol Chen', '1935-11-08', 'active', '{"room": "103", "nursing_acuity": "high"}'::jsonb),
    (v_agency_id, 'David Davis', '1942-01-30', 'active', '{"room": "104", "nursing_acuity": "medium"}'::jsonb),
    (v_agency_id, 'Emma Evans', '1937-05-18', 'active', '{"room": "105", "nursing_acuity": "low"}'::jsonb),
    (v_agency_id, 'Frank Foster', '1939-09-25', 'active', '{"room": "106", "nursing_acuity": "high"}'::jsonb),
    (v_agency_id, 'Grace Garcia', '1941-12-10', 'active', '{"room": "107", "nursing_acuity": "medium"}'::jsonb),
    (v_agency_id, 'Henry Hill', '1936-04-03', 'active', '{"room": "108", "nursing_acuity": "high"}'::jsonb),
    (v_agency_id, 'Iris Ivanov', '1943-08-14', 'active', '{"room": "109", "nursing_acuity": "low"}'::jsonb),
    (v_agency_id, 'Jack Johnson', '1940-06-27', 'active', '{"room": "110", "nursing_acuity": "medium"}'::jsonb),
    (v_agency_id, 'Kate Kim', '1938-10-19', 'active', '{"room": "111", "nursing_acuity": "high"}'::jsonb),
    (v_agency_id, 'Leo Lopez', '1941-02-08', 'active', '{"room": "112", "nursing_acuity": "low"}'::jsonb),
    (v_agency_id, 'Mary Miller', '1937-07-31', 'active', '{"room": "113", "nursing_acuity": "medium"}'::jsonb),
    (v_agency_id, 'Nathan Nguyen', '1939-11-22', 'active', '{"room": "114", "nursing_acuity": "high"}'::jsonb),
    (v_agency_id, 'Olivia OBrien', '1942-03-14', 'active', '{"room": "115", "nursing_acuity": "low"}'::jsonb),
    (v_agency_id, 'Paul Patel', '1936-09-05', 'active', '{"room": "116", "nursing_acuity": "medium"}'::jsonb),
    (v_agency_id, 'Quinn Roberts', '1940-12-28', 'active', '{"room": "117", "nursing_acuity": "high"}'::jsonb),
    (v_agency_id, 'Rose Rodriguez', '1938-05-16', 'active', '{"room": "118", "nursing_acuity": "medium"}'::jsonb),
    (v_agency_id, 'Sam Smith', '1941-08-09', 'active', '{"room": "119", "nursing_acuity": "low"}'::jsonb),
    (v_agency_id, 'Tina Taylor', '1937-01-21', 'active', '{"room": "120", "nursing_acuity": "high"}'::jsonb);
  
  SELECT array_agg(id) INTO v_resident_ids FROM residents WHERE agency_id = v_agency_id;
  
  -- Create task categories
  INSERT INTO task_categories (agency_id, name, category_type, description, default_priority, requires_evidence, metadata)
  VALUES
    (v_agency_id, 'Medication Administration', 'clinical', 'Administer prescribed medications', 'high', true, '{"department": "NURSING"}'::jsonb),
    (v_agency_id, 'Vital Signs Monitoring', 'monitoring', 'Monitor and record vital signs', 'medium', true, '{"department": "NURSING"}'::jsonb),
    (v_agency_id, 'Room Cleaning', 'housekeeping', 'Clean and sanitize resident rooms', 'medium', true, '{"department": "HOUSEKEEPING"}'::jsonb),
    (v_agency_id, 'Meal Delivery', 'nutrition', 'Deliver meals to residents', 'medium', true, '{"department": "KITCHEN"}'::jsonb);
  
  SELECT id INTO v_cat_nursing_med FROM task_categories WHERE agency_id = v_agency_id AND name = 'Medication Administration';
  SELECT id INTO v_cat_nursing_vitals FROM task_categories WHERE agency_id = v_agency_id AND name = 'Vital Signs Monitoring';
  SELECT id INTO v_cat_housekeeping FROM task_categories WHERE agency_id = v_agency_id AND name = 'Room Cleaning';
  SELECT id INTO v_cat_kitchen_delivery FROM task_categories WHERE agency_id = v_agency_id AND name = 'Meal Delivery';
  
  -- Create unassigned tasks for TODAY at various time slots
  -- Morning (8 AM - 12 PM)
  FOR v_resident_id IN SELECT unnest(v_resident_ids) LIMIT 10 LOOP
    v_time_slot := CURRENT_DATE + interval '8 hours' + (v_task_counter * interval '15 minutes');
    INSERT INTO tasks (
      agency_id, resident_id, category_id, department, department_id,
      task_name, description, priority, risk_level, state,
      scheduled_start, scheduled_end,
      responsibility_role, requires_evidence,
      created_by, owner_user_id, metadata
    ) VALUES (
      v_agency_id, v_resident_id, v_cat_nursing_med, 'NURSING', v_dept_nursing,
      'Morning Medication Round', 'Administer prescribed morning medications',
      'high', 'B', 'scheduled',
      v_time_slot, v_time_slot + interval '1 hour',
      'RN', true, NULL, NULL,
      jsonb_build_object('medications', jsonb_build_array('Lisinopril 10mg'))
    );
    v_task_counter := v_task_counter + 1;
  END LOOP;
  
  -- Afternoon (12 PM - 4 PM)
  FOR v_resident_id IN SELECT unnest(v_resident_ids) LIMIT 10 LOOP
    v_time_slot := CURRENT_DATE + interval '12 hours' + (v_task_counter * interval '15 minutes');
    INSERT INTO tasks (
      agency_id, resident_id, category_id, department, department_id,
      task_name, description, priority, risk_level, state,
      scheduled_start, scheduled_end,
      responsibility_role, requires_evidence,
      created_by, owner_user_id, metadata
    ) VALUES (
      v_agency_id, v_resident_id, v_cat_kitchen_delivery, 'KITCHEN', v_dept_kitchen,
      'Lunch Delivery', 'Deliver lunch meal',
      'medium', 'C', 'scheduled',
      v_time_slot, v_time_slot + interval '30 minutes',
      'KITCHEN_STAFF', true, NULL, NULL,
      jsonb_build_object('meal_type', 'lunch')
    );
    v_task_counter := v_task_counter + 1;
  END LOOP;
  
  -- Evening (4 PM - 8 PM)
  FOR v_resident_id IN SELECT unnest(v_resident_ids) LIMIT 10 LOOP
    v_time_slot := CURRENT_DATE + interval '16 hours' + (v_task_counter * interval '15 minutes');
    INSERT INTO tasks (
      agency_id, resident_id, category_id, department, department_id,
      task_name, description, priority, risk_level, state,
      scheduled_start, scheduled_end,
      responsibility_role, requires_evidence,
      created_by, owner_user_id, metadata
    ) VALUES (
      v_agency_id, v_resident_id, v_cat_housekeeping, 'HOUSEKEEPING', v_dept_housekeeping,
      'Evening Room Cleaning', 'Clean and sanitize resident room',
      'medium', 'C', 'scheduled',
      v_time_slot, v_time_slot + interval '45 minutes',
      'HOUSEKEEPER', true, NULL, NULL,
      jsonb_build_object('room_type', 'standard')
    );
    v_task_counter := v_task_counter + 1;
  END LOOP;
  
  v_result := jsonb_build_object(
    'success', true,
    'agency_id', v_agency_id,
    'residents_created', array_length(v_resident_ids, 1),
    'departments_created', 3,
    'personnel_created', 5,
    'tasks_created', v_task_counter,
    'unassigned_tasks', v_task_counter,
    'tasks_for_today', v_task_counter,
    'message', 'Showcase scenario seeded with ' || v_task_counter || ' unassigned tasks for TODAY'
  );
  
  RETURN v_result;
END $$;
