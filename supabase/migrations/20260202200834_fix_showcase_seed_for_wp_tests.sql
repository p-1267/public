/*
  # Fix Showcase Seeding for WP1-8 Tests

  ## Problem
  WP1 acceptance test fails with "No unassigned tasks available" because:
  - The seed function doesn't create tasks with owner_user_id = NULL
  - The created_by field is not set properly
  - Some column names don't match the schema

  ## Solution
  Update seed_showcase_scenario() to:
  1. Create a system user ID for created_by field
  2. Create unassigned tasks (owner_user_id = NULL) for WP1 testing
  3. Use correct column names throughout
  4. Return helpful statistics

  ## Changes
  - Sets owner_user_id = NULL for future tasks (day offset >= 3)
  - Uses system user ID for created_by field
  - Adds both department_id and department columns
  - Returns count of unassigned tasks in result
*/

CREATE OR REPLACE FUNCTION seed_showcase_scenario()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_system_user_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_resident_ids uuid[];
  v_cat_nursing_med uuid;
  v_cat_nursing_vitals uuid;
  v_cat_housekeeping uuid;
  v_cat_kitchen_delivery uuid;
  v_result jsonb;
  v_day_offset int;
  v_base_time timestamptz;
  v_resident_id uuid;
  v_dept_nursing uuid := 'd0000000-0000-0000-0000-000000000001'::uuid;
  v_dept_housekeeping uuid := 'd0000000-0000-0000-0000-000000000002'::uuid;
  v_dept_kitchen uuid := 'd0000000-0000-0000-0000-000000000003'::uuid;
  v_dept_hygiene uuid := 'd0000000-0000-0000-0000-000000000004'::uuid;
  v_dept_mobility uuid := 'd0000000-0000-0000-0000-000000000005'::uuid;
  v_dept_nutrition uuid := 'd0000000-0000-0000-0000-000000000006'::uuid;
  v_dept_monitoring uuid := 'd0000000-0000-0000-0000-000000000007'::uuid;
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
    (v_dept_kitchen, v_agency_id, 'Kitchen', 'KITCHEN', 'Meal preparation, delivery, and nutrition services', '🍽️', 'understaffed', 6, now(), now()),
    (v_dept_hygiene, v_agency_id, 'Hygiene', 'HYGIENE', 'Personal care, bathing assistance, and grooming', '🚿', 'normal', 5, now(), now()),
    (v_dept_mobility, v_agency_id, 'Mobility', 'MOBILITY', 'Physical therapy, transfers, and mobility support', '🚶', 'normal', 4, now(), now()),
    (v_dept_nutrition, v_agency_id, 'Nutrition', 'NUTRITION', 'Dietary planning, supplements, and nutrition monitoring', '🥗', 'normal', 3, now(), now()),
    (v_dept_monitoring, v_agency_id, 'Monitoring', 'MONITORING', 'Safety monitoring, device management, and alert response', '📊', 'alerts', 4, now(), now());
  
  -- Create department personnel - Nursing
  INSERT INTO department_personnel (agency_id, department_id, user_id, first_name, last_name, display_name, employee_id, position_title, shift_pattern, is_primary_department, skills, status, work_phone, work_email, workload_indicator)
  SELECT 
    v_agency_id, v_dept_nursing, NULL,
    'Nurse', 'Staff' || i::text, 'Nurse ' || i::text,
    'RN-' || LPAD(i::text, 3, '0'),
    CASE WHEN i <= 4 THEN 'Registered Nurse (RN)' ELSE 'Personal Support Worker (PSW)' END,
    CASE WHEN i % 3 = 0 THEN 'day' WHEN i % 3 = 1 THEN 'evening' ELSE 'night' END,
    true, ARRAY['medication_administration', 'vital_signs', 'wound_care'],
    CASE WHEN i % 4 = 0 THEN 'on_shift' WHEN i % 4 = 1 THEN 'off_shift' WHEN i % 4 = 2 THEN 'on_break' ELSE 'on_call' END,
    '555-01' || LPAD(i::text, 2, '0'), 'nurse' || i::text || '@demo.com', (i % 5) + 2
  FROM generate_series(1, 12) AS i;
  
  -- Create department personnel - Housekeeping
  INSERT INTO department_personnel (agency_id, department_id, user_id, first_name, last_name, display_name, employee_id, position_title, shift_pattern, is_primary_department, skills, status, work_phone, work_email, workload_indicator)
  SELECT 
    v_agency_id, v_dept_housekeeping, NULL,
    'Housekeeper', 'Staff' || i::text, 'Housekeeper ' || i::text,
    'HK-' || LPAD(i::text, 3, '0'), 'Housekeeper',
    CASE WHEN i % 2 = 0 THEN 'day' ELSE 'evening' END,
    true, ARRAY['cleaning', 'sanitization'],
    CASE WHEN i % 3 = 0 THEN 'on_shift' ELSE 'off_shift' END,
    '555-02' || LPAD(i::text, 2, '0'), 'housekeeper' || i::text || '@demo.com', (i % 4) + 1
  FROM generate_series(1, 8) AS i;
  
  -- Create department personnel - Kitchen
  INSERT INTO department_personnel (agency_id, department_id, user_id, first_name, last_name, display_name, employee_id, position_title, shift_pattern, is_primary_department, skills, status, work_phone, work_email, workload_indicator)
  SELECT 
    v_agency_id, v_dept_kitchen, NULL,
    'Cook', 'Staff' || i::text, 'Kitchen Staff ' || i::text,
    'CK-' || LPAD(i::text, 3, '0'),
    CASE WHEN i <= 2 THEN 'Head Cook' ELSE 'Kitchen Assistant' END,
    'day', true, ARRAY['meal_prep', 'food_safety'],
    CASE WHEN i % 2 = 0 THEN 'on_shift' ELSE 'off_shift' END,
    '555-03' || LPAD(i::text, 2, '0'), 'cook' || i::text || '@demo.com', (i % 3) + 2
  FROM generate_series(1, 6) AS i;
  
  -- Create 20 Residents
  INSERT INTO residents (agency_id, full_name, date_of_birth, status, metadata)
  VALUES 
    (v_agency_id, 'Alice Anderson', '1940-03-15', 'active', '{"room": "101", "diet": "vegetarian", "allergies": ["peanuts"], "nursing_acuity": "medium"}'::jsonb),
    (v_agency_id, 'Bob Baker', '1938-07-22', 'active', '{"room": "102", "diet": "normal", "allergies": [], "nursing_acuity": "low"}'::jsonb),
    (v_agency_id, 'Carol Chen', '1935-11-08', 'active', '{"room": "103", "diet": "diabetic", "allergies": ["shellfish"], "nursing_acuity": "high"}'::jsonb),
    (v_agency_id, 'David Davis', '1942-01-30', 'active', '{"room": "104", "diet": "normal", "allergies": [], "nursing_acuity": "medium"}'::jsonb),
    (v_agency_id, 'Emma Evans', '1937-05-18', 'active', '{"room": "105", "diet": "vegetarian", "allergies": [], "nursing_acuity": "low"}'::jsonb),
    (v_agency_id, 'Frank Foster', '1939-09-25', 'active', '{"room": "106", "diet": "diabetic", "allergies": ["dairy"], "nursing_acuity": "high"}'::jsonb),
    (v_agency_id, 'Grace Garcia', '1941-12-10', 'active', '{"room": "107", "diet": "normal", "allergies": [], "nursing_acuity": "medium"}'::jsonb),
    (v_agency_id, 'Henry Hill', '1936-04-03', 'active', '{"room": "108", "diet": "diabetic", "allergies": [], "nursing_acuity": "high"}'::jsonb),
    (v_agency_id, 'Iris Ivanov', '1943-08-14', 'active', '{"room": "109", "diet": "normal", "allergies": ["gluten"], "nursing_acuity": "low"}'::jsonb),
    (v_agency_id, 'Jack Johnson', '1940-06-27', 'active', '{"room": "110", "diet": "vegetarian", "allergies": [], "nursing_acuity": "medium"}'::jsonb),
    (v_agency_id, 'Kate Kim', '1938-10-19', 'active', '{"room": "111", "diet": "diabetic", "allergies": ["soy"], "nursing_acuity": "high"}'::jsonb),
    (v_agency_id, 'Leo Lopez', '1941-02-08', 'active', '{"room": "112", "diet": "normal", "allergies": [], "nursing_acuity": "low"}'::jsonb),
    (v_agency_id, 'Mary Miller', '1937-07-31', 'active', '{"room": "113", "diet": "vegetarian", "allergies": ["eggs"], "nursing_acuity": "medium"}'::jsonb),
    (v_agency_id, 'Nathan Nguyen', '1939-11-22', 'active', '{"room": "114", "diet": "diabetic", "allergies": [], "nursing_acuity": "high"}'::jsonb),
    (v_agency_id, 'Olivia OBrien', '1942-03-14', 'active', '{"room": "115", "diet": "normal", "allergies": [], "nursing_acuity": "low"}'::jsonb),
    (v_agency_id, 'Paul Patel', '1936-09-05', 'active', '{"room": "116", "diet": "vegetarian", "allergies": ["nuts"], "nursing_acuity": "medium"}'::jsonb),
    (v_agency_id, 'Quinn Roberts', '1940-12-28', 'active', '{"room": "117", "diet": "diabetic", "allergies": [], "nursing_acuity": "high"}'::jsonb),
    (v_agency_id, 'Rose Rodriguez', '1938-05-16', 'active', '{"room": "118", "diet": "normal", "allergies": [], "nursing_acuity": "medium"}'::jsonb),
    (v_agency_id, 'Sam Smith', '1941-08-09', 'active', '{"room": "119", "diet": "vegetarian", "allergies": [], "nursing_acuity": "low"}'::jsonb),
    (v_agency_id, 'Tina Taylor', '1937-01-21', 'active', '{"room": "120", "diet": "diabetic", "allergies": ["fish"], "nursing_acuity": "high"}'::jsonb);
  
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
  
  v_base_time := NOW() - interval '3 days';
  
  -- Create tasks with proper fields
  -- Past tasks (completed) have owner_user_id set
  -- Future tasks (scheduled) have owner_user_id = NULL for WP1 testing
  FOR v_day_offset IN 0..6 LOOP
    FOR v_resident_id IN 
      SELECT id FROM residents 
      WHERE agency_id = v_agency_id 
      AND metadata->>'nursing_acuity' IN ('high', 'medium')
      LIMIT 10
    LOOP
      INSERT INTO tasks (
        agency_id, resident_id, category_id, department, department_id,
        task_name, description, priority, risk_level, state,
        scheduled_start, scheduled_end,
        responsibility_role, requires_evidence,
        created_by, owner_user_id, metadata
      ) VALUES (
        v_agency_id, v_resident_id, v_cat_nursing_med, 'NURSING', v_dept_nursing,
        'Morning Medication Round', 'Administer prescribed morning medications',
        'high', 'B', 
        CASE WHEN v_day_offset < 3 THEN 'completed' ELSE 'scheduled' END,
        v_base_time + (v_day_offset || ' days')::interval + interval '8 hours',
        v_base_time + (v_day_offset || ' days')::interval + interval '9 hours',
        'RN', true,
        v_system_user_id,
        CASE WHEN v_day_offset >= 3 THEN NULL ELSE v_system_user_id END,
        jsonb_build_object('medications', jsonb_build_array('Lisinopril 10mg'))
      );
    END LOOP;
    
    FOR v_resident_id IN SELECT unnest(v_resident_ids) LIMIT 15 LOOP
      INSERT INTO tasks (
        agency_id, resident_id, category_id, department, department_id,
        task_name, description, priority, risk_level, state,
        scheduled_start, scheduled_end,
        responsibility_role, requires_evidence,
        created_by, owner_user_id, metadata
      ) VALUES (
        v_agency_id, v_resident_id, v_cat_kitchen_delivery, 'KITCHEN', v_dept_kitchen,
        'Breakfast Delivery', 'Deliver breakfast meal',
        'medium', 'C',
        CASE WHEN v_day_offset < 3 THEN 'completed' ELSE 'scheduled' END,
        v_base_time + (v_day_offset || ' days')::interval + interval '8.5 hours',
        v_base_time + (v_day_offset || ' days')::interval + interval '9 hours',
        'KITCHEN_STAFF', true,
        v_system_user_id,
        CASE WHEN v_day_offset >= 3 THEN NULL ELSE v_system_user_id END,
        jsonb_build_object('meal_type', 'breakfast')
      );
    END LOOP;
  END LOOP;
  
  v_result := jsonb_build_object(
    'success', true,
    'agency_id', v_agency_id,
    'residents_created', array_length(v_resident_ids, 1),
    'departments_created', 7,
    'personnel_created', 26,
    'tasks_created', (SELECT COUNT(*) FROM tasks WHERE agency_id = v_agency_id),
    'unassigned_tasks', (SELECT COUNT(*) FROM tasks WHERE agency_id = v_agency_id AND owner_user_id IS NULL),
    'message', 'Showcase scenario seeded with unassigned tasks for WP1-8 testing'
  );
  
  RETURN v_result;
END $$;
