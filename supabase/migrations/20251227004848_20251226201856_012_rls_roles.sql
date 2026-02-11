/*
  # RLS Policies for roles Table

  1. Purpose
    - Enforce permission-based access to role definitions
    - SELECT requires MANAGE_ROLES permission
    - INSERT/UPDATE/DELETE require MANAGE_ROLES permission
    - Roles are seed data, modifications rare

  2. Policies
    - "Users with MANAGE_ROLES can read roles" - SELECT policy
    - "Users with MANAGE_ROLES can insert roles" - INSERT policy
    - "Users with MANAGE_ROLES can update roles" - UPDATE policy
    - "Users with MANAGE_ROLES can delete roles" - DELETE policy

  3. Security
    - All policies require authenticated user
    - Only SUPER_ADMIN has MANAGE_ROLES by default
*/

CREATE POLICY "Users with MANAGE_ROLES can read roles"
  ON roles
  FOR SELECT
  TO authenticated
  USING (current_user_has_permission('MANAGE_ROLES'));

CREATE POLICY "Users with MANAGE_ROLES can insert roles"
  ON roles
  FOR INSERT
  TO authenticated
  WITH CHECK (current_user_has_permission('MANAGE_ROLES'));

CREATE POLICY "Users with MANAGE_ROLES can update roles"
  ON roles
  FOR UPDATE
  TO authenticated
  USING (current_user_has_permission('MANAGE_ROLES'))
  WITH CHECK (current_user_has_permission('MANAGE_ROLES'));

CREATE POLICY "Users with MANAGE_ROLES can delete roles"
  ON roles
  FOR DELETE
  TO authenticated
  USING (current_user_has_permission('MANAGE_ROLES'));