/*
  # Fix Showcase Seed Function
  
  Creates working seed function that populates showcase mode with operational data
*/

CREATE OR REPLACE FUNCTION seed_showcase_scenario()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
  v_resident_ids uuid[];
  v_cat_nursing_med uuid;
  v_cat_nursing_vitals uuid;
  v_cat_housekeeping uuid;
  v_cat_kitchen_prep uuid;
  v_cat_kitchen_delivery uuid;
  v_result jsonb;
  v_day_offset int;
  v_base_time timestamptz;
  v_resident_id uuid;
BEGIN
  
  -- Get or create agency in AGENCY mode
  SELECT id INTO v_agency_id FROM agencies WHERE name = 'Sunrise Senior Care';
  
  IF v_agency_id IS NULL THEN
    INSERT INTO agencies (name, status, operating_mode, metadata)
    VALUES (
      'Sunrise Senior Care',
      'active',
      'AGENCY',
      '{"capacity": 20, "departments": ["NURSING", "HOUSEKEEPING", "KITCHEN", "MANAGEMENT"]}'::jsonb
    )
    RETURNING id INTO v_agency_id;
  ELSE
    UPDATE agencies SET operating_mode = 'AGENCY' WHERE id = v_agency_id;
  END IF;
  
  -- Delete existing showcase data
  DELETE FROM tasks WHERE agency_id = v_agency_id;
  DELETE FROM residents WHERE agency_id = v_agency_id;
  DELETE FROM task_categories WHERE agency_id = v_agency_id;
  
  -- Create 20 Residents without conflict handling
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
  
  -- Get resident IDs
  SELECT array_agg(id) INTO v_resident_ids FROM residents WHERE agency_id = v_agency_id;
  
  -- Create task categories for each department
  INSERT INTO task_categories (agency_id, name, description, department)
  VALUES
    (v_agency_id, 'Medication Administration', 'Administer prescribed medications', 'NURSING'),
    (v_agency_id, 'Vital Signs Monitoring', 'Monitor and record vital signs', 'NURSING'),
    (v_agency_id, 'Room Cleaning', 'Clean and sanitize resident rooms', 'HOUSEKEEPING'),
    (v_agency_id, 'Hygiene Assistance', 'Assist with bathing and personal care', 'HOUSEKEEPING'),
    (v_agency_id, 'Meal Preparation', 'Prepare meals according to dietary requirements', 'KITCHEN'),
    (v_agency_id, 'Meal Delivery', 'Deliver meals to residents', 'KITCHEN');
  
  -- Get category IDs
  SELECT id INTO v_cat_nursing_med FROM task_categories WHERE agency_id = v_agency_id AND name = 'Medication Administration';
  SELECT id INTO v_cat_nursing_vitals FROM task_categories WHERE agency_id = v_agency_id AND name = 'Vital Signs Monitoring';
  SELECT id INTO v_cat_housekeeping FROM task_categories WHERE agency_id = v_agency_id AND name = 'Room Cleaning';
  SELECT id INTO v_cat_kitchen_delivery FROM task_categories WHERE agency_id = v_agency_id AND name = 'Meal Delivery';
  
  -- Generate 7 days of tasks (starting 3 days ago for history)
  v_base_time := NOW() - interval '3 days';
  
  -- Create tasks for each day
  FOR v_day_offset IN 0..6 LOOP
    -- Morning medications (8 AM) for high acuity residents
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
        responsibility_role, requires_evidence,
        metadata
      ) VALUES (
        v_agency_id, v_resident_id, v_cat_nursing_med, 'NURSING',
        'Morning Medication Round', 'Administer prescribed morning medications',
        'high', 'medium', 
        CASE WHEN v_day_offset < 3 THEN 'completed' ELSE 'pending' END,
        v_base_time + (v_day_offset || ' days')::interval + interval '8 hours',
        v_base_time + (v_day_offset || ' days')::interval + interval '9 hours',
        'RN', true,
        jsonb_build_object(
          'medications', jsonb_build_array('Lisinopril 10mg', 'Metformin 500mg'),
          'route', 'oral',
          'staff_license_required', 'RN'
        )
      );
    END LOOP;
    
    -- Breakfast delivery (8:30 AM) for all residents
    FOR v_resident_id IN SELECT unnest(v_resident_ids) LIMIT 20 LOOP
      INSERT INTO tasks (
        agency_id, resident_id, category_id, department,
        task_name, description, priority, risk_level, state,
        scheduled_start, scheduled_end,
        responsibility_role, requires_evidence,
        metadata
      ) VALUES (
        v_agency_id, v_resident_id, v_cat_kitchen_delivery, 'KITCHEN',
        'Breakfast Delivery', 'Deliver breakfast meal',
        'medium', 'low',
        CASE WHEN v_day_offset < 3 THEN 'completed' ELSE 'pending' END,
        v_base_time + (v_day_offset || ' days')::interval + interval '8.5 hours',
        v_base_time + (v_day_offset || ' days')::interval + interval '9 hours',
        'KITCHEN_STAFF', true,
        jsonb_build_object(
          'meal_type', 'breakfast',
          'diet_type', 'standard',
          'intake_percentage', CASE WHEN v_day_offset < 3 THEN 85 ELSE NULL END
        )
      );
    END LOOP;
    
    -- Room cleaning (10 AM) - rotating schedule
    FOR v_resident_id IN 
      SELECT id FROM residents WHERE agency_id = v_agency_id 
      ORDER BY id OFFSET (v_day_offset * 7) LIMIT 7
    LOOP
      INSERT INTO tasks (
        agency_id, resident_id, category_id, department,
        task_name, description, priority, risk_level, state,
        scheduled_start, scheduled_end,
        responsibility_role, requires_evidence,
        metadata
      ) VALUES (
        v_agency_id, v_resident_id, v_cat_housekeeping, 'HOUSEKEEPING',
        'Room Cleaning & Sanitation', 'Clean room, change linens, sanitize bathroom',
        'medium', 'low',
        CASE WHEN v_day_offset < 3 THEN 'completed' ELSE 'pending' END,
        v_base_time + (v_day_offset || ' days')::interval + interval '10 hours',
        v_base_time + (v_day_offset || ' days')::interval + interval '11 hours',
        'HOUSEKEEPING_STAFF', true,
        jsonb_build_object(
          'tasks_completed', jsonb_build_array('swept_floor', 'sanitized_bathroom', 'changed_linens'),
          'voice_report', 'Room clean, no issues found',
          'supervisor_acknowledged', CASE WHEN v_day_offset < 3 THEN true ELSE false END
        )
      );
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
