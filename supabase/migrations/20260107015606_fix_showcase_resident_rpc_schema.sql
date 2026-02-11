/*
  # Fix Showcase Resident RPC Schema

  Updates seed_showcase_resident to match actual residents table schema.
  The table doesn't have room_number - it was removed in later migrations.

  1. Updates
    - Remove room_number parameter
    - Use correct column names
*/

DROP FUNCTION IF EXISTS seed_showcase_resident;

CREATE OR REPLACE FUNCTION seed_showcase_resident(
  p_id text,
  p_agency_id text,
  p_full_name text,
  p_date_of_birth date,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resident_id uuid;
  v_agency_uuid uuid;
  v_id_uuid uuid;
BEGIN
  -- Convert string IDs to UUIDs using MD5 hash
  v_id_uuid := md5(p_id)::uuid;
  v_agency_uuid := md5(p_agency_id)::uuid;

  INSERT INTO residents (
    id, agency_id, full_name, date_of_birth, 
    status, metadata, created_at, updated_at
  )
  VALUES (
    v_id_uuid, v_agency_uuid, p_full_name, p_date_of_birth,
    'active', p_metadata, now(), now()
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    full_name = EXCLUDED.full_name,
    date_of_birth = EXCLUDED.date_of_birth,
    metadata = EXCLUDED.metadata,
    updated_at = now()
  RETURNING id INTO v_resident_id;

  RETURN jsonb_build_object('success', true, 'resident_id', v_resident_id);
END;
$$;

-- Also fix the agency RPC to use consistent UUID conversion
DROP FUNCTION IF EXISTS seed_showcase_agency;

CREATE OR REPLACE FUNCTION seed_showcase_agency(
  p_id text,
  p_name text,
  p_operating_mode text,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id_uuid uuid;
BEGIN
  -- Convert string ID to UUID using MD5 hash
  v_id_uuid := md5(p_id)::uuid;

  INSERT INTO agencies (id, name, status, operating_mode, metadata, created_at, updated_at)
  VALUES (v_id_uuid, p_name, 'active', p_operating_mode, p_metadata, now(), now())
  ON CONFLICT (id) DO UPDATE
  SET 
    name = EXCLUDED.name,
    operating_mode = EXCLUDED.operating_mode,
    metadata = EXCLUDED.metadata,
    updated_at = now();

  RETURN jsonb_build_object('success', true, 'agency_id', v_id_uuid);
END;
$$;
