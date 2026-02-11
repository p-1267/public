/*
  # Fix Seeding: Roles Access and Ensure Required Roles Exist

  ## Purpose
  - Allow anon to read roles table (needed by seed function)
  - Ensure SENIOR and FAMILY_ADMIN roles exist
  - Fix seed_senior_family_scenario to work properly
*/

-- Allow anon to read roles table
DROP POLICY IF EXISTS "anon_can_read_roles_for_seeding" ON roles;
CREATE POLICY "anon_can_read_roles_for_seeding"
  ON roles FOR SELECT TO anon USING (true);

-- Ensure required roles exist
INSERT INTO roles (name, description) VALUES
  ('SENIOR', 'Senior resident user role')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) VALUES
  ('FAMILY_ADMIN', 'Family member with admin access')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) VALUES
  ('FAMILY_VIEWER', 'Family member with view-only access')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) VALUES
  ('CAREGIVER', 'Caregiver staff member')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) VALUES
  ('SUPERVISOR', 'Supervisor staff member')
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description) VALUES
  ('AGENCY_ADMIN', 'Agency administrator')
ON CONFLICT (name) DO NOTHING;
