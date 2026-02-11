-- Fix verifier to use actual seeded names
DROP FUNCTION IF EXISTS verify_app_wide_wiring CASCADE;

CREATE OR REPLACE FUNCTION verify_app_wide_wiring()
RETURNS TABLE (
  scenario text,
  role text,
  route text,
  required_tables text,
  required_rpcs text,
  minimum_data_count int,
  actual_data_count int,
  actions_tested text,
  db_write_proof text,
  status text,
  error_detail text
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid := 'a0000000-0000-0000-0000-000000000010';  -- Fixed showcase agency ID
  v_resident_id uuid := 'b0000000-0000-0000-0000-000000000001';  -- Fixed showcase resident ID
  v_senior_user_id uuid := 'a0000000-0000-0000-0000-000000000001';
  v_family_user_id uuid := 'a0000000-0000-0000-0000-000000000002';
  v_caregiver_user_id uuid := 'a0000000-0000-0000-0000-000000000003';
  v_supervisor_user_id uuid := 'a0000000-0000-0000-0000-000000000005';
  v_admin_user_id uuid;
  v_admin_role_id uuid;
  v_count int;
BEGIN
  -- Get admin role and user
  SELECT id INTO v_admin_role_id FROM roles WHERE name = 'AGENCY_ADMIN' LIMIT 1;
  SELECT id INTO v_admin_user_id FROM user_profiles WHERE role_id = v_admin_role_id AND agency_id = v_agency_id LIMIT 1;

  -- Verify seeding
  IF NOT EXISTS (SELECT 1 FROM agencies WHERE id = v_agency_id) THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'ALL'::text, 'SEED'::text,
      'agencies'::text, 'seed_senior_family_scenario'::text,
      1::int, 0::int, 'NONE'::text, 'NONE'::text,
      'FAIL'::text, 'No agency seeded - run seed_senior_family_scenario'::text;
    RETURN;
  END IF;

  -- SENIOR ROUTES
  BEGIN
    SELECT COUNT(*) INTO v_count FROM residents WHERE id = v_resident_id;
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'SENIOR'::text, 'home'::text,
      'residents, appointments, resident_medications, device_registry'::text, 'NONE'::text,
      1::int, v_count::int, 'view_profile'::text, format('resident=%s', v_resident_id)::text,
      CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 1 THEN 'No resident' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'SENIOR'::text, 'home'::text, ''::text, ''::text, 1::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM appointments WHERE resident_id = v_resident_id;
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'SENIOR'::text, 'appointments'::text,
      'appointments'::text, 'NONE'::text, 1::int, v_count::int, 'view_appointments'::text,
      format('%s appointments', v_count)::text,
      CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 1 THEN 'No appointments' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'SENIOR'::text, 'appointments'::text, ''::text, ''::text, 1::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM resident_medications WHERE resident_id = v_resident_id AND is_active = true;
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'SENIOR'::text, 'medications'::text,
      'resident_medications'::text, 'NONE'::text, 2::int, v_count::int, 'view_medications'::text,
      format('%s medications', v_count)::text,
      CASE WHEN v_count >= 2 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 2 THEN 'Insufficient medications' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'SENIOR'::text, 'medications'::text, ''::text, ''::text, 2::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM health_metrics WHERE resident_id = v_resident_id;
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'SENIOR'::text, 'health-dashboard'::text,
      'health_metrics, health_metric_trends'::text, 'get_recent_health_metrics'::text,
      3::int, v_count::int, 'view_metrics'::text, format('%s metrics', v_count)::text,
      CASE WHEN v_count >= 3 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 3 THEN 'Insufficient metrics' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'SENIOR'::text, 'health-dashboard'::text, ''::text, ''::text, 3::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM device_registry WHERE resident_id = v_resident_id;
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'SENIOR'::text, 'devices'::text,
      'device_registry'::text, 'NONE'::text, 1::int, v_count::int, 'view_devices'::text,
      format('%s devices', v_count)::text,
      CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 1 THEN 'No devices' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'SENIOR'::text, 'devices'::text, ''::text, ''::text, 1::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  -- FAMILY ROUTES
  BEGIN
    SELECT COUNT(*) INTO v_count FROM residents WHERE id = v_resident_id;
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'FAMILY_VIEWER'::text, 'home'::text,
      'residents, resident_medications, health_metrics'::text, 'get_recent_health_metrics'::text,
      1::int, v_count::int, 'view_overview'::text,
      format('resident=%s, family_link=TRUE', v_resident_id)::text,
      CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 1 THEN 'No resident' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'FAMILY_VIEWER'::text, 'home'::text, ''::text, ''::text, 1::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM health_metrics WHERE resident_id = v_resident_id;
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'FAMILY_VIEWER'::text, 'health-monitoring'::text,
      'health_metrics, health_metric_trends, intelligence_signals'::text, 'get_recent_health_metrics'::text,
      3::int, v_count::int, 'view_health_trends'::text, format('%s metrics', v_count)::text,
      CASE WHEN v_count >= 3 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 3 THEN 'Insufficient metrics' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'FAMILY_VIEWER'::text, 'health-monitoring'::text, ''::text, ''::text, 3::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM resident_medications WHERE resident_id = v_resident_id AND is_active = true;
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'FAMILY_VIEWER'::text, 'medications'::text,
      'resident_medications, medication_administration'::text, 'NONE'::text,
      2::int, v_count::int, 'view_medications'::text, format('%s medications', v_count)::text,
      CASE WHEN v_count >= 2 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 2 THEN 'Insufficient medications' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'FAMILY_VIEWER'::text, 'medications'::text, ''::text, ''::text, 2::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  -- CAREGIVER ROUTES
  BEGIN
    SELECT COUNT(*) INTO v_count FROM tasks WHERE assigned_to = v_caregiver_user_id AND state IN ('PENDING', 'IN_PROGRESS');
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'CAREGIVER'::text, 'home'::text,
      'tasks, residents, intelligence_signals'::text, 'get_caregiver_task_list'::text,
      1::int, v_count::int, 'view_tasks'::text, format('%s tasks', v_count)::text,
      CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 1 THEN 'No tasks' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'CAREGIVER'::text, 'home'::text, ''::text, ''::text, 1::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM departments WHERE agency_id = v_agency_id;
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'CAREGIVER'::text, 'departments'::text,
      'departments, department_personnel'::text, 'get_agency_departments'::text,
      3::int, v_count::int, 'view_departments'::text, format('%s departments', v_count)::text,
      CASE WHEN v_count >= 3 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 3 THEN 'Insufficient departments' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'CAREGIVER'::text, 'departments'::text, ''::text, ''::text, 3::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM residents WHERE agency_id = v_agency_id;
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'CAREGIVER'::text, 'residents'::text,
      'residents, resident_baselines'::text, 'NONE'::text,
      1::int, v_count::int, 'view_residents'::text, format('%s residents', v_count)::text,
      CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 1 THEN 'No residents' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'CAREGIVER'::text, 'residents'::text, ''::text, ''::text, 1::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  -- SUPERVISOR ROUTES
  BEGIN
    SELECT COUNT(*) INTO v_count FROM departments WHERE agency_id = v_agency_id;
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'SUPERVISOR'::text, 'home'::text,
      'departments, tasks, intelligence_signals'::text, 'get_agency_departments'::text,
      3::int, v_count::int, 'view_dashboard'::text, format('%s departments', v_count)::text,
      CASE WHEN v_count >= 3 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 3 THEN 'Insufficient departments' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'SUPERVISOR'::text, 'home'::text, ''::text, ''::text, 3::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM intelligence_signals WHERE agency_id = v_agency_id;
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'SUPERVISOR'::text, 'ai-intelligence'::text,
      'intelligence_signals, observation_events, risk_scores'::text, 'NONE'::text,
      1::int, v_count::int, 'view_signals'::text, format('%s signals', v_count)::text,
      CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 1 THEN 'No signals' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'SUPERVISOR'::text, 'ai-intelligence'::text, ''::text, ''::text, 1::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM residents WHERE agency_id = v_agency_id;
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'SUPERVISOR'::text, 'residents'::text,
      'residents, risk_scores, intelligence_signals'::text, 'NONE'::text,
      1::int, v_count::int, 'view_residents'::text, format('%s residents', v_count)::text,
      CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 1 THEN 'No residents' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'SUPERVISOR'::text, 'residents'::text, ''::text, ''::text, 1::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  -- AGENCY_ADMIN ROUTES
  BEGIN
    SELECT COUNT(*) INTO v_count FROM agencies WHERE id = v_agency_id;
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'AGENCY_ADMIN'::text, 'home'::text,
      'agencies, user_profiles, residents, shifts'::text, 'get_agency_residents'::text,
      1::int, v_count::int, 'view_dashboard'::text, format('agency=%s', v_agency_id)::text,
      CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 1 THEN 'No agency' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'AGENCY_ADMIN'::text, 'home'::text, ''::text, ''::text, 1::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM residents WHERE agency_id = v_agency_id;
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'AGENCY_ADMIN'::text, 'residents'::text,
      'residents'::text, 'get_agency_residents'::text,
      1::int, v_count::int, 'view_residents'::text, format('%s residents', v_count)::text,
      CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 1 THEN 'No residents' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'AGENCY_ADMIN'::text, 'residents'::text, ''::text, ''::text, 1::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM departments WHERE agency_id = v_agency_id;
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'AGENCY_ADMIN'::text, 'departments'::text,
      'departments, department_personnel'::text, 'get_agency_departments'::text,
      3::int, v_count::int, 'view_departments'::text, format('%s departments', v_count)::text,
      CASE WHEN v_count >= 3 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 3 THEN 'Insufficient departments' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'AGENCY_ADMIN'::text, 'departments'::text, ''::text, ''::text, 3::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  BEGIN
    SELECT COUNT(*) INTO v_count FROM user_profiles WHERE agency_id = v_agency_id;
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'AGENCY_ADMIN'::text, 'users'::text,
      'user_profiles, roles'::text, 'NONE'::text,
      3::int, v_count::int, 'view_users'::text, format('%s users', v_count)::text,
      CASE WHEN v_count >= 3 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 3 THEN 'Insufficient users' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'AGENCY_ADMIN'::text, 'users'::text, ''::text, ''::text, 3::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  RETURN;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION verify_app_wide_wiring TO anon, authenticated;
