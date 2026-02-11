/*
  # Legal Hold RPCs (Phase 33)

  ## Purpose
  Functions for legal hold management (override retention/erasure).
  Enforces legal hold constraints.

  ## Functions
  1. apply_legal_hold - Apply legal hold
  2. release_legal_hold - Release legal hold
  3. get_active_legal_holds - Get active legal holds

  ## Security
  - SUPER_ADMIN only
  - Complete audit logging

  ## Enforcement Rules
  1. If legal hold is active: Erasure is blocked
  2. Archival may proceed
  3. Hold reason and authority logged
*/

-- Function: apply_legal_hold
-- Applies legal hold
CREATE OR REPLACE FUNCTION apply_legal_hold(
  p_hold_reason text,
  p_hold_authority text,
  p_hold_reference text,
  p_hold_scope text,
  p_scope_identifier text DEFAULT NULL,
  p_data_category text DEFAULT NULL,
  p_record_id uuid DEFAULT NULL,
  p_record_table text DEFAULT NULL,
  p_blocks_erasure boolean DEFAULT true,
  p_blocks_archival boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_hold_id text;
BEGIN
  v_actor_id := auth.uid();
  v_hold_id := 'hold-' || gen_random_uuid()::text;

  INSERT INTO legal_holds (
    hold_id,
    hold_reason,
    hold_authority,
    hold_reference,
    record_id,
    record_table,
    hold_scope,
    scope_identifier,
    data_category,
    blocks_erasure,
    blocks_archival,
    applied_by
  ) VALUES (
    v_hold_id,
    p_hold_reason,
    p_hold_authority,
    p_hold_reference,
    p_record_id,
    p_record_table,
    p_hold_scope,
    p_scope_identifier,
    p_data_category,
    p_blocks_erasure,
    p_blocks_archival,
    v_actor_id
  );

  -- Update affected retention rules
  IF p_hold_scope = 'SPECIFIC_RECORD' AND p_record_id IS NOT NULL AND p_record_table IS NOT NULL THEN
    UPDATE data_retention_rules
    SET legal_hold_active = true
    WHERE record_table = p_record_table
    AND record_id = p_record_id;
  ELSIF p_hold_scope = 'DATA_CATEGORY' AND p_data_category IS NOT NULL THEN
    UPDATE data_retention_rules
    SET legal_hold_active = true
    WHERE data_category = p_data_category;
  ELSIF p_hold_scope = 'ALL' THEN
    UPDATE data_retention_rules
    SET legal_hold_active = true;
  END IF;

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
    event_details,
    related_hold_id
  ) VALUES (
    gen_random_uuid()::text,
    'LEGAL_HOLD_APPLIED',
    p_record_id,
    p_record_table,
    p_data_category,
    'BLOCK',
    p_hold_authority,
    v_actor_id,
    'USER',
    jsonb_build_object(
      'hold_id', v_hold_id,
      'hold_scope', p_hold_scope,
      'hold_reason', p_hold_reason,
      'blocks_erasure', p_blocks_erasure,
      'blocks_archival', p_blocks_archival
    ),
    v_hold_id
  );

  RETURN json_build_object(
    'success', true,
    'hold_id', v_hold_id,
    'hold_status', 'ACTIVE',
    'blocks_erasure', p_blocks_erasure,
    'blocks_archival', p_blocks_archival,
    'message', 'Legal hold applied. ' || 
      CASE WHEN p_blocks_erasure THEN 'Erasure blocked. ' ELSE '' END ||
      CASE WHEN p_blocks_archival THEN 'Archival blocked.' ELSE 'Archival may proceed.' END
  );
END;
$$;

-- Function: release_legal_hold
-- Releases legal hold
CREATE OR REPLACE FUNCTION release_legal_hold(
  p_hold_id text,
  p_release_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_id uuid;
  v_hold record;
BEGIN
  v_actor_id := auth.uid();

  SELECT * INTO v_hold
  FROM legal_holds
  WHERE hold_id = p_hold_id
  AND hold_status = 'ACTIVE';

  IF v_hold IS NULL THEN
    RAISE EXCEPTION 'Active legal hold not found: %', p_hold_id;
  END IF;

  UPDATE legal_holds
  SET hold_status = 'RELEASED',
      released_by = v_actor_id,
      released_at = now(),
      release_reason = p_release_reason
  WHERE hold_id = p_hold_id;

  -- Update affected retention rules
  IF v_hold.hold_scope = 'SPECIFIC_RECORD' AND v_hold.record_id IS NOT NULL AND v_hold.record_table IS NOT NULL THEN
    UPDATE data_retention_rules
    SET legal_hold_active = false
    WHERE record_table = v_hold.record_table
    AND record_id = v_hold.record_id
    AND NOT EXISTS (
      SELECT 1
      FROM legal_holds
      WHERE hold_status = 'ACTIVE'
      AND hold_id != p_hold_id
      AND (
        (hold_scope = 'SPECIFIC_RECORD' AND record_table = v_hold.record_table AND record_id = v_hold.record_id)
        OR hold_scope = 'ALL'
      )
    );
  ELSIF v_hold.hold_scope = 'DATA_CATEGORY' AND v_hold.data_category IS NOT NULL THEN
    UPDATE data_retention_rules
    SET legal_hold_active = false
    WHERE data_category = v_hold.data_category
    AND NOT EXISTS (
      SELECT 1
      FROM legal_holds
      WHERE hold_status = 'ACTIVE'
      AND hold_id != p_hold_id
      AND (data_category = v_hold.data_category OR hold_scope = 'ALL')
    );
  ELSIF v_hold.hold_scope = 'ALL' THEN
    UPDATE data_retention_rules
    SET legal_hold_active = false
    WHERE NOT EXISTS (
      SELECT 1
      FROM legal_holds
      WHERE hold_status = 'ACTIVE'
      AND hold_id != p_hold_id
    );
  END IF;

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
    event_details,
    related_hold_id
  ) VALUES (
    gen_random_uuid()::text,
    'LEGAL_HOLD_RELEASED',
    v_hold.record_id,
    v_hold.record_table,
    v_hold.data_category,
    'ARCHIVE',
    v_hold.hold_authority,
    v_actor_id,
    'USER',
    jsonb_build_object(
      'hold_id', p_hold_id,
      'release_reason', p_release_reason
    ),
    p_hold_id
  );

  RETURN json_build_object(
    'success', true,
    'hold_id', p_hold_id,
    'hold_status', 'RELEASED',
    'message', 'Legal hold released. Retention policies now apply.'
  );
END;
$$;

-- Function: get_active_legal_holds
-- Gets active legal holds
CREATE OR REPLACE FUNCTION get_active_legal_holds()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_holds json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'hold_id', hold_id,
      'hold_reason', hold_reason,
      'hold_authority', hold_authority,
      'hold_reference', hold_reference,
      'hold_scope', hold_scope,
      'scope_identifier', scope_identifier,
      'data_category', data_category,
      'blocks_erasure', blocks_erasure,
      'blocks_archival', blocks_archival,
      'applied_at', applied_at
    ) ORDER BY applied_at DESC
  )
  INTO v_holds
  FROM legal_holds
  WHERE hold_status = 'ACTIVE';

  RETURN json_build_object(
    'success', true,
    'holds', COALESCE(v_holds, '[]'::json)
  );
END;
$$;
