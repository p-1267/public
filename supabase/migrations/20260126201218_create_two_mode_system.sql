/*
  # Two-Mode Operating System for Senior + Family

  1. New Tables
    - `senior_operating_mode` - tracks which mode is active for each resident
  
  2. Role Updates
    - Add `FAMILY_ADMIN` role with full operational permissions
  
  3. Permissions
    - Create family admin operational permissions
  
  4. Security
    - RLS on senior_operating_mode table
    - Only seniors can change their own operating mode
    - Audit all mode changes
*/

-- Create senior operating mode table
CREATE TABLE IF NOT EXISTS senior_operating_mode (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('SELF_MANAGE', 'FAMILY_ADMIN')),
  enabled_by uuid NOT NULL REFERENCES user_profiles(id),
  enabled_at timestamptz NOT NULL DEFAULT now(),
  disabled_at timestamptz,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(resident_id, disabled_at)
);

CREATE INDEX IF NOT EXISTS idx_senior_operating_mode_resident_active
  ON senior_operating_mode(resident_id)
  WHERE disabled_at IS NULL;

ALTER TABLE senior_operating_mode ENABLE ROW LEVEL SECURITY;

-- Add FAMILY_ADMIN role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'FAMILY_ADMIN') THEN
    INSERT INTO roles (name, description, is_system_role, created_at)
    VALUES ('FAMILY_ADMIN', 'Family administrator with full operational control when authorized', false, now());
  END IF;
END $$;

-- Create permissions for family admin
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'manage_resident_medications') THEN
    INSERT INTO permissions (name, description, created_at)
    VALUES ('manage_resident_medications', 'Add, edit, remove resident medications', now());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'manage_resident_appointments') THEN
    INSERT INTO permissions (name, description, created_at)
    VALUES ('manage_resident_appointments', 'Add, edit, cancel resident appointments', now());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'manage_resident_documents') THEN
    INSERT INTO permissions (name, description, created_at)
    VALUES ('manage_resident_documents', 'Upload, organize, share resident documents', now());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'communicate_on_behalf') THEN
    INSERT INTO permissions (name, description, created_at)
    VALUES ('communicate_on_behalf', 'Message providers and pharmacy on behalf of resident', now());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'manage_care_plan') THEN
    INSERT INTO permissions (name, description, created_at)
    VALUES ('manage_care_plan', 'Update care plan, dietary restrictions, allergies, emergency contacts', now());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM permissions WHERE name = 'manage_resident_settings') THEN
    INSERT INTO permissions (name, description, created_at)
    VALUES ('manage_resident_settings', 'Adjust accessibility and notification settings on behalf of resident', now());
  END IF;
END $$;

-- Assign permissions to FAMILY_ADMIN role
DO $$
DECLARE
  v_family_admin_role_id uuid;
  v_permission_id uuid;
BEGIN
  SELECT id INTO v_family_admin_role_id FROM roles WHERE name = 'FAMILY_ADMIN';

  FOR v_permission_id IN
    SELECT id FROM permissions WHERE name IN (
      'manage_resident_medications', 'manage_resident_appointments', 'manage_resident_documents',
      'communicate_on_behalf', 'manage_care_plan', 'manage_resident_settings',
      'view_own_resident_data', 'view_assigned_caregivers', 'view_own_care_timeline'
    )
  LOOP
    INSERT INTO role_permissions (role_id, permission_id, created_at)
    VALUES (v_family_admin_role_id, v_permission_id, now())
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;

-- RLS Policies
CREATE POLICY "Seniors can view own operating mode"
  ON senior_operating_mode FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM senior_resident_links srl
    WHERE srl.resident_id = senior_operating_mode.resident_id
      AND srl.senior_user_id = auth.uid() AND srl.status = 'active'
  ));

CREATE POLICY "Seniors can change own operating mode"
  ON senior_operating_mode FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM senior_resident_links srl
    WHERE srl.resident_id = senior_operating_mode.resident_id
      AND srl.senior_user_id = auth.uid() AND srl.status = 'active'
  ) AND enabled_by = auth.uid());

CREATE POLICY "Family can view linked resident operating mode"
  ON senior_operating_mode FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM family_resident_links frl
    WHERE frl.resident_id = senior_operating_mode.resident_id
      AND frl.family_user_id = auth.uid() AND frl.status = 'active'
  ));

CREATE POLICY "Agency admins can view operating modes"
  ON senior_operating_mode FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN residents r ON r.agency_id = up.agency_id
    WHERE up.id = auth.uid() AND r.id = senior_operating_mode.resident_id
      AND up.role_id IN (SELECT id FROM roles WHERE name IN ('SUPER_ADMIN', 'AGENCY_ADMIN'))
  ));

-- RPC functions
CREATE OR REPLACE FUNCTION get_resident_operating_mode(p_resident_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mode text;
BEGIN
  SELECT mode INTO v_mode FROM senior_operating_mode
  WHERE resident_id = p_resident_id AND disabled_at IS NULL
  ORDER BY enabled_at DESC LIMIT 1;
  RETURN COALESCE(v_mode, 'SELF_MANAGE');
END;
$$;

CREATE OR REPLACE FUNCTION set_resident_operating_mode(
  p_resident_id uuid, p_mode text, p_reason text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_mode_id uuid;
  v_user_id uuid;
BEGIN
  v_user_id := auth.uid();

  IF NOT EXISTS (
    SELECT 1 FROM senior_resident_links
    WHERE resident_id = p_resident_id AND senior_user_id = v_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Only the senior can change their operating mode';
  END IF;

  IF p_mode NOT IN ('SELF_MANAGE', 'FAMILY_ADMIN') THEN
    RAISE EXCEPTION 'Invalid mode: %', p_mode;
  END IF;

  UPDATE senior_operating_mode SET disabled_at = now(), updated_at = now()
  WHERE resident_id = p_resident_id AND disabled_at IS NULL;

  INSERT INTO senior_operating_mode (resident_id, mode, enabled_by, enabled_at, reason)
  VALUES (p_resident_id, p_mode, v_user_id, now(), p_reason)
  RETURNING id INTO v_new_mode_id;

  INSERT INTO audit_log (actor_id, action, resource_type, resource_id, details)
  VALUES (v_user_id, 'SET_OPERATING_MODE', 'senior_operating_mode', v_new_mode_id,
    jsonb_build_object('resident_id', p_resident_id, 'mode', p_mode, 'reason', p_reason));

  RETURN v_new_mode_id;
END;
$$;

CREATE OR REPLACE FUNCTION check_family_admin_control(p_user_id uuid, p_resident_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_mode text;
  v_has_admin_role boolean;
BEGIN
  v_current_mode := get_resident_operating_mode(p_resident_id);

  SELECT EXISTS (
    SELECT 1 FROM family_resident_links frl
    JOIN user_profiles up ON up.id = frl.family_user_id
    JOIN roles r ON r.id = up.role_id
    WHERE frl.family_user_id = p_user_id AND frl.resident_id = p_resident_id
      AND frl.status = 'active' AND r.name = 'FAMILY_ADMIN'
  ) INTO v_has_admin_role;

  RETURN (v_current_mode = 'FAMILY_ADMIN' AND v_has_admin_role);
END;
$$;