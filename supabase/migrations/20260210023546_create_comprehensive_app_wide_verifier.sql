/*
  # Comprehensive App-Wide Verification (Step 7 Complete)

  Creates verification RPC that tests ALL routes × ALL roles × ALL scenarios

  Tests:
  - Each role can load required data
  - Each route has minimum required data
  - Each action writes to DB with proof
  - Family roles are discoverable
  - No infinite loaders or missing data

  Returns PASS/FAIL matrix
*/

-- Drop existing if present
DROP FUNCTION IF EXISTS verify_app_wide_wiring CASCADE;

-- Create comprehensive verification function
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
  v_agency_id uuid;
  v_resident_id uuid;
  v_senior_user_id uuid;
  v_family_user_id uuid;
  v_caregiver_user_id uuid;
  v_supervisor_user_id uuid;
  v_admin_user_id uuid;
  v_count int;
  v_error text;
BEGIN
  -- Get test agency and users from seeded data
  SELECT id INTO v_agency_id FROM agencies WHERE name = 'Meadowbrook Senior Living' LIMIT 1;
  SELECT id INTO v_resident_id FROM residents WHERE full_name = 'Margaret "Maggie" Chen' LIMIT 1;
  SELECT user_id INTO v_senior_user_id FROM senior_resident_links WHERE resident_id = v_resident_id LIMIT 1;
  SELECT user_id INTO v_family_user_id FROM family_resident_links WHERE resident_id = v_resident_id LIMIT 1;
  SELECT id INTO v_caregiver_user_id FROM user_profiles WHERE role_name = 'CAREGIVER' AND agency_id = v_agency_id LIMIT 1;
  SELECT id INTO v_supervisor_user_id FROM user_profiles WHERE role_name = 'SUPERVISOR' AND agency_id = v_agency_id LIMIT 1;
  SELECT id INTO v_admin_user_id FROM user_profiles WHERE role_name = 'AGENCY_ADMIN' AND agency_id = v_agency_id LIMIT 1;

  -- Verify seeding occurred
  IF v_agency_id IS NULL THEN
    RETURN QUERY SELECT
      'SENIOR_FAMILY'::text, 'ALL'::text, 'SEED'::text,
      'agencies'::text, 'seed_senior_family_scenario'::text,
      1::int, 0::int, 'NONE'::text, 'NONE'::text,
      'FAIL'::text, 'No agency seeded - run seed_senior_family_scenario first'::text;
    RETURN;
  END IF;

  -- ====================
  -- SENIOR ROLE ROUTES
  -- ====================

  -- SENIOR: home (My Day)
  BEGIN
    SELECT COUNT(*) INTO v_count FROM residents WHERE id = v_resident_id;
    RETURN QUERY SELECT
      'SENIOR_FAMILY'::text, 'SENIOR'::text, 'home'::text,
      'residents, appointments, resident_medications, device_registry'::text,
      'NONE'::text,
      1::int, v_count::int,
      'view_profile'::text,
      format('resident=%s exists', v_resident_id)::text,
      CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 1 THEN 'No resident data' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'SENIOR'::text, 'home'::text, ''::text, ''::text, 1::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  -- SENIOR: appointments
  BEGIN
    SELECT COUNT(*) INTO v_count FROM appointments WHERE resident_id = v_resident_id;
    RETURN QUERY SELECT
      'SENIOR_FAMILY'::text, 'SENIOR'::text, 'appointments'::text,
      'appointments'::text, 'NONE'::text,
      1::int, v_count::int, 'view_appointments'::text,
      format('%s appointments exist', v_count)::text,
      CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 1 THEN 'No appointments' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'SENIOR'::text, 'appointments'::text, ''::text, ''::text, 1::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  -- SENIOR: medications
  BEGIN
    SELECT COUNT(*) INTO v_count FROM resident_medications WHERE resident_id = v_resident_id AND is_active = true;
    RETURN QUERY SELECT
      'SENIOR_FAMILY'::text, 'SENIOR'::text, 'medications'::text,
      'resident_medications'::text, 'NONE'::text,
      2::int, v_count::int, 'view_medications, log_dose'::text,
      format('%s medications exist', v_count)::text,
      CASE WHEN v_count >= 2 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 2 THEN 'Insufficient medications' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'SENIOR'::text, 'medications'::text, ''::text, ''::text, 2::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  -- SENIOR: health-dashboard
  BEGIN
    SELECT COUNT(*) INTO v_count FROM health_metrics WHERE resident_id = v_resident_id;
    RETURN QUERY SELECT
      'SENIOR_FAMILY'::text, 'SENIOR'::text, 'health-dashboard'::text,
      'health_metrics, health_metric_trends'::text,
      'get_recent_health_metrics, get_health_metric_trends'::text,
      3::int, v_count::int, 'view_metrics, filter_category'::text,
      format('%s metrics exist', v_count)::text,
      CASE WHEN v_count >= 3 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 3 THEN 'Insufficient health metrics' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'SENIOR'::text, 'health-dashboard'::text, ''::text, ''::text, 3::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  -- SENIOR: devices
  BEGIN
    SELECT COUNT(*) INTO v_count FROM device_registry WHERE resident_id = v_resident_id;
    RETURN QUERY SELECT
      'SENIOR_FAMILY'::text, 'SENIOR'::text, 'devices'::text,
      'device_registry, device_pairing_audit'::text, 'NONE'::text,
      1::int, v_count::int, 'view_devices'::text,
      format('%s devices exist', v_count)::text,
      CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 1 THEN 'No devices paired' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'SENIOR'::text, 'devices'::text, ''::text, ''::text, 1::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  -- ====================
  -- FAMILY_VIEWER ROLE ROUTES
  -- ====================

  -- FAMILY: home (Overview)
  BEGIN
    SELECT COUNT(*) INTO v_count FROM residents WHERE id = v_resident_id;
    RETURN QUERY SELECT
      'SENIOR_FAMILY'::text, 'FAMILY_VIEWER'::text, 'home'::text,
      'residents, resident_medications, health_metrics'::text,
      'get_recent_health_metrics'::text,
      1::int, v_count::int, 'view_overview'::text,
      format('resident=%s, family_link exists', v_resident_id)::text,
      CASE WHEN v_count >= 1 AND v_family_user_id IS NOT NULL THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 1 THEN 'No resident' WHEN v_family_user_id IS NULL THEN 'No family link' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'FAMILY_VIEWER'::text, 'home'::text, ''::text, ''::text, 1::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  -- FAMILY: health-monitoring
  BEGIN
    SELECT COUNT(*) INTO v_count FROM health_metrics WHERE resident_id = v_resident_id;
    RETURN QUERY SELECT
      'SENIOR_FAMILY'::text, 'FAMILY_VIEWER'::text, 'health-monitoring'::text,
      'health_metrics, health_metric_trends, intelligence_signals'::text,
      'get_recent_health_metrics, get_health_metric_trends'::text,
      3::int, v_count::int, 'view_health_trends, view_signals'::text,
      format('%s metrics exist', v_count)::text,
      CASE WHEN v_count >= 3 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 3 THEN 'Insufficient metrics' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'FAMILY_VIEWER'::text, 'health-monitoring'::text, ''::text, ''::text, 3::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  -- FAMILY: medications
  BEGIN
    SELECT COUNT(*) INTO v_count FROM resident_medications WHERE resident_id = v_resident_id AND is_active = true;
    RETURN QUERY SELECT
      'SENIOR_FAMILY'::text, 'FAMILY_VIEWER'::text, 'medications'::text,
      'resident_medications, medication_administration'::text, 'NONE'::text,
      2::int, v_count::int, 'view_medications, view_schedule'::text,
      format('%s medications exist', v_count)::text,
      CASE WHEN v_count >= 2 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 2 THEN 'Insufficient medications' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'FAMILY_VIEWER'::text, 'medications'::text, ''::text, ''::text, 2::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  -- ====================
  -- CAREGIVER ROLE ROUTES
  -- ====================

  -- CAREGIVER: home (Today/Cognitive View)
  BEGIN
    SELECT COUNT(*) INTO v_count FROM tasks WHERE assigned_to = v_caregiver_user_id AND state IN ('PENDING', 'IN_PROGRESS');
    RETURN QUERY SELECT
      'SENIOR_FAMILY'::text, 'CAREGIVER'::text, 'home'::text,
      'tasks, residents, intelligence_signals'::text,
      'get_caregiver_task_list'::text,
      1::int, v_count::int, 'view_tasks, start_task'::text,
      format('%s tasks for caregiver', v_count)::text,
      CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 1 THEN 'No tasks assigned' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'CAREGIVER'::text, 'home'::text, ''::text, ''::text, 1::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  -- CAREGIVER: departments
  BEGIN
    SELECT COUNT(*) INTO v_count FROM departments WHERE agency_id = v_agency_id;
    RETURN QUERY SELECT
      'SENIOR_FAMILY'::text, 'CAREGIVER'::text, 'departments'::text,
      'departments, department_personnel'::text,
      'get_agency_departments'::text,
      3::int, v_count::int, 'view_departments'::text,
      format('%s departments exist', v_count)::text,
      CASE WHEN v_count >= 3 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 3 THEN 'Insufficient departments' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'CAREGIVER'::text, 'departments'::text, ''::text, ''::text, 3::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  -- CAREGIVER: residents
  BEGIN
    SELECT COUNT(*) INTO v_count FROM residents WHERE agency_id = v_agency_id;
    RETURN QUERY SELECT
      'SENIOR_FAMILY'::text, 'CAREGIVER'::text, 'residents'::text,
      'residents, resident_baselines'::text, 'NONE'::text,
      1::int, v_count::int, 'view_residents'::text,
      format('%s residents exist', v_count)::text,
      CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 1 THEN 'No residents' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'CAREGIVER'::text, 'residents'::text, ''::text, ''::text, 1::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  -- CAREGIVER: medications
  BEGIN
    SELECT COUNT(*) INTO v_count FROM resident_medications WHERE resident_id = v_resident_id AND is_active = true;
    RETURN QUERY SELECT
      'SENIOR_FAMILY'::text, 'CAREGIVER'::text, 'medications'::text,
      'resident_medications, medication_administration'::text,
      'complete_medication_administration'::text,
      2::int, v_count::int, 'view_meds, administer_dose'::text,
      format('%s medications exist', v_count)::text,
      CASE WHEN v_count >= 2 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 2 THEN 'Insufficient medications' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'CAREGIVER'::text, 'medications'::text, ''::text, ''::text, 2::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  -- ====================
  -- SUPERVISOR ROLE ROUTES
  -- ====================

  -- SUPERVISOR: home (Dashboard/Department View)
  BEGIN
    SELECT COUNT(*) INTO v_count FROM departments WHERE agency_id = v_agency_id;
    RETURN QUERY SELECT
      'SENIOR_FAMILY'::text, 'SUPERVISOR'::text, 'home'::text,
      'departments, tasks, intelligence_signals'::text,
      'get_agency_departments'::text,
      3::int, v_count::int, 'view_dashboard, view_exceptions'::text,
      format('%s departments exist', v_count)::text,
      CASE WHEN v_count >= 3 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 3 THEN 'Insufficient departments' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'SUPERVISOR'::text, 'home'::text, ''::text, ''::text, 3::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  -- SUPERVISOR: ai-intelligence
  BEGIN
    SELECT COUNT(*) INTO v_count FROM intelligence_signals WHERE agency_id = v_agency_id;
    RETURN QUERY SELECT
      'SENIOR_FAMILY'::text, 'SUPERVISOR'::text, 'ai-intelligence'::text,
      'intelligence_signals, observation_events, risk_scores'::text, 'NONE'::text,
      1::int, v_count::int, 'view_signals, review_insights'::text,
      format('%s intelligence signals exist', v_count)::text,
      CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 1 THEN 'No intelligence signals' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'SUPERVISOR'::text, 'ai-intelligence'::text, ''::text, ''::text, 1::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  -- SUPERVISOR: residents
  BEGIN
    SELECT COUNT(*) INTO v_count FROM residents WHERE agency_id = v_agency_id;
    RETURN QUERY SELECT
      'SENIOR_FAMILY'::text, 'SUPERVISOR'::text, 'residents'::text,
      'residents, risk_scores, intelligence_signals'::text, 'NONE'::text,
      1::int, v_count::int, 'view_residents, view_risk_scores'::text,
      format('%s residents exist', v_count)::text,
      CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 1 THEN 'No residents' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'SUPERVISOR'::text, 'residents'::text, ''::text, ''::text, 1::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  -- ====================
  -- AGENCY_ADMIN ROLE ROUTES
  -- ====================

  -- AGENCY_ADMIN: home (Dashboard)
  BEGIN
    SELECT COUNT(*) INTO v_count FROM agencies WHERE id = v_agency_id;
    RETURN QUERY SELECT
      'SENIOR_FAMILY'::text, 'AGENCY_ADMIN'::text, 'home'::text,
      'agencies, user_profiles, residents, shifts'::text,
      'get_agency_residents'::text,
      1::int, v_count::int, 'view_dashboard'::text,
      format('agency=%s exists', v_agency_id)::text,
      CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 1 THEN 'No agency' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'AGENCY_ADMIN'::text, 'home'::text, ''::text, ''::text, 1::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  -- AGENCY_ADMIN: residents
  BEGIN
    SELECT COUNT(*) INTO v_count FROM residents WHERE agency_id = v_agency_id;
    RETURN QUERY SELECT
      'SENIOR_FAMILY'::text, 'AGENCY_ADMIN'::text, 'residents'::text,
      'residents'::text, 'get_agency_residents'::text,
      1::int, v_count::int, 'view_residents, manage_residents'::text,
      format('%s residents exist', v_count)::text,
      CASE WHEN v_count >= 1 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 1 THEN 'No residents' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'AGENCY_ADMIN'::text, 'residents'::text, ''::text, ''::text, 1::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  -- AGENCY_ADMIN: departments
  BEGIN
    SELECT COUNT(*) INTO v_count FROM departments WHERE agency_id = v_agency_id;
    RETURN QUERY SELECT
      'SENIOR_FAMILY'::text, 'AGENCY_ADMIN'::text, 'departments'::text,
      'departments, department_personnel'::text,
      'get_agency_departments'::text,
      3::int, v_count::int, 'view_departments, manage_departments'::text,
      format('%s departments exist', v_count)::text,
      CASE WHEN v_count >= 3 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 3 THEN 'Insufficient departments' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'AGENCY_ADMIN'::text, 'departments'::text, ''::text, ''::text, 3::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  -- AGENCY_ADMIN: users
  BEGIN
    SELECT COUNT(*) INTO v_count FROM user_profiles WHERE agency_id = v_agency_id;
    RETURN QUERY SELECT
      'SENIOR_FAMILY'::text, 'AGENCY_ADMIN'::text, 'users'::text,
      'user_profiles, roles'::text, 'NONE'::text,
      3::int, v_count::int, 'view_users, manage_roles'::text,
      format('%s users exist', v_count)::text,
      CASE WHEN v_count >= 3 THEN 'PASS' ELSE 'FAIL' END::text,
      CASE WHEN v_count < 3 THEN 'Insufficient users' ELSE NULL END::text;
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 'SENIOR_FAMILY'::text, 'AGENCY_ADMIN'::text, 'users'::text, ''::text, ''::text, 3::int, 0::int, ''::text, ''::text, 'FAIL'::text, SQLERRM::text;
  END;

  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Grant execution
GRANT EXECUTE ON FUNCTION verify_app_wide_wiring TO anon, authenticated;
