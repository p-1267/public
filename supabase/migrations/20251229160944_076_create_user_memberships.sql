/*
  # User Memberships Table (Phase 19)

  ## Purpose
  Stores explicit access grants binding users to residents with specific roles and permissions.
  NO implicit access is permitted. All access must be explicitly granted and is revocable.

  ## New Tables
  - `user_memberships`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK to user_profiles) - user receiving access
    - `resident_id` (uuid, FK to residents) - resident for whom access is granted
    - `role_id` (uuid, FK to roles) - role in this context
    - `agency_id` (uuid, FK to agencies) - agency context
    - `permissions` (jsonb) - explicit permission overrides for this membership
    - `granted_by` (uuid, FK to user_profiles) - who granted this access
    - `granted_at` (timestamptz) - when access was granted
    - `starts_at` (timestamptz, nullable) - when access starts (for time-boxed)
    - `expires_at` (timestamptz, nullable) - when access expires (for time-boxed)
    - `revoked_at` (timestamptz, nullable) - when access was revoked
    - `revoked_by` (uuid, nullable, FK to user_profiles) - who revoked access
    - `revoked_reason` (text, nullable) - reason for revocation
    - `is_active` (boolean) - whether membership is currently active
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Access grants are explicit and scoped per resident
  - All grants and revocations are audited

  ## Enforcement Rules
  1. Access must be explicitly granted (no defaults)
  2. Access is scoped per resident (no global access)
  3. Access can be time-boxed (starts_at/expires_at)
  4. Revocation is immediate and logged
  5. Expired memberships are automatically inactive
*/

CREATE TABLE IF NOT EXISTS user_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  permissions jsonb NOT NULL DEFAULT '{}',
  granted_by uuid NOT NULL REFERENCES user_profiles(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  starts_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES user_profiles(id),
  revoked_reason text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, resident_id, role_id),
  CONSTRAINT valid_time_range CHECK (starts_at IS NULL OR expires_at IS NULL OR starts_at < expires_at)
);

ALTER TABLE user_memberships ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_memberships_user_id ON user_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_resident_id ON user_memberships(resident_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_agency_id ON user_memberships(agency_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_role_id ON user_memberships(role_id);
CREATE INDEX IF NOT EXISTS idx_user_memberships_granted_by ON user_memberships(granted_by);
CREATE INDEX IF NOT EXISTS idx_user_memberships_is_active ON user_memberships(is_active);
CREATE INDEX IF NOT EXISTS idx_user_memberships_expires_at ON user_memberships(expires_at) WHERE expires_at IS NOT NULL;
