/*
  # Financial Adjustment RPCs (Phase 25)

  ## Purpose
  Non-destructive corrections to financial records.
  Preserves original data.

  ## Functions
  1. create_financial_adjustment - Create adjustment entry
  2. approve_financial_adjustment - Approve adjustment
  3. get_adjustments - Get adjustments for export

  ## Security
  - Finance admin only
  - Original data preserved
  - Complete audit trail

  ## Enforcement Rules
  1. Create adjustment entry (not edit)
  2. Reference original record
  3. Provide reason (mandatory)
  4. Preserve original data
  5. No deletion allowed
*/

-- Function: create_financial_adjustment
-- Creates a financial adjustment
CREATE OR REPLACE FUNCTION create_financial_adjustment(
  p_adjustment_type text,
  p_original_export_id uuid,
  p_original_record_id text,
  p_adjustment_reason text,
  p_original_value jsonb,
  p_adjusted_value jsonb,
  p_amount_delta numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_agency_id uuid;
  v_adjustment_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name, up.agency_id
  INTO v_user_role, v_agency_id
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- Only agency admins and finance admins can create adjustments
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions: Only AGENCY_ADMIN or FINANCE_ADMIN can create adjustments';
  END IF;

  -- Validate adjustment type
  IF p_adjustment_type NOT IN ('PAYROLL', 'BILLING') THEN
    RAISE EXCEPTION 'Invalid adjustment type: must be PAYROLL or BILLING';
  END IF;

  -- Reason is mandatory
  IF p_adjustment_reason IS NULL OR trim(p_adjustment_reason) = '' THEN
    RAISE EXCEPTION 'Adjustment reason is mandatory';
  END IF;

  -- Create adjustment
  INSERT INTO financial_adjustments (
    agency_id,
    adjustment_type,
    original_export_id,
    original_record_id,
    adjustment_reason,
    original_value,
    adjusted_value,
    amount_delta,
    performed_by,
    performed_by_role,
    is_approved
  ) VALUES (
    v_agency_id,
    p_adjustment_type,
    p_original_export_id,
    p_original_record_id,
    p_adjustment_reason,
    p_original_value,
    p_adjusted_value,
    p_amount_delta,
    v_user_id,
    v_user_role,
    false
  )
  RETURNING id INTO v_adjustment_id;

  -- Audit adjustment creation
  INSERT INTO financial_audit (
    agency_id,
    actor_id,
    actor_role,
    action_type,
    export_type,
    adjustment_id,
    metadata
  ) VALUES (
    v_agency_id,
    v_user_id,
    v_user_role,
    'ADJUSTMENT_CREATED',
    p_adjustment_type,
    v_adjustment_id,
    jsonb_build_object(
      'original_export_id', p_original_export_id,
      'original_record_id', p_original_record_id,
      'amount_delta', p_amount_delta,
      'reason', p_adjustment_reason
    )
  );

  RETURN json_build_object(
    'success', true,
    'adjustment_id', v_adjustment_id,
    'is_approved', false,
    'message', 'Financial adjustment created successfully - awaiting approval'
  );
END;
$$;

-- Function: approve_financial_adjustment
-- Approves a financial adjustment
CREATE OR REPLACE FUNCTION approve_financial_adjustment(
  p_adjustment_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_adjustment record;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name
  INTO v_user_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- Only agency admins and finance admins can approve adjustments
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions: Only AGENCY_ADMIN or FINANCE_ADMIN can approve adjustments';
  END IF;

  -- Get adjustment
  SELECT * INTO v_adjustment
  FROM financial_adjustments
  WHERE id = p_adjustment_id;

  IF v_adjustment IS NULL THEN
    RAISE EXCEPTION 'Adjustment not found';
  END IF;

  IF v_adjustment.is_approved THEN
    RAISE EXCEPTION 'Adjustment is already approved';
  END IF;

  -- Cannot approve own adjustment
  IF v_adjustment.performed_by = v_user_id THEN
    RAISE EXCEPTION 'Cannot approve your own adjustment';
  END IF;

  -- Approve adjustment
  UPDATE financial_adjustments
  SET is_approved = true,
      approved_by = v_user_id,
      approved_at = now()
  WHERE id = p_adjustment_id;

  -- Audit approval
  INSERT INTO financial_audit (
    agency_id,
    actor_id,
    actor_role,
    action_type,
    export_type,
    adjustment_id,
    metadata
  ) VALUES (
    v_adjustment.agency_id,
    v_user_id,
    v_user_role,
    'ADJUSTMENT_APPROVED',
    v_adjustment.adjustment_type,
    p_adjustment_id,
    jsonb_build_object(
      'approved_at', now(),
      'original_performer', v_adjustment.performed_by
    )
  );

  RETURN json_build_object(
    'success', true,
    'adjustment_id', p_adjustment_id,
    'is_approved', true,
    'approved_at', now(),
    'message', 'Financial adjustment approved successfully'
  );
END;
$$;

-- Function: get_adjustments
-- Gets adjustments for export or agency
CREATE OR REPLACE FUNCTION get_adjustments(
  p_export_id uuid DEFAULT NULL,
  p_adjustment_type text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_agency_id uuid;
  v_adjustments json;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT agency_id
  INTO v_agency_id
  FROM user_profiles
  WHERE id = v_user_id;

  SELECT json_agg(
    json_build_object(
      'id', fa.id,
      'adjustment_type', fa.adjustment_type,
      'original_export_id', fa.original_export_id,
      'original_record_id', fa.original_record_id,
      'adjustment_reason', fa.adjustment_reason,
      'original_value', fa.original_value,
      'adjusted_value', fa.adjusted_value,
      'amount_delta', fa.amount_delta,
      'performed_by_name', up1.full_name,
      'performed_by_role', fa.performed_by_role,
      'is_approved', fa.is_approved,
      'approved_by_name', up2.full_name,
      'approved_at', fa.approved_at,
      'created_at', fa.created_at
    ) ORDER BY fa.created_at DESC
  )
  INTO v_adjustments
  FROM financial_adjustments fa
  JOIN user_profiles up1 ON up1.id = fa.performed_by
  LEFT JOIN user_profiles up2 ON up2.id = fa.approved_by
  WHERE fa.agency_id = v_agency_id
  AND (p_export_id IS NULL OR fa.original_export_id = p_export_id)
  AND (p_adjustment_type IS NULL OR fa.adjustment_type = p_adjustment_type);

  RETURN json_build_object(
    'success', true,
    'adjustments', COALESCE(v_adjustments, '[]'::json),
    'adjustment_count', COALESCE(json_array_length(v_adjustments), 0)
  );
END;
$$;
