/*
  # Create System Health Permission (Phase 15)

  1. New Permission
    - `view_system_health` - View system health diagnostics and invariants

  2. Role Assignment
    - Assign to SUPER_ADMIN role only
    - This is a read-only diagnostic permission

  3. Security
    - No write capabilities
    - No mutation authority
    - Admin visibility only
*/

-- Create system health permission
INSERT INTO permissions (name, description)
VALUES (
  'view_system_health',
  'View system health diagnostics and invariants (admin only)'
)
ON CONFLICT (name) DO NOTHING;

-- Assign to SUPER_ADMIN role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'SUPER_ADMIN'
  AND p.name = 'view_system_health'
ON CONFLICT (role_id, permission_id) DO NOTHING;