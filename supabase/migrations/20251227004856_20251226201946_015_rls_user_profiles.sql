/*
  # RLS Policies for user_profiles Table

  1. Purpose
    - Enforce permission-based access to user profiles
    - Users can read their own profile
    - Users with MANAGE_USERS can read/modify all profiles
    - Users can update their own display_name only

  2. Policies
    - "Users can read own profile" - SELECT policy for own data
    - "Users with MANAGE_USERS can read all profiles" - SELECT policy for admins
    - "Users can update own display_name" - UPDATE policy for own non-role data
    - "Users with MANAGE_USERS can update profiles" - UPDATE policy for admins
    - "Users with MANAGE_USERS can insert profiles" - INSERT policy for admins
    - "Users with MANAGE_USERS can delete profiles" - DELETE policy for admins

  3. Security
    - Authenticated users can only see/edit own profile by default
    - Role changes require MANAGE_USERS permission
*/

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Users with MANAGE_USERS can read all profiles
CREATE POLICY "Users with MANAGE_USERS can read all profiles"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (current_user_has_permission('MANAGE_USERS'));

-- Users can update own display_name (but not role)
CREATE POLICY "Users can update own display_name"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND role_id = (SELECT role_id FROM user_profiles WHERE id = auth.uid()));

-- Users with MANAGE_USERS can update any profile
CREATE POLICY "Users with MANAGE_USERS can update profiles"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (current_user_has_permission('MANAGE_USERS'))
  WITH CHECK (current_user_has_permission('MANAGE_USERS'));

-- Users with MANAGE_USERS can insert profiles
CREATE POLICY "Users with MANAGE_USERS can insert profiles"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (current_user_has_permission('MANAGE_USERS'));

-- Users with MANAGE_USERS can delete profiles
CREATE POLICY "Users with MANAGE_USERS can delete profiles"
  ON user_profiles
  FOR DELETE
  TO authenticated
  USING (current_user_has_permission('MANAGE_USERS'));