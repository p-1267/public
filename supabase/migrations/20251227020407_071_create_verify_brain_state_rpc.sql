/*
  # Verification RPC for Brain State

  1. Purpose
    - Provides RLS-free brain state verification for system readiness checks
    - Returns brain state structure info without requiring authentication
    - Used ONLY for verification, not for business logic

  2. Security
    - SECURITY DEFINER to bypass RLS
    - Returns only structure verification data
    - Does not expose sensitive operational data
*/

CREATE OR REPLACE FUNCTION verify_brain_state()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  state_record record;
  result jsonb;
BEGIN
  -- Check if table exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'brain_state'
  ) THEN
    RETURN jsonb_build_object(
      'exists', false,
      'error', 'Table brain_state does not exist'
    );
  END IF;

  -- Get brain state data
  SELECT 
    id,
    care_state,
    emergency_state,
    offline_online_state,
    state_version
  INTO state_record
  FROM brain_state
  LIMIT 1;

  -- Check if row exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'exists', true,
      'has_row', false,
      'error', 'Brain state singleton not initialized'
    );
  END IF;

  -- Return verification data
  RETURN jsonb_build_object(
    'exists', true,
    'has_row', true,
    'id', state_record.id,
    'care_state', state_record.care_state,
    'emergency_state', state_record.emergency_state,
    'offline_online_state', state_record.offline_online_state,
    'state_version', state_record.state_version,
    'emergency_valid', state_record.emergency_state IN ('NONE', 'ACTIVE', 'RESOLVED', 'inactive', 'active'),
    'version_valid', state_record.state_version >= 0
  );
END;
$$;
