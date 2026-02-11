/*
  # Resident Management RPC Functions

  ## Purpose
  Brain-validated functions for resident (senior) management operations.
  All functions enforce permissions, validate input, and log to audit.

  ## Functions
  1. register_resident(full_name, dob, agency_id) - Register new resident
  2. get_residents(agency_id) - Get all residents for an agency

  ## Security
  - All functions check permissions
  - Agency-scoped access via RLS
  - All mutations are auditable
  - No deletion (use status instead)
*/

-- Register Resident
CREATE OR REPLACE FUNCTION register_resident(
  p_full_name text,
  p_date_of_birth date,
  p_agency_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_resident_id uuid;
  v_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check permission
  IF NOT user_has_permission(v_user_id, 'resident.create') THEN
    RAISE EXCEPTION 'Permission denied: resident.create required';
  END IF;

  -- Validate full name
  IF p_full_name IS NULL OR trim(p_full_name) = '' THEN
    RAISE EXCEPTION 'Resident full name is required';
  END IF;

  -- Validate date of birth
  IF p_date_of_birth IS NULL THEN
    RAISE EXCEPTION 'Date of birth is required';
  END IF;

  IF p_date_of_birth > CURRENT_DATE THEN
    RAISE EXCEPTION 'Date of birth cannot be in the future';
  END IF;

  -- Validate agency exists
  IF NOT EXISTS (SELECT 1 FROM agencies WHERE id = p_agency_id) THEN
    RAISE EXCEPTION 'Agency not found';
  END IF;

  -- Create resident
  INSERT INTO residents (full_name, date_of_birth, agency_id, created_by)
  VALUES (p_full_name, p_date_of_birth, p_agency_id, v_user_id)
  RETURNING id INTO v_resident_id;

  -- Log audit entry
  PERFORM log_audit_entry(
    v_user_id,
    'REGISTER_RESIDENT',
    'resident',
    v_resident_id,
    NULL,
    jsonb_build_object(
      'full_name', p_full_name,
      'date_of_birth', p_date_of_birth,
      'agency_id', p_agency_id
    )
  );

  RETURN v_resident_id;
END;
$$;

-- Get Residents
CREATE OR REPLACE FUNCTION get_residents(
  p_agency_id uuid
)
RETURNS TABLE (
  id uuid,
  agency_id uuid,
  full_name text,
  date_of_birth date,
  status text,
  metadata jsonb,
  created_at timestamptz,
  created_by uuid
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
  IF NOT user_has_permission(v_user_id, 'resident.view') THEN
    RAISE EXCEPTION 'Permission denied: resident.view required';
  END IF;

  -- Return residents (RLS will enforce agency-scoped access)
  RETURN QUERY
  SELECT r.id, r.agency_id, r.full_name, r.date_of_birth, r.status, r.metadata, r.created_at, r.created_by
  FROM residents r
  WHERE r.agency_id = p_agency_id
  ORDER BY r.created_at DESC;
END;
$$;