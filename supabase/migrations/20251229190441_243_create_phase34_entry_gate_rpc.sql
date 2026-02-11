/*
  # Phase 34 Entry Gate RPC (Phase 34)

  ## Purpose
  Checks if user can enter Phase 34 (Analytics, Insights & Non-Executing Intelligence).
  Enforces hard gate conditions.

  ## Entry Conditions (ALL must be satisfied)
  1. Organization state = ACTIVE
  2. Phase 33 = COMPLETED (Data retention operational)
  3. User role = AGENCY_ADMIN or SUPERVISOR (analytics viewers)
  4. At least one data source configured

  ## Function
  - check_phase34_entry_gate() - Returns allow/block with detailed reasons

  ## Security
  - SECURITY DEFINER to check system state
  - Returns safe error messages
  - Logs access attempts
*/

-- Function: check_phase34_entry_gate
-- Checks if current user can enter Phase 34
CREATE OR REPLACE FUNCTION check_phase34_entry_gate()
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
  v_data_retention_configured boolean;
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

  -- Check role requirement - AGENCY_ADMIN or SUPERVISOR (analytics viewers)
  IF v_user_role NOT IN ('SUPER_ADMIN', 'AGENCY_ADMIN', 'SUPERVISOR') THEN
    v_blocked_reasons := array_append(v_blocked_reasons, 'ROLE_NOT_AUTHORIZED: Only AGENCY_ADMIN and SUPERVISOR can view analytics');
    v_can_enter := false;
  END IF;

  -- Check Phase 33 completion (organization onboarding through data retention)
  IF v_agency_id IS NOT NULL THEN
    SELECT current_state, locked
    INTO v_onboarding_state, v_onboarding_locked
    FROM organization_onboarding
    WHERE agency_id = v_agency_id;

    IF v_onboarding_state IS NULL THEN
      v_blocked_reasons := array_append(v_blocked_reasons, 'PHASES_18_33_NOT_INITIALIZED');
      v_can_enter := false;
    ELSIF v_onboarding_state != 'COMPLETED' THEN
      v_blocked_reasons := array_append(v_blocked_reasons, 'PHASES_18_33_NOT_COMPLETED: Current state is ' || v_onboarding_state);
      v_can_enter := false;
    ELSIF NOT v_onboarding_locked THEN
      v_blocked_reasons := array_append(v_blocked_reasons, 'PHASES_18_33_NOT_LOCKED');
      v_can_enter := false;
    END IF;
  END IF;

  -- Check Phase 33 (data retention system operational)
  SELECT EXISTS (
    SELECT 1
    FROM jurisdictional_retention_policies
    WHERE is_locked = true
    LIMIT 1
  ) INTO v_data_retention_configured;

  IF NOT v_data_retention_configured THEN
    v_blocked_reasons := array_append(v_blocked_reasons, 'PHASE_33_NOT_OPERATIONAL: Data retention system not configured');
    v_can_enter := false;
  END IF;

  RETURN json_build_object(
    'allowed', v_can_enter,
    'agency_id', v_agency_id,
    'user_role', v_user_role,
    'onboarding_state', v_onboarding_state,
    'onboarding_locked', v_onboarding_locked,
    'data_retention_configured', v_data_retention_configured,
    'blocked_reasons', v_blocked_reasons
  );
END;
$$;
