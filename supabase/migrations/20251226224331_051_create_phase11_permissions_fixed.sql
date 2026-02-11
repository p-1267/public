/*
  # Phase 11 Permissions (Fixed)

  ## Purpose
  Define all permissions required for Agency Admin Control Plane.
  These permissions control access to agency management operations.

  ## New Permissions
  - agency.create - Create new agencies
  - agency.view - View agency information
  - agency.update - Update agency metadata
  - user.invite - Invite new users to agency
  - user.assign_role - Assign or change user roles
  - user.deactivate - Deactivate user accounts
  - resident.create - Register new residents
  - resident.view - View resident information
  - assignment.manage - Create/remove caregiver assignments

  ## Assignment Strategy
  - SUPER_ADMIN: All permissions
  - AGENCY_ADMIN: All except system-level
  - Other roles: View-only or excluded

  ## Security Notes
  - Permissions are immutable after creation
  - Role assignments done via role_permissions table
  - All permission checks use Brain permission system
*/

-- Insert Phase 11 permissions
INSERT INTO permissions (name, description) VALUES
  ('agency.create', 'Create new agencies'),
  ('agency.view', 'View agency information'),
  ('agency.update', 'Update agency metadata'),
  ('user.invite', 'Invite new users to agency'),
  ('user.assign_role', 'Assign or change user roles'),
  ('user.deactivate', 'Deactivate user accounts'),
  ('resident.create', 'Register new residents'),
  ('resident.view', 'View resident information'),
  ('assignment.manage', 'Create and remove caregiver assignments')
ON CONFLICT (name) DO NOTHING;
