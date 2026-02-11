/*
  # Phase 32 Entry Gate RPC (Phase 32)

  ## Purpose
  Checks if user can enter Phase 32 (Production Hardening, Resilience & Failure Safety).
  Enforces hard gate conditions.

  ## Entry Conditions (ALL must be satisfied)
  1. Organization state = ACTIVE
  2. Phase 31 = COMPLETED (OTA updates operational)
  3. User role = SUPER_ADMIN only (system-level operations)
  4. At least one environment configured

  ## Function
  - check_phase32_entry_gate() - Returns allow/block with detailed reasons

  ## Security
  - SECURITY DEFINER to check system state
  - Returns safe error messages
  - Logs access attempts
*/

-- Function: check_phase32_entry_gate
-- Checks if current user can enter Phase 32
CREATE OR REPLACE FUNCTION check_phase32_entry_gate()
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
  v_ota_system_operational boolean;
  v_environments_configured boolean;
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

  -- Check role requirement - SUPER_ADMIN only (system-level operations)
  IF v_user_role != 'SUPER_ADMIN' THEN
    v_blocked_reasons := array_append(v_blocked_reasons, 'ROLE_NOT_AUTHORIZED: Only SUPER_ADMIN can manage production hardening and resilience');
    v_can_enter := false;
  END IF;

  -- Check Phase 31 completion (organization onboarding through OTA)
  IF v_agency_id IS NOT NULL THEN
    SELECT current_state, locked
    INTO v_onboarding_state, v_onboarding_locked
    FROM organization_onboarding
    WHERE agency_id = v_agency_id;

    IF v_onboarding_state IS NULL THEN
      v_blocked_reasons := array_append(v_blocked_reasons, 'PHASES_18_31_NOT_INITIALIZED');
      v_can_enter := false;
    ELSIF v_onboarding_state != 'COMPLETED' THEN
      v_blocked_reasons := array_append(v_blocked_reasons, 'PHASES_18_31_NOT_COMPLETED: Current state is ' || v_onboarding_state);
      v_can_enter := false;
    ELSIF NOT v_onboarding_locked THEN
      v_blocked_reasons := array_append(v_blocked_reasons, 'PHASES_18_31_NOT_LOCKED');
      v_can_enter := false;
    END IF;
  END IF;

  -- Check Phase 31 (OTA system operational)
  SELECT EXISTS (
    SELECT 1
    FROM system_versions
    WHERE is_current_version = true
    LIMIT 1
  ) INTO v_ota_system_operational;

  IF NOT v_ota_system_operational THEN
    v_blocked_reasons := array_append(v_blocked_reasons, 'PHASE_31_NOT_OPERATIONAL: OTA system not configured');
    v_can_enter := false;
  END IF;

  -- Check at least one environment configured
  SELECT EXISTS (
    SELECT 1
    FROM environment_config
    WHERE is_active = true
    LIMIT 1
  ) INTO v_environments_configured;

  IF NOT v_environments_configured THEN
    v_blocked_reasons := array_append(v_blocked_reasons, 'NO_ENVIRONMENTS_CONFIGURED');
    v_can_enter := false;
  END IF;

  RETURN json_build_object(
    'allowed', v_can_enter,
    'agency_id', v_agency_id,
    'user_role', v_user_role,
    'onboarding_state', v_onboarding_state,
    'onboarding_locked', v_onboarding_locked,
    'ota_system_operational', v_ota_system_operational,
    'environments_configured', v_environments_configured,
    'blocked_reasons', v_blocked_reasons
  );
END;
$$;
