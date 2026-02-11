/*
  # Transparency RPCs (Phase 28)

  ## Purpose
  Provide transparency into data collection, processing, and sharing.
  Users can view what data is collected, processed, and shared.

  ## Functions
  1. get_consent_domains - Get all consent domains
  2. get_data_processing_history - Get data processing history
  3. get_third_party_integrations - Get third-party integrations
  4. log_transparency_access - Log transparency portal access

  ## Security
  - All functions enforce authorization
  - Agency-isolated
  - Audit logging

  ## Enforcement Rules
  1. Users MUST be able to view: Current active consent, Consent history, What data is collected, What data is processed, What data is shared, Which systems access the data
  2. Information MUST be human-readable
  3. For each third-party integration: Purpose must be disclosed, Data scope must be listed, Sharing status must be visible
*/

-- Function: get_consent_domains
-- Gets all available consent domains
CREATE OR REPLACE FUNCTION get_consent_domains()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_domains json;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT json_agg(
    json_build_object(
      'domain_key', cd.domain_key,
      'domain_name', cd.domain_name,
      'description', cd.description,
      'legal_basis', cd.legal_basis,
      'data_scope', cd.data_scope,
      'processing_purpose', cd.processing_purpose,
      'retention_period', cd.retention_period,
      'is_required', cd.is_required
    ) ORDER BY cd.display_order
  )
  INTO v_domains
  FROM consent_domains cd
  WHERE cd.is_active = true;

  RETURN json_build_object(
    'success', true,
    'domains', COALESCE(v_domains, '[]'::json),
    'domain_count', COALESCE(json_array_length(v_domains), 0)
  );
END;
$$;

-- Function: get_data_processing_history
-- Gets data processing history for resident/user
CREATE OR REPLACE FUNCTION get_data_processing_history(
  p_resident_id uuid DEFAULT NULL,
  p_user_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_agency_id uuid;
  v_processing_history json;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT agency_id INTO v_agency_id
  FROM user_profiles
  WHERE id = v_user_id;

  -- Log transparency access
  INSERT INTO transparency_access_log (
    agency_id,
    user_id,
    access_type,
    resource_type,
    resource_id
  ) VALUES (
    v_agency_id,
    v_user_id,
    'VIEW_DATA_PROCESSING',
    'DATA_PROCESSING_LOG',
    NULL
  );

  -- Get processing history
  IF p_resident_id IS NOT NULL THEN
    SELECT json_agg(
      json_build_object(
        'id', dpl.id,
        'processing_type', dpl.processing_type,
        'data_category', dpl.data_category,
        'data_scope', dpl.data_scope,
        'consent_domain', dpl.consent_domain,
        'consent_verified', dpl.consent_verified,
        'purpose', dpl.purpose,
        'processor_system', dpl.processor_system,
        'third_party_recipient', dpl.third_party_recipient,
        'timestamp', dpl.timestamp
      ) ORDER BY dpl.timestamp DESC
    )
    INTO v_processing_history
    FROM data_processing_log dpl
    WHERE dpl.resident_id = p_resident_id
    AND dpl.agency_id = v_agency_id
    LIMIT p_limit;
  ELSIF p_user_id IS NOT NULL THEN
    SELECT json_agg(
      json_build_object(
        'id', dpl.id,
        'processing_type', dpl.processing_type,
        'data_category', dpl.data_category,
        'data_scope', dpl.data_scope,
        'consent_domain', dpl.consent_domain,
        'consent_verified', dpl.consent_verified,
        'purpose', dpl.purpose,
        'processor_system', dpl.processor_system,
        'third_party_recipient', dpl.third_party_recipient,
        'timestamp', dpl.timestamp
      ) ORDER BY dpl.timestamp DESC
    )
    INTO v_processing_history
    FROM data_processing_log dpl
    WHERE dpl.user_id = p_user_id
    AND dpl.agency_id = v_agency_id
    LIMIT p_limit;
  ELSE
    RAISE EXCEPTION 'Either resident_id or user_id must be provided';
  END IF;

  RETURN json_build_object(
    'success', true,
    'processing_history', COALESCE(v_processing_history, '[]'::json),
    'history_count', COALESCE(json_array_length(v_processing_history), 0)
  );
END;
$$;

-- Function: get_third_party_integrations
-- Gets third-party integrations for agency
CREATE OR REPLACE FUNCTION get_third_party_integrations()
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

  -- Log transparency access
  INSERT INTO transparency_access_log (
    agency_id,
    user_id,
    access_type,
    resource_type,
    resource_id
  ) VALUES (
    v_agency_id,
    v_user_id,
    'VIEW_THIRD_PARTY_INTEGRATIONS',
    'THIRD_PARTY_INTEGRATIONS',
    NULL
  );

  -- Get integrations
  SELECT json_agg(
    json_build_object(
      'id', tpi.id,
      'integration_name', tpi.integration_name,
      'third_party_name', tpi.third_party_name,
      'integration_type', tpi.integration_type,
      'purpose', tpi.purpose,
      'data_scope', tpi.data_scope,
      'consent_domain_required', tpi.consent_domain_required,
      'legal_basis', tpi.legal_basis,
      'data_retention_period', tpi.data_retention_period,
      'privacy_policy_url', tpi.privacy_policy_url,
      'is_active', tpi.is_active,
      'activated_at', tpi.activated_at
    )
  )
  INTO v_integrations
  FROM third_party_integrations tpi
  WHERE tpi.agency_id = v_agency_id
  AND tpi.is_active = true;

  RETURN json_build_object(
    'success', true,
    'integrations', COALESCE(v_integrations, '[]'::json),
    'integration_count', COALESCE(json_array_length(v_integrations), 0)
  );
END;
$$;

-- Function: get_transparency_summary
-- Gets comprehensive transparency summary
CREATE OR REPLACE FUNCTION get_transparency_summary(
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
  v_active_consent json;
  v_consent_history_count integer;
  v_processing_count integer;
  v_sharing_count integer;
  v_third_party_count integer;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT agency_id INTO v_agency_id
  FROM user_profiles
  WHERE id = v_user_id;

  -- Log transparency access
  INSERT INTO transparency_access_log (
    agency_id,
    user_id,
    access_type,
    resource_type,
    resource_id
  ) VALUES (
    v_agency_id,
    v_user_id,
    'VIEW_CONSENT_STATUS',
    'CONSENT_REGISTRY',
    NULL
  );

  -- Get active consent
  IF p_resident_id IS NOT NULL THEN
    SELECT json_build_object(
      'id', cr.id,
      'consent_version', cr.consent_version,
      'granted_domains', cr.granted_domains,
      'granted_at', cr.granted_at,
      'status', cr.status
    )
    INTO v_active_consent
    FROM consent_registry cr
    WHERE cr.resident_id = p_resident_id
    AND cr.agency_id = v_agency_id
    AND cr.status = 'ACTIVE';

    -- Get counts
    SELECT COUNT(*) INTO v_consent_history_count
    FROM consent_history
    WHERE resident_id = p_resident_id
    AND agency_id = v_agency_id;

    SELECT COUNT(*) INTO v_processing_count
    FROM data_processing_log
    WHERE resident_id = p_resident_id
    AND agency_id = v_agency_id;

    SELECT COUNT(*) INTO v_sharing_count
    FROM data_processing_log
    WHERE resident_id = p_resident_id
    AND agency_id = v_agency_id
    AND processing_type = 'SHARE';
  ELSIF p_user_id IS NOT NULL THEN
    SELECT json_build_object(
      'id', cr.id,
      'consent_version', cr.consent_version,
      'granted_domains', cr.granted_domains,
      'granted_at', cr.granted_at,
      'status', cr.status
    )
    INTO v_active_consent
    FROM consent_registry cr
    WHERE cr.user_id = p_user_id
    AND cr.agency_id = v_agency_id
    AND cr.status = 'ACTIVE';

    -- Get counts
    SELECT COUNT(*) INTO v_consent_history_count
    FROM consent_history
    WHERE user_id = p_user_id
    AND agency_id = v_agency_id;

    SELECT COUNT(*) INTO v_processing_count
    FROM data_processing_log
    WHERE user_id = p_user_id
    AND agency_id = v_agency_id;

    SELECT COUNT(*) INTO v_sharing_count
    FROM data_processing_log
    WHERE user_id = p_user_id
    AND agency_id = v_agency_id
    AND processing_type = 'SHARE';
  ELSE
    RAISE EXCEPTION 'Either resident_id or user_id must be provided';
  END IF;

  -- Get third-party count
  SELECT COUNT(*) INTO v_third_party_count
  FROM third_party_integrations
  WHERE agency_id = v_agency_id
  AND is_active = true;

  RETURN json_build_object(
    'success', true,
    'active_consent', v_active_consent,
    'consent_history_count', v_consent_history_count,
    'processing_event_count', v_processing_count,
    'sharing_event_count', v_sharing_count,
    'third_party_integration_count', v_third_party_count
  );
END;
$$;
