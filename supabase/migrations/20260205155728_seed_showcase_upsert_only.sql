/*
  # Seed Showcase with Upsert-Only Approach
  
  ## Strategy
  Instead of deleting and recreating, use ON CONFLICT to upsert all data.
  This avoids foreign key constraint issues with 120+ dependent tables.
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
  v_caregiver_ids uuid[]  := '{}';
  v_supervisor_ids uuid[] := '{}';
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
  v_caregiver_role_id uuid;
  v_supervisor_role_id uuid;
  v_admin_role_id uuid;
  v_user_id uuid;
  i int;
BEGIN
  
  -- Get role IDs
  SELECT id INTO v_caregiver_role_id FROM roles WHERE name = 'CAREGIVER';
  SELECT id INTO v_supervisor_role_id FROM roles WHERE name = 'SUPERVISOR';
  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'AGENCY_ADMIN';
  
  -- Upsert showcase agency
  INSERT INTO agencies (id, name, status, operating_mode, metadata)
  VALUES (
    v_agency_id,
    'Sunrise Senior Care',
    'active',
    'AGENCY',
    '{"capacity": 20, "departments": ["NURSING", "HOUSEKEEPING", "KITCHEN", "MANAGEMENT"]}'::jsonb
  )
  ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    status = EXCLUDED.status;
  
  -- Upsert departments
  INSERT INTO departments (id, agency_id, name, department_code, description, icon, status, staff_count)
  VALUES 
    (v_dept_nursing, v_agency_id, 'Nursing', 'NURSING', 'Clinical nursing care, medication management, vital signs monitoring', '💊', 'normal', 12),
    (v_dept_housekeeping, v_agency_id, 'Housekeeping', 'HOUSEKEEPING', 'Room cleaning, sanitization, and environmental services', '🧹', 'normal', 8),
    (v_dept_kitchen, v_agency_id, 'Kitchen', 'KITCHEN', 'Meal preparation, delivery, and nutrition services', '🍽️', 'understaffed', 6)
  ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    status = EXCLUDED.status;
  
  -- Create user profiles for caregivers (10 caregivers)
  FOR i IN 1..10 LOOP
    v_user_id := ('10000000-0000-0000-0000-' || lpad((100 + i)::text, 12, '0'))::uuid;
    INSERT INTO user_profiles (id, role_id, agency_id, display_name, is_active)
    VALUES (
      v_user_id,
      v_caregiver_role_id,
      v_agency_id,
      'Caregiver ' || i,
      true
    )
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
    
    v_caregiver_ids := array_append(v_caregiver_ids, v_user_id);
    
    -- Link to department_personnel
    INSERT INTO department_personnel (
      agency_id, department_id, user_id, first_name, last_name, display_name, 
      employee_id, position_title, shift_pattern, is_primary_department, 
      skills, status, work_phone, work_email, workload_indicator
    ) VALUES (
      v_agency_id, 
      v_dept_nursing, 
      v_user_id,
      'Caregiver',
      'Staff' || i,
      'Caregiver ' || i,
      'CG-' || lpad(i::text, 3, '0'),
      'Personal Support Worker (PSW)',
      CASE WHEN i % 3 = 0 THEN 'day' WHEN i % 3 = 1 THEN 'evening' ELSE 'night' END,
      true,
      ARRAY['medication_administration', 'vital_signs', 'patient_care'],
      'on_shift',
      '555-01' || lpad(i::text, 2, '0'),
      'caregiver' || i || '@demo.com',
      3
    )
    ON CONFLICT (agency_id, employee_id) DO UPDATE SET 
      display_name = EXCLUDED.display_name;
  END LOOP;
  
  -- Create supervisor user profiles (2 supervisors)
  FOR i IN 1..2 LOOP
    v_user_id := ('20000000-0000-0000-0000-' || lpad((100 + i)::text, 12, '0'))::uuid;
    INSERT INTO user_profiles (id, role_id, agency_id, display_name, is_active)
    VALUES (
      v_user_id,
      v_supervisor_role_id,
      v_agency_id,
      'Supervisor ' || i,
      true
    )
    ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
    
    v_supervisor_ids := array_append(v_supervisor_ids, v_user_id);
    
    INSERT INTO department_personnel (
      agency_id, department_id, user_id, first_name, last_name, display_name,
      employee_id, position_title, shift_pattern, is_primary_department,
      skills, status, work_phone, work_email, workload_indicator
    ) VALUES (
      v_agency_id,
      v_dept_nursing,
      v_user_id,
      'Supervisor',
      'Staff' || i,
      'Supervisor ' || i,
      'SUP-' || lpad(i::text, 3, '0'),
      'Nursing Supervisor',
      'day',
      true,
      ARRAY['supervision', 'quality_assurance', 'staff_management'],
      'on_shift',
      '555-09' || i,
      'supervisor' || i || '@demo.com',
      2
    )
    ON CONFLICT (agency_id, employee_id) DO UPDATE SET 
      display_name = EXCLUDED.display_name;
  END LOOP;
  
  -- Create agency admin user profile
  v_user_id := '30000000-0000-0000-0000-000000000001'::uuid;
  INSERT INTO user_profiles (id, role_id, agency_id, display_name, is_active)
  VALUES (
    v_user_id,
    v_admin_role_id,
    v_agency_id,
    'Admin Manager',
    true
  )
  ON CONFLICT (id) DO UPDATE SET display_name = EXCLUDED.display_name;
  
  -- Create 20 Residents with fixed IDs
  INSERT INTO residents (id, agency_id, full_name, date_of_birth, status, metadata)
  VALUES 
    ('40000000-0000-0000-0000-000000000001'::uuid, v_agency_id, 'Alice Anderson', '1940-03-15', 'active', '{"room": "101", "nursing_acuity": "medium"}'::jsonb),
    ('40000000-0000-0000-0000-000000000002'::uuid, v_agency_id, 'Bob Baker', '1938-07-22', 'active', '{"room": "102", "nursing_acuity": "low"}'::jsonb),
    ('40000000-0000-0000-0000-000000000003'::uuid, v_agency_id, 'Carol Chen', '1935-11-08', 'active', '{"room": "103", "nursing_acuity": "high"}'::jsonb),
    ('40000000-0000-0000-0000-000000000004'::uuid, v_agency_id, 'David Davis', '1942-01-30', 'active', '{"room": "104", "nursing_acuity": "medium"}'::jsonb),
    ('40000000-0000-0000-0000-000000000005'::uuid, v_agency_id, 'Emma Evans', '1937-05-18', 'active', '{"room": "105", "nursing_acuity": "low"}'::jsonb),
    ('40000000-0000-0000-0000-000000000006'::uuid, v_agency_id, 'Frank Foster', '1939-09-25', 'active', '{"room": "106", "nursing_acuity": "high"}'::jsonb),
    ('40000000-0000-0000-0000-000000000007'::uuid, v_agency_id, 'Grace Garcia', '1941-12-10', 'active', '{"room": "107", "nursing_acuity": "medium"}'::jsonb),
    ('40000000-0000-0000-0000-000000000008'::uuid, v_agency_id, 'Henry Hill', '1936-04-03', 'active', '{"room": "108", "nursing_acuity": "high"}'::jsonb),
    ('40000000-0000-0000-0000-000000000009'::uuid, v_agency_id, 'Iris Ivanov', '1943-08-14', 'active', '{"room": "109", "nursing_acuity": "low"}'::jsonb),
    ('40000000-0000-0000-0000-000000000010'::uuid, v_agency_id, 'Jack Johnson', '1940-06-27', 'active', '{"room": "110", "nursing_acuity": "medium"}'::jsonb),
    ('40000000-0000-0000-0000-000000000011'::uuid, v_agency_id, 'Kate Kim', '1938-10-19', 'active', '{"room": "111", "nursing_acuity": "high"}'::jsonb),
    ('40000000-0000-0000-0000-000000000012'::uuid, v_agency_id, 'Leo Lopez', '1941-02-08', 'active', '{"room": "112", "nursing_acuity": "low"}'::jsonb),
    ('40000000-0000-0000-0000-000000000013'::uuid, v_agency_id, 'Mary Miller', '1937-07-31', 'active', '{"room": "113", "nursing_acuity": "medium"}'::jsonb),
    ('40000000-0000-0000-0000-000000000014'::uuid, v_agency_id, 'Nathan Nguyen', '1939-11-22', 'active', '{"room": "114", "nursing_acuity": "high"}'::jsonb),
    ('40000000-0000-0000-0000-000000000015'::uuid, v_agency_id, 'Olivia OBrien', '1942-03-14', 'active', '{"room": "115", "nursing_acuity": "low"}'::jsonb),
    ('40000000-0000-0000-0000-000000000016'::uuid, v_agency_id, 'Paul Patel', '1936-09-05', 'active', '{"room": "116", "nursing_acuity": "medium"}'::jsonb),
    ('40000000-0000-0000-0000-000000000017'::uuid, v_agency_id, 'Quinn Roberts', '1940-12-28', 'active', '{"room": "117", "nursing_acuity": "high"}'::jsonb),
    ('40000000-0000-0000-0000-000000000018'::uuid, v_agency_id, 'Rose Rodriguez', '1938-05-16', 'active', '{"room": "118", "nursing_acuity": "medium"}'::jsonb),
    ('40000000-0000-0000-0000-000000000019'::uuid, v_agency_id, 'Sam Smith', '1941-08-09', 'active', '{"room": "119", "nursing_acuity": "low"}'::jsonb),
    ('40000000-0000-0000-0000-000000000020'::uuid, v_agency_id, 'Tina Taylor', '1937-01-21', 'active', '{"room": "120", "nursing_acuity": "high"}'::jsonb)
  ON CONFLICT (id) DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    status = 'active';
  
  -- Get resident IDs
  v_resident_ids := ARRAY[
    '40000000-0000-0000-0000-000000000001'::uuid,
    '40000000-0000-0000-0000-000000000002'::uuid,
    '40000000-0000-0000-0000-000000000003'::uuid,
    '40000000-0000-0000-0000-000000000004'::uuid,
    '40000000-0000-0000-0000-000000000005'::uuid,
    '40000000-0000-0000-0000-000000000006'::uuid,
    '40000000-0000-0000-0000-000000000007'::uuid,
    '40000000-0000-0000-0000-000000000008'::uuid,
    '40000000-0000-0000-0000-000000000009'::uuid,
    '40000000-0000-0000-0000-000000000010'::uuid,
    '40000000-0000-0000-0000-000000000011'::uuid,
    '40000000-0000-0000-0000-000000000012'::uuid,
    '40000000-0000-0000-0000-000000000013'::uuid,
    '40000000-0000-0000-0000-000000000014'::uuid,
    '40000000-0000-0000-0000-000000000015'::uuid,
    '40000000-0000-0000-0000-000000000016'::uuid,
    '40000000-0000-0000-0000-000000000017'::uuid,
    '40000000-0000-0000-0000-000000000018'::uuid,
    '40000000-0000-0000-0000-000000000019'::uuid,
    '40000000-0000-0000-0000-000000000020'::uuid
  ];
  
  -- Create task categories
  INSERT INTO task_categories (agency_id, name, category_type, description, default_priority, requires_evidence, metadata)
  VALUES
    (v_agency_id, 'Medication Administration', 'clinical', 'Administer prescribed medications', 'high', true, '{"department": "NURSING"}'::jsonb),
    (v_agency_id, 'Vital Signs Monitoring', 'monitoring', 'Monitor and record vital signs', 'medium', true, '{"department": "NURSING"}'::jsonb),
    (v_agency_id, 'Room Cleaning', 'housekeeping', 'Clean and sanitize resident rooms', 'medium', true, '{"department": "HOUSEKEEPING"}'::jsonb),
    (v_agency_id, 'Meal Delivery', 'nutrition', 'Deliver meals to residents', 'medium', true, '{"department": "KITCHEN"}'::jsonb)
  ON CONFLICT (agency_id, name) DO UPDATE SET 
    description = EXCLUDED.description;
  
  SELECT id INTO v_cat_nursing_med FROM task_categories WHERE agency_id = v_agency_id AND name = 'Medication Administration';
  SELECT id INTO v_cat_nursing_vitals FROM task_categories WHERE agency_id = v_agency_id AND name = 'Vital Signs Monitoring';
  SELECT id INTO v_cat_housekeeping FROM task_categories WHERE agency_id = v_agency_id AND name = 'Room Cleaning';
  SELECT id INTO v_cat_kitchen_delivery FROM task_categories WHERE agency_id = v_agency_id AND name = 'Meal Delivery';
  
  -- Delete old tasks for today only (to avoid duplicates on re-seed)
  DELETE FROM tasks 
  WHERE agency_id = v_agency_id 
    AND scheduled_start::date = CURRENT_DATE;
  
  -- Create unassigned tasks for TODAY at various time slots
  -- Morning (8 AM - 12 PM) - 10 medication tasks
  FOR i IN 1..10 LOOP
    v_resident_id := v_resident_ids[i];
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
  
  -- Afternoon (12 PM - 4 PM) - 10 meal delivery tasks
  FOR i IN 1..10 LOOP
    v_resident_id := v_resident_ids[i];
    v_time_slot := CURRENT_DATE + interval '12 hours' + ((v_task_counter - 10) * interval '15 minutes');
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
  
  -- Evening (4 PM - 8 PM) - 10 cleaning tasks
  FOR i IN 1..10 LOOP
    v_resident_id := v_resident_ids[i];
    v_time_slot := CURRENT_DATE + interval '16 hours' + ((v_task_counter - 20) * interval '15 minutes');
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
    'residents_created', 20,
    'departments_created', 3,
    'caregivers_created', array_length(v_caregiver_ids, 1),
    'supervisors_created', array_length(v_supervisor_ids, 1),
    'total_users_created', array_length(v_caregiver_ids, 1) + array_length(v_supervisor_ids, 1) + 1,
    'personnel_created', array_length(v_caregiver_ids, 1) + array_length(v_supervisor_ids, 1),
    'tasks_created', v_task_counter,
    'unassigned_tasks', v_task_counter,
    'tasks_for_today', v_task_counter,
    'message', 'Showcase scenario ready with ' || array_length(v_caregiver_ids, 1) || ' caregivers and ' || v_task_counter || ' unassigned tasks for TODAY'
  );
  
  RETURN v_result;
END $$;
