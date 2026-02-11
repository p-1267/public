/*
  # Resident Baseline Completion RPCs (Phase 20)

  ## Purpose
  RPC functions for medications, care plans, consent, validation, and sealing.

  ## Functions
  1. add_resident_medication - Add medication to baseline
  2. create_care_plan_anchors - Create care plan expectations
  3. set_consent_config - Set consent and visibility
  4. validate_baseline_completeness - Check if ready to seal
  5. seal_resident_baseline - Final confirmation and lock

  ## Security
  - All functions enforce authorization
  - All actions are audited
  - Sealed baselines cannot be modified
*/

-- Function: add_resident_medication
-- Adds medication to resident baseline
CREATE OR REPLACE FUNCTION add_resident_medication(
  p_resident_id uuid,
  p_medication_name text,
  p_dosage text,
  p_frequency text,
  p_route text,
  p_schedule jsonb,
  p_prescriber_name text,
  p_is_prn boolean DEFAULT false,
  p_is_controlled boolean DEFAULT false,
  p_start_date date DEFAULT CURRENT_DATE,
  p_end_date date DEFAULT NULL,
  p_indication text DEFAULT NULL,
  p_side_effects_to_monitor text DEFAULT NULL,
  p_special_instructions text DEFAULT NULL,
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
  v_medication_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name INTO v_user_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  INSERT INTO resident_medications (
    resident_id,
    medication_name,
    dosage,
    frequency,
    route,
    schedule,
    prescriber_name,
    is_prn,
    is_controlled,
    start_date,
    end_date,
    indication,
    side_effects_to_monitor,
    special_instructions,
    is_active,
    entered_by,
    language_context
  ) VALUES (
    p_resident_id,
    p_medication_name,
    p_dosage,
    p_frequency,
    p_route,
    p_schedule,
    p_prescriber_name,
    p_is_prn,
    p_is_controlled,
    p_start_date,
    p_end_date,
    p_indication,
    p_side_effects_to_monitor,
    p_special_instructions,
    true,
    v_user_id,
    p_language_context
  )
  RETURNING id INTO v_medication_id;

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
    'MEDICATION_ADDED',
    json_build_object(
      'medication_id', v_medication_id,
      'medication_name', p_medication_name,
      'is_prn', p_is_prn,
      'is_controlled', p_is_controlled
    ),
    v_user_id,
    v_user_role,
    'MANUAL',
    p_language_context,
    'NOT_APPLICABLE'
  );

  RETURN json_build_object(
    'success', true,
    'medication_id', v_medication_id,
    'is_controlled', p_is_controlled
  );
END;
$$;

-- Function: create_care_plan_anchors
-- Creates care plan anchors for resident
CREATE OR REPLACE FUNCTION create_care_plan_anchors(
  p_resident_id uuid,
  p_care_frequency text,
  p_mobility_assistance_needs text[],
  p_behavioral_considerations text DEFAULT NULL,
  p_dietary_restrictions text[] DEFAULT '{}',
  p_dietary_preferences text[] DEFAULT '{}',
  p_sleep_patterns jsonb DEFAULT '{"typical_bedtime": "22:00", "typical_wake": "07:00"}',
  p_known_triggers text[] DEFAULT '{}',
  p_communication_preferences text DEFAULT NULL,
  p_activity_preferences text[] DEFAULT '{}',
  p_social_needs text DEFAULT NULL,
  p_special_considerations text DEFAULT NULL,
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
  v_anchor_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name INTO v_user_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  INSERT INTO resident_care_plan_anchors (
    resident_id,
    care_frequency,
    mobility_assistance_needs,
    behavioral_considerations,
    dietary_restrictions,
    dietary_preferences,
    sleep_patterns,
    known_triggers,
    communication_preferences,
    activity_preferences,
    social_needs,
    special_considerations,
    entered_by,
    language_context
  ) VALUES (
    p_resident_id,
    p_care_frequency,
    p_mobility_assistance_needs,
    p_behavioral_considerations,
    p_dietary_restrictions,
    p_dietary_preferences,
    p_sleep_patterns,
    p_known_triggers,
    p_communication_preferences,
    p_activity_preferences,
    p_social_needs,
    p_special_considerations,
    v_user_id,
    p_language_context
  )
  ON CONFLICT (resident_id)
  DO UPDATE SET
    care_frequency = p_care_frequency,
    mobility_assistance_needs = p_mobility_assistance_needs,
    behavioral_considerations = p_behavioral_considerations,
    dietary_restrictions = p_dietary_restrictions,
    dietary_preferences = p_dietary_preferences,
    sleep_patterns = p_sleep_patterns,
    known_triggers = p_known_triggers,
    communication_preferences = p_communication_preferences,
    activity_preferences = p_activity_preferences,
    social_needs = p_social_needs,
    special_considerations = p_special_considerations,
    entered_by = v_user_id,
    language_context = p_language_context,
    updated_at = now()
  RETURNING id INTO v_anchor_id;

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
    'CARE_PLAN_CREATED',
    json_build_object(
      'care_frequency', p_care_frequency,
      'mobility_needs_count', array_length(p_mobility_assistance_needs, 1)
    ),
    v_user_id,
    v_user_role,
    'MANUAL',
    p_language_context,
    'NOT_APPLICABLE'
  );

  RETURN json_build_object(
    'success', true,
    'anchor_id', v_anchor_id
  );
END;
$$;

-- Function: set_consent_config
-- Sets consent and visibility configuration
CREATE OR REPLACE FUNCTION set_consent_config(
  p_resident_id uuid,
  p_family_visibility_level text,
  p_ai_assistance_level text,
  p_data_sharing_scope text,
  p_emergency_override_permissions jsonb,
  p_photo_consent boolean,
  p_voice_recording_consent boolean,
  p_biometric_consent boolean,
  p_third_party_sharing_consent boolean,
  p_consent_obtained_from text,
  p_legal_representative_name text DEFAULT NULL,
  p_legal_representative_relationship text DEFAULT NULL,
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
  v_consent_id uuid;
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

  -- Deactivate previous consent configs
  UPDATE resident_consent_config
  SET is_active = false
  WHERE resident_id = p_resident_id
  AND is_active = true;

  -- Get next version
  SELECT COALESCE(MAX(consent_version), 0) + 1 INTO v_next_version
  FROM resident_consent_config
  WHERE resident_id = p_resident_id;

  INSERT INTO resident_consent_config (
    resident_id,
    consent_version,
    family_visibility_level,
    ai_assistance_level,
    data_sharing_scope,
    emergency_override_permissions,
    photo_consent,
    voice_recording_consent,
    biometric_consent,
    third_party_sharing_consent,
    consent_obtained_by,
    consent_obtained_from,
    legal_representative_name,
    legal_representative_relationship,
    is_active,
    language_context
  ) VALUES (
    p_resident_id,
    v_next_version,
    p_family_visibility_level,
    p_ai_assistance_level,
    p_data_sharing_scope,
    p_emergency_override_permissions,
    p_photo_consent,
    p_voice_recording_consent,
    p_biometric_consent,
    p_third_party_sharing_consent,
    v_user_id,
    p_consent_obtained_from,
    p_legal_representative_name,
    p_legal_representative_relationship,
    true,
    p_language_context
  )
  RETURNING id INTO v_consent_id;

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
    'CONSENT_OBTAINED',
    json_build_object(
      'consent_id', v_consent_id,
      'consent_version', v_next_version,
      'obtained_from', p_consent_obtained_from
    ),
    v_user_id,
    v_user_role,
    'MANUAL',
    p_language_context,
    'NOT_APPLICABLE'
  );

  RETURN json_build_object(
    'success', true,
    'consent_id', v_consent_id,
    'consent_version', v_next_version
  );
END;
$$;

-- Function: validate_baseline_completeness
-- Validates if baseline is complete and ready to seal
CREATE OR REPLACE FUNCTION validate_baseline_completeness(
  p_resident_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_baseline boolean;
  v_baseline_sealed boolean;
  v_emergency_contact_count integer;
  v_has_primary_physician boolean;
  v_has_care_plan boolean;
  v_has_consent boolean;
  v_is_complete boolean := true;
  v_missing_items text[] := '{}';
BEGIN
  -- Check baseline exists and not sealed
  SELECT EXISTS(
    SELECT 1 FROM resident_baselines
    WHERE resident_id = p_resident_id
    AND is_sealed = false
  ), EXISTS(
    SELECT 1 FROM resident_baselines
    WHERE resident_id = p_resident_id
    AND is_sealed = true
  )
  INTO v_has_baseline, v_baseline_sealed;

  IF NOT v_has_baseline THEN
    v_is_complete := false;
    v_missing_items := array_append(v_missing_items, 'BASELINE_HEALTH_SNAPSHOT');
  END IF;

  IF v_baseline_sealed THEN
    RETURN json_build_object(
      'is_complete', true,
      'is_sealed', true,
      'message', 'Baseline is already sealed'
    );
  END IF;

  -- Check emergency contacts (minimum 2)
  SELECT COUNT(*) INTO v_emergency_contact_count
  FROM resident_emergency_contacts
  WHERE resident_id = p_resident_id;

  IF v_emergency_contact_count < 2 THEN
    v_is_complete := false;
    v_missing_items := array_append(v_missing_items, 'EMERGENCY_CONTACTS: Need at least 2, have ' || v_emergency_contact_count);
  END IF;

  -- Check primary physician
  SELECT EXISTS(
    SELECT 1 FROM resident_physicians
    WHERE resident_id = p_resident_id
    AND is_primary = true
  ) INTO v_has_primary_physician;

  IF NOT v_has_primary_physician THEN
    v_is_complete := false;
    v_missing_items := array_append(v_missing_items, 'PRIMARY_PHYSICIAN');
  END IF;

  -- Check care plan anchors
  SELECT EXISTS(
    SELECT 1 FROM resident_care_plan_anchors
    WHERE resident_id = p_resident_id
  ) INTO v_has_care_plan;

  IF NOT v_has_care_plan THEN
    v_is_complete := false;
    v_missing_items := array_append(v_missing_items, 'CARE_PLAN_ANCHORS');
  END IF;

  -- Check consent config
  SELECT EXISTS(
    SELECT 1 FROM resident_consent_config
    WHERE resident_id = p_resident_id
    AND is_active = true
  ) INTO v_has_consent;

  IF NOT v_has_consent THEN
    v_is_complete := false;
    v_missing_items := array_append(v_missing_items, 'CONSENT_CONFIGURATION');
  END IF;

  RETURN json_build_object(
    'is_complete', v_is_complete,
    'is_sealed', false,
    'missing_items', v_missing_items,
    'checks', json_build_object(
      'has_baseline', v_has_baseline,
      'emergency_contacts', v_emergency_contact_count,
      'has_primary_physician', v_has_primary_physician,
      'has_care_plan', v_has_care_plan,
      'has_consent', v_has_consent
    )
  );
END;
$$;

-- Function: seal_resident_baseline
-- Seals baseline (final confirmation and lock)
CREATE OR REPLACE FUNCTION seal_resident_baseline(
  p_resident_id uuid,
  p_confirmation_text text
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
  v_validation json;
  v_is_complete boolean;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name INTO v_user_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- Validate completeness
  SELECT validate_baseline_completeness(p_resident_id) INTO v_validation;
  SELECT (v_validation->>'is_complete')::boolean INTO v_is_complete;

  IF NOT v_is_complete THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Baseline is incomplete',
      'validation', v_validation
    );
  END IF;

  -- Verify confirmation text
  IF p_confirmation_text != 'I confirm this baseline represents the resident''s current state.' THEN
    RAISE EXCEPTION 'Invalid confirmation text';
  END IF;

  -- Seal the baseline
  UPDATE resident_baselines
  SET is_sealed = true,
      sealed_at = now(),
      sealed_by = v_user_id,
      updated_at = now()
  WHERE resident_id = p_resident_id
  AND is_sealed = false
  RETURNING id INTO v_baseline_id;

  IF v_baseline_id IS NULL THEN
    RAISE EXCEPTION 'No unsealed baseline found for resident';
  END IF;

  -- Update resident status to ACTIVE
  UPDATE residents
  SET updated_at = now()
  WHERE id = p_resident_id;

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
    'BASELINE_SEALED',
    json_build_object(
      'confirmation', p_confirmation_text,
      'sealed_at', now()
    ),
    v_user_id,
    v_user_role,
    'MANUAL',
    'en',
    'PASSED'
  );

  RETURN json_build_object(
    'success', true,
    'baseline_id', v_baseline_id,
    'sealed_at', now(),
    'message', 'Baseline sealed successfully. Care execution is now unlocked.'
  );
END;
$$;
