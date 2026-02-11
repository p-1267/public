/*
  # Role Permissions Mapping Table

  1. Purpose
    - Maps roles to permissions
    - Defines what each role can do
    - Brain logic layer queries this for permission checks

  2. New Tables
    - `role_permissions`
      - `id` (uuid, primary key) - unique mapping identifier
      - `role_id` (uuid, FK) - reference to roles table
      - `permission_id` (uuid, FK) - reference to permissions table
      - `created_at` (timestamptz) - creation timestamp

  3. Seed Data Mappings
    - SUPER_ADMIN: all permissions
    - AGENCY_ADMIN: all except MANAGE_ROLES (system-level)
    - SUPERVISOR: VIEW_BRAIN_STATE, VIEW_CARE_DATA, WRITE_CARE_DATA, VIEW_AUDIT_LOG, ACKNOWLEDGE_AI_INPUT, VIEW_EMERGENCY_STATE
    - CAREGIVER: VIEW_BRAIN_STATE, WRITE_CARE_DATA, VIEW_CARE_DATA, TRIGGER_EMERGENCY, VIEW_EMERGENCY_STATE
    - FAMILY_VIEWER: VIEW_CARE_DATA
    - SYSTEM: VIEW_BRAIN_STATE only

  4. Security
    - RLS enabled
    - Unique constraint on role_id + permission_id
*/

CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_role_permission UNIQUE (role_id, permission_id)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);

-- SUPER_ADMIN: all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'SUPER_ADMIN'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- AGENCY_ADMIN: all except MANAGE_ROLES
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'AGENCY_ADMIN'
  AND p.name != 'MANAGE_ROLES'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- SUPERVISOR: VIEW_BRAIN_STATE, VIEW_CARE_DATA, WRITE_CARE_DATA, VIEW_AUDIT_LOG, ACKNOWLEDGE_AI_INPUT, VIEW_EMERGENCY_STATE
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'SUPERVISOR'
  AND p.name IN ('VIEW_BRAIN_STATE', 'VIEW_CARE_DATA', 'WRITE_CARE_DATA', 'VIEW_AUDIT_LOG', 'ACKNOWLEDGE_AI_INPUT', 'VIEW_EMERGENCY_STATE')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- CAREGIVER: VIEW_BRAIN_STATE, WRITE_CARE_DATA, VIEW_CARE_DATA, TRIGGER_EMERGENCY, VIEW_EMERGENCY_STATE
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'CAREGIVER'
  AND p.name IN ('VIEW_BRAIN_STATE', 'WRITE_CARE_DATA', 'VIEW_CARE_DATA', 'TRIGGER_EMERGENCY', 'VIEW_EMERGENCY_STATE')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- FAMILY_VIEWER: VIEW_CARE_DATA only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'FAMILY_VIEWER'
  AND p.name = 'VIEW_CARE_DATA'
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- SYSTEM: VIEW_BRAIN_STATE only
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'SYSTEM'
  AND p.name = 'VIEW_BRAIN_STATE'
ON CONFLICT (role_id, permission_id) DO NOTHING;