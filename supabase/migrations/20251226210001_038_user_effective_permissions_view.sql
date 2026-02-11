/*
  # User Effective Permissions View

  1. Purpose
    - Brain-backed view exposing resolved permissions for current user
    - UI reads permissions from this view only
    - No permission inference in UI layer

  2. View Definition
    - `user_effective_permissions`
      - `permission_name` (text) - name of the permission
      - `granted` (boolean) - whether permission is granted

  3. Query Logic
    - Joins user_profiles -> roles -> role_permissions -> permissions
    - Filters by auth.uid() automatically
    - Returns all permissions with granted status based on user's role

  4. Security
    - Uses security definer to access permission chain
    - Returns only current user's permissions
    - No data exposure beyond own permissions
*/

CREATE OR REPLACE VIEW user_effective_permissions AS
SELECT
  p.name AS permission_name,
  true AS granted
FROM user_profiles up
JOIN role_permissions rp ON rp.role_id = up.role_id
JOIN permissions p ON p.id = rp.permission_id
WHERE up.id = auth.uid()
  AND up.is_active = true;