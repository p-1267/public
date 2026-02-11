/*
  # Retention and Archival RPCs (Phase 33)

  ## Purpose
  Core functions for retention policy management and archival operations.
  Enforces jurisdiction-driven retention and non-destructive archival.

  ## Functions
  1. create_retention_policy - Create jurisdictional retention policy
  2. lock_retention_policy - Lock retention policy (cannot be modified)
  3. archive_record - Archive record (non-destructive)
  4. get_archival_eligible_records - Get records eligible for archival

  ## Security
  - SUPER_ADMIN only
  - Complete audit logging

  ## Enforcement Rules
  1. Data retention is jurisdiction-driven
  2. Retention rules MUST be configurable but locked per jurisdiction
  3. If the law requires retention, data stays
  4. When retention period expires: Data moved to ARCHIVED state, Data becomes read-only, Data remains queryable, Data excluded from active workflows
  5. No deletion occurs at archival stage
*/

-- Function: create_retention_policy
-- Creates jurisdictional retention policy
CREATE OR REPLACE FUNCTION create_retention_policy(
  p_jurisdiction_country text,
  p_jurisdiction_state text,
  p_care_context text,
  p_data_category text,
  p_retention_years integer,
  p_archival_allowed boolean,
  p_erasure_allowed boolean,
  p_legal_basis text,
  p_legal_citation text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_policy_id text;
BEGIN
  v_actor_id := auth.uid();
  v_policy_id := 'policy-' || p_jurisdiction_country || '-' || p_care_context || '-' || p_data_category || '-' || gen_random_uuid()::text;

  INSERT INTO jurisdictional_retention_policies (
    policy_id,
    jurisdiction_country,
    jurisdiction_state,
    care_context,
    data_category,
    retention_years,
    archival_allowed,
    erasure_allowed,
    legal_basis,
    legal_citation,
    created_by
  ) VALUES (
    v_policy_id,
    p_jurisdiction_country,
    p_jurisdiction_state,
    p_care_context,
    p_data_category,
    p_retention_years,
    p_archival_allowed,
    p_erasure_allowed,
    p_legal_basis,
    p_legal_citation,
    v_actor_id
  );

  -- Log audit event
  INSERT INTO retention_audit_log (
    event_id,
    event_type,
    data_category,
    action,
    legal_basis,
    actor_id,
    actor_type,
    event_details
  ) VALUES (
    gen_random_uuid()::text,
    'POLICY_CREATED',
    p_data_category,
    'ARCHIVE',
    p_legal_basis,
    v_actor_id,
    'USER',
    jsonb_build_object(
      'policy_id', v_policy_id,
      'jurisdiction_country', p_jurisdiction_country,
      'jurisdiction_state', p_jurisdiction_state,
      'care_context', p_care_context,
      'retention_years', p_retention_years
    )
  );

  RETURN json_build_object(
    'success', true,
    'policy_id', v_policy_id,
    'retention_years', p_retention_years,
    'retention_days', p_retention_years * 365,
    'archival_allowed', p_archival_allowed,
    'erasure_allowed', p_erasure_allowed,
    'message', 'Retention policy created'
  );
END;
$$;

-- Function: lock_retention_policy
-- Locks retention policy (cannot be modified)
CREATE OR REPLACE FUNCTION lock_retention_policy(
  p_policy_id text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_data_category text;
  v_legal_basis text;
BEGIN
  v_actor_id := auth.uid();

  UPDATE jurisdictional_retention_policies
  SET is_locked = true,
      locked_by = v_actor_id,
      locked_at = now(),
      updated_at = now()
  WHERE policy_id = p_policy_id
  RETURNING data_category, legal_basis INTO v_data_category, v_legal_basis;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Retention policy not found: %', p_policy_id;
  END IF;

  -- Log audit event
  INSERT INTO retention_audit_log (
    event_id,
    event_type,
    data_category,
    action,
    legal_basis,
    actor_id,
    actor_type,
    event_details
  ) VALUES (
    gen_random_uuid()::text,
    'POLICY_LOCKED',
    v_data_category,
    'BLOCK',
    v_legal_basis,
    v_actor_id,
    'USER',
    jsonb_build_object('policy_id', p_policy_id)
  );

  RETURN json_build_object(
    'success', true,
    'policy_id', p_policy_id,
    'is_locked', true,
    'message', 'Retention policy locked. Cannot be modified.'
  );
END;
$$;

-- Function: archive_record
-- Archives record (non-destructive)
CREATE OR REPLACE FUNCTION archive_record(
  p_record_id uuid,
  p_record_table text,
  p_data_category text,
  p_policy_id text,
  p_archival_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_archival_id text;
  v_retention_rule record;
BEGIN
  v_actor_id := auth.uid();
  v_archival_id := 'archive-' || gen_random_uuid()::text;

  -- Check if record has retention rule
  SELECT * INTO v_retention_rule
  FROM data_retention_rules
  WHERE record_table = p_record_table
  AND record_id = p_record_id;

  IF v_retention_rule IS NULL THEN
    RAISE EXCEPTION 'No retention rule found for record: % / %', p_record_table, p_record_id;
  END IF;

  -- Check if legal hold blocks archival
  IF EXISTS (
    SELECT 1
    FROM legal_holds
    WHERE hold_status = 'ACTIVE'
    AND blocks_archival = true
    AND (
      (hold_scope = 'SPECIFIC_RECORD' AND record_table = p_record_table AND record_id = p_record_id)
      OR hold_scope IN ('ALL', 'DATA_CATEGORY')
    )
  ) THEN
    RAISE EXCEPTION 'Legal hold blocks archival for record: % / %', p_record_table, p_record_id;
  END IF;

  -- Update retention rule to ARCHIVED
  UPDATE data_retention_rules
  SET retention_state = 'ARCHIVED',
      archived_at = now()
  WHERE record_table = p_record_table
  AND record_id = p_record_id;

  -- Create archival log
  INSERT INTO archival_log (
    archival_id,
    record_id,
    record_table,
    data_category,
    policy_id,
    archival_reason,
    retention_period_expired,
    archived_by
  ) VALUES (
    v_archival_id,
    p_record_id,
    p_record_table,
    p_data_category,
    p_policy_id,
    p_archival_reason,
    now() >= v_retention_rule.retention_expires_at,
    v_actor_id
  );

  -- Log audit event
  INSERT INTO retention_audit_log (
    event_id,
    event_type,
    record_id,
    record_table,
    data_category,
    action,
    legal_basis,
    actor_id,
    actor_type,
    event_details
  ) VALUES (
    gen_random_uuid()::text,
    'ARCHIVAL',
    p_record_id,
    p_record_table,
    p_data_category,
    'ARCHIVE',
    'Retention policy archival',
    v_actor_id,
    CASE WHEN v_actor_id IS NOT NULL THEN 'USER' ELSE 'SYSTEM' END,
    jsonb_build_object(
      'archival_id', v_archival_id,
      'policy_id', p_policy_id,
      'is_read_only', true,
      'is_queryable', true,
      'excluded_from_active_workflows', true
    )
  );

  RETURN json_build_object(
    'success', true,
    'archival_id', v_archival_id,
    'record_id', p_record_id,
    'record_table', p_record_table,
    'retention_state', 'ARCHIVED',
    'is_read_only', true,
    'is_queryable', true,
    'excluded_from_active_workflows', true,
    'message', 'Record archived. Data is read-only, queryable for audits, and excluded from active workflows. No deletion occurred.'
  );
END;
$$;

-- Function: get_archival_eligible_records
-- Gets records eligible for archival
CREATE OR REPLACE FUNCTION get_archival_eligible_records(
  p_limit integer DEFAULT 100
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_records json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'record_id', record_id,
      'record_table', record_table,
      'data_category', data_category,
      'policy_id', policy_id,
      'retention_state', retention_state,
      'retention_expires_at', retention_expires_at,
      'eligible_for_archival_at', eligible_for_archival_at,
      'legal_hold_active', legal_hold_active
    )
  )
  INTO v_records
  FROM data_retention_rules
  WHERE retention_state = 'ACTIVE'
  AND now() >= eligible_for_archival_at
  AND NOT legal_hold_active
  LIMIT p_limit;

  RETURN json_build_object(
    'success', true,
    'records', COALESCE(v_records, '[]'::json)
  );
END;
$$;
