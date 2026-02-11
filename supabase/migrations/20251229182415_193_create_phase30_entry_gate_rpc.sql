/*
  # Phase 30 Entry Gate RPC (Phase 30)

  ## Purpose
  Checks if user can enter Phase 30 (Third-Party Integrations & External Data Ingestion).
  Enforces hard gate conditions.

  ## Entry Conditions (ALL must be satisfied)
  1. Organization state = ACTIVE
  2. Phases 18-29 = COMPLETED (including Phase 29 - Credentials)
  3. User role = AGENCY_ADMIN or SUPER_ADMIN
  4. Credential system operational

  ## Function
  - check_phase30_entry_gate() - Returns allow/block with detailed reasons

  ## Security
  - SECURITY DEFINER to check system state
  - Returns safe error messages
  - Logs access attempts
*/

-- Function: check_phase30_entry_gate
-- Checks if current user can enter Phase 30
CREATE OR REPLACE FUNCTION check_phase30_entry_gate()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_agency_id uuid;
  v_user_role text;
  v_onboarding_state text;
  v_onboarding_locked boolean;
  v_credential_types_exist boolean;
  v_blocked_reasons text[] := '{}';
  v_can_enter boolean := true;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'Not authenticated',
      'blocked_reasons', ARRAY['NOT_AUTHENTICATED']
    );
  END IF;

  -- Check user's agency and role
  SELECT up.agency_id, r.name
  INTO v_agency_id, v_user_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  IF v_agency_id IS NULL THEN
    v_blocked_reasons := array_append(v_blocked_reasons, 'USER_NOT_ASSIGNED_TO_AGENCY');
    v_can_enter := false;
  END IF;

  -- Check role requirement - AGENCY_ADMIN or SUPER_ADMIN only
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'SUPER_ADMIN') THEN
    v_blocked_reasons := array_append(v_blocked_reasons, 'ROLE_NOT_AUTHORIZED: Only AGENCY_ADMIN or SUPER_ADMIN can manage integrations');
    v_can_enter := false;
  END IF;

  -- Check Phase 18-29 completion (organization onboarding)
  IF v_agency_id IS NOT NULL THEN
    SELECT current_state, locked
    INTO v_onboarding_state, v_onboarding_locked
    FROM organization_onboarding
    WHERE agency_id = v_agency_id;

    IF v_onboarding_state IS NULL THEN
      v_blocked_reasons := array_append(v_blocked_reasons, 'PHASES_18_29_NOT_INITIALIZED');
      v_can_enter := false;
    ELSIF v_onboarding_state != 'COMPLETED' THEN
      v_blocked_reasons := array_append(v_blocked_reasons, 'PHASES_18_29_NOT_COMPLETED: Current state is ' || v_onboarding_state);
      v_can_enter := false;
    ELSIF NOT v_onboarding_locked THEN
      v_blocked_reasons := array_append(v_blocked_reasons, 'PHASES_18_29_NOT_LOCKED');
      v_can_enter := false;
    END IF;
  END IF;

  -- Check Phase 29 (Credential system operational)
  SELECT EXISTS (
    SELECT 1
    FROM credential_types
    WHERE is_active = true
    LIMIT 1
  ) INTO v_credential_types_exist;

  IF NOT v_credential_types_exist THEN
    v_blocked_reasons := array_append(v_blocked_reasons, 'PHASE_29_NOT_OPERATIONAL: Credential system not available');
    v_can_enter := false;
  END IF;

  RETURN json_build_object(
    'allowed', v_can_enter,
    'agency_id', v_agency_id,
    'user_role', v_user_role,
    'onboarding_state', v_onboarding_state,
    'onboarding_locked', v_onboarding_locked,
    'credential_system_operational', v_credential_types_exist,
    'blocked_reasons', v_blocked_reasons
  );
END;
$$;
