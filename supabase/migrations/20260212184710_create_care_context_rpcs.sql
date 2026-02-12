/*
  # Create Care Context Management RPCs

  1. RPCs
    - `get_active_care_context(resident_id uuid)` - Returns active context for resident
    - `set_active_care_context(resident_id uuid, context_id uuid)` - Sets active context atomically
    - `create_default_care_context(resident_id uuid)` - Creates default SELF context
*/

-- Function: Get active care context for a resident
CREATE OR REPLACE FUNCTION get_active_care_context(p_resident_id uuid)
RETURNS TABLE (
  id uuid,
  resident_id uuid,
  management_mode text,
  care_setting text,
  service_model text,
  agency_id uuid,
  family_admin_user_id uuid,
  supervision_enabled boolean,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cc.id,
    cc.resident_id,
    cc.management_mode,
    cc.care_setting,
    cc.service_model,
    cc.agency_id,
    cc.family_admin_user_id,
    cc.supervision_enabled,
    cc.is_active,
    cc.created_at,
    cc.updated_at
  FROM care_contexts cc
  WHERE cc.resident_id = p_resident_id 
    AND cc.is_active = true
  LIMIT 1;
END;
$$;

-- Function: Set active care context (deactivates others atomically)
CREATE OR REPLACE FUNCTION set_active_care_context(
  p_resident_id uuid,
  p_context_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_context_id uuid;
BEGIN
  -- Deactivate all contexts for this resident
  UPDATE care_contexts
  SET is_active = false, updated_at = now()
  WHERE resident_id = p_resident_id;
  
  -- Activate the specified context
  UPDATE care_contexts
  SET is_active = true, updated_at = now()
  WHERE id = p_context_id AND resident_id = p_resident_id
  RETURNING id INTO v_context_id;
  
  -- If no context was updated, raise exception
  IF v_context_id IS NULL THEN
    RAISE EXCEPTION 'Context % not found for resident %', p_context_id, p_resident_id;
  END IF;
  
  RETURN v_context_id;
END;
$$;

-- Function: Create default care context for a resident
CREATE OR REPLACE FUNCTION create_default_care_context(p_resident_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_context_id uuid;
  v_existing_active_id uuid;
BEGIN
  -- Check if an active context already exists
  SELECT id INTO v_existing_active_id
  FROM care_contexts
  WHERE resident_id = p_resident_id AND is_active = true
  LIMIT 1;
  
  -- If active context exists, return it (idempotent)
  IF v_existing_active_id IS NOT NULL THEN
    RETURN v_existing_active_id;
  END IF;
  
  -- Create default SELF context
  INSERT INTO care_contexts (
    resident_id,
    management_mode,
    care_setting,
    service_model,
    supervision_enabled,
    is_active
  ) VALUES (
    p_resident_id,
    'SELF',
    'IN_HOME',
    'NONE',
    false,
    true
  )
  RETURNING id INTO v_context_id;
  
  RETURN v_context_id;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_active_care_context(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION set_active_care_context(uuid, uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION create_default_care_context(uuid) TO authenticated, anon;
