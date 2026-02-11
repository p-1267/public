/*
  # Caregiver Assignment RPC Functions

  ## Purpose
  Brain-validated functions for caregiver-resident assignment operations.
  All functions enforce permissions, validate input, and log to audit.

  ## Functions
  1. assign_caregiver(resident_id, caregiver_user_id) - Assign caregiver to resident
  2. remove_assignment(assignment_id) - Remove caregiver assignment

  ## Security
  - All functions check permissions
  - One active assignment per resident (enforced by unique index)
  - All mutations are auditable
  - No deletion (set status='removed' instead)
*/

-- Assign Caregiver
CREATE OR REPLACE FUNCTION assign_caregiver(
  p_resident_id uuid,
  p_caregiver_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_assignment_id uuid;
  v_user_id uuid;
  v_agency_id uuid;
  v_caregiver_agency_id uuid;
  v_caregiver_role_name text;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check permission
  IF NOT user_has_permission(v_user_id, 'assignment.manage') THEN
    RAISE EXCEPTION 'Permission denied: assignment.manage required';
  END IF;

  -- Get resident agency
  SELECT agency_id INTO v_agency_id
  FROM residents
  WHERE id = p_resident_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Resident not found';
  END IF;

  -- Get caregiver agency and role
  SELECT up.agency_id, r.name INTO v_caregiver_agency_id, v_caregiver_role_name
  FROM user_profiles up
  JOIN roles r ON up.role_id = r.id
  WHERE up.id = p_caregiver_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Caregiver not found';
  END IF;

  -- Validate same agency
  IF v_agency_id != v_caregiver_agency_id THEN
    RAISE EXCEPTION 'Caregiver must be in same agency as resident';
  END IF;

  -- Validate caregiver role
  IF v_caregiver_role_name NOT IN ('CAREGIVER', 'SUPERVISOR', 'AGENCY_ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'User must have caregiver-capable role';
  END IF;

  -- Check for existing active assignment
  IF EXISTS (
    SELECT 1 FROM caregiver_assignments
    WHERE resident_id = p_resident_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Resident already has an active caregiver assignment';
  END IF;

  -- Create assignment
  INSERT INTO caregiver_assignments (
    agency_id,
    resident_id,
    caregiver_user_id,
    assigned_by
  )
  VALUES (
    v_agency_id,
    p_resident_id,
    p_caregiver_user_id,
    v_user_id
  )
  RETURNING id INTO v_assignment_id;

  -- Log audit entry
  PERFORM log_audit_entry(
    v_user_id,
    'ASSIGN_CAREGIVER',
    'assignment',
    v_assignment_id,
    NULL,
    jsonb_build_object(
      'resident_id', p_resident_id,
      'caregiver_user_id', p_caregiver_user_id,
      'agency_id', v_agency_id
    )
  );

  RETURN v_assignment_id;
END;
$$;

-- Remove Assignment
CREATE OR REPLACE FUNCTION remove_assignment(
  p_assignment_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_resident_id uuid;
  v_caregiver_user_id uuid;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check permission
  IF NOT user_has_permission(v_user_id, 'assignment.manage') THEN
    RAISE EXCEPTION 'Permission denied: assignment.manage required';
  END IF;

  -- Get assignment details for audit
  SELECT resident_id, caregiver_user_id
  INTO v_resident_id, v_caregiver_user_id
  FROM caregiver_assignments
  WHERE id = p_assignment_id AND status = 'active';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active assignment not found';
  END IF;

  -- Remove assignment (soft delete)
  UPDATE caregiver_assignments
  SET status = 'removed',
      removed_at = now(),
      removed_by = v_user_id
  WHERE id = p_assignment_id;

  -- Log audit entry
  PERFORM log_audit_entry(
    v_user_id,
    'REMOVE_ASSIGNMENT',
    'assignment',
    p_assignment_id,
    jsonb_build_object(
      'status', 'active',
      'resident_id', v_resident_id,
      'caregiver_user_id', v_caregiver_user_id
    ),
    jsonb_build_object('status', 'removed')
  );
END;
$$;
