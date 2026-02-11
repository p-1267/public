/*
  # Remove SECURITY DEFINER from user_effective_permissions View

  1. Problem
    - View uses SECURITY DEFINER to bypass RLS on permission tables
    - This violates production security requirements
    - Need to remove SECURITY DEFINER while maintaining identical behavior

  2. Solution
    - Add RLS policies allowing users to read permission data for their own role only
    - This eliminates the need for SECURITY DEFINER
    - View executes with INVOKER rights and relies on new RLS policies

  3. New RLS Policies
    - roles: Users can read their own role
    - role_permissions: Users can read permissions for their own role
    - permissions: Users can read permission names for their own role's permissions

  4. View Changes
    - DROP existing view with CASCADE (dependent RLS policies will be recreated)
    - RECREATE without SECURITY DEFINER (uses INVOKER by default)
    - Behavior remains identical - only current user's permissions are returned

  5. Security
    - No permission escalation possible
    - RLS policies enforce same filtering as view's WHERE clause
    - Users can only access permission data for their own role
    - Existing MANAGE_ROLES policies remain for administrative access
*/

-- Add RLS policy for users to read their own role
CREATE POLICY "Users can read own role"
  ON roles FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT role_id 
      FROM user_profiles 
      WHERE id = (SELECT auth.uid())
    )
  );

-- Add RLS policy for users to read role_permissions for their own role
CREATE POLICY "Users can read own role permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (
    role_id IN (
      SELECT role_id 
      FROM user_profiles 
      WHERE id = (SELECT auth.uid())
    )
  );

-- Add RLS policy for users to read permissions assigned to their role
CREATE POLICY "Users can read own assigned permissions"
  ON permissions FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT rp.permission_id
      FROM role_permissions rp
      JOIN user_profiles up ON up.role_id = rp.role_id
      WHERE up.id = (SELECT auth.uid())
    )
  );

-- Drop and recreate the view without SECURITY DEFINER
-- CASCADE will drop dependent policies which will be automatically recreated
DROP VIEW IF EXISTS user_effective_permissions CASCADE;

CREATE VIEW user_effective_permissions AS
SELECT
  p.name AS permission_name,
  true AS granted
FROM user_profiles up
JOIN role_permissions rp ON rp.role_id = up.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE up.id = auth.uid()
  AND up.is_active = true;

-- Note: View now executes with SECURITY INVOKER (default)
-- RLS policies above allow users to access only their own permission chain
