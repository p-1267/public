/*
  # RLS Policies for permissions Table

  1. Purpose
    - Enforce permission-based access to permission definitions
    - SELECT requires MANAGE_ROLES permission
    - INSERT/UPDATE/DELETE require MANAGE_ROLES permission
    - Permissions are seed data, modifications rare

  2. Policies
    - "Users with MANAGE_ROLES can read permissions" - SELECT policy
    - "Users with MANAGE_ROLES can insert permissions" - INSERT policy
    - "Users with MANAGE_ROLES can update permissions" - UPDATE policy
    - "Users with MANAGE_ROLES can delete permissions" - DELETE policy

  3. Security
    - All policies require authenticated user
    - Only SUPER_ADMIN has MANAGE_ROLES by default
*/

CREATE POLICY "Users with MANAGE_ROLES can read permissions"
  ON permissions
  FOR SELECT
  TO authenticated
  USING (current_user_has_permission('MANAGE_ROLES'));

CREATE POLICY "Users with MANAGE_ROLES can insert permissions"
  ON permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (current_user_has_permission('MANAGE_ROLES'));

CREATE POLICY "Users with MANAGE_ROLES can update permissions"
  ON permissions
  FOR UPDATE
  TO authenticated
  USING (current_user_has_permission('MANAGE_ROLES'))
  WITH CHECK (current_user_has_permission('MANAGE_ROLES'));

CREATE POLICY "Users with MANAGE_ROLES can delete permissions"
  ON permissions
  FOR DELETE
  TO authenticated
  USING (current_user_has_permission('MANAGE_ROLES'));