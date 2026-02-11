/*
  # RLS Policies for role_permissions Table

  1. Purpose
    - Enforce permission-based access to role-permission mappings
    - SELECT requires MANAGE_ROLES permission
    - INSERT/UPDATE/DELETE require MANAGE_ROLES permission
    - Mappings are seed data, modifications controlled

  2. Policies
    - "Users with MANAGE_ROLES can read role_permissions" - SELECT policy
    - "Users with MANAGE_ROLES can insert role_permissions" - INSERT policy
    - "Users with MANAGE_ROLES can update role_permissions" - UPDATE policy
    - "Users with MANAGE_ROLES can delete role_permissions" - DELETE policy

  3. Security
    - All policies require authenticated user
    - Only SUPER_ADMIN has MANAGE_ROLES by default
*/

CREATE POLICY "Users with MANAGE_ROLES can read role_permissions"
  ON role_permissions
  FOR SELECT
  TO authenticated
  USING (current_user_has_permission('MANAGE_ROLES'));

CREATE POLICY "Users with MANAGE_ROLES can insert role_permissions"
  ON role_permissions
  FOR INSERT
  TO authenticated
  WITH CHECK (current_user_has_permission('MANAGE_ROLES'));

CREATE POLICY "Users with MANAGE_ROLES can update role_permissions"
  ON role_permissions
  FOR UPDATE
  TO authenticated
  USING (current_user_has_permission('MANAGE_ROLES'))
  WITH CHECK (current_user_has_permission('MANAGE_ROLES'));

CREATE POLICY "Users with MANAGE_ROLES can delete role_permissions"
  ON role_permissions
  FOR DELETE
  TO authenticated
  USING (current_user_has_permission('MANAGE_ROLES'));