/*
  # Fix AI Permissions for Correct Role Names

  1. Purpose
    - Add AI permissions for AGENCY_ADMIN and FAMILY_VIEWER
    - Previous migration used incorrect role names (ADMIN, VIEWER)
*/

-- AGENCY_ADMIN gets both VIEW and ACKNOWLEDGE
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'AGENCY_ADMIN'
  AND p.name IN ('VIEW_AI_INPUTS', 'ACKNOWLEDGE_AI_INPUT')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- SUPERVISOR gets both VIEW and ACKNOWLEDGE
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'SUPERVISOR'
  AND p.name IN ('VIEW_AI_INPUTS', 'ACKNOWLEDGE_AI_INPUT')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- FAMILY_VIEWER can only view
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'FAMILY_VIEWER'
  AND p.name = 'VIEW_AI_INPUTS'
ON CONFLICT (role_id, permission_id) DO NOTHING;