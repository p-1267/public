/*
  # Consent Management RPCs (Phase 28)

  ## Purpose
  Manage consent granting, revocation, and verification.
  Enforces consent versioning and immediate revocation.

  ## Functions
  1. grant_consent - Grant consent for domains
  2. revoke_consent - Revoke consent immediately
  3. get_active_consent - Get active consent for resident/user
  4. verify_consent - Verify consent for processing
  5. get_consent_history - Get consent history

  ## Security
  - All functions enforce authorization
  - Immediate revocation enforcement
  - Audit logging

  ## Enforcement Rules
  1. Consent is explicit, versioned, and revocable
  2. Only ONE active consent version allowed per resident/user context
  3. Revocation has immediate effect
  4. No data processing occurs without valid consent
*/

-- Function: grant_consent
-- Grants consent for specified domains
CREATE OR REPLACE FUNCTION grant_consent(
  p_granted_domains text[],
  p_resident_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_granted_by_relationship text DEFAULT NULL,
  p_legal_representative_id uuid DEFAULT NULL,
  p_language_context text DEFAULT 'en',
  p_device_fingerprint text DEFAULT NULL
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
  v_consent_version integer := 1;
  v_previous_consent_id uuid;
  v_new_consent_id uuid;
  v_domain text;
BEGIN
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate input
  IF p_resident_id IS NULL AND p_user_id IS NULL THEN
    RAISE EXCEPTION 'Either resident_id or user_id must be provided';
  END IF;

  IF array_length(p_granted_domains, 1) IS NULL OR array_length(p_granted_domains, 1) = 0 THEN
    RAISE EXCEPTION 'At least one consent domain must be provided';
  END IF;

  -- Get actor details
  SELECT r.name, up.agency_id
  INTO v_actor_role, v_agency_id
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_actor_id;

  -- Check if user has authority to grant consent
  IF v_actor_role NOT IN ('AGENCY_ADMIN', 'SUPERVISOR', 'FAMILY', 'SENIOR', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'User role not authorized to grant consent';
  END IF;

  -- Check for existing active consent and supersede it
  IF p_resident_id IS NOT NULL THEN
    SELECT id, consent_version INTO v_previous_consent_id, v_consent_version
    FROM consent_registry
    WHERE resident_id = p_resident_id
    AND agency_id = v_agency_id
    AND status = 'ACTIVE';
    
    IF v_previous_consent_id IS NOT NULL THEN
      v_consent_version := v_consent_version + 1;
    END IF;
  ELSE
    SELECT id, consent_version INTO v_previous_consent_id, v_consent_version
    FROM consent_registry
    WHERE user_id = p_user_id
    AND agency_id = v_agency_id
    AND status = 'ACTIVE';
    
    IF v_previous_consent_id IS NOT NULL THEN
      v_consent_version := v_consent_version + 1;
    END IF;
  END IF;

  -- Create new consent record
  INSERT INTO consent_registry (
    agency_id,
    resident_id,
    user_id,
    consent_version,
    granted_domains,
    granted_by,
    granted_by_relationship,
    legal_representative_id,
    language_context,
    device_fingerprint,
    status,
    granted_at
  ) VALUES (
    v_agency_id,
    p_resident_id,
    p_user_id,
    v_consent_version,
    p_granted_domains,
    v_actor_id,
    p_granted_by_relationship,
    p_legal_representative_id,
    p_language_context,
    p_device_fingerprint,
    'ACTIVE',
    now()
  ) RETURNING id INTO v_new_consent_id;

  -- Supersede previous consent if exists
  IF v_previous_consent_id IS NOT NULL THEN
    UPDATE consent_registry
    SET status = 'SUPERSEDED',
        superseded_by = v_new_consent_id
    WHERE id = v_previous_consent_id;

    -- Log supersession
    INSERT INTO consent_history (
      agency_id,
      consent_id,
      resident_id,
      user_id,
      actor_id,
      actor_role,
      consent_domain,
      action,
      consent_version,
      language_context,
      device_fingerprint
    ) VALUES (
      v_agency_id,
      v_previous_consent_id,
      p_resident_id,
      p_user_id,
      v_actor_id,
      v_actor_role,
      'ALL',
      'SUPERSEDE',
      v_consent_version - 1,
      p_language_context,
      p_device_fingerprint
    );
  END IF;

  -- Log each domain grant
  FOREACH v_domain IN ARRAY p_granted_domains
  LOOP
    INSERT INTO consent_history (
      agency_id,
      consent_id,
      resident_id,
      user_id,
      actor_id,
      actor_role,
      consent_domain,
      action,
      consent_version,
      language_context,
      device_fingerprint
    ) VALUES (
      v_agency_id,
      v_new_consent_id,
      p_resident_id,
      p_user_id,
      v_actor_id,
      v_actor_role,
      v_domain,
      'GRANT',
      v_consent_version,
      p_language_context,
      p_device_fingerprint
    );
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'consent_id', v_new_consent_id,
    'consent_version', v_consent_version,
    'granted_domains', p_granted_domains,
    'message', 'Consent granted successfully'
  );
END;
$$;

-- Function: revoke_consent
-- Revokes consent immediately
CREATE OR REPLACE FUNCTION revoke_consent(
  p_revoked_reason text,
  p_resident_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
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
  v_consent_id uuid;
  v_consent_version integer;
  v_granted_domains text[];
  v_domain text;
BEGIN
  v_actor_id := auth.uid();
  
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Validate input
  IF p_resident_id IS NULL AND p_user_id IS NULL THEN
    RAISE EXCEPTION 'Either resident_id or user_id must be provided';
  END IF;

  -- Get actor details
  SELECT r.name, up.agency_id
  INTO v_actor_role, v_agency_id
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_actor_id;

  -- Get active consent
  IF p_resident_id IS NOT NULL THEN
    SELECT id, consent_version, granted_domains
    INTO v_consent_id, v_consent_version, v_granted_domains
    FROM consent_registry
    WHERE resident_id = p_resident_id
    AND agency_id = v_agency_id
    AND status = 'ACTIVE';
  ELSE
    SELECT id, consent_version, granted_domains
    INTO v_consent_id, v_consent_version, v_granted_domains
    FROM consent_registry
    WHERE user_id = p_user_id
    AND agency_id = v_agency_id
    AND status = 'ACTIVE';
  END IF;

  IF v_consent_id IS NULL THEN
    RAISE EXCEPTION 'No active consent found to revoke';
  END IF;

  -- Revoke consent immediately
  UPDATE consent_registry
  SET status = 'REVOKED',
      revoked_at = now(),
      revoked_by = v_actor_id,
      revoked_reason = p_revoked_reason
  WHERE id = v_consent_id;

  -- Log revocation for each domain
  FOREACH v_domain IN ARRAY v_granted_domains
  LOOP
    INSERT INTO consent_history (
      agency_id,
      consent_id,
      resident_id,
      user_id,
      actor_id,
      actor_role,
      consent_domain,
      action,
      consent_version,
      language_context
    ) VALUES (
      v_agency_id,
      v_consent_id,
      p_resident_id,
      p_user_id,
      v_actor_id,
      v_actor_role,
      v_domain,
      'REVOKE',
      v_consent_version,
      'en'
    );
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'consent_id', v_consent_id,
    'revoked_at', now(),
    'message', 'Consent revoked immediately. Processing halted.'
  );
END;
$$;

-- Function: get_active_consent
-- Gets active consent for resident/user
CREATE OR REPLACE FUNCTION get_active_consent(
  p_resident_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_agency_id uuid;
  v_consent record;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT agency_id INTO v_agency_id
  FROM user_profiles
  WHERE id = v_user_id;

  -- Get active consent
  IF p_resident_id IS NOT NULL THEN
    SELECT * INTO v_consent
    FROM consent_registry
    WHERE resident_id = p_resident_id
    AND agency_id = v_agency_id
    AND status = 'ACTIVE';
  ELSIF p_user_id IS NOT NULL THEN
    SELECT * INTO v_consent
    FROM consent_registry
    WHERE user_id = p_user_id
    AND agency_id = v_agency_id
    AND status = 'ACTIVE';
  ELSE
    RAISE EXCEPTION 'Either resident_id or user_id must be provided';
  END IF;

  IF v_consent IS NULL THEN
    RETURN json_build_object(
      'success', true,
      'has_active_consent', false,
      'consent', NULL
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'has_active_consent', true,
    'consent', json_build_object(
      'id', v_consent.id,
      'consent_version', v_consent.consent_version,
      'granted_domains', v_consent.granted_domains,
      'granted_at', v_consent.granted_at,
      'granted_by_relationship', v_consent.granted_by_relationship,
      'language_context', v_consent.language_context,
      'status', v_consent.status
    )
  );
END;
$$;

-- Function: verify_consent
-- Verifies if consent exists for specific domain
CREATE OR REPLACE FUNCTION verify_consent(
  p_consent_domain text,
  p_resident_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_agency_id uuid;
  v_consent_exists boolean := false;
  v_consent_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT agency_id INTO v_agency_id
  FROM user_profiles
  WHERE id = v_user_id;

  -- Check if active consent exists with domain
  IF p_resident_id IS NOT NULL THEN
    SELECT id INTO v_consent_id
    FROM consent_registry
    WHERE resident_id = p_resident_id
    AND agency_id = v_agency_id
    AND status = 'ACTIVE'
    AND p_consent_domain = ANY(granted_domains);
  ELSIF p_user_id IS NOT NULL THEN
    SELECT id INTO v_consent_id
    FROM consent_registry
    WHERE user_id = p_user_id
    AND agency_id = v_agency_id
    AND status = 'ACTIVE'
    AND p_consent_domain = ANY(granted_domains);
  ELSE
    RAISE EXCEPTION 'Either resident_id or user_id must be provided';
  END IF;

  v_consent_exists := v_consent_id IS NOT NULL;

  RETURN json_build_object(
    'success', true,
    'consent_verified', v_consent_exists,
    'consent_id', v_consent_id,
    'message', CASE 
      WHEN v_consent_exists THEN 'Consent verified for domain: ' || p_consent_domain
      ELSE 'No consent found for domain: ' || p_consent_domain || '. Processing blocked.'
    END
  );
END;
$$;

-- Function: get_consent_history
-- Gets consent history for resident/user
CREATE OR REPLACE FUNCTION get_consent_history(
  p_resident_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_agency_id uuid;
  v_history json;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT agency_id INTO v_agency_id
  FROM user_profiles
  WHERE id = v_user_id;

  -- Get consent history
  IF p_resident_id IS NOT NULL THEN
    SELECT json_agg(
      json_build_object(
        'id', ch.id,
        'consent_domain', ch.consent_domain,
        'action', ch.action,
        'consent_version', ch.consent_version,
        'actor_role', ch.actor_role,
        'timestamp', ch.timestamp,
        'language_context', ch.language_context
      ) ORDER BY ch.timestamp DESC
    )
    INTO v_history
    FROM consent_history ch
    WHERE ch.resident_id = p_resident_id
    AND ch.agency_id = v_agency_id;
  ELSIF p_user_id IS NOT NULL THEN
    SELECT json_agg(
      json_build_object(
        'id', ch.id,
        'consent_domain', ch.consent_domain,
        'action', ch.action,
        'consent_version', ch.consent_version,
        'actor_role', ch.actor_role,
        'timestamp', ch.timestamp,
        'language_context', ch.language_context
      ) ORDER BY ch.timestamp DESC
    )
    INTO v_history
    FROM consent_history ch
    WHERE ch.user_id = p_user_id
    AND ch.agency_id = v_agency_id;
  ELSE
    RAISE EXCEPTION 'Either resident_id or user_id must be provided';
  END IF;

  RETURN json_build_object(
    'success', true,
    'history', COALESCE(v_history, '[]'::json),
    'history_count', COALESCE(json_array_length(v_history), 0)
  );
END;
$$;
