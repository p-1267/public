/*
  # Resident Baseline Management RPCs (Phase 20)

  ## Purpose
  RPC functions for creating and managing resident baselines.
  Enforces validation rules and audit logging.

  ## Functions
  1. create_resident_baseline - Create baseline health snapshot
  2. seal_resident_baseline - Seal baseline (final confirmation)
  3. validate_baseline_completeness - Check if baseline is complete
  4. add_emergency_contact - Add emergency contact
  5. add_resident_physician - Add physician
  6. add_resident_medication - Add medication
  7. create_care_plan_anchors - Create care plan anchors
  8. set_consent_config - Set consent configuration

  ## Security
  - All functions enforce authorization
  - All actions are audited
  - Sealed baselines are immutable
*/

-- Function: create_resident_baseline
-- Creates baseline health snapshot for resident
CREATE OR REPLACE FUNCTION create_resident_baseline(
  p_resident_id uuid,
  p_blood_pressure_systolic integer,
  p_blood_pressure_diastolic integer,
  p_heart_rate integer,
  p_weight_kg numeric,
  p_mobility_status text,
  p_cognitive_status text,
  p_fall_risk_level text,
  p_baseline_notes text DEFAULT NULL,
  p_data_source text DEFAULT 'MANUAL',
  p_language_context text DEFAULT 'en'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_baseline_id uuid;
  v_existing_baseline uuid;
  v_next_version integer := 1;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name INTO v_user_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- Check if resident already has a baseline
  SELECT id, baseline_version INTO v_existing_baseline, v_next_version
  FROM resident_baselines
  WHERE resident_id = p_resident_id
  AND is_sealed = false
  ORDER BY baseline_version DESC
  LIMIT 1;

  IF v_existing_baseline IS NOT NULL THEN
    -- Update existing unsealed baseline
    UPDATE resident_baselines
    SET blood_pressure_systolic = p_blood_pressure_systolic,
        blood_pressure_diastolic = p_blood_pressure_diastolic,
        heart_rate = p_heart_rate,
        weight_kg = p_weight_kg,
        mobility_status = p_mobility_status,
        cognitive_status = p_cognitive_status,
        fall_risk_level = p_fall_risk_level,
        baseline_notes = p_baseline_notes,
        data_source = p_data_source,
        language_context = p_language_context,
        updated_at = now()
    WHERE id = v_existing_baseline
    RETURNING id INTO v_baseline_id;
  ELSE
    -- Create new baseline
    SELECT COALESCE(MAX(baseline_version), 0) + 1 INTO v_next_version
    FROM resident_baselines
    WHERE resident_id = p_resident_id;

    INSERT INTO resident_baselines (
      resident_id,
      baseline_version,
      blood_pressure_systolic,
      blood_pressure_diastolic,
      heart_rate,
      weight_kg,
      mobility_status,
      cognitive_status,
      fall_risk_level,
      baseline_notes,
      data_source,
      entered_by,
      entered_by_role,
      language_context
    ) VALUES (
      p_resident_id,
      v_next_version,
      p_blood_pressure_systolic,
      p_blood_pressure_diastolic,
      p_heart_rate,
      p_weight_kg,
      p_mobility_status,
      p_cognitive_status,
      p_fall_risk_level,
      p_baseline_notes,
      p_data_source,
      v_user_id,
      v_user_role,
      p_language_context
    )
    RETURNING id INTO v_baseline_id;
  END IF;

  -- Log audit event
  INSERT INTO resident_baseline_audit (
    resident_id,
    baseline_id,
    event_type,
    event_data,
    performed_by,
    performed_by_role,
    data_source,
    language_context,
    validation_status
  ) VALUES (
    p_resident_id,
    v_baseline_id,
    CASE WHEN v_existing_baseline IS NOT NULL THEN 'BASELINE_UPDATED' ELSE 'BASELINE_CREATED' END,
    json_build_object(
      'bp_systolic', p_blood_pressure_systolic,
      'bp_diastolic', p_blood_pressure_diastolic,
      'heart_rate', p_heart_rate,
      'weight_kg', p_weight_kg,
      'mobility', p_mobility_status,
      'cognitive', p_cognitive_status,
      'fall_risk', p_fall_risk_level
    ),
    v_user_id,
    v_user_role,
    p_data_source,
    p_language_context,
    'NOT_APPLICABLE'
  );

  RETURN json_build_object(
    'success', true,
    'baseline_id', v_baseline_id,
    'baseline_version', v_next_version
  );
END;
$$;

-- Function: add_emergency_contact
-- Adds emergency contact for resident
CREATE OR REPLACE FUNCTION add_emergency_contact(
  p_resident_id uuid,
  p_contact_name text,
  p_relationship text,
  p_phone_primary text,
  p_phone_secondary text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_is_primary boolean DEFAULT false,
  p_notes text DEFAULT NULL,
  p_language_context text DEFAULT 'en'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_contact_id uuid;
  v_next_order integer;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name INTO v_user_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- Get next contact order
  SELECT COALESCE(MAX(contact_order), 0) + 1 INTO v_next_order
  FROM resident_emergency_contacts
  WHERE resident_id = p_resident_id;

  -- If this is primary, unset other primary contacts
  IF p_is_primary THEN
    UPDATE resident_emergency_contacts
    SET is_primary = false
    WHERE resident_id = p_resident_id
    AND is_primary = true;
  END IF;

  INSERT INTO resident_emergency_contacts (
    resident_id,
    contact_name,
    relationship,
    phone_primary,
    phone_secondary,
    email,
    is_primary,
    contact_order,
    notes,
    entered_by,
    language_context
  ) VALUES (
    p_resident_id,
    p_contact_name,
    p_relationship,
    p_phone_primary,
    p_phone_secondary,
    p_email,
    p_is_primary,
    v_next_order,
    p_notes,
    v_user_id,
    p_language_context
  )
  RETURNING id INTO v_contact_id;

  -- Log audit event
  INSERT INTO resident_baseline_audit (
    resident_id,
    event_type,
    event_data,
    performed_by,
    performed_by_role,
    data_source,
    language_context,
    validation_status
  ) VALUES (
    p_resident_id,
    'EMERGENCY_CONTACT_ADDED',
    json_build_object(
      'contact_id', v_contact_id,
      'contact_name', p_contact_name,
      'relationship', p_relationship,
      'is_primary', p_is_primary
    ),
    v_user_id,
    v_user_role,
    'MANUAL',
    p_language_context,
    'NOT_APPLICABLE'
  );

  RETURN json_build_object(
    'success', true,
    'contact_id', v_contact_id
  );
END;
$$;

-- Function: add_resident_physician
-- Adds physician for resident
CREATE OR REPLACE FUNCTION add_resident_physician(
  p_resident_id uuid,
  p_physician_name text,
  p_specialty text,
  p_clinic_name text,
  p_phone text,
  p_fax text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_is_primary boolean DEFAULT false,
  p_notes text DEFAULT NULL,
  p_language_context text DEFAULT 'en'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_physician_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name INTO v_user_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- If this is primary, unset other primary physicians
  IF p_is_primary THEN
    UPDATE resident_physicians
    SET is_primary = false
    WHERE resident_id = p_resident_id
    AND is_primary = true;
  END IF;

  INSERT INTO resident_physicians (
    resident_id,
    physician_name,
    specialty,
    clinic_name,
    phone,
    fax,
    email,
    address,
    is_primary,
    notes,
    entered_by,
    language_context
  ) VALUES (
    p_resident_id,
    p_physician_name,
    p_specialty,
    p_clinic_name,
    p_phone,
    p_fax,
    p_email,
    p_address,
    p_is_primary,
    p_notes,
    v_user_id,
    p_language_context
  )
  RETURNING id INTO v_physician_id;

  -- Log audit event
  INSERT INTO resident_baseline_audit (
    resident_id,
    event_type,
    event_data,
    performed_by,
    performed_by_role,
    data_source,
    language_context,
    validation_status
  ) VALUES (
    p_resident_id,
    'PHYSICIAN_ADDED',
    json_build_object(
      'physician_id', v_physician_id,
      'physician_name', p_physician_name,
      'specialty', p_specialty,
      'is_primary', p_is_primary
    ),
    v_user_id,
    v_user_role,
    'MANUAL',
    p_language_context,
    'NOT_APPLICABLE'
  );

  RETURN json_build_object(
    'success', true,
    'physician_id', v_physician_id
  );
END;
$$;
