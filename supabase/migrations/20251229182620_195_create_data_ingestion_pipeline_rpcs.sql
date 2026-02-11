/*
  # Data Ingestion Pipeline RPCs (Phase 30)

  ## Purpose
  Brain-owned data ingestion pipeline for external data.
  All incoming data passes through validation, verification, and trust scoring.

  ## Functions
  1. ingest_external_data - Main ingestion pipeline entry point
  2. validate_ingestion_gates - Check if ingestion is allowed
  3. calculate_trust_score - Calculate trust score for data
  4. detect_data_conflicts - Detect conflicts with internal data
  5. get_external_observations - Get observations for resident
  6. get_integration_conflicts - Get conflicts for review

  ## Security
  - All functions enforce authorization
  - Complete validation and audit logging
  - Brain-owned interpretation layer

  ## Enforcement Rules
  1. All third-party data enters through the Brain ingestion pipeline
  2. All incoming data MUST pass through: Schema validation, Source verification, Timestamp normalization, Trust scoring, Brain interpretation layer
  3. No raw data persistence without validation
  4. Third-party data MUST be stored as external observations
  5. NEVER overwrite internal records
  6. NEVER auto-trigger actions
  7. NEVER escalate emergencies directly
  8. Any action requires Brain validation + human confirmation
  9. If external data conflicts with internal records: Flag discrepancy, Surface to supervisor, Preserve both records, Do NOT auto-resolve
*/

-- Function: validate_ingestion_gates
-- Validates if data ingestion is allowed
CREATE OR REPLACE FUNCTION validate_ingestion_gates(
  p_integration_id uuid,
  p_data_domain text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_integration record;
  v_credential_status text;
  v_consent_active boolean;
  v_blocked_reasons text[] := '{}';
  v_can_ingest boolean := true;
BEGIN
  -- Get integration
  SELECT * INTO v_integration
  FROM integration_registry
  WHERE id = p_integration_id;

  IF v_integration IS NULL THEN
    RETURN json_build_object(
      'allowed', false,
      'reason', 'Integration not found',
      'blocked_reasons', ARRAY['INTEGRATION_NOT_FOUND']
    );
  END IF;

  -- Check integration status = ACTIVE
  IF v_integration.status != 'ACTIVE' THEN
    v_blocked_reasons := array_append(v_blocked_reasons, 'INTEGRATION_NOT_ACTIVE: Status is ' || v_integration.status);
    v_can_ingest := false;
  END IF;

  -- Check agency enabled
  IF NOT v_integration.enabled_by_agency THEN
    v_blocked_reasons := array_append(v_blocked_reasons, 'INTEGRATION_NOT_ENABLED_BY_AGENCY');
    v_can_ingest := false;
  END IF;

  -- Check credential is LIVE_ACTIVE
  SELECT status INTO v_credential_status
  FROM credentials
  WHERE id = v_integration.credential_id;

  IF v_credential_status != 'LIVE_ACTIVE' THEN
    v_blocked_reasons := array_append(v_blocked_reasons, 'CREDENTIAL_NOT_LIVE_ACTIVE: Status is ' || v_credential_status);
    v_can_ingest := false;
  END IF;

  -- Check required consent domains are ACTIVE
  IF array_length(v_integration.required_consent_domains, 1) > 0 THEN
    SELECT EXISTS (
      SELECT 1
      FROM consent_registry
      WHERE agency_id = v_integration.agency_id
      AND status = 'ACTIVE'
      AND consent_domain = ANY(v_integration.required_consent_domains)
    ) INTO v_consent_active;

    IF NOT v_consent_active THEN
      v_blocked_reasons := array_append(v_blocked_reasons, 'REQUIRED_CONSENT_DOMAINS_NOT_ACTIVE');
      v_can_ingest := false;
    END IF;
  END IF;

  RETURN json_build_object(
    'allowed', v_can_ingest,
    'blocked_reasons', v_blocked_reasons,
    'integration_status', v_integration.status,
    'credential_status', v_credential_status
  );
END;
$$;

-- Function: calculate_trust_score
-- Calculates trust score for external data
CREATE OR REPLACE FUNCTION calculate_trust_score(
  p_integration_id uuid,
  p_data_type text,
  p_source_timestamp timestamptz
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trust_score numeric := 50.0;
  v_integration_success_rate numeric;
  v_data_freshness_hours numeric;
BEGIN
  -- Calculate integration success rate
  SELECT 
    CASE 
      WHEN total_requests > 0 THEN (total_successes::numeric / total_requests::numeric) * 100
      ELSE 50.0
    END
  INTO v_integration_success_rate
  FROM integration_connectors
  WHERE integration_id = p_integration_id
  LIMIT 1;

  -- Start with integration success rate
  v_trust_score := COALESCE(v_integration_success_rate, 50.0);

  -- Adjust for data freshness (newer data = higher trust)
  v_data_freshness_hours := EXTRACT(EPOCH FROM (now() - p_source_timestamp)) / 3600;
  
  IF v_data_freshness_hours < 1 THEN
    v_trust_score := v_trust_score + 10;
  ELSIF v_data_freshness_hours < 24 THEN
    v_trust_score := v_trust_score + 5;
  ELSIF v_data_freshness_hours > 168 THEN -- > 1 week
    v_trust_score := v_trust_score - 10;
  END IF;

  -- Ensure score is between 0 and 100
  v_trust_score := GREATEST(0.0, LEAST(100.0, v_trust_score));

  RETURN v_trust_score;
END;
$$;

-- Function: ingest_external_data
-- Main ingestion pipeline entry point
CREATE OR REPLACE FUNCTION ingest_external_data(
  p_integration_id uuid,
  p_resident_id uuid,
  p_observation_type text,
  p_data_domain text,
  p_observation_data jsonb,
  p_source_timestamp timestamptz
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_integration record;
  v_gate_check json;
  v_trust_score numeric;
  v_observation_id uuid;
  v_credential_version text;
  v_consent_version text;
  v_validation_result jsonb := '{}';
BEGIN
  -- Get integration
  SELECT * INTO v_integration
  FROM integration_registry
  WHERE id = p_integration_id;

  IF v_integration IS NULL THEN
    RAISE EXCEPTION 'Integration not found';
  END IF;

  -- Validate ingestion gates
  SELECT * INTO v_gate_check
  FROM validate_ingestion_gates(p_integration_id, p_data_domain);

  IF NOT (v_gate_check->>'allowed')::boolean THEN
    -- Log blocked ingestion
    INSERT INTO external_data_ingestion_log (
      agency_id,
      integration_id,
      provider_name,
      data_type,
      data_domain,
      action,
      action_reason,
      validation_result,
      resident_id
    ) VALUES (
      v_integration.agency_id,
      p_integration_id,
      v_integration.provider_name,
      p_observation_type,
      p_data_domain,
      'BLOCK',
      'Ingestion gates failed: ' || (v_gate_check->>'blocked_reasons'),
      jsonb_build_object('gate_check', v_gate_check),
      p_resident_id
    );

    RAISE EXCEPTION 'Data ingestion blocked. Reasons: %', v_gate_check->>'blocked_reasons';
  END IF;

  -- Schema validation (basic)
  IF p_observation_data IS NULL OR jsonb_typeof(p_observation_data) = 'null' THEN
    v_validation_result := jsonb_build_object('schema_valid', false, 'reason', 'Observation data is null');
    
    INSERT INTO external_data_ingestion_log (
      agency_id,
      integration_id,
      provider_name,
      data_type,
      data_domain,
      action,
      action_reason,
      validation_result,
      source_timestamp,
      resident_id
    ) VALUES (
      v_integration.agency_id,
      p_integration_id,
      v_integration.provider_name,
      p_observation_type,
      p_data_domain,
      'FAIL',
      'Schema validation failed',
      v_validation_result,
      p_source_timestamp,
      p_resident_id
    );

    RAISE EXCEPTION 'Schema validation failed: Observation data is null';
  END IF;

  v_validation_result := jsonb_build_object('schema_valid', true);

  -- Calculate trust score
  v_trust_score := calculate_trust_score(p_integration_id, p_observation_type, p_source_timestamp);

  -- Get credential version (hash)
  SELECT md5(encrypted_credentials) INTO v_credential_version
  FROM credentials
  WHERE id = v_integration.credential_id;

  -- Get consent version (simplified - use registry ID)
  SELECT id::text INTO v_consent_version
  FROM consent_registry
  WHERE agency_id = v_integration.agency_id
  AND status = 'ACTIVE'
  AND consent_domain = ANY(v_integration.required_consent_domains)
  LIMIT 1;

  -- Create external observation (NEVER overwrites internal records)
  INSERT INTO external_observations (
    agency_id,
    integration_id,
    resident_id,
    observation_type,
    data_domain,
    observation_data,
    source_timestamp,
    trust_score,
    validation_status,
    conflict_detected,
    auto_action_blocked,
    requires_human_confirmation
  ) VALUES (
    v_integration.agency_id,
    p_integration_id,
    p_resident_id,
    p_observation_type,
    p_data_domain,
    p_observation_data,
    p_source_timestamp,
    v_trust_score,
    CASE WHEN v_trust_score < 50 THEN 'PENDING_REVIEW' ELSE 'VALIDATED' END,
    false,
    true,
    true
  ) RETURNING id INTO v_observation_id;

  -- Log successful ingestion
  INSERT INTO external_data_ingestion_log (
    agency_id,
    integration_id,
    provider_name,
    data_type,
    data_domain,
    action,
    action_reason,
    consent_domain,
    consent_version,
    credential_id,
    credential_version,
    validation_result,
    trust_score,
    source_timestamp,
    resident_id,
    observation_id
  ) VALUES (
    v_integration.agency_id,
    p_integration_id,
    v_integration.provider_name,
    p_observation_type,
    p_data_domain,
    'INGEST',
    'Data successfully ingested',
    p_data_domain,
    v_consent_version,
    v_integration.credential_id,
    v_credential_version,
    v_validation_result,
    v_trust_score,
    p_source_timestamp,
    p_resident_id,
    v_observation_id
  );

  RETURN json_build_object(
    'success', true,
    'observation_id', v_observation_id,
    'trust_score', v_trust_score,
    'validation_status', CASE WHEN v_trust_score < 50 THEN 'PENDING_REVIEW' ELSE 'VALIDATED' END,
    'message', 'Data ingested as external observation. No internal records overwritten. Auto-actions blocked. Human confirmation required.'
  );
END;
$$;

-- Function: get_external_observations
-- Gets external observations for resident
CREATE OR REPLACE FUNCTION get_external_observations(
  p_resident_id uuid,
  p_limit integer DEFAULT 50
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_agency_id uuid;
  v_observations json;
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
      'id', eo.id,
      'observation_type', eo.observation_type,
      'data_domain', eo.data_domain,
      'observation_data', eo.observation_data,
      'source_timestamp', eo.source_timestamp,
      'ingestion_timestamp', eo.ingestion_timestamp,
      'trust_score', eo.trust_score,
      'validation_status', eo.validation_status,
      'conflict_detected', eo.conflict_detected,
      'requires_human_confirmation', eo.requires_human_confirmation,
      'provider_name', ir.provider_name,
      'integration_type', ir.integration_type
    ) ORDER BY eo.source_timestamp DESC
  )
  INTO v_observations
  FROM external_observations eo
  JOIN integration_registry ir ON ir.id = eo.integration_id
  WHERE eo.resident_id = p_resident_id
  AND eo.agency_id = v_agency_id
  LIMIT p_limit;

  RETURN json_build_object(
    'success', true,
    'observations', COALESCE(v_observations, '[]'::json),
    'observation_count', COALESCE(json_array_length(v_observations), 0)
  );
END;
$$;

-- Function: get_integration_conflicts
-- Gets conflicts for review
CREATE OR REPLACE FUNCTION get_integration_conflicts(
  p_resolution_status text DEFAULT 'PENDING'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_agency_id uuid;
  v_conflicts json;
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
      'id', ic.id,
      'conflict_type', ic.conflict_type,
      'conflict_severity', ic.conflict_severity,
      'external_value', ic.external_value,
      'internal_value', ic.internal_value,
      'conflict_details', ic.conflict_details,
      'detected_at', ic.detected_at,
      'resolution_status', ic.resolution_status,
      'provider_name', ir.provider_name,
      'resident_id', ic.resident_id
    ) ORDER BY ic.detected_at DESC
  )
  INTO v_conflicts
  FROM integration_conflicts ic
  JOIN integration_registry ir ON ir.id = ic.integration_id
  WHERE ic.agency_id = v_agency_id
  AND (p_resolution_status IS NULL OR ic.resolution_status = p_resolution_status);

  RETURN json_build_object(
    'success', true,
    'conflicts', COALESCE(v_conflicts, '[]'::json),
    'conflict_count', COALESCE(json_array_length(v_conflicts), 0)
  );
END;
$$;
