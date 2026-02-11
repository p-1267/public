/*
  # Export Generation and Sealing RPCs (Phase 25)

  ## Purpose
  Generate, seal, and retrieve payroll/billing exports.
  Sealed exports are immutable.

  ## Functions
  1. generate_payroll_export - Generate payroll export
  2. generate_billing_export - Generate billing export
  3. seal_export - Seal an export (make immutable)
  4. get_exports - Get exports for agency

  ## Security
  - Finance admin only
  - Sealed exports cannot be modified
  - Complete audit trail

  ## Enforcement Rules
  1. Sealed exports are IMMUTABLE
  2. Regeneration creates new version, never overwrites
  3. Each export includes: Source record IDs, Generation timestamp, Export version, Jurisdiction context
*/

-- Function: generate_payroll_export
-- Generates a payroll export
CREATE OR REPLACE FUNCTION generate_payroll_export(
  p_start_date date,
  p_end_date date,
  p_format text,
  p_jurisdiction text
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
  v_export_id uuid;
  v_payroll_data json;
  v_data_hash text;
  v_export_version integer := 1;
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

  -- Only agency admins and finance admins can generate exports
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Validate format
  IF p_format NOT IN ('CSV', 'JSON') THEN
    RAISE EXCEPTION 'Invalid format: must be CSV or JSON';
  END IF;

  -- Calculate payroll
  v_payroll_data := calculate_payroll_preview(p_start_date, p_end_date);

  -- Get next version number
  SELECT COALESCE(MAX(export_version), 0) + 1
  INTO v_export_version
  FROM payroll_exports
  WHERE agency_id = v_agency_id
  AND start_date = p_start_date
  AND end_date = p_end_date;

  -- Generate hash
  v_data_hash := md5(v_payroll_data::text);

  -- Create export record
  INSERT INTO payroll_exports (
    agency_id,
    export_version,
    start_date,
    end_date,
    format,
    generated_by,
    generated_at,
    record_count,
    total_hours,
    total_amount,
    data_hash,
    export_data,
    is_sealed,
    jurisdiction
  ) VALUES (
    v_agency_id,
    v_export_version,
    p_start_date,
    p_end_date,
    p_format,
    v_user_id,
    now(),
    (v_payroll_data->>'record_count')::integer,
    (v_payroll_data->>'total_hours')::numeric,
    (v_payroll_data->>'total_amount')::numeric,
    v_data_hash,
    v_payroll_data::jsonb,
    false,
    p_jurisdiction
  )
  RETURNING id INTO v_export_id;

  -- Audit export generation
  INSERT INTO financial_audit (
    agency_id,
    actor_id,
    actor_role,
    action_type,
    export_type,
    export_id,
    date_range_start,
    date_range_end,
    record_count,
    data_hash,
    metadata
  ) VALUES (
    v_agency_id,
    v_user_id,
    v_user_role,
    'EXPORT_GENERATED',
    'PAYROLL',
    v_export_id,
    p_start_date,
    p_end_date,
    (v_payroll_data->>'record_count')::integer,
    v_data_hash,
    jsonb_build_object(
      'format', p_format,
      'jurisdiction', p_jurisdiction,
      'export_version', v_export_version
    )
  );

  RETURN json_build_object(
    'success', true,
    'export_id', v_export_id,
    'export_version', v_export_version,
    'record_count', (v_payroll_data->>'record_count')::integer,
    'total_hours', (v_payroll_data->>'total_hours')::numeric,
    'total_amount', (v_payroll_data->>'total_amount')::numeric,
    'data_hash', v_data_hash,
    'is_sealed', false,
    'message', 'Payroll export generated successfully'
  );
END;
$$;

-- Function: generate_billing_export
-- Generates a billing export
CREATE OR REPLACE FUNCTION generate_billing_export(
  p_start_date date,
  p_end_date date,
  p_format text
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
  v_export_id uuid;
  v_billing_data json;
  v_data_hash text;
  v_export_version integer := 1;
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

  -- Only agency admins and finance admins can generate exports
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Validate format
  IF p_format NOT IN ('CSV', 'JSON') THEN
    RAISE EXCEPTION 'Invalid format: must be CSV or JSON';
  END IF;

  -- Calculate billing
  v_billing_data := calculate_billing_preview(p_start_date, p_end_date);

  -- Get next version number
  SELECT COALESCE(MAX(export_version), 0) + 1
  INTO v_export_version
  FROM billing_exports
  WHERE agency_id = v_agency_id
  AND start_date = p_start_date
  AND end_date = p_end_date;

  -- Generate hash
  v_data_hash := md5(v_billing_data::text);

  -- Create export record
  INSERT INTO billing_exports (
    agency_id,
    export_version,
    start_date,
    end_date,
    format,
    generated_by,
    generated_at,
    record_count,
    total_units,
    total_amount,
    data_hash,
    export_data,
    is_sealed
  ) VALUES (
    v_agency_id,
    v_export_version,
    p_start_date,
    p_end_date,
    p_format,
    v_user_id,
    now(),
    (v_billing_data->>'record_count')::integer,
    (v_billing_data->>'total_units')::numeric,
    (v_billing_data->>'total_amount')::numeric,
    v_data_hash,
    v_billing_data::jsonb,
    false
  )
  RETURNING id INTO v_export_id;

  -- Audit export generation
  INSERT INTO financial_audit (
    agency_id,
    actor_id,
    actor_role,
    action_type,
    export_type,
    export_id,
    date_range_start,
    date_range_end,
    record_count,
    data_hash,
    metadata
  ) VALUES (
    v_agency_id,
    v_user_id,
    v_user_role,
    'EXPORT_GENERATED',
    'BILLING',
    v_export_id,
    p_start_date,
    p_end_date,
    (v_billing_data->>'record_count')::integer,
    v_data_hash,
    jsonb_build_object(
      'format', p_format,
      'export_version', v_export_version
    )
  );

  RETURN json_build_object(
    'success', true,
    'export_id', v_export_id,
    'export_version', v_export_version,
    'record_count', (v_billing_data->>'record_count')::integer,
    'total_units', (v_billing_data->>'total_units')::numeric,
    'total_amount', (v_billing_data->>'total_amount')::numeric,
    'data_hash', v_data_hash,
    'is_sealed', false,
    'message', 'Billing export generated successfully'
  );
END;
$$;

-- Function: seal_export
-- Seals a payroll or billing export
CREATE OR REPLACE FUNCTION seal_export(
  p_export_id uuid,
  p_export_type text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_is_sealed boolean;
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

  -- Only agency admins and finance admins can seal exports
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'FINANCE_ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions';
  END IF;

  -- Validate export type
  IF p_export_type NOT IN ('PAYROLL', 'BILLING') THEN
    RAISE EXCEPTION 'Invalid export type: must be PAYROLL or BILLING';
  END IF;

  -- Check if already sealed and seal
  IF p_export_type = 'PAYROLL' THEN
    SELECT is_sealed INTO v_is_sealed
    FROM payroll_exports
    WHERE id = p_export_id;

    IF v_is_sealed THEN
      RAISE EXCEPTION 'Export is already sealed';
    END IF;

    UPDATE payroll_exports
    SET is_sealed = true,
        sealed_at = now(),
        sealed_by = v_user_id
    WHERE id = p_export_id;
  ELSE
    SELECT is_sealed INTO v_is_sealed
    FROM billing_exports
    WHERE id = p_export_id;

    IF v_is_sealed THEN
      RAISE EXCEPTION 'Export is already sealed';
    END IF;

    UPDATE billing_exports
    SET is_sealed = true,
        sealed_at = now(),
        sealed_by = v_user_id
    WHERE id = p_export_id;
  END IF;

  -- Audit seal action
  INSERT INTO financial_audit (
    agency_id,
    actor_id,
    actor_role,
    action_type,
    export_type,
    export_id,
    metadata
  ) VALUES (
    (SELECT agency_id FROM user_profiles WHERE id = v_user_id),
    v_user_id,
    v_user_role,
    'EXPORT_SEALED',
    p_export_type,
    p_export_id,
    jsonb_build_object('sealed_at', now())
  );

  RETURN json_build_object(
    'success', true,
    'export_id', p_export_id,
    'is_sealed', true,
    'sealed_at', now(),
    'message', 'Export sealed successfully - now immutable'
  );
END;
$$;

-- Function: get_exports
-- Gets exports for agency
CREATE OR REPLACE FUNCTION get_exports(
  p_export_type text,
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
  v_exports json;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT agency_id
  INTO v_agency_id
  FROM user_profiles
  WHERE id = v_user_id;

  -- Validate export type
  IF p_export_type NOT IN ('PAYROLL', 'BILLING') THEN
    RAISE EXCEPTION 'Invalid export type: must be PAYROLL or BILLING';
  END IF;

  IF p_export_type = 'PAYROLL' THEN
    SELECT json_agg(
      json_build_object(
        'id', pe.id,
        'export_version', pe.export_version,
        'start_date', pe.start_date,
        'end_date', pe.end_date,
        'format', pe.format,
        'generated_at', pe.generated_at,
        'generated_by_name', up.full_name,
        'record_count', pe.record_count,
        'total_hours', pe.total_hours,
        'total_amount', pe.total_amount,
        'is_sealed', pe.is_sealed,
        'sealed_at', pe.sealed_at,
        'jurisdiction', pe.jurisdiction
      ) ORDER BY pe.generated_at DESC
    )
    INTO v_exports
    FROM payroll_exports pe
    JOIN user_profiles up ON up.id = pe.generated_by
    WHERE pe.agency_id = v_agency_id
    LIMIT p_limit;
  ELSE
    SELECT json_agg(
      json_build_object(
        'id', be.id,
        'export_version', be.export_version,
        'start_date', be.start_date,
        'end_date', be.end_date,
        'format', be.format,
        'generated_at', be.generated_at,
        'generated_by_name', up.full_name,
        'record_count', be.record_count,
        'total_units', be.total_units,
        'total_amount', be.total_amount,
        'is_sealed', be.is_sealed,
        'sealed_at', be.sealed_at
      ) ORDER BY be.generated_at DESC
    )
    INTO v_exports
    FROM billing_exports be
    JOIN user_profiles up ON up.id = be.generated_by
    WHERE be.agency_id = v_agency_id
    LIMIT p_limit;
  END IF;

  RETURN json_build_object(
    'success', true,
    'export_type', p_export_type,
    'exports', COALESCE(v_exports, '[]'::json),
    'export_count', COALESCE(json_array_length(v_exports), 0)
  );
END;
$$;
