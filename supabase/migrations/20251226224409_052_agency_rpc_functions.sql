/*
  # Agency RPC Functions

  ## Purpose
  Brain-validated functions for agency management operations.
  All functions enforce permissions, validate input, and log to audit.

  ## Functions
  1. create_agency(name, metadata) - Create new agency
  2. update_agency(agency_id, metadata) - Update agency metadata
  3. get_agency(agency_id) - Get agency details

  ## Security
  - All functions check permissions via Brain system
  - All mutations are auditable
  - No cascading side effects
  - Validation before execution
*/

-- Create Agency
CREATE OR REPLACE FUNCTION create_agency(
  p_name text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_agency_id uuid;
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check permission
  IF NOT user_has_permission(v_user_id, 'agency.create') THEN
    RAISE EXCEPTION 'Permission denied: agency.create required';
  END IF;

  -- Validate name
  IF p_name IS NULL OR trim(p_name) = '' THEN
    RAISE EXCEPTION 'Agency name is required';
  END IF;

  -- Create agency
  INSERT INTO agencies (name, metadata, created_by)
  VALUES (p_name, COALESCE(p_metadata, '{}'::jsonb), v_user_id)
  RETURNING id INTO v_agency_id;

  -- Log audit entry
  PERFORM log_audit_entry(
    v_user_id,
    'CREATE',
    'agency',
    v_agency_id,
    NULL,
    jsonb_build_object('name', p_name, 'metadata', p_metadata)
  );

  RETURN v_agency_id;
END;
$$;

-- Update Agency
CREATE OR REPLACE FUNCTION update_agency(
  p_agency_id uuid,
  p_metadata jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_old_metadata jsonb;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check permission
  IF NOT user_has_permission(v_user_id, 'agency.update') THEN
    RAISE EXCEPTION 'Permission denied: agency.update required';
  END IF;

  -- Get old metadata for audit
  SELECT metadata INTO v_old_metadata
  FROM agencies
  WHERE id = p_agency_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Agency not found';
  END IF;

  -- Update agency
  UPDATE agencies
  SET metadata = p_metadata,
      updated_at = now()
  WHERE id = p_agency_id;

  -- Log audit entry
  PERFORM log_audit_entry(
    v_user_id,
    'UPDATE',
    'agency',
    p_agency_id,
    jsonb_build_object('metadata', v_old_metadata),
    jsonb_build_object('metadata', p_metadata)
  );
END;
$$;

-- Get Agency
CREATE OR REPLACE FUNCTION get_agency(
  p_agency_id uuid
)
RETURNS TABLE (
  id uuid,
  name text,
  status text,
  metadata jsonb,
  created_at timestamptz,
  created_by uuid,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check permission
  IF NOT user_has_permission(v_user_id, 'agency.view') THEN
    RAISE EXCEPTION 'Permission denied: agency.view required';
  END IF;

  -- Return agency (RLS will enforce agency-scoped access)
  RETURN QUERY
  SELECT a.id, a.name, a.status, a.metadata, a.created_at, a.created_by, a.updated_at
  FROM agencies a
  WHERE a.id = p_agency_id;
END;
$$;
