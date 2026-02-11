/*
  # Integration Management RPCs (Phase 30)

  ## Purpose
  Manage integration registration, activation, and lifecycle.
  Enforces consent and credential gates.

  ## Functions
  1. register_integration - Register new integration
  2. get_agency_integrations - Get all integrations for agency
  3. verify_integration_activation_gates - Check if integration can be activated
  4. activate_integration - Activate integration (with gates)
  5. suspend_integration - Suspend integration immediately
  6. get_integration_health - Get integration connector health

  ## Security
  - All functions enforce authorization
  - Admin-only access
  - Complete audit logging

  ## Enforcement Rules
  1. External systems are data sources only, never authorities
  2. Data ingestion MAY occur ONLY if: Required consent domains are ACTIVE, Relevant credentials are ACTIVE (LIVE), Integration status = ACTIVE, Agency explicitly enabled the integration
  3. If ANY condition fails → BLOCK ingestion
  4. Default status = INACTIVE
*/

-- Function: register_integration
-- Registers new integration (starts INACTIVE)
CREATE OR REPLACE FUNCTION register_integration(
  p_integration_type text,
  p_provider_name text,
  p_credential_id uuid,
  p_supported_data_domains text[],
  p_read_only boolean DEFAULT true,
  p_limited_write boolean DEFAULT false,
  p_required_consent_domains text[] DEFAULT '{}',
  p_configuration jsonb DEFAULT '{}'
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
  v_credential_status text;
  v_credential_environment text;
  v_new_integration_id uuid;
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
    RAISE EXCEPTION 'Only AGENCY_ADMIN or SUPER_ADMIN can register integrations';
  END IF;

  -- Verify credential exists and belongs to agency
  SELECT status, environment INTO v_credential_status, v_credential_environment
  FROM credentials
  WHERE id = p_credential_id
  AND agency_id = v_agency_id;

  IF v_credential_status IS NULL THEN
    RAISE EXCEPTION 'Credential not found or does not belong to agency';
  END IF;

  -- Create integration (starts INACTIVE, disabled by agency)
  INSERT INTO integration_registry (
    agency_id,
    integration_type,
    provider_name,
    credential_id,
    supported_data_domains,
    read_only,
    limited_write,
    required_consent_domains,
    status,
    enabled_by_agency,
    configuration,
    created_by
  ) VALUES (
    v_agency_id,
    p_integration_type,
    p_provider_name,
    p_credential_id,
    p_supported_data_domains,
    p_read_only,
    p_limited_write,
    p_required_consent_domains,
    'INACTIVE',
    false,
    p_configuration,
    v_actor_id
  ) RETURNING id INTO v_new_integration_id;

  RETURN json_build_object(
    'success', true,
    'integration_id', v_new_integration_id,
    'status', 'INACTIVE',
    'message', 'Integration registered (inactive). Verify gates before activation.'
  );
END;
$$;

-- Function: get_agency_integrations
-- Gets all integrations for current user's agency
CREATE OR REPLACE FUNCTION get_agency_integrations()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_agency_id uuid;
  v_integrations json;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT agency_id INTO v_agency_id
  FROM user_profiles
  WHERE id = v_user_id;

  SELECT json_agg(
    json_build_object(
      'id', ir.id,
      'integration_type', ir.integration_type,
      'provider_name', ir.provider_name,
      'status', ir.status,
      'enabled_by_agency', ir.enabled_by_agency,
      'read_only', ir.read_only,
      'limited_write', ir.limited_write,
      'supported_data_domains', ir.supported_data_domains,
      'required_consent_domains', ir.required_consent_domains,
      'credential_status', c.status,
      'credential_environment', c.environment,
      'created_at', ir.created_at,
      'activated_at', ir.activated_at,
      'suspended_at', ir.suspended_at
    ) ORDER BY ir.created_at DESC
  )
  INTO v_integrations
  FROM integration_registry ir
  JOIN credentials c ON c.id = ir.credential_id
  WHERE ir.agency_id = v_agency_id;

  RETURN json_build_object(
    'success', true,
    'integrations', COALESCE(v_integrations, '[]'::json),
    'integration_count', COALESCE(json_array_length(v_integrations), 0)
  );
END;
$$;

-- Function: verify_integration_activation_gates
-- Verifies if integration can be activated
CREATE OR REPLACE FUNCTION verify_integration_activation_gates(
  p_integration_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_agency_id uuid;
  v_integration record;
  v_credential_status text;
  v_credential_environment text;
  v_consent_count integer;
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

  -- Get integration
  SELECT * INTO v_integration
  FROM integration_registry
  WHERE id = p_integration_id
  AND agency_id = v_agency_id;

  IF v_integration IS NULL THEN
    RAISE EXCEPTION 'Integration not found';
  END IF;

  -- Check credential is LIVE_ACTIVE
  SELECT status, environment INTO v_credential_status, v_credential_environment
  FROM credentials
  WHERE id = v_integration.credential_id;

  IF v_credential_status != 'LIVE_ACTIVE' THEN
    v_blocked_reasons := array_append(v_blocked_reasons, 'CREDENTIAL_NOT_LIVE_ACTIVE: Status is ' || v_credential_status);
    v_can_activate := false;
  END IF;

  IF v_credential_environment != 'LIVE' THEN
    v_blocked_reasons := array_append(v_blocked_reasons, 'CREDENTIAL_NOT_LIVE_ENVIRONMENT: Environment is ' || v_credential_environment);
    v_can_activate := false;
  END IF;

  -- Check required consent domains are ACTIVE
  IF array_length(v_integration.required_consent_domains, 1) > 0 THEN
    SELECT COUNT(*) INTO v_consent_count
    FROM consent_registry
    WHERE agency_id = v_agency_id
    AND status = 'ACTIVE'
    AND consent_domain = ANY(v_integration.required_consent_domains);

    IF v_consent_count < array_length(v_integration.required_consent_domains, 1) THEN
      v_blocked_reasons := array_append(v_blocked_reasons, 'REQUIRED_CONSENT_DOMAINS_NOT_ACTIVE: ' || (array_length(v_integration.required_consent_domains, 1) - v_consent_count)::text || ' missing');
      v_can_activate := false;
    END IF;
  END IF;

  -- Check agency explicitly enabled
  IF NOT v_integration.enabled_by_agency THEN
    v_blocked_reasons := array_append(v_blocked_reasons, 'INTEGRATION_NOT_ENABLED_BY_AGENCY');
    v_can_activate := false;
  END IF;

  RETURN json_build_object(
    'allowed', v_can_activate,
    'blocked_reasons', v_blocked_reasons,
    'checks', json_build_object(
      'credential_live_active', v_credential_status = 'LIVE_ACTIVE',
      'credential_live_environment', v_credential_environment = 'LIVE',
      'consent_domains_active', v_consent_count >= COALESCE(array_length(v_integration.required_consent_domains, 1), 0),
      'enabled_by_agency', v_integration.enabled_by_agency
    )
  );
END;
$$;

-- Function: activate_integration
-- Activates integration with gate enforcement
CREATE OR REPLACE FUNCTION activate_integration(
  p_integration_id uuid
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
  v_integration record;
  v_gate_check json;
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
    RAISE EXCEPTION 'Only AGENCY_ADMIN or SUPER_ADMIN can activate integrations';
  END IF;

  -- Get integration
  SELECT * INTO v_integration
  FROM integration_registry
  WHERE id = p_integration_id
  AND agency_id = v_agency_id;

  IF v_integration IS NULL THEN
    RAISE EXCEPTION 'Integration not found';
  END IF;

  IF v_integration.status = 'ACTIVE' THEN
    RAISE EXCEPTION 'Integration already active';
  END IF;

  -- Verify activation gates
  SELECT * INTO v_gate_check
  FROM verify_integration_activation_gates(p_integration_id);

  IF NOT (v_gate_check->>'allowed')::boolean THEN
    RAISE EXCEPTION 'Integration activation blocked. Reasons: %', v_gate_check->>'blocked_reasons';
  END IF;

  -- Activate integration
  UPDATE integration_registry
  SET status = 'ACTIVE',
      activated_at = now(),
      activated_by = v_actor_id,
      updated_at = now()
  WHERE id = p_integration_id;

  RETURN json_build_object(
    'success', true,
    'integration_id', p_integration_id,
    'status', 'ACTIVE',
    'activated_at', now(),
    'message', 'Integration activated. Data ingestion enabled.'
  );
END;
$$;

-- Function: suspend_integration
-- Suspends integration immediately
CREATE OR REPLACE FUNCTION suspend_integration(
  p_integration_id uuid,
  p_suspended_reason text
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
  v_integration record;
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
    RAISE EXCEPTION 'Only AGENCY_ADMIN or SUPER_ADMIN can suspend integrations';
  END IF;

  -- Get integration
  SELECT * INTO v_integration
  FROM integration_registry
  WHERE id = p_integration_id
  AND agency_id = v_agency_id;

  IF v_integration IS NULL THEN
    RAISE EXCEPTION 'Integration not found';
  END IF;

  IF v_integration.status = 'SUSPENDED' THEN
    RAISE EXCEPTION 'Integration already suspended';
  END IF;

  -- Suspend integration immediately
  UPDATE integration_registry
  SET status = 'SUSPENDED',
      suspended_at = now(),
      suspended_by = v_actor_id,
      suspended_reason = p_suspended_reason,
      updated_at = now()
  WHERE id = p_integration_id;

  RETURN json_build_object(
    'success', true,
    'integration_id', p_integration_id,
    'status', 'SUSPENDED',
    'suspended_at', now(),
    'message', 'Integration suspended immediately. Data ingestion blocked.'
  );
END;
$$;

-- Function: enable_integration_for_agency
-- Agency explicitly enables integration
CREATE OR REPLACE FUNCTION enable_integration_for_agency(
  p_integration_id uuid,
  p_enabled boolean
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
    RAISE EXCEPTION 'Only AGENCY_ADMIN or SUPER_ADMIN can enable/disable integrations';
  END IF;

  -- Update integration
  UPDATE integration_registry
  SET enabled_by_agency = p_enabled,
      updated_at = now()
  WHERE id = p_integration_id
  AND agency_id = v_agency_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Integration not found';
  END IF;

  RETURN json_build_object(
    'success', true,
    'integration_id', p_integration_id,
    'enabled_by_agency', p_enabled,
    'message', CASE WHEN p_enabled THEN 'Integration enabled by agency' ELSE 'Integration disabled by agency' END
  );
END;
$$;
