/*
  # Create Scenario Seed RPC
  
  Comprehensive function to seed all scenario data for showcase mode
*/

CREATE OR REPLACE FUNCTION seed_comprehensive_scenario()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
  v_result jsonb;
  v_resident_count int;
  v_staff_count int;
BEGIN
  
  -- Create or get agency
  INSERT INTO agencies (name, status, metadata, operating_mode)
  VALUES (
    'Sunrise Senior Care',
    'active',
    jsonb_build_object(
      'address', '123 Care Street, Healthcare City, HC 12345',
      'capacity', 20,
      'departments', jsonb_build_array('NURSING', 'HOUSEKEEPING', 'KITCHEN', 'MANAGEMENT')
    ),
    'AGENCY'
  )
  ON CONFLICT (name) DO UPDATE 
  SET operating_mode = 'AGENCY'
  RETURNING id INTO v_agency_id;
  
  IF v_agency_id IS NULL THEN
    SELECT id INTO v_agency_id FROM agencies LIMIT 1;
  END IF;
  
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
    (v_agency_id, 'Tina Taylor', '1937-01-21', 'active', '{"room": "120", "diet": "diabetic", "allergies": ["fish"], "nursing_acuity": "high", "hygiene_needs": "daily"}'::jsonb)
  ON CONFLICT (full_name, agency_id) DO NOTHING;
  
  -- Create task categories
  INSERT INTO task_categories (agency_id, name, description, department)
  VALUES
    (v_agency_id, 'Medication Administration', 'Administer prescribed medications', 'NURSING'),
    (v_agency_id, 'Vital Signs Monitoring', 'Monitor and record vital signs', 'NURSING'),
    (v_agency_id, 'Assessment', 'Perform nursing assessments', 'NURSING'),
    (v_agency_id, 'Room Cleaning', 'Clean and sanitize resident rooms', 'HOUSEKEEPING'),
    (v_agency_id, 'Hygiene Assistance', 'Assist with bathing and personal care', 'HOUSEKEEPING'),
    (v_agency_id, 'Linen Change', 'Change bed linens and towels', 'HOUSEKEEPING'),
    (v_agency_id, 'Meal Preparation', 'Prepare meals according to dietary requirements', 'KITCHEN'),
    (v_agency_id, 'Meal Delivery', 'Deliver meals to residents', 'KITCHEN'),
    (v_agency_id, 'Intake Documentation', 'Document meal intake percentages', 'KITCHEN')
  ON CONFLICT (agency_id, name) DO NOTHING;
  
  SELECT COUNT(*) INTO v_resident_count FROM residents WHERE agency_id = v_agency_id;
  
  v_result := jsonb_build_object(
    'success', true,
    'agency_id', v_agency_id,
    'residents_created', v_resident_count,
    'message', 'Scenario seed completed successfully'
  );
  
  RETURN v_result;
  
END $$;
