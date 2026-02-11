/*
  # Fix Intelligence Signals Schema Match
  
  Updates seed to match actual intelligence_signals table schema
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
  v_category_hygiene uuid;
  v_template_morning_med uuid;
  v_template_vitals uuid;
  v_template_room_clean uuid;
  v_template_breakfast uuid;
  v_today date;
  i integer;
BEGIN
  v_today := CURRENT_DATE;
  
  v_agency_id := md5('showcase-agency-001')::uuid;
  v_resident_ids := ARRAY[
    md5('showcase-resident-a')::uuid,
    md5('showcase-resident-b')::uuid
  ];
  
  -- 1. Create Agency
  INSERT INTO agencies (id, name, status, operating_mode, metadata, created_at, updated_at)
  VALUES (v_agency_id, 'Demo Care Agency', 'active', 'AGENCY',
    '{"demo": true, "total_staff": 8, "total_residents": 2, "active_shifts": 3}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;
  
  -- 2. Create Residents
  INSERT INTO residents (id, agency_id, full_name, date_of_birth, status, metadata, created_at, updated_at)
  VALUES
    (v_resident_ids[1], v_agency_id, 'Pat Anderson', '1948-03-15', 'active',
     '{"floor": 1, "unit": "East Wing", "room": "102", "care_level": "high"}'::jsonb, now(), now()),
    (v_resident_ids[2], v_agency_id, 'Jordan Martinez', '1942-07-22', 'active',
     '{"floor": 2, "unit": "West Wing", "room": "205", "care_level": "medium"}'::jsonb, now(), now())
  ON CONFLICT (id) DO NOTHING;
  
  -- 3. Create Task Categories
  INSERT INTO task_categories (agency_id, name, category_type, description, default_priority, requires_evidence, allows_skip, is_active, created_at, updated_at)
  VALUES
    (v_agency_id, 'NURSING', 'clinical', 'Clinical nursing tasks', 'high', true, false, true, now(), now()),
    (v_agency_id, 'HOUSEKEEPING', 'housekeeping', 'Room and facility cleaning', 'medium', false, true, true, now(), now()),
    (v_agency_id, 'KITCHEN', 'cooking', 'Meal preparation and delivery', 'high', false, false, true, now(), now()),
    (v_agency_id, 'HYGIENE', 'hygiene', 'Personal hygiene assistance', 'high', true, false, true, now(), now()),
    (v_agency_id, 'MOBILITY', 'clinical', 'Movement and physical therapy', 'medium', true, false, true, now(), now()),
    (v_agency_id, 'NUTRITION', 'nutrition', 'Dietary monitoring', 'medium', true, true, true, now(), now()),
    (v_agency_id, 'MONITORING', 'monitoring', 'Safety and wellness monitoring', 'high', true, false, true, now(), now())
  ON CONFLICT (agency_id, name) DO NOTHING;
  
  SELECT id INTO v_category_nursing FROM task_categories WHERE agency_id = v_agency_id AND name = 'NURSING' LIMIT 1;
  SELECT id INTO v_category_housekeeping FROM task_categories WHERE agency_id = v_agency_id AND name = 'HOUSEKEEPING' LIMIT 1;
  SELECT id INTO v_category_kitchen FROM task_categories WHERE agency_id = v_agency_id AND name = 'KITCHEN' LIMIT 1;
  SELECT id INTO v_category_hygiene FROM task_categories WHERE agency_id = v_agency_id AND name = 'HYGIENE' LIMIT 1;
  
  -- 4. Create Task Templates
  INSERT INTO task_templates (agency_id, category_id, template_name, description, default_duration_minutes, default_priority, is_active, created_at)
  VALUES
    (v_agency_id, v_category_nursing, 'Morning Medication', 'Administer morning medications', 15, 'high', true, now()),
    (v_agency_id, v_category_nursing, 'Vital Signs Check', 'Monitor and record vital signs', 10, 'medium', true, now()),
    (v_agency_id, v_category_housekeeping, 'Room Cleaning', 'Complete room cleaning and sanitization', 30, 'medium', true, now()),
    (v_agency_id, v_category_kitchen, 'Breakfast Delivery', 'Deliver and serve breakfast', 10, 'high', true, now()),
    (v_agency_id, v_category_hygiene, 'Morning Hygiene', 'Assist with morning personal care', 25, 'high', true, now())
  ON CONFLICT (agency_id, template_name) DO NOTHING;
  
  SELECT id INTO v_template_morning_med FROM task_templates WHERE agency_id = v_agency_id AND template_name = 'Morning Medication' LIMIT 1;
  SELECT id INTO v_template_vitals FROM task_templates WHERE agency_id = v_agency_id AND template_name = 'Vital Signs Check' LIMIT 1;
  SELECT id INTO v_template_room_clean FROM task_templates WHERE agency_id = v_agency_id AND template_name = 'Room Cleaning' LIMIT 1;
  SELECT id INTO v_template_breakfast FROM task_templates WHERE agency_id = v_agency_id AND template_name = 'Breakfast Delivery' LIMIT 1;
  
  -- 5. Create Today's Tasks
  FOR i IN 1..2 LOOP
    INSERT INTO tasks (agency_id, resident_id, task_name, department, priority, scheduled_start, scheduled_end, 
                       duration_minutes, state, category_id, template_id, responsibility_role, requires_evidence, 
                       evidence_submitted, supervisor_acknowledged, is_emergency, is_blocked, created_at, updated_at)
    VALUES 
      (v_agency_id, v_resident_ids[i], 'Morning Medication', 'NURSING', 'high',
       v_today + interval '8 hours', v_today + interval '8 hours 15 minutes', 15, 'due',
       v_category_nursing, v_template_morning_med, 'CAREGIVER', true, false, false, false, false, now(), now()),
      (v_agency_id, v_resident_ids[i], 'Vital Signs Check', 'NURSING', 'medium',
       v_today + interval '9 hours', v_today + interval '9 hours 10 minutes', 10, 'due',
       v_category_nursing, v_template_vitals, 'CAREGIVER', true, false, false, false, false, now(), now()),
      (v_agency_id, v_resident_ids[i], 'Breakfast Delivery', 'KITCHEN', 'high',
       v_today + interval '7 hours 30 minutes', v_today + interval '7 hours 40 minutes', 10, 'completed',
       v_category_kitchen, v_template_breakfast, 'CAREGIVER', false, false, true, false, false, now(), now()),
      (v_agency_id, v_resident_ids[i], 'Room Cleaning', 'HOUSEKEEPING', 'medium',
       v_today + interval '10 hours', v_today + interval '10 hours 30 minutes', 30, 'scheduled',
       v_category_housekeeping, v_template_room_clean, 'CAREGIVER', false, false, false, false, false, now(), now()),
      (v_agency_id, v_resident_ids[i], 'Lunch Delivery', 'KITCHEN', 'high',
       v_today + interval '12 hours', v_today + interval '12 hours 10 minutes', 10, 'scheduled',
       v_category_kitchen, v_template_breakfast, 'CAREGIVER', false, false, false, false, false, now(), now()),
      (v_agency_id, v_resident_ids[i], 'Evening Medication', 'NURSING', 'high',
       v_today + interval '18 hours', v_today + interval '18 hours 15 minutes', 15, 'scheduled',
       v_category_nursing, v_template_morning_med, 'CAREGIVER', true, false, false, false, false, now(), now());
  END LOOP;
  
  UPDATE tasks SET actual_start = scheduled_start - interval '2 minutes', actual_end = scheduled_end - interval '2 minutes', outcome = 'success'
  WHERE agency_id = v_agency_id AND state = 'completed';
  
  -- 6. Create Intelligence Signals (match actual schema)
  INSERT INTO intelligence_signals (signal_id, resident_id, agency_id, category, title, description, reasoning, severity,
                                    detected_at, requires_human_action, suggested_actions, data_source, dismissed, created_at)
  VALUES
    ('sig-med-timing-001', v_resident_ids[1], v_agency_id, 'anomaly', 'Unusual Medication Timing',
     'System detected consistent 15-minute delays in morning medication administration over the past week.',
     'Pattern analysis shows medication scheduled for 08:00 consistently delivered at 08:15. Occurs 3 times this week, suggesting systematic scheduling conflict.',
     'medium', now() - interval '2 hours', true,
     ARRAY['Review caregiver morning schedule', 'Consider adjusting medication time window', 'Investigate concurrent task conflicts'],
     ARRAY['task_completion_log', 'schedule_analysis'], false, now()),
    ('sig-nutrition-001', v_resident_ids[1], v_agency_id, 'trend', 'Declining Meal Intake',
     'Resident meal intake has decreased from 90% to 65% average over past 7 days.',
     'Downward trend in meal consumption detected across all meal types. May indicate appetite changes, food preferences, or underlying health concerns requiring investigation.',
     'high', now() - interval '1 hour', true,
     ARRAY['Consult with dietitian', 'Review meal preferences with resident', 'Consider nutritional supplements', 'Monitor weight trends'],
     ARRAY['meal_intake_log', 'nutrition_tracker'], false, now()),
    ('sig-mobility-002', v_resident_ids[2], v_agency_id, 'positive', 'Improved Mobility',
     'Physical therapy showing measurable results with 18% improvement in mobility score.',
     'Mobility assessment score improved from 7.2 to 8.5 over 2-week period. Resident demonstrating increased range of motion and stability during assisted activities.',
     'low', now() - interval '30 minutes', false,
     ARRAY['Continue current PT regimen', 'Consider graduated increase in activity level', 'Update care plan to reflect mobility improvements'],
     ARRAY['physical_therapy_log', 'mobility_assessment'], false, now());
  
  -- 7. Create Vital Signs
  INSERT INTO vital_signs (resident_id, recorded_at, systolic_bp, diastolic_bp, heart_rate, respiratory_rate,
                           temperature_f, oxygen_saturation, blood_glucose, notes, created_at)
  VALUES
    (v_resident_ids[1], now() - interval '3 hours', 128, 82, 72, 16, 98.4, 97, null,
     'All vitals within normal range. Resident alert and responsive.', now()),
    (v_resident_ids[1], now() - interval '1 day 3 hours', 132, 84, 75, 16, 98.2, 96, null,
     'Stable readings. No concerns.', now()),
    (v_resident_ids[2], now() - interval '3 hours', 118, 76, 68, 14, 98.6, 98, 105,
     'Excellent vitals. Blood glucose slightly elevated but within acceptable range.', now());
  
  -- 8. Create Brain States
  INSERT INTO brain_state (resident_id, current_state, previous_state, state_reason, confidence_score, risk_level,
                           active_alerts, blocked_actions, required_acknowledgments, last_assessment_time,
                           metadata, version, created_at, updated_at)
  VALUES
    (v_resident_ids[1], 'monitoring_required', 'stable',
     'Multiple intelligence signals detected requiring attention', 0.82, 'B', 2, '[]'::jsonb, '[]'::jsonb,
     now(), '{"assessment_trigger": "intelligence_signals", "signal_count": 2}'::jsonb, 1, now(), now()),
    (v_resident_ids[2], 'stable', 'stable',
     'All indicators normal, positive trends observed', 0.95, 'A', 0, '[]'::jsonb, '[]'::jsonb,
     now(), '{"assessment_trigger": "routine", "positive_signals": 1}'::jsonb, 1, now(), now());
  
  RETURN jsonb_build_object(
    'success', true, 'message', 'Comprehensive showcase data seeded successfully',
    'agency_id', v_agency_id, 'resident_count', 2,
    'task_count', (SELECT COUNT(*) FROM tasks WHERE agency_id = v_agency_id),
    'category_count', (SELECT COUNT(*) FROM task_categories WHERE agency_id = v_agency_id),
    'template_count', (SELECT COUNT(*) FROM task_templates WHERE agency_id = v_agency_id),
    'signal_count', (SELECT COUNT(*) FROM intelligence_signals WHERE resident_id = ANY(v_resident_ids)),
    'vital_count', (SELECT COUNT(*) FROM vital_signs WHERE resident_id = ANY(v_resident_ids)),
    'brain_state_count', (SELECT COUNT(*) FROM brain_state WHERE resident_id = ANY(v_resident_ids))
  );
END;
$$;
