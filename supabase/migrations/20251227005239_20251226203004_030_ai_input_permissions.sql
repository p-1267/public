/*
  # AI Input Permissions

  1. Purpose
    - Add VIEW_AI_INPUTS permission for viewing AI observations
    - Assign permissions to appropriate roles
    - Note: ACKNOWLEDGE_AI_INPUT already exists from initial setup

  2. New Permissions
    - VIEW_AI_INPUTS: View AI observations and statistics

  3. Permission Assignments
    - SUPER_ADMIN: All AI input permissions
    - ADMIN: All AI input permissions
    - CAREGIVER: View and acknowledge AI inputs
    - VIEWER: View AI inputs only
*/

-- Insert VIEW_AI_INPUTS permission
INSERT INTO permissions (name, description)
VALUES ('VIEW_AI_INPUTS', 'View AI observations and learning inputs')
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to roles
-- SUPER_ADMIN gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'SUPER_ADMIN'
  AND p.name IN ('VIEW_AI_INPUTS', 'ACKNOWLEDGE_AI_INPUT')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- ADMIN gets all AI permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'ADMIN'
  AND p.name IN ('VIEW_AI_INPUTS', 'ACKNOWLEDGE_AI_INPUT')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- CAREGIVER can view and acknowledge
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'CAREGIVER'
  AND p.name IN ('VIEW_AI_INPUTS', 'ACKNOWLEDGE_AI_INPUT')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- VIEWER can only view
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'VIEWER'
  AND p.name = 'VIEW_AI_INPUTS'
ON CONFLICT (role_id, permission_id) DO NOTHING;