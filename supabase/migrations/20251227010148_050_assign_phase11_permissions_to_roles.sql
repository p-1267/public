/*
  # Assign Phase 11 Permissions to Roles

  ## Purpose
  Grant Phase 11 permissions to appropriate roles.
  Follows principle of least privilege with explicit grants.

  ## Permission Assignments

  ### SUPER_ADMIN
  - All Phase 11 permissions (full system access)

  ### AGENCY_ADMIN
  - All agency, user, resident, and assignment permissions
  - Scoped to their own agency via RLS

  ### SUPERVISOR
  - resident.view (read-only access to residents)
  - No administrative powers

  ### CAREGIVER
  - None (care execution only, not admin)

  ### FAMILY_VIEWER
  - None (view care data only, not admin)

  ## Security Notes
  - Permissions are additive (no removal here)
  - RLS enforces agency scoping
  - Audit log captures all permission usage
*/

-- SUPER_ADMIN: All Phase 11 permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'SUPER_ADMIN'),
  id
FROM permissions
WHERE name IN (
  'agency.create',
  'agency.view',
  'agency.update',
  'user.invite',
  'user.assign_role',
  'user.deactivate',
  'resident.create',
  'resident.view',
  'assignment.manage'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- AGENCY_ADMIN: All Phase 11 permissions (agency-scoped)
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'AGENCY_ADMIN'),
  id
FROM permissions
WHERE name IN (
  'agency.create',
  'agency.view',
  'agency.update',
  'user.invite',
  'user.assign_role',
  'user.deactivate',
  'resident.create',
  'resident.view',
  'assignment.manage'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- SUPERVISOR: Read-only resident access
INSERT INTO role_permissions (role_id, permission_id)
SELECT
  (SELECT id FROM roles WHERE name = 'SUPERVISOR'),
  id
FROM permissions
WHERE name IN (
  'resident.view'
)
ON CONFLICT (role_id, permission_id) DO NOTHING;