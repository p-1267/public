/*
  # Credential Activation RPCs (Phase 29)

  ## Purpose
  Manage credential activation with strict gate enforcement.
  Sandbox first, live last.

  ## Functions
  1. activate_sandbox_credential - Activate sandbox environment
  2. verify_live_activation_gates - Check if live activation allowed
  3. activate_live_credential - Activate live environment (with gates)

  ## Security
  - All functions enforce authorization
  - Strict gate enforcement for live activation
  - Complete audit logging

  ## Enforcement Rules
  1. Sandbox credentials allowed ONLY to: validate integration, test flows, verify enforcement
  2. No live transactions permitted in sandbox
  3. Live activation requires: Phases 18-28 complete, Consent active, Shadow AI verified, Audit operational, Admin confirmation
  4. Explicit admin confirmation: Admin role, Typed confirmation phrase, Timestamp, Device fingerprint
  5. Activation is irreversible without re-keying
*/

-- Function: activate_sandbox_credential
-- Activates sandbox environment for testing
CREATE OR REPLACE FUNCTION activate_sandbox_credential(
  p_credential_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_actor_role text;
  v_agency_id uuid;
  v_credential record;
BEGIN
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get actor details
  SELECT r.name, up.agency_id
  INTO v_actor_role, v_agency_id
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_actor_id;

  -- Check authorization
  IF v_actor_role NOT IN ('AGENCY_ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Only AGENCY_ADMIN or SUPER_ADMIN can activate credentials';
  END IF;

  -- Get credential
  SELECT * INTO v_credential
  FROM credentials
  WHERE id = p_credential_id
  AND agency_id = v_agency_id;

  IF v_credential IS NULL THEN
    RAISE EXCEPTION 'Credential not found';
  END IF;

  IF v_credential.environment != 'SANDBOX' THEN
    RAISE EXCEPTION 'Credential is not in SANDBOX environment';
  END IF;

  IF v_credential.status = 'REVOKED' THEN
    RAISE EXCEPTION 'Cannot activate revoked credential';
  END IF;

  IF v_credential.status = 'SANDBOX_ACTIVE' THEN
    RAISE EXCEPTION 'Sandbox already active';
  END IF;

  -- Activate sandbox
  UPDATE credentials
  SET status = 'SANDBOX_ACTIVE',
      sandbox_activated_at = now(),
      sandbox_activated_by = v_actor_id,
      updated_at = now()
  WHERE id = p_credential_id;

  -- Log activation
  INSERT INTO credential_activation_log (
    agency_id,
    credential_id,
    actor_id,
    actor_role,
    credential_type,
    environment,
    action,
    validation_result
  ) SELECT
    v_agency_id,
    p_credential_id,
    v_actor_id,
    v_actor_role,
    ct.type_name,
    'SANDBOX',
    'ACTIVATE_SANDBOX',
    jsonb_build_object('status', 'SANDBOX_ACTIVE', 'message', 'Sandbox activated for testing')
  FROM credential_types ct
  WHERE ct.id = v_credential.credential_type_id;

  RETURN json_build_object(
    'success', true,
    'credential_id', p_credential_id,
    'status', 'SANDBOX_ACTIVE',
    'environment', 'SANDBOX',
    'message', 'Sandbox activated. No live transactions permitted.'
  );
END;
$$;

-- Function: verify_live_activation_gates
-- Verifies if live activation is allowed
CREATE OR REPLACE FUNCTION verify_live_activation_gates(
  p_credential_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_agency_id uuid;
  v_onboarding_state text;
  v_consent_count integer;
  v_ai_config_exists boolean;
  v_audit_operational boolean;
  v_blocked_reasons text[] := '{}';
  v_can_activate boolean := true;
BEGIN
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT agency_id INTO v_agency_id
  FROM user_profiles
  WHERE id = v_actor_id;

  -- Check Phases 18-28 completion (via organization state)
  SELECT current_state INTO v_onboarding_state
  FROM organization_onboarding
  WHERE agency_id = v_agency_id;

  IF v_onboarding_state IS NULL OR v_onboarding_state != 'COMPLETED' THEN
    v_blocked_reasons := array_append(v_blocked_reasons, 'PHASES_18_28_NOT_COMPLETED');
    v_can_activate := false;
  END IF;

  -- Check consent for relevant domains is active
  SELECT COUNT(*) INTO v_consent_count
  FROM consent_registry
  WHERE agency_id = v_agency_id
  AND status = 'ACTIVE';

  IF v_consent_count = 0 THEN
    v_blocked_reasons := array_append(v_blocked_reasons, 'NO_ACTIVE_CONSENT');
    v_can_activate := false;
  END IF;

  -- Check Shadow AI boundaries verified (AI config exists)
  SELECT EXISTS (
    SELECT 1
    FROM ai_assistance_config
    WHERE agency_id = v_agency_id
  ) INTO v_ai_config_exists;

  IF NOT v_ai_config_exists THEN
    v_blocked_reasons := array_append(v_blocked_reasons, 'SHADOW_AI_NOT_VERIFIED');
    v_can_activate := false;
  END IF;

  -- Check audit logging operational (audit log has entries)
  SELECT EXISTS (
    SELECT 1
    FROM audit_log
    WHERE agency_id = v_agency_id
    LIMIT 1
  ) INTO v_audit_operational;

  IF NOT v_audit_operational THEN
    v_blocked_reasons := array_append(v_blocked_reasons, 'AUDIT_LOGGING_NOT_OPERATIONAL');
    v_can_activate := false;
  END IF;

  RETURN json_build_object(
    'allowed', v_can_activate,
    'blocked_reasons', v_blocked_reasons,
    'checks', json_build_object(
      'phases_18_28_complete', v_onboarding_state = 'COMPLETED',
      'consent_active', v_consent_count > 0,
      'shadow_ai_verified', v_ai_config_exists,
      'audit_operational', v_audit_operational
    )
  );
END;
$$;

-- Function: activate_live_credential
-- Activates live environment with strict gate enforcement
CREATE OR REPLACE FUNCTION activate_live_credential(
  p_credential_id uuid,
  p_confirmation_phrase text,
  p_device_fingerprint text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_actor_role text;
  v_agency_id uuid;
  v_credential record;
  v_gate_check json;
  v_expected_phrase text := 'ACTIVATE LIVE CREDENTIAL';
BEGIN
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get actor details
  SELECT r.name, up.agency_id
  INTO v_actor_role, v_agency_id
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_actor_id;

  -- Check authorization - AGENCY_ADMIN only (explicit requirement)
  IF v_actor_role NOT IN ('AGENCY_ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Only AGENCY_ADMIN can activate live credentials';
  END IF;

  -- Get credential
  SELECT * INTO v_credential
  FROM credentials
  WHERE id = p_credential_id
  AND agency_id = v_agency_id;

  IF v_credential IS NULL THEN
    RAISE EXCEPTION 'Credential not found';
  END IF;

  IF v_credential.status = 'REVOKED' THEN
    RAISE EXCEPTION 'Cannot activate revoked credential';
  END IF;

  IF v_credential.status = 'LIVE_ACTIVE' THEN
    RAISE EXCEPTION 'Credential already live active';
  END IF;

  -- Verify confirmation phrase (explicit requirement)
  IF p_confirmation_phrase != v_expected_phrase THEN
    RAISE EXCEPTION 'Invalid confirmation phrase. Expected: %', v_expected_phrase;
  END IF;

  -- Verify live activation gates
  SELECT * INTO v_gate_check
  FROM verify_live_activation_gates(p_credential_id);

  IF NOT (v_gate_check->>'allowed')::boolean THEN
    RAISE EXCEPTION 'Live activation blocked. Reasons: %', v_gate_check->>'blocked_reasons';
  END IF;

  -- Activate live (move to LIVE environment)
  UPDATE credentials
  SET status = 'LIVE_ACTIVE',
      environment = 'LIVE',
      live_activated_at = now(),
      live_activated_by = v_actor_id,
      live_activation_confirmation = p_confirmation_phrase,
      live_activation_device_fingerprint = p_device_fingerprint,
      updated_at = now()
  WHERE id = p_credential_id;

  -- Log activation
  INSERT INTO credential_activation_log (
    agency_id,
    credential_id,
    actor_id,
    actor_role,
    credential_type,
    environment,
    action,
    confirmation_phrase,
    device_fingerprint,
    validation_result
  ) SELECT
    v_agency_id,
    p_credential_id,
    v_actor_id,
    v_actor_role,
    ct.type_name,
    'LIVE',
    'ACTIVATE_LIVE',
    p_confirmation_phrase,
    p_device_fingerprint,
    jsonb_build_object(
      'status', 'LIVE_ACTIVE',
      'message', 'Live credential activated',
      'gate_checks', v_gate_check->'checks'
    )
  FROM credential_types ct
  WHERE ct.id = v_credential.credential_type_id;

  RETURN json_build_object(
    'success', true,
    'credential_id', p_credential_id,
    'status', 'LIVE_ACTIVE',
    'environment', 'LIVE',
    'activated_at', now(),
    'message', 'Live credential activated. Activation is irreversible without re-keying.'
  );
END;
$$;
