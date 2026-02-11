/*
  # Fix Showcase Agency ID to Match Context
  
  Updates seed function to use the hardcoded showcase agency ID
*/

CREATE OR REPLACE FUNCTION seed_showcase_scenario()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid := 'a0000000-0000-0000-0000-000000000001'::uuid; -- Fixed showcase agency ID
  v_resident_ids uuid[];
  v_cat_nursing_med uuid;
  v_cat_nursing_vitals uuid;
  v_cat_housekeeping uuid;
  v_cat_kitchen_delivery uuid;
  v_result jsonb;
  v_day_offset int;
  v_base_time timestamptz;
  v_resident_id uuid;
BEGIN
  
  -- Delete and recreate showcase agency with fixed ID
  DELETE FROM tasks WHERE agency_id = v_agency_id;
  DELETE FROM residents WHERE agency_id = v_agency_id;
  DELETE FROM task_categories WHERE agency_id = v_agency_id;
  DELETE FROM agencies WHERE id = v_agency_id;
  
  INSERT INTO agencies (id, name, status, operating_mode, metadata)
  VALUES (
    v_agency_id,
    'Sunrise Senior Care',
    'active',
    'AGENCY',
    '{"capacity": 20, "departments": ["NURSING", "HOUSEKEEPING", "KITCHEN", "MANAGEMENT"]}'::jsonb
  );
  
  -- Create 20 Residents
  INSERT INTO residents (agency_id, full_name, date_of_birth, status, metadata)
  VALUES 
    (v_agency_id, 'Alice Anderson', '1940-03-15', 'active', '{"room": "101", "diet": "vegetarian", "allergies": ["peanuts"], "nursing_acuity": "medium", "hygiene_needs": "assisted"}'::jsonb),
    (v_agency_id, 'Bob Baker', '1938-07-22', 'active', '{"room": "102", "diet": "normal", "allergies": [], "nursing_acuity": "low", "hygiene_needs": "independent"}'::jsonb),
    (v_agency_id, 'Carol Chen', '1935-11-08', 'active', '{"room": "103", "diet": "diabetic", "allergies": ["shellfish"], "nursing_acuity": "high", "hygiene_needs": "assisted"}'::jsonb),
    (v_agency_id, 'David Davis', '1942-01-30', 'active', '{"room": "104", "diet": "normal", "allergies": [], "nursing_acuity": "medium", "hygiene_needs": "independent"}'::jsonb),
    (v_agency_id, 'Emma Evans', '1937-05-18', 'active', '{"room": "105", "diet": "vegetarian", "allergies": [], "nursing_acuity": "low", "hygiene_needs": "assisted"}'::jsonb),
    (v_agency_id, 'Frank Foster', '1939-09-25', 'active', '{"room": "106", "diet": "diabetic", "allergies": ["dairy"], "nursing_acuity": "high", "hygiene_needs": "daily"}'::jsonb),
    (v_agency_id, 'Grace Garcia', '1941-12-10', 'active', '{"room": "107", "diet": "normal", "allergies": [], "nursing_acuity": "medium", "hygiene_needs": "independent"}'::jsonb),
    (v_agency_id, 'Henry Hill', '1936-04-03', 'active', '{"room": "108", "diet": "diabetic", "allergies": [], "nursing_acuity": "high", "hygiene_needs": "assisted"}'::jsonb),
    (v_agency_id, 'Iris Ivanov', '1943-08-14', 'active', '{"room": "109", "diet": "normal", "allergies": ["gluten"], "nursing_acuity": "low", "hygiene_needs": "independent"}'::jsonb),
    (v_agency_id, 'Jack Johnson', '1940-06-27', 'active', '{"room": "110", "diet": "vegetarian", "allergies": [], "nursing_acuity": "medium", "hygiene_needs": "assisted"}'::jsonb),
    (v_agency_id, 'Kate Kim', '1938-10-19', 'active', '{"room": "111", "diet": "diabetic", "allergies": ["soy"], "nursing_acuity": "high", "hygiene_needs": "daily"}'::jsonb),
    (v_agency_id, 'Leo Lopez', '1941-02-08', 'active', '{"room": "112", "diet": "normal", "allergies": [], "nursing_acuity": "low", "hygiene_needs": "independent"}'::jsonb),
    (v_agency_id, 'Mary Miller', '1937-07-31', 'active', '{"room": "113", "diet": "vegetarian", "allergies": ["eggs"], "nursing_acuity": "medium", "hygiene_needs": "assisted"}'::jsonb),
    (v_agency_id, 'Nathan Nguyen', '1939-11-22', 'active', '{"room": "114", "diet": "diabetic", "allergies": [], "nursing_acuity": "high", "hygiene_needs": "daily"}'::jsonb),
    (v_agency_id, 'Olivia OBrien', '1942-03-14', 'active', '{"room": "115", "diet": "normal", "allergies": [], "nursing_acuity": "low", "hygiene_needs": "independent"}'::jsonb),
    (v_agency_id, 'Paul Patel', '1936-09-05', 'active', '{"room": "116", "diet": "vegetarian", "allergies": ["nuts"], "nursing_acuity": "medium", "hygiene_needs": "assisted"}'::jsonb),
    (v_agency_id, 'Quinn Roberts', '1940-12-28', 'active', '{"room": "117", "diet": "diabetic", "allergies": [], "nursing_acuity": "high", "hygiene_needs": "daily"}'::jsonb),
    (v_agency_id, 'Rose Rodriguez', '1938-05-16', 'active', '{"room": "118", "diet": "normal", "allergies": [], "nursing_acuity": "medium", "hygiene_needs": "independent"}'::jsonb),
    (v_agency_id, 'Sam Smith', '1941-08-09', 'active', '{"room": "119", "diet": "vegetarian", "allergies": [], "nursing_acuity": "low", "hygiene_needs": "assisted"}'::jsonb),
    (v_agency_id, 'Tina Taylor', '1937-01-21', 'active', '{"room": "120", "diet": "diabetic", "allergies": ["fish"], "nursing_acuity": "high", "hygiene_needs": "daily"}'::jsonb);
  
  SELECT array_agg(id) INTO v_resident_ids FROM residents WHERE agency_id = v_agency_id;
  
  INSERT INTO task_categories (agency_id, name, category_type, description, default_priority, requires_evidence, metadata)
  VALUES
    (v_agency_id, 'Medication Administration', 'clinical', 'Administer prescribed medications', 'high', true, '{"department": "NURSING", "license_required": "RN"}'::jsonb),
    (v_agency_id, 'Vital Signs Monitoring', 'monitoring', 'Monitor and record vital signs', 'medium', true, '{"department": "NURSING"}'::jsonb),
    (v_agency_id, 'Room Cleaning', 'housekeeping', 'Clean and sanitize resident rooms', 'medium', true, '{"department": "HOUSEKEEPING"}'::jsonb),
    (v_agency_id, 'Hygiene Assistance', 'hygiene', 'Assist with bathing and personal care', 'high', true, '{"department": "HOUSEKEEPING"}'::jsonb),
    (v_agency_id, 'Meal Preparation', 'cooking', 'Prepare meals according to dietary requirements', 'high', true, '{"department": "KITCHEN"}'::jsonb),
    (v_agency_id, 'Meal Delivery', 'nutrition', 'Deliver meals to residents', 'medium', true, '{"department": "KITCHEN"}'::jsonb);
  
  SELECT id INTO v_cat_nursing_med FROM task_categories WHERE agency_id = v_agency_id AND name = 'Medication Administration';
  SELECT id INTO v_cat_nursing_vitals FROM task_categories WHERE agency_id = v_agency_id AND name = 'Vital Signs Monitoring';
  SELECT id INTO v_cat_housekeeping FROM task_categories WHERE agency_id = v_agency_id AND name = 'Room Cleaning';
  SELECT id INTO v_cat_kitchen_delivery FROM task_categories WHERE agency_id = v_agency_id AND name = 'Meal Delivery';
  
  v_base_time := NOW() - interval '3 days';
  
  FOR v_day_offset IN 0..6 LOOP
    FOR v_resident_id IN 
      SELECT id FROM residents 
      WHERE agency_id = v_agency_id 
      AND metadata->>'nursing_acuity' IN ('high', 'medium')
      LIMIT 10
    LOOP
      INSERT INTO tasks (
        agency_id, resident_id, category_id, department,
        task_name, description, priority, risk_level, state,
        scheduled_start, scheduled_end,
        responsibility_role, requires_evidence, metadata
      ) VALUES (
        v_agency_id, v_resident_id, v_cat_nursing_med, 'NURSING',
        'Morning Medication Round', 'Administer prescribed morning medications',
        'high', 'B', 
        CASE WHEN v_day_offset < 3 THEN 'completed' ELSE 'scheduled' END,
        v_base_time + (v_day_offset || ' days')::interval + interval '8 hours',
        v_base_time + (v_day_offset || ' days')::interval + interval '9 hours',
        'RN', true,
        jsonb_build_object(
          'medications', jsonb_build_array('Lisinopril 10mg', 'Metformin 500mg'),
          'route', 'oral', 'completed_by_name',
          CASE WHEN v_day_offset < 3 THEN 'Sarah Williams' ELSE NULL END
        )
      );
    END LOOP;
    
    FOR v_resident_id IN SELECT unnest(v_resident_ids) LIMIT 20 LOOP
      INSERT INTO tasks (agency_id, resident_id, category_id, department, task_name, description, priority, risk_level, state, scheduled_start, scheduled_end, responsibility_role, requires_evidence, metadata)
      VALUES (v_agency_id, v_resident_id, v_cat_kitchen_delivery, 'KITCHEN', 'Breakfast Delivery', 'Deliver breakfast meal', 'medium', 'C',
        CASE WHEN v_day_offset < 3 THEN 'completed' ELSE 'scheduled' END,
        v_base_time + (v_day_offset || ' days')::interval + interval '8.5 hours',
        v_base_time + (v_day_offset || ' days')::interval + interval '9 hours',
        'KITCHEN_STAFF', true, jsonb_build_object('meal_type', 'breakfast', 'completed_by_name', CASE WHEN v_day_offset < 3 THEN 'Tom Harris' ELSE NULL END));
      
      INSERT INTO tasks (agency_id, resident_id, category_id, department, task_name, description, priority, risk_level, state, scheduled_start, scheduled_end, responsibility_role, requires_evidence, metadata)
      VALUES (v_agency_id, v_resident_id, v_cat_kitchen_delivery, 'KITCHEN', 'Lunch Delivery', 'Deliver lunch meal', 'medium', 'C',
        CASE WHEN v_day_offset < 3 THEN 'completed' ELSE 'scheduled' END,
        v_base_time + (v_day_offset || ' days')::interval + interval '12.5 hours',
        v_base_time + (v_day_offset || ' days')::interval + interval '13 hours',
        'KITCHEN_STAFF', true, jsonb_build_object('meal_type', 'lunch', 'completed_by_name', CASE WHEN v_day_offset < 3 THEN 'Tom Harris' ELSE NULL END));
    END LOOP;
    
    FOR v_resident_id IN SELECT id FROM residents WHERE agency_id = v_agency_id ORDER BY id OFFSET (v_day_offset * 7) LIMIT 7 LOOP
      INSERT INTO tasks (agency_id, resident_id, category_id, department, task_name, description, priority, risk_level, state, scheduled_start, scheduled_end, responsibility_role, requires_evidence, supervisor_acknowledged, metadata)
      VALUES (v_agency_id, v_resident_id, v_cat_housekeeping, 'HOUSEKEEPING', 'Room Cleaning & Sanitation', 'Clean room, change linens, sanitize bathroom', 'medium', 'C',
        CASE WHEN v_day_offset < 3 THEN 'completed' ELSE 'scheduled' END,
        v_base_time + (v_day_offset || ' days')::interval + interval '10 hours',
        v_base_time + (v_day_offset || ' days')::interval + interval '11 hours',
        'HOUSEKEEPING_STAFF', true, CASE WHEN v_day_offset < 3 THEN true ELSE false END,
        jsonb_build_object('voice_report', 'Room clean', 'completed_by_name', CASE WHEN v_day_offset < 3 THEN 'Maria Gonzalez' ELSE NULL END));
    END LOOP;
    
    FOR v_resident_id IN SELECT id FROM residents WHERE agency_id = v_agency_id AND metadata->>'nursing_acuity' = 'high' LIMIT 7 LOOP
      INSERT INTO tasks (agency_id, resident_id, category_id, department, task_name, description, priority, risk_level, state, scheduled_start, scheduled_end, responsibility_role, requires_evidence, metadata)
      VALUES (v_agency_id, v_resident_id, v_cat_nursing_vitals, 'NURSING', 'Afternoon Vital Signs Check', 'Monitor BP, HR, Temp, O2', 'medium', 'B',
        CASE WHEN v_day_offset < 3 THEN 'completed' ELSE 'scheduled' END,
        v_base_time + (v_day_offset || ' days')::interval + interval '14 hours',
        v_base_time + (v_day_offset || ' days')::interval + interval '14.5 hours',
        'CNA', true, jsonb_build_object('vitals', jsonb_build_object('bp_systolic', 135, 'heart_rate', 72), 'completed_by_name', CASE WHEN v_day_offset < 3 THEN 'Robert Chen' ELSE NULL END));
    END LOOP;
  END LOOP;
  
  v_result := jsonb_build_object(
    'success', true,
    'agency_id', v_agency_id,
    'residents_created', array_length(v_resident_ids, 1),
    'tasks_created', (SELECT COUNT(*) FROM tasks WHERE agency_id = v_agency_id),
    'message', 'Showcase scenario seeded successfully'
  );
  
  RETURN v_result;
END $$;
