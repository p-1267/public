/*
  # Create or Update Care Context RPC

  Creates RPC to create or update care context for a resident.
  This is idempotent - it will create a new context or update the active one.

  1. RPC
    - `create_or_update_care_context` - Creates or updates active care context
*/

CREATE OR REPLACE FUNCTION create_or_update_care_context(
  p_resident_id uuid,
  p_management_mode text,
  p_care_setting text,
  p_service_model text,
  p_supervision_enabled boolean,
  p_agency_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_context_id uuid;
  v_existing_id uuid;
BEGIN
  -- Check if an active context exists for this resident
  SELECT id INTO v_existing_id
  FROM care_contexts
  WHERE resident_id = p_resident_id AND is_active = true
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    -- Update existing active context
    UPDATE care_contexts
    SET
      management_mode = p_management_mode,
      care_setting = p_care_setting,
      service_model = p_service_model,
      supervision_enabled = p_supervision_enabled,
      agency_id = p_agency_id,
      updated_at = now()
    WHERE id = v_existing_id
    RETURNING id INTO v_context_id;

    RETURN v_context_id;
  ELSE
    -- Create new context
    INSERT INTO care_contexts (
      resident_id,
      management_mode,
      care_setting,
      service_model,
      supervision_enabled,
      agency_id,
      is_active
    ) VALUES (
      p_resident_id,
      p_management_mode,
      p_care_setting,
      p_service_model,
      p_supervision_enabled,
      p_agency_id,
      true
    )
    RETURNING id INTO v_context_id;

    RETURN v_context_id;
  END IF;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_or_update_care_context(uuid, text, text, text, boolean, uuid) TO authenticated, anon;
