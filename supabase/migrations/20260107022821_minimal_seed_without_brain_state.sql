/*
  # Minimal Working Seed
  
  Seeds only the core operational data that exists and works
*/

CREATE OR REPLACE FUNCTION seed_all_showcase_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
  v_resident_ids uuid[];
  v_category_nursing uuid;
  v_category_housekeeping uuid;
  v_category_kitchen uuid;
  v_today date;
  v_template_morning_med uuid;
  v_template_vitals uuid;
  v_template_room_clean uuid;
  v_template_breakfast uuid;
  i integer;
BEGIN
  v_today := CURRENT_DATE;
  v_agency_id := md5('showcase-agency-001')::uuid;
  v_resident_ids := ARRAY[md5('showcase-resident-a')::uuid, md5('showcase-resident-b')::uuid];
  
  -- 1. Agency
  INSERT INTO agencies (id, name, status, operating_mode, metadata, created_at, updated_at)
  VALUES (v_agency_id, 'Demo Care Agency', 'active', 'AGENCY',
    '{"demo": true}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;
  
  -- 2. Residents  
  INSERT INTO residents (id, agency_id, full_name, date_of_birth, status, metadata, created_at, updated_at)
  VALUES
    (v_resident_ids[1], v_agency_id, 'Pat Anderson', '1948-03-15', 'active', '{}'::jsonb, now(), now()),
    (v_resident_ids[2], v_agency_id, 'Jordan Martinez', '1942-07-22', 'active', '{}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;
  
  -- 3. Categories
  INSERT INTO task_categories (agency_id, name, category_type, description, default_priority, requires_evidence, allows_skip, is_active, created_at, updated_at)
  VALUES
    (v_agency_id, 'NURSING', 'clinical', 'Nursing', 'high', true, false, true, now(), now()),
    (v_agency_id, 'HOUSEKEEPING', 'housekeeping', 'Cleaning', 'medium', false, true, true, now(), now()),
    (v_agency_id, 'KITCHEN', 'cooking', 'Meals', 'high', false, false, true, now(), now())
  ON CONFLICT (agency_id, name) DO NOTHING;
  
  SELECT id INTO v_category_nursing FROM task_categories WHERE agency_id = v_agency_id AND name = 'NURSING' LIMIT 1;
  SELECT id INTO v_category_housekeeping FROM task_categories WHERE agency_id = v_agency_id AND name = 'HOUSEKEEPING' LIMIT 1;
  SELECT id INTO v_category_kitchen FROM task_categories WHERE agency_id = v_agency_id AND name = 'KITCHEN' LIMIT 1;
  
  -- 4. Templates
  INSERT INTO task_templates (agency_id, category_id, template_name, description, default_duration_minutes, default_priority, is_active, created_at)
  VALUES
    (v_agency_id, v_category_nursing, 'Morning Medication', 'Medication', 15, 'high', true, now()),
    (v_agency_id, v_category_nursing, 'Vital Signs', 'Vitals', 10, 'medium', true, now()),
    (v_agency_id, v_category_housekeeping, 'Room Cleaning', 'Cleaning', 30, 'medium', true, now()),
    (v_agency_id, v_category_kitchen, 'Breakfast', 'Breakfast', 10, 'high', true, now())
  ON CONFLICT (agency_id, template_name) DO NOTHING;
  
  SELECT id INTO v_template_morning_med FROM task_templates WHERE agency_id = v_agency_id AND template_name = 'Morning Medication' LIMIT 1;
  SELECT id INTO v_template_vitals FROM task_templates WHERE agency_id = v_agency_id AND template_name = 'Vital Signs' LIMIT 1;
  SELECT id INTO v_template_room_clean FROM task_templates WHERE agency_id = v_agency_id AND template_name = 'Room Cleaning' LIMIT 1;
  SELECT id INTO v_template_breakfast FROM task_templates WHERE agency_id = v_agency_id AND template_name = 'Breakfast' LIMIT 1;
  
  -- 5. Tasks
  FOR i IN 1..2 LOOP
    INSERT INTO tasks (agency_id, resident_id, task_name, department, priority, scheduled_start, scheduled_end, 
                       duration_minutes, state, category_id, template_id, responsibility_role, requires_evidence, 
                       evidence_submitted, supervisor_acknowledged, is_emergency, is_blocked, created_at, updated_at)
    VALUES 
      (v_agency_id, v_resident_ids[i], 'Morning Medication', 'NURSING', 'high',
       v_today + interval '8 hours', v_today + interval '8 hours 15 minutes', 15, 'due',
       v_category_nursing, v_template_morning_med, 'CAREGIVER', true, false, false, false, false, now(), now()),
      (v_agency_id, v_resident_ids[i], 'Vital Signs', 'NURSING', 'medium',
       v_today + interval '9 hours', v_today + interval '9 hours 10 minutes', 10, 'due',
       v_category_nursing, v_template_vitals, 'CAREGIVER', true, false, false, false, false, now(), now()),
      (v_agency_id, v_resident_ids[i], 'Breakfast', 'KITCHEN', 'high',
       v_today + interval '7 hours 30 minutes', v_today + interval '7 hours 40 minutes', 10, 'completed',
       v_category_kitchen, v_template_breakfast, 'CAREGIVER', false, false, true, false, false, now(), now()),
      (v_agency_id, v_resident_ids[i], 'Room Cleaning', 'HOUSEKEEPING', 'medium',
       v_today + interval '10 hours', v_today + interval '10 hours 30 minutes', 30, 'scheduled',
       v_category_housekeeping, v_template_room_clean, 'CAREGIVER', false, false, false, false, false, now(), now());
  END LOOP;
  
  UPDATE tasks SET actual_start = scheduled_start - interval '2 minutes', actual_end = scheduled_end - interval '2 minutes', outcome = 'success'
  WHERE agency_id = v_agency_id AND state = 'completed';
  
  -- 6. Intelligence Signals
  INSERT INTO intelligence_signals (signal_id, resident_id, agency_id, category, title, description, reasoning, severity,
                                    detected_at, requires_human_action, suggested_actions, data_source, dismissed, created_at)
  VALUES
    ('sig-001', v_resident_ids[1], v_agency_id, 'PREDICTIVE', 'Medication Timing Pattern',
     'Consistent delays detected', 'Pattern analysis complete', 'MEDIUM', now() - interval '2 hours', true,
     ARRAY['Review schedule'], ARRAY['task_log'], false, now()),
    ('sig-002', v_resident_ids[1], v_agency_id, 'REACTIVE', 'Meal Intake Decline',
     'Intake decreased', 'Trend detected', 'HIGH', now() - interval '1 hour', true,
     ARRAY['Consult dietitian'], ARRAY['meal_log'], false, now());
  
  RETURN jsonb_build_object(
    'success', true,
    'agency_id', v_agency_id,
    'residents', 2,
    'tasks', (SELECT COUNT(*) FROM tasks WHERE agency_id = v_agency_id),
    'categories', (SELECT COUNT(*) FROM task_categories WHERE agency_id = v_agency_id),
    'signals', (SELECT COUNT(*) FROM intelligence_signals WHERE resident_id = ANY(v_resident_ids))
  );
END;
$$;
