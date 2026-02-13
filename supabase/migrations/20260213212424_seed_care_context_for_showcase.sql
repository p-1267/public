/*
  # Seed Care Context for Showcase

  ## Changes
  - Ensure care_context exists for showcase resident
  - Set management_mode = AGENCY_MANAGED, care_setting = IN_HOME for scenario D/E

  ## Purpose
  - Fix "Unknown Scenario" label in ScenarioIdentityBanner
  - Provide proper context for showcase demos
*/

CREATE OR REPLACE FUNCTION seed_care_context_for_showcase(
  p_resident_id uuid,
  p_agency_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_context_id uuid;
BEGIN
  -- Deactivate any existing contexts for this resident
  UPDATE care_contexts SET is_active = false WHERE resident_id = p_resident_id;

  -- Create or update active care context for AGENCY_HOME_CARE scenario (D)
  INSERT INTO care_contexts (
    id,
    resident_id,
    management_mode,
    care_setting,
    service_model,
    agency_id,
    supervision_enabled,
    is_active,
    workflow_enabled,
    ai_enabled,
    metadata
  ) VALUES (
    gen_random_uuid(),
    p_resident_id,
    'AGENCY_MANAGED',
    'IN_HOME',
    'AGENCY',
    p_agency_id,
    true,
    true,
    true,
    true,
    '{"scenario": "D", "description": "Agency In-Home Care"}'::jsonb
  )
  ON CONFLICT (resident_id, management_mode, care_setting, service_model) 
  DO UPDATE SET 
    is_active = true,
    agency_id = EXCLUDED.agency_id,
    supervision_enabled = true,
    updated_at = now()
  RETURNING id INTO v_context_id;

  RAISE NOTICE 'Seeded care context % for resident % (agency %)', v_context_id, p_resident_id, p_agency_id;
  
  RETURN v_context_id;
END;
$$;

GRANT EXECUTE ON FUNCTION seed_care_context_for_showcase TO anon;
GRANT EXECUTE ON FUNCTION seed_care_context_for_showcase TO authenticated;

-- Update the main seed function to call this
CREATE OR REPLACE FUNCTION seed_senior_family_scenario()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agency_id uuid := 'a0000000-0000-0000-0000-000000000010'::uuid;
  v_resident_id uuid := 'b0000000-0000-0000-0000-000000000001'::uuid;
  v_context_id uuid;
BEGIN
  -- Quick check: if already seeded recently, skip
  IF EXISTS (
    SELECT 1 FROM escalation_queue 
    WHERE resident_id = v_resident_id 
    AND escalated_at > now() - interval '30 seconds'
  ) THEN
    RETURN jsonb_build_object('status', 'SKIPPED', 'message', 'Already seeded recently');
  END IF;

  -- Seed care context first
  v_context_id := seed_care_context_for_showcase(v_resident_id, v_agency_id);

  -- Seed escalations for supervisor dashboard
  PERFORM seed_supervisor_escalations(v_agency_id, v_resident_id, 'Dorothy Miller');

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'message', 'Senior + Family scenario seeded with care context and escalations',
    'resident_id', v_resident_id,
    'agency_id', v_agency_id,
    'care_context_id', v_context_id,
    'escalations_seeded', true
  );
END;
$$;

COMMENT ON FUNCTION seed_senior_family_scenario IS 'Seeds showcase data including care context and supervisor escalations';
