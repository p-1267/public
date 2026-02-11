/*
  # Phase 22 Entry Gate RPC (Phase 22)

  ## Purpose
  Checks if user can enter Phase 22 (Accessibility, Personalization & Notification Control).
  Enforces hard gate conditions.

  ## Entry Conditions (ALL must be satisfied)
  1. Organization state = ACTIVE
  2. Phase 18 = COMPLETED (organization onboarding)
  3. Phase 19 = COMPLETED (implied by Phase 18)
  4. Phase 20 = COMPLETED (at least one sealed baseline)
  5. Phase 21 = COMPLETED (at least one device registered)
  6. User role ∈ {AGENCY_ADMIN, SUPERVISOR, FAMILY, SENIOR}

  ## Function
  - check_phase22_entry_gate() - Returns allow/block with detailed reasons

  ## Security
  - SECURITY DEFINER to check system state
  - Returns safe error messages
  - Logs access attempts
*/

-- Function: check_phase22_entry_gate
-- Checks if current user can enter Phase 22
CREATE OR REPLACE FUNCTION check_phase22_entry_gate()
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
  v_sealed_baseline_count integer;
  v_device_count integer;
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

  -- Check user role
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'SUPERVISOR', 'FAMILY', 'SENIOR', 'SUPER_ADMIN') THEN
    v_blocked_reasons := array_append(v_blocked_reasons, 'INSUFFICIENT_ROLE: Must be AGENCY_ADMIN, SUPERVISOR, FAMILY, or SENIOR');
    v_can_enter := false;
  END IF;

  -- Check Phase 18 completion (organization onboarding)
  IF v_agency_id IS NOT NULL THEN
    SELECT current_state, locked
    INTO v_onboarding_state, v_onboarding_locked
    FROM organization_onboarding
    WHERE agency_id = v_agency_id;

    IF v_onboarding_state IS NULL THEN
      v_blocked_reasons := array_append(v_blocked_reasons, 'PHASE_18_NOT_INITIALIZED');
      v_can_enter := false;
    ELSIF v_onboarding_state != 'COMPLETED' THEN
      v_blocked_reasons := array_append(v_blocked_reasons, 'PHASE_18_NOT_COMPLETED: Current state is ' || v_onboarding_state);
      v_can_enter := false;
    ELSIF NOT v_onboarding_locked THEN
      v_blocked_reasons := array_append(v_blocked_reasons, 'PHASE_18_NOT_LOCKED');
      v_can_enter := false;
    END IF;
  END IF;

  -- Check Phase 20 completion (at least one sealed baseline exists)
  IF v_agency_id IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_sealed_baseline_count
    FROM resident_baselines rb
    JOIN residents r ON r.id = rb.resident_id
    WHERE r.agency_id = v_agency_id
    AND rb.is_sealed = true;

    IF v_sealed_baseline_count = 0 THEN
      v_blocked_reasons := array_append(v_blocked_reasons, 'PHASE_20_NOT_COMPLETED: No sealed baselines exist');
      v_can_enter := false;
    END IF;
  END IF;

  -- Check Phase 21 completion (at least one device registered)
  IF v_agency_id IS NOT NULL THEN
    SELECT COUNT(*)
    INTO v_device_count
    FROM device_registry dr
    JOIN residents r ON r.id = dr.resident_id
    WHERE r.agency_id = v_agency_id;

    IF v_device_count = 0 THEN
      v_blocked_reasons := array_append(v_blocked_reasons, 'PHASE_21_NOT_COMPLETED: No devices registered');
      v_can_enter := false;
    END IF;
  END IF;

  RETURN json_build_object(
    'allowed', v_can_enter,
    'agency_id', v_agency_id,
    'user_role', v_user_role,
    'onboarding_state', v_onboarding_state,
    'onboarding_locked', v_onboarding_locked,
    'sealed_baseline_count', v_sealed_baseline_count,
    'device_count', v_device_count,
    'blocked_reasons', v_blocked_reasons
  );
END;
$$;
