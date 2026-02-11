/*
  # Create SENIOR Role and Permissions (Phase 14)

  1. New Role
    - `SENIOR` - Care recipient with read-only access to own data only

  2. New Permissions
    - `view_own_resident_data` - View own resident record
    - `view_assigned_caregivers` - View assigned caregiver information
    - `view_own_care_timeline` - View own care activity timeline
    - `view_system_emergency_status` - View global emergency status

  3. Role Permissions
    - Assign all four permissions to SENIOR role

  4. Security
    - All permissions are read-only
    - No write permissions granted
    - No mutation capabilities
*/

-- Create SENIOR role
INSERT INTO roles (name, description, is_system_role)
VALUES (
  'SENIOR',
  'Care recipient with read-only access to own data',
  false
)
ON CONFLICT (name) DO NOTHING;

-- Create read-only permissions for seniors
INSERT INTO permissions (name, description)
VALUES
  (
    'view_own_resident_data',
    'View own resident record'
  ),
  (
    'view_assigned_caregivers',
    'View assigned caregiver information'
  ),
  (
    'view_own_care_timeline',
    'View own care activity timeline'
  ),
  (
    'view_system_emergency_status',
    'View global emergency status'
  )
ON CONFLICT (name) DO NOTHING;

-- Assign permissions to SENIOR role
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
  r.id,
  p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'SENIOR'
  AND p.name IN (
    'view_own_resident_data',
    'view_assigned_caregivers',
    'view_own_care_timeline',
    'view_system_emergency_status'
  )
ON CONFLICT (role_id, permission_id) DO NOTHING;