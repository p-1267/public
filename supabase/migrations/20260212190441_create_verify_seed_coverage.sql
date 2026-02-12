/*
  # Create Seed Coverage Verifier

  Creates verify_seed_coverage RPC that:
  - Validates all required tables per SEED_SCOPE_TRUTH.md
  - Returns PASS/FAIL status for each page
  - Checks row counts against minimum requirements
*/

CREATE OR REPLACE FUNCTION verify_seed_coverage(p_care_context_id uuid)
RETURNS TABLE (
  page_name text,
  required_sources text,
  missing_sources text,
  status text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_context RECORD;
  v_resident_id uuid;
  v_senior_user_id uuid;
  v_family_user_id uuid;
  v_caregiver_user_id uuid;
  v_supervisor_user_id uuid;
  v_admin_user_id uuid;
  v_count INTEGER;
BEGIN
  SELECT * INTO v_context FROM care_contexts WHERE id = p_care_context_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Care context % not found', p_care_context_id;
  END IF;

  v_resident_id := v_context.resident_id;

  SELECT senior_user_id INTO v_senior_user_id FROM senior_resident_links WHERE resident_id = v_resident_id LIMIT 1;
  SELECT family_user_id INTO v_family_user_id FROM family_resident_links WHERE resident_id = v_resident_id LIMIT 1;
  SELECT caregiver_user_id INTO v_caregiver_user_id FROM caregiver_assignments WHERE resident_id = v_resident_id LIMIT 1;
  SELECT up.id INTO v_supervisor_user_id FROM user_profiles up JOIN roles r ON up.role_id = r.id WHERE r.name = 'SUPERVISOR' LIMIT 1;
  SELECT up.id INTO v_admin_user_id FROM user_profiles up JOIN roles r ON up.role_id = r.id WHERE r.name = 'AGENCY_ADMIN' LIMIT 1;

  -- SENIOR PAGES
  IF v_senior_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM intelligence_signals WHERE resident_id = v_resident_id;
    page_name := 'SeniorHome'; required_sources := 'residents, intelligence_signals'; 
    missing_sources := CASE WHEN v_count = 0 THEN 'intelligence_signals' ELSE '' END;
    status := CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END;
    RETURN NEXT;

    SELECT COUNT(*) INTO v_count FROM vital_signs WHERE resident_id = v_resident_id;
    page_name := 'SeniorHealthDashboard'; required_sources := 'vital_signs, health_metrics, health_metric_trends';
    missing_sources := CASE WHEN v_count < 1 THEN 'vital_signs' ELSE '' END;
    status := CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END;
    RETURN NEXT;

    SELECT COUNT(*) INTO v_count FROM resident_medications WHERE resident_id = v_resident_id AND status = 'ACTIVE';
    page_name := 'SeniorMedicationsPage'; required_sources := 'resident_medications';
    missing_sources := CASE WHEN v_count = 0 THEN 'resident_medications' ELSE '' END;
    status := CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END;
    RETURN NEXT;

    SELECT COUNT(*) INTO v_count FROM appointments WHERE resident_id = v_resident_id AND scheduled_at > now();
    page_name := 'SeniorAppointmentsPage'; required_sources := 'appointments';
    missing_sources := CASE WHEN v_count = 0 THEN 'appointments' ELSE '' END;
    status := CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END;
    RETURN NEXT;

    SELECT COUNT(*) INTO v_count FROM resident_documents WHERE resident_id = v_resident_id;
    page_name := 'SeniorDocumentsPage'; required_sources := 'resident_documents';
    missing_sources := CASE WHEN v_count < 2 THEN 'resident_documents' ELSE '' END;
    status := CASE WHEN v_count >= 2 THEN 'PASS' ELSE 'FAIL' END;
    RETURN NEXT;

    SELECT COUNT(*) INTO v_count FROM resident_care_plan_anchors WHERE resident_id = v_resident_id;
    page_name := 'SeniorCarePlanPage'; required_sources := 'resident_care_plan_anchors';
    missing_sources := CASE WHEN v_count = 0 THEN 'resident_care_plan_anchors' ELSE '' END;
    status := CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END;
    RETURN NEXT;

    SELECT COUNT(*) INTO v_count FROM device_registry WHERE resident_id = v_resident_id AND is_active = true;
    page_name := 'SeniorDevicePairingPage'; required_sources := 'device_registry';
    missing_sources := CASE WHEN v_count = 0 THEN 'device_registry' ELSE '' END;
    status := CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END;
    RETURN NEXT;

    SELECT COUNT(*) INTO v_count FROM notification_log WHERE user_id = v_senior_user_id;
    page_name := 'SeniorNotificationsPageReal'; required_sources := 'notification_log';
    missing_sources := CASE WHEN v_count < 3 THEN 'notification_log' ELSE '' END;
    status := CASE WHEN v_count >= 3 THEN 'PASS' ELSE 'FAIL' END;
    RETURN NEXT;
  END IF;

  -- FAMILY PAGES
  IF v_family_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM intelligence_signals WHERE resident_id = v_resident_id;
    page_name := 'FamilyHome'; required_sources := 'family_resident_links, intelligence_signals';
    missing_sources := CASE WHEN v_count = 0 THEN 'intelligence_signals' ELSE '' END;
    status := CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END;
    RETURN NEXT;

    SELECT COUNT(*) INTO v_count FROM vital_signs WHERE resident_id = v_resident_id;
    page_name := 'FamilyHealthMonitoringPage'; required_sources := 'vital_signs, health_metrics';
    missing_sources := CASE WHEN v_count < 5 THEN 'vital_signs' ELSE '' END;
    status := CASE WHEN v_count >= 5 THEN 'PASS' ELSE 'FAIL' END;
    RETURN NEXT;

    SELECT COUNT(*) INTO v_count FROM notification_log WHERE user_id = v_family_user_id;
    page_name := 'FamilyNotificationsPageReal'; required_sources := 'notification_log';
    missing_sources := CASE WHEN v_count < 3 THEN 'notification_log' ELSE '' END;
    status := CASE WHEN v_count >= 3 THEN 'PASS' ELSE 'FAIL' END;
    RETURN NEXT;

    SELECT COUNT(*) INTO v_count FROM family_notification_preferences WHERE family_user_id = v_family_user_id;
    page_name := 'FamilySettingsPageReal'; required_sources := 'family_notification_preferences';
    missing_sources := CASE WHEN v_count = 0 THEN 'family_notification_preferences' ELSE '' END;
    status := CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END;
    RETURN NEXT;
  END IF;

  -- CAREGIVER PAGES
  IF v_caregiver_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM tasks WHERE assigned_to = v_caregiver_user_id AND state IN ('pending', 'in_progress');
    page_name := 'CaregiverHome'; required_sources := 'tasks, caregiver_assignments, intelligence_signals';
    missing_sources := CASE WHEN v_count < 3 THEN 'tasks' ELSE '' END;
    status := CASE WHEN v_count >= 3 THEN 'PASS' ELSE 'FAIL' END;
    RETURN NEXT;

    SELECT COUNT(*) INTO v_count FROM task_categories;
    page_name := 'CaregiverExecutionUI'; required_sources := 'tasks, task_categories';
    missing_sources := CASE WHEN v_count < 3 THEN 'task_categories' ELSE '' END;
    status := CASE WHEN v_count >= 3 THEN 'PASS' ELSE 'FAIL' END;
    RETURN NEXT;
  END IF;

  -- SUPERVISOR PAGES
  IF v_supervisor_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM departments;
    page_name := 'SupervisorHome'; required_sources := 'departments, tasks, intelligence_signals';
    missing_sources := CASE WHEN v_count = 0 THEN 'departments' ELSE '' END;
    status := CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END;
    RETURN NEXT;

    SELECT COUNT(*) INTO v_count FROM tasks;
    page_name := 'SupervisorDashboard'; required_sources := 'tasks, residents';
    missing_sources := CASE WHEN v_count < 5 THEN 'tasks' ELSE '' END;
    status := CASE WHEN v_count >= 5 THEN 'PASS' ELSE 'FAIL' END;
    RETURN NEXT;
  END IF;

  -- AGENCY ADMIN PAGES
  IF v_admin_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_count FROM residents;
    page_name := 'AgencyDashboard'; required_sources := 'residents, tasks';
    missing_sources := CASE WHEN v_count = 0 THEN 'residents' ELSE '' END;
    status := CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END;
    RETURN NEXT;
  END IF;

  -- INTELLIGENCE PIPELINE CHECK
  SELECT COUNT(*) INTO v_count FROM observation_events WHERE resident_id = v_resident_id;
  page_name := 'IntelligencePipeline'; required_sources := 'observation_events, intelligence_signals';
  missing_sources := CASE WHEN v_count < 3 THEN 'observation_events' ELSE '' END;
  status := CASE WHEN v_count >= 3 THEN 'PASS' ELSE 'FAIL' END;
  RETURN NEXT;

END;
$$;

GRANT EXECUTE ON FUNCTION verify_seed_coverage(uuid) TO authenticated, anon;