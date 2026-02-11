/*
  # Bootstrap Super Admin Function

  1. Purpose
    - Provides a one-time mechanism to promote the first user to SUPER_ADMIN
    - Required for production initialization
    - Safely creates user profile and assigns role
    - Can only be used when no SUPER_ADMIN exists yet

  2. Function: bootstrap_super_admin()
    - Must be called by an authenticated user
    - Creates user_profile for calling user if it doesn't exist
    - Assigns SUPER_ADMIN role
    - Only works if no other SUPER_ADMIN exists (safety mechanism)
    - Returns success status and message

  3. Usage
    - First user signs up via Supabase Auth
    - User calls: SELECT bootstrap_super_admin();
    - User is promoted to SUPER_ADMIN
    - Function becomes unusable after first SUPER_ADMIN exists

  4. Security
    - Requires authenticated user (auth.uid() must exist)
    - Single-use safety: won't create duplicate SUPER_ADMINs
    - Creates user_profile with proper agency_id (NULL for super admin)
*/

CREATE OR REPLACE FUNCTION bootstrap_super_admin()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_super_admin_role_id uuid;
  v_existing_super_admin_count int;
  v_user_email text;
  v_user_name text;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'You must be authenticated to bootstrap super admin'
    );
  END IF;

  SELECT COUNT(*)
  INTO v_existing_super_admin_count
  FROM user_profiles up
  JOIN roles r ON up.role_id = r.id
  WHERE r.name = 'SUPER_ADMIN';

  IF v_existing_super_admin_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'message', 'A SUPER_ADMIN already exists. Bootstrap can only be used once.'
    );
  END IF;

  SELECT id INTO v_super_admin_role_id
  FROM roles
  WHERE name = 'SUPER_ADMIN';

  IF v_super_admin_role_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'SUPER_ADMIN role not found in database'
    );
  END IF;

  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = v_user_id;

  v_user_name := COALESCE(
    (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE id = v_user_id),
    split_part(v_user_email, '@', 1)
  );

  INSERT INTO user_profiles (id, email, name, role_id, agency_id)
  VALUES (v_user_id, v_user_email, v_user_name, v_super_admin_role_id, NULL)
  ON CONFLICT (id) DO UPDATE
  SET role_id = v_super_admin_role_id,
      email = v_user_email,
      name = v_user_name;

  RETURN json_build_object(
    'success', true,
    'message', 'Successfully bootstrapped SUPER_ADMIN for user: ' || v_user_email,
    'user_id', v_user_id,
    'role', 'SUPER_ADMIN'
  );
END;
$$;

COMMENT ON FUNCTION bootstrap_super_admin IS 'One-time bootstrap function to create the first SUPER_ADMIN user. Can only be used when no SUPER_ADMIN exists.';
