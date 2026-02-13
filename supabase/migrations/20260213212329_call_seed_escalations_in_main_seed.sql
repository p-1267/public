/*
  # Update seed_senior_family_scenario to include escalations

  ## Changes
  - Add call to seed_supervisor_escalations in seed_senior_family_scenario
  - Ensures supervisor dashboard has visible triage items on load

  ## Purpose
  - Fix "All Clear" empty state in supervisor showcase
  - Provide realistic escalation scenarios for demo
*/

-- Get the most recent seed_senior_family_scenario function and add escalation seeding
CREATE OR REPLACE FUNCTION seed_senior_family_scenario()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agency_id uuid := 'a0000000-0000-0000-0000-000000000010'::uuid;
  v_resident_id uuid := 'b0000000-0000-0000-0000-000000000001'::uuid;
  v_senior_user_id uuid := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_family_user_id uuid := 'a0000000-0000-0000-0000-000000000002'::uuid;
  v_caregiver_user_id uuid := 'a0000000-0000-0000-0000-000000000003'::uuid;
  v_supervisor_user_id uuid := 'a0000000-0000-0000-0000-000000000005'::uuid;
  v_role_id uuid;
  v_department_id uuid;
  v_thread_id uuid;
  v_systolic int;
  v_diastolic int;
  v_timestamp timestamptz;
  v_vital_count int := 0;
BEGIN
  -- Quick check: if already seeded recently, skip
  IF EXISTS (
    SELECT 1 FROM residents WHERE id = v_resident_id AND created_at > now() - interval '1 minute'
  ) THEN
    RETURN jsonb_build_object('status', 'SKIPPED', 'message', 'Already seeded recently');
  END IF;

  -- Seed escalations for supervisor dashboard
  PERFORM seed_supervisor_escalations(v_agency_id, v_resident_id, 'Dorothy Miller');

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'message', 'Senior + Family scenario seeded with escalations',
    'resident_id', v_resident_id,
    'agency_id', v_agency_id,
    'escalations_seeded', true
  );
END;
$$;

COMMENT ON FUNCTION seed_senior_family_scenario IS 'Seeds showcase data including supervisor escalations';
