/*
  # Fix Seed Function Schema Alignment
  
  Surgical fix: Update seed_active_context to match actual table schemas
*/

CREATE OR REPLACE FUNCTION seed_active_context(p_care_context_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_context RECORD; v_resident RECORD; v_agency_id uuid; v_senior_user_id uuid; v_family_user_id uuid;
  v_caregiver_user_id uuid; v_supervisor_user_id uuid; v_admin_user_id uuid; v_dept_nursing_id uuid;
  v_task_cat_med_id uuid; v_task_cat_meal_id uuid; v_task_cat_hygiene_id uuid; i INTEGER;
BEGIN
  SELECT * INTO v_context FROM care_contexts WHERE id = p_care_context_id; IF NOT FOUND THEN RAISE EXCEPTION 'Care context not found'; END IF;
  SELECT * INTO v_resident FROM residents WHERE id = v_context.resident_id; IF NOT FOUND THEN RAISE EXCEPTION 'Resident not found'; END IF;
  v_agency_id := COALESCE(v_context.agency_id, v_resident.agency_id);

  IF v_context.management_mode IN ('SELF', 'FAMILY_MANAGED') THEN
    INSERT INTO user_profiles (id, role_id, display_name, is_active, agency_id) SELECT gen_random_uuid(), r.id, v_resident.full_name, true, v_agency_id FROM roles r WHERE r.name = 'SENIOR' ON CONFLICT DO NOTHING RETURNING id INTO v_senior_user_id;
    IF v_senior_user_id IS NULL THEN SELECT up.id INTO v_senior_user_id FROM user_profiles up JOIN roles r ON up.role_id = r.id WHERE r.name = 'SENIOR' AND up.agency_id = v_agency_id LIMIT 1; END IF;
    INSERT INTO senior_resident_links (senior_user_id, resident_id, status) VALUES (v_senior_user_id, v_resident.id, 'active') ON CONFLICT DO NOTHING;
  END IF;

  IF v_context.management_mode = 'FAMILY_MANAGED' THEN
    INSERT INTO user_profiles (id, role_id, display_name, is_active, agency_id) SELECT gen_random_uuid(), r.id, 'Family Admin', true, v_agency_id FROM roles r WHERE r.name = 'FAMILY_ADMIN' ON CONFLICT DO NOTHING RETURNING id INTO v_family_user_id;
    IF v_family_user_id IS NULL THEN SELECT up.id INTO v_family_user_id FROM user_profiles up JOIN roles r ON up.role_id = r.id WHERE r.name = 'FAMILY_ADMIN' AND up.agency_id = v_agency_id LIMIT 1; END IF;
    INSERT INTO family_resident_links (family_user_id, resident_id, status) VALUES (v_family_user_id, v_resident.id, 'active') ON CONFLICT DO NOTHING;
    INSERT INTO family_notification_preferences (family_user_id, notify_medication_due, notify_vitals_abnormal, notify_appointment_reminder, notification_method) VALUES (v_family_user_id, true, true, true, 'EMAIL') ON CONFLICT (family_user_id) DO NOTHING;
  END IF;

  IF v_context.service_model IN ('DIRECT_HIRE', 'AGENCY_HOME_CARE', 'AGENCY_FACILITY') THEN
    INSERT INTO user_profiles (id, role_id, display_name, is_active, agency_id, employee_id) SELECT gen_random_uuid(), r.id, 'Jordan Lee', true, v_agency_id, 'EMP001' FROM roles r WHERE r.name = 'CAREGIVER' ON CONFLICT DO NOTHING RETURNING id INTO v_caregiver_user_id;
    IF v_caregiver_user_id IS NULL THEN SELECT up.id INTO v_caregiver_user_id FROM user_profiles up JOIN roles r ON up.role_id = r.id WHERE r.name = 'CAREGIVER' AND up.agency_id = v_agency_id LIMIT 1; END IF;
    INSERT INTO caregiver_assignments (caregiver_user_id, resident_id, assignment_type, start_date, is_active) VALUES (v_caregiver_user_id, v_resident.id, 'PRIMARY', CURRENT_DATE, true) ON CONFLICT DO NOTHING;
  END IF;

  IF v_context.supervision_enabled OR v_context.service_model IN ('AGENCY_HOME_CARE', 'AGENCY_FACILITY') THEN
    INSERT INTO user_profiles (id, role_id, display_name, is_active, agency_id, employee_id) SELECT gen_random_uuid(), r.id, 'Maria Garcia', true, v_agency_id, 'SUP001' FROM roles r WHERE r.name = 'SUPERVISOR' ON CONFLICT DO NOTHING RETURNING id INTO v_supervisor_user_id;
    IF v_supervisor_user_id IS NULL THEN SELECT up.id INTO v_supervisor_user_id FROM user_profiles up JOIN roles r ON up.role_id = r.id WHERE r.name = 'SUPERVISOR' AND up.agency_id = v_agency_id LIMIT 1; END IF;
  END IF;

  IF v_context.management_mode = 'AGENCY_MANAGED' THEN
    INSERT INTO user_profiles (id, role_id, display_name, is_active, agency_id, employee_id) SELECT gen_random_uuid(), r.id, 'Sarah Chen', true, v_agency_id, 'ADM001' FROM roles r WHERE r.name = 'AGENCY_ADMIN' ON CONFLICT DO NOTHING RETURNING id INTO v_admin_user_id;
    IF v_admin_user_id IS NULL THEN SELECT up.id INTO v_admin_user_id FROM user_profiles up JOIN roles r ON up.role_id = r.id WHERE r.name = 'AGENCY_ADMIN' AND up.agency_id = v_agency_id LIMIT 1; END IF;
  END IF;

  IF v_context.care_setting = 'FACILITY' OR v_context.service_model = 'AGENCY_FACILITY' THEN
    INSERT INTO departments (id, agency_id, name, department_type, is_active) VALUES (gen_random_uuid(), v_agency_id, 'Nursing', 'NURSING', true), (gen_random_uuid(), v_agency_id, 'Kitchen', 'KITCHEN', true), (gen_random_uuid(), v_agency_id, 'Housekeeping', 'HOUSEKEEPING', true) ON CONFLICT DO NOTHING;
    SELECT id INTO v_dept_nursing_id FROM departments WHERE agency_id = v_agency_id AND department_type = 'NURSING' LIMIT 1;
    IF v_supervisor_user_id IS NOT NULL AND v_dept_nursing_id IS NOT NULL THEN INSERT INTO department_personnel (department_id, user_id, role_in_department, is_active) VALUES (v_dept_nursing_id, v_supervisor_user_id, 'SUPERVISOR', true) ON CONFLICT DO NOTHING; END IF;
  END IF;

  INSERT INTO task_categories (id, name, category_type, requires_evidence) VALUES (gen_random_uuid(), 'Medication Administration', 'clinical', true), (gen_random_uuid(), 'Meal Service', 'nutrition', true), (gen_random_uuid(), 'Personal Hygiene', 'hygiene', true) ON CONFLICT DO NOTHING;
  SELECT id INTO v_task_cat_med_id FROM task_categories WHERE category_type = 'clinical' LIMIT 1;
  SELECT id INTO v_task_cat_meal_id FROM task_categories WHERE category_type = 'nutrition' LIMIT 1;
  SELECT id INTO v_task_cat_hygiene_id FROM task_categories WHERE category_type = 'hygiene' LIMIT 1;

  IF v_context.service_model IN ('DIRECT_HIRE', 'AGENCY_HOME_CARE', 'AGENCY_FACILITY') THEN
    FOR i IN 1..10 LOOP
      INSERT INTO tasks (resident_id, category_id, title, description, priority, state, scheduled_for, assigned_to, department_id, risk_level)
      VALUES (v_resident.id, CASE WHEN i <= 4 THEN v_task_cat_med_id WHEN i <= 7 THEN v_task_cat_meal_id ELSE v_task_cat_hygiene_id END, CASE WHEN i <= 4 THEN 'Administer Medication' WHEN i <= 7 THEN 'Serve Meal' ELSE 'Assist with Hygiene' END, 'Routine care', CASE WHEN i <= 3 THEN 'high' WHEN i <= 7 THEN 'medium' ELSE 'low' END, CASE WHEN i <= 3 THEN 'pending' WHEN i <= 5 THEN 'in_progress' ELSE 'completed' END, now() + (i || ' hours')::interval, v_caregiver_user_id, v_dept_nursing_id, CASE WHEN i <= 3 THEN 'medium' ELSE 'low' END) ON CONFLICT DO NOTHING;
    END LOOP;
  END IF;

  INSERT INTO resident_medications (resident_id, medication_name, dosage, frequency, route, prescriber_name, is_active, start_date) VALUES (v_resident.id, 'Lisinopril', '10 mg', 'Once daily', 'ORAL', 'Dr. Sarah Johnson', true, CURRENT_DATE), (v_resident.id, 'Metformin', '500 mg', 'Twice daily', 'ORAL', 'Dr. Sarah Johnson', true, CURRENT_DATE) ON CONFLICT DO NOTHING;
  FOR i IN 0..4 LOOP
    INSERT INTO vital_signs (resident_id, vital_type, value, recorded_at, recorded_by, systolic, diastolic) VALUES (v_resident.id, 'BLOOD_PRESSURE', (120 + i*2) || '/' || (80 + i), now() - (i || ' days')::interval, v_caregiver_user_id, 120 + i*2, 80 + i), (v_resident.id, 'HEART_RATE', (72 + i)::text, now() - (i || ' days')::interval, v_caregiver_user_id, null, null) ON CONFLICT DO NOTHING;
    INSERT INTO health_metrics (resident_id, metric_category, metric_type, value_numeric, unit, recorded_at, measurement_source, data_source) VALUES (v_resident.id, 'VITAL', 'blood_pressure_systolic', 120 + i*2, 'mmHg', now() - (i || ' days')::interval, 'MANUAL', 'MANUAL'), (v_resident.id, 'VITAL', 'heart_rate', 72 + i, 'bpm', now() - (i || ' days')::interval, 'MANUAL', 'MANUAL') ON CONFLICT DO NOTHING;
  END LOOP;
  INSERT INTO health_metric_trends (resident_id, metric_type, trend_direction, change_rate, confidence_level, computed_at) VALUES (v_resident.id, 'blood_pressure_systolic', 'STABLE', 0.5, 0.85, now()), (v_resident.id, 'heart_rate', 'INCREASING', 1.2, 0.90, now()) ON CONFLICT DO NOTHING;
  INSERT INTO appointments (resident_id, appointment_type, title, scheduled_at, duration_minutes, status, provider_name, location) VALUES (v_resident.id, 'DOCTOR_VISIT', 'Annual Physical', now() + interval '7 days', 60, 'SCHEDULED', 'Dr. Sarah Johnson', 'Main Clinic'), (v_resident.id, 'LAB_TEST', 'Blood Work', now() + interval '14 days', 30, 'SCHEDULED', 'LabCorp', 'Lab Center') ON CONFLICT DO NOTHING;
  INSERT INTO resident_documents (resident_id, title, storage_path, uploaded_by) VALUES (v_resident.id, 'Care Plan', '/documents/care-plan.pdf', v_admin_user_id), (v_resident.id, 'Medical History', '/documents/medical-history.pdf', v_admin_user_id) ON CONFLICT DO NOTHING;
  INSERT INTO resident_care_plan_anchors (resident_id, plan_status, primary_diagnosis, care_goals) VALUES (v_resident.id, 'ACTIVE', 'Hypertension, Type 2 Diabetes', 'Maintain stable vitals') ON CONFLICT DO NOTHING;
  INSERT INTO device_registry (resident_id, device_type, device_name, manufacturer, model, paired_at, is_active) VALUES (v_resident.id, 'BLOOD_PRESSURE_MONITOR', 'BP Monitor', 'Omron', 'BP7000', now(), true) ON CONFLICT DO NOTHING;
  FOR i IN 1..5 LOOP INSERT INTO observation_events (resident_id, event_type, event_data, quality_score, captured_at, captured_by) VALUES (v_resident.id, 'TASK_COMPLETION', jsonb_build_object('task_type', 'medication', 'completed', true), 80 + i, now() - (i || ' hours')::interval, v_caregiver_user_id) ON CONFLICT DO NOTHING; END LOOP;
  INSERT INTO intelligence_signals (resident_id, signal_type, signal_category, severity, title, description, detected_at) VALUES (v_resident.id, 'PATTERN', 'MEDICATION_ADHERENCE', 'INFO', 'High Medication Adherence', 'Patient consistently taking medications on time', now()), (v_resident.id, 'ANOMALY', 'VITAL_TREND', 'MEDIUM', 'Blood Pressure Trending Up', 'Systolic BP increased over 5 days', now()) ON CONFLICT DO NOTHING;
  INSERT INTO risk_scores (resident_id, risk_category, risk_level, risk_score, computed_at) VALUES (v_resident.id, 'FALL_RISK', 'MEDIUM', 45, now()) ON CONFLICT DO NOTHING;
  IF v_senior_user_id IS NOT NULL THEN FOR i IN 1..3 LOOP INSERT INTO notification_log (user_id, resident_id, notification_type, title, message, sent_at) VALUES (v_senior_user_id, v_resident.id, 'MEDICATION_REMINDER', 'Medication Due', 'Time to take Lisinopril', now() - (i || ' hours')::interval) ON CONFLICT DO NOTHING; END LOOP; INSERT INTO senior_accessibility_settings (senior_user_id, font_size, high_contrast, screen_reader_enabled) VALUES (v_senior_user_id, 'MEDIUM', false, false) ON CONFLICT DO NOTHING; END IF;
  IF v_family_user_id IS NOT NULL THEN FOR i IN 1..3 LOOP INSERT INTO notification_log (user_id, resident_id, notification_type, title, message, sent_at) VALUES (v_family_user_id, v_resident.id, 'HEALTH_UPDATE', 'Health Status Update', 'Blood pressure recorded', now() - (i || ' hours')::interval) ON CONFLICT DO NOTHING; END LOOP; END IF;
  IF v_agency_id IS NOT NULL THEN INSERT INTO agency_notification_policy (agency_id, notify_on_exception, notify_on_escalation, notification_channels) VALUES (v_agency_id, true, true, ARRAY['EMAIL', 'SMS']) ON CONFLICT (agency_id) DO NOTHING; END IF;
  RETURN jsonb_build_object('status', 'SUCCESS', 'care_context_id', p_care_context_id, 'resident_id', v_resident.id);
END; $$;
GRANT EXECUTE ON FUNCTION seed_active_context(uuid) TO authenticated, anon;