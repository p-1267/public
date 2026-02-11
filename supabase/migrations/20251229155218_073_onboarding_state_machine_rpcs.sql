/*
  # Phase 18 - Onboarding State Machine RPC Functions

  1. Purpose
    - Implements strict state machine transitions
    - Validates prerequisites before state advancement
    - Enforces linear progression (no skipping)
    - Locks configuration after completion

  2. Functions
    - initialize_onboarding(agency_id) - Creates initial state
    - advance_onboarding_state(agency_id, from_state, to_state) - Validates and advances
    - save_org_identity(agency_id, data) - State 1
    - save_insurance_config(agency_id, data) - State 2
    - upload_sop_document(agency_id, category, data) - State 3
    - save_role_baselines(agency_id, baselines) - State 4
    - save_escalation_config(agency_id, config) - State 5
    - finalize_onboarding(agency_id, legal_acceptance) - State 6
    - check_onboarding_status(agency_id) - Status checker
*/

-- Function: Initialize onboarding state for an agency
CREATE OR REPLACE FUNCTION initialize_onboarding(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_state_id uuid;
  v_config_id uuid;
BEGIN
  -- Check if already initialized
  IF EXISTS (SELECT 1 FROM organization_onboarding_state WHERE agency_id = p_agency_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Onboarding already initialized for this agency'
    );
  END IF;

  -- Create onboarding state
  INSERT INTO organization_onboarding_state (agency_id, current_state, completed_states)
  VALUES (p_agency_id, 'UNINITIALIZED', '[]'::jsonb)
  RETURNING id INTO v_state_id;

  -- Create empty organization config
  INSERT INTO organization_config (agency_id, created_by)
  VALUES (p_agency_id, auth.uid())
  RETURNING id INTO v_config_id;

  RETURN jsonb_build_object(
    'success', true,
    'state_id', v_state_id,
    'config_id', v_config_id,
    'current_state', 'UNINITIALIZED'
  );
END;
$$;

-- Function: Check onboarding status
CREATE OR REPLACE FUNCTION check_onboarding_status(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state organization_onboarding_state%ROWTYPE;
  v_config organization_config%ROWTYPE;
  v_completed_states text[];
BEGIN
  -- Get current state
  SELECT * INTO v_state
  FROM organization_onboarding_state
  WHERE agency_id = p_agency_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'initialized', false,
      'can_initialize', true
    );
  END IF;

  -- Get config
  SELECT * INTO v_config
  FROM organization_config
  WHERE agency_id = p_agency_id;

  -- Convert completed_states jsonb to text array
  SELECT array_agg(value::text)
  INTO v_completed_states
  FROM jsonb_array_elements_text(v_state.completed_states);

  RETURN jsonb_build_object(
    'initialized', true,
    'current_state', v_state.current_state,
    'completed_states', v_completed_states,
    'locked', v_state.locked,
    'locked_at', v_state.locked_at,
    'has_org_identity', v_config.legal_name IS NOT NULL,
    'has_insurance', v_config.insurance_provider IS NOT NULL,
    'sop_count', (SELECT COUNT(*) FROM sop_documents WHERE agency_id = p_agency_id),
    'has_role_baselines', EXISTS(SELECT 1 FROM role_permission_baselines WHERE agency_id = p_agency_id),
    'has_escalation_config', EXISTS(SELECT 1 FROM escalation_config WHERE agency_id = p_agency_id),
    'has_legal_acceptance', EXISTS(SELECT 1 FROM legal_acceptance_records WHERE agency_id = p_agency_id)
  );
END;
$$;

-- Function: Save organization identity (State 1)
CREATE OR REPLACE FUNCTION save_org_identity(
  p_agency_id uuid,
  p_legal_name text,
  p_organization_type organization_type,
  p_country text,
  p_state_province text,
  p_primary_language text,
  p_secondary_languages text[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state organization_onboarding_state%ROWTYPE;
BEGIN
  -- Get current state
  SELECT * INTO v_state
  FROM organization_onboarding_state
  WHERE agency_id = p_agency_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Onboarding not initialized');
  END IF;

  IF v_state.locked THEN
    RETURN jsonb_build_object('success', false, 'error', 'Onboarding is locked');
  END IF;

  -- Validate inputs
  IF p_legal_name IS NULL OR trim(p_legal_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Legal name is required');
  END IF;

  IF p_country IS NULL OR trim(p_country) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Country is required');
  END IF;

  IF p_state_province IS NULL OR trim(p_state_province) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'State/Province is required');
  END IF;

  -- Update organization config
  UPDATE organization_config
  SET 
    legal_name = p_legal_name,
    organization_type = p_organization_type,
    country = p_country,
    state_province = p_state_province,
    primary_language = p_primary_language,
    secondary_languages = p_secondary_languages,
    jurisdiction_locked_at = now(),
    updated_at = now()
  WHERE agency_id = p_agency_id;

  -- Update onboarding state
  UPDATE organization_onboarding_state
  SET 
    current_state = 'INSURANCE_CONFIG',
    completed_states = jsonb_build_array('ORG_IDENTITY'),
    updated_at = now()
  WHERE agency_id = p_agency_id;

  RETURN jsonb_build_object(
    'success', true,
    'next_state', 'INSURANCE_CONFIG'
  );
END;
$$;

-- Function: Save insurance configuration (State 2)
CREATE OR REPLACE FUNCTION save_insurance_config(
  p_agency_id uuid,
  p_insurance_provider text,
  p_policy_types text[],
  p_coverage_scope text,
  p_expiration_date date,
  p_incident_timeline text,
  p_policy_url text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state organization_onboarding_state%ROWTYPE;
BEGIN
  -- Get current state
  SELECT * INTO v_state
  FROM organization_onboarding_state
  WHERE agency_id = p_agency_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Onboarding not initialized');
  END IF;

  IF v_state.locked THEN
    RETURN jsonb_build_object('success', false, 'error', 'Onboarding is locked');
  END IF;

  IF v_state.current_state != 'INSURANCE_CONFIG' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must complete State 1 first');
  END IF;

  -- Validate inputs
  IF p_insurance_provider IS NULL OR trim(p_insurance_provider) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insurance provider is required');
  END IF;

  IF p_policy_url IS NULL OR trim(p_policy_url) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Insurance policy PDF is required');
  END IF;

  -- Update organization config
  UPDATE organization_config
  SET 
    insurance_provider = p_insurance_provider,
    insurance_policy_types = p_policy_types,
    insurance_coverage_scope = p_coverage_scope,
    insurance_expiration_date = p_expiration_date,
    insurance_incident_timeline = p_incident_timeline,
    insurance_policy_url = p_policy_url,
    updated_at = now()
  WHERE agency_id = p_agency_id;

  -- Update onboarding state
  UPDATE organization_onboarding_state
  SET 
    current_state = 'SOP_INGESTION',
    completed_states = jsonb_build_array('ORG_IDENTITY', 'INSURANCE_CONFIG'),
    updated_at = now()
  WHERE agency_id = p_agency_id;

  RETURN jsonb_build_object(
    'success', true,
    'next_state', 'SOP_INGESTION'
  );
END;
$$;

-- Function: Upload SOP document (State 3)
CREATE OR REPLACE FUNCTION upload_sop_document(
  p_agency_id uuid,
  p_category sop_category,
  p_file_name text,
  p_file_url text,
  p_file_size_bytes bigint,
  p_mime_type text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state organization_onboarding_state%ROWTYPE;
  v_sop_id uuid;
  v_sop_count integer;
BEGIN
  -- Get current state
  SELECT * INTO v_state
  FROM organization_onboarding_state
  WHERE agency_id = p_agency_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Onboarding not initialized');
  END IF;

  IF v_state.locked THEN
    RETURN jsonb_build_object('success', false, 'error', 'Onboarding is locked');
  END IF;

  IF v_state.current_state != 'SOP_INGESTION' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must complete State 2 first');
  END IF;

  -- Insert SOP document
  INSERT INTO sop_documents (
    agency_id, 
    category, 
    file_name, 
    file_url, 
    file_size_bytes, 
    mime_type,
    processing_status,
    uploaded_by
  )
  VALUES (
    p_agency_id,
    p_category,
    p_file_name,
    p_file_url,
    p_file_size_bytes,
    p_mime_type,
    'uploaded',
    auth.uid()
  )
  RETURNING id INTO v_sop_id;

  -- Check if all 5 categories are uploaded
  SELECT COUNT(DISTINCT category)
  INTO v_sop_count
  FROM sop_documents
  WHERE agency_id = p_agency_id;

  RETURN jsonb_build_object(
    'success', true,
    'sop_id', v_sop_id,
    'categories_uploaded', v_sop_count,
    'categories_required', 5,
    'can_advance', v_sop_count >= 5
  );
END;
$$;

-- Function: Advance to State 4 after SOP upload
CREATE OR REPLACE FUNCTION complete_sop_ingestion(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state organization_onboarding_state%ROWTYPE;
  v_sop_count integer;
BEGIN
  SELECT * INTO v_state
  FROM organization_onboarding_state
  WHERE agency_id = p_agency_id;

  IF v_state.current_state != 'SOP_INGESTION' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not in SOP ingestion state');
  END IF;

  -- Verify all 5 categories are present
  SELECT COUNT(DISTINCT category)
  INTO v_sop_count
  FROM sop_documents
  WHERE agency_id = p_agency_id;

  IF v_sop_count < 5 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'All 5 SOP categories must be uploaded',
      'categories_uploaded', v_sop_count
    );
  END IF;

  UPDATE organization_onboarding_state
  SET 
    current_state = 'ROLE_DEFAULTS',
    completed_states = jsonb_build_array('ORG_IDENTITY', 'INSURANCE_CONFIG', 'SOP_INGESTION'),
    updated_at = now()
  WHERE agency_id = p_agency_id;

  RETURN jsonb_build_object('success', true, 'next_state', 'ROLE_DEFAULTS');
END;
$$;

-- Function: Save role permission baselines (State 4)
CREATE OR REPLACE FUNCTION save_role_baselines(
  p_agency_id uuid,
  p_baselines jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state organization_onboarding_state%ROWTYPE;
  v_baseline jsonb;
  v_role_id uuid;
BEGIN
  SELECT * INTO v_state
  FROM organization_onboarding_state
  WHERE agency_id = p_agency_id;

  IF v_state.current_state != 'ROLE_DEFAULTS' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must complete State 3 first');
  END IF;

  -- Clear existing baselines
  DELETE FROM role_permission_baselines WHERE agency_id = p_agency_id;

  -- Insert new baselines
  FOR v_baseline IN SELECT * FROM jsonb_array_elements(p_baselines)
  LOOP
    SELECT id INTO v_role_id
    FROM roles
    WHERE name = v_baseline->>'role_name';

    IF v_role_id IS NOT NULL THEN
      INSERT INTO role_permission_baselines (
        agency_id,
        role_id,
        baseline_permissions,
        auto_apply,
        created_by
      ) VALUES (
        p_agency_id,
        v_role_id,
        v_baseline->'permissions',
        true,
        auth.uid()
      );
    END IF;
  END LOOP;

  UPDATE organization_onboarding_state
  SET 
    current_state = 'ESCALATION_BASELINES',
    completed_states = jsonb_build_array('ORG_IDENTITY', 'INSURANCE_CONFIG', 'SOP_INGESTION', 'ROLE_DEFAULTS'),
    updated_at = now()
  WHERE agency_id = p_agency_id;

  RETURN jsonb_build_object('success', true, 'next_state', 'ESCALATION_BASELINES');
END;
$$;

-- Function: Save escalation configuration (State 5)
CREATE OR REPLACE FUNCTION save_escalation_config(
  p_agency_id uuid,
  p_escalation_order jsonb,
  p_timeout_durations jsonb,
  p_notification_channels jsonb,
  p_quiet_hours_start time,
  p_quiet_hours_end time
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state organization_onboarding_state%ROWTYPE;
BEGIN
  SELECT * INTO v_state
  FROM organization_onboarding_state
  WHERE agency_id = p_agency_id;

  IF v_state.current_state != 'ESCALATION_BASELINES' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must complete State 4 first');
  END IF;

  -- Insert or update escalation config
  INSERT INTO escalation_config (
    agency_id,
    escalation_order,
    timeout_durations,
    notification_channels,
    quiet_hours_start,
    quiet_hours_end,
    emergency_ignores_quiet_hours,
    created_by
  ) VALUES (
    p_agency_id,
    p_escalation_order,
    p_timeout_durations,
    p_notification_channels,
    p_quiet_hours_start,
    p_quiet_hours_end,
    true,
    auth.uid()
  )
  ON CONFLICT (agency_id) DO UPDATE
  SET 
    escalation_order = EXCLUDED.escalation_order,
    timeout_durations = EXCLUDED.timeout_durations,
    notification_channels = EXCLUDED.notification_channels,
    quiet_hours_start = EXCLUDED.quiet_hours_start,
    quiet_hours_end = EXCLUDED.quiet_hours_end,
    updated_at = now();

  UPDATE organization_onboarding_state
  SET 
    current_state = 'LEGAL_ACCEPTANCE',
    completed_states = jsonb_build_array('ORG_IDENTITY', 'INSURANCE_CONFIG', 'SOP_INGESTION', 'ROLE_DEFAULTS', 'ESCALATION_BASELINES'),
    updated_at = now()
  WHERE agency_id = p_agency_id;

  RETURN jsonb_build_object('success', true, 'next_state', 'LEGAL_ACCEPTANCE');
END;
$$;

-- Function: Finalize onboarding with legal acceptance (State 6)
CREATE OR REPLACE FUNCTION finalize_onboarding(
  p_agency_id uuid,
  p_typed_legal_name text,
  p_device_fingerprint text,
  p_accepted_terms jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_state organization_onboarding_state%ROWTYPE;
  v_config organization_config%ROWTYPE;
BEGIN
  SELECT * INTO v_state
  FROM organization_onboarding_state
  WHERE agency_id = p_agency_id;

  IF v_state.current_state != 'LEGAL_ACCEPTANCE' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Must complete State 5 first');
  END IF;

  SELECT * INTO v_config
  FROM organization_config
  WHERE agency_id = p_agency_id;

  -- Validate typed name matches legal name
  IF trim(lower(p_typed_legal_name)) != trim(lower(v_config.legal_name)) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Typed legal name does not match registered name');
  END IF;

  -- Create legal acceptance record
  INSERT INTO legal_acceptance_records (
    agency_id,
    accepted_by,
    typed_legal_name,
    device_fingerprint,
    accepted_terms,
    immutable
  ) VALUES (
    p_agency_id,
    auth.uid(),
    p_typed_legal_name,
    p_device_fingerprint,
    p_accepted_terms,
    true
  );

  -- LOCK THE ONBOARDING
  UPDATE organization_onboarding_state
  SET 
    current_state = 'COMPLETED',
    completed_states = jsonb_build_array('ORG_IDENTITY', 'INSURANCE_CONFIG', 'SOP_INGESTION', 'ROLE_DEFAULTS', 'ESCALATION_BASELINES', 'LEGAL_ACCEPTANCE'),
    locked = true,
    locked_at = now(),
    locked_by = auth.uid(),
    updated_at = now()
  WHERE agency_id = p_agency_id;

  RETURN jsonb_build_object(
    'success', true,
    'status', 'COMPLETED',
    'locked', true,
    'message', 'Organization onboarding successfully completed and locked'
  );
END;
$$;
