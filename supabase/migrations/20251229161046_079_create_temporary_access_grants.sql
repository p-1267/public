/*
  # Temporary Access Grants (Phase 19)

  ## Purpose
  Stores time-boxed access grants with explicit start and end times.
  Auto-revokes when time expires, even offline.

  ## New Tables
  - `temporary_access_grants`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK to user_profiles) - user receiving temporary access
    - `resident_id` (uuid, FK to residents) - resident for access
    - `granted_by` (uuid, FK to user_profiles) - who granted temporary access
    - `starts_at` (timestamptz) - when access begins
    - `ends_at` (timestamptz) - when access expires
    - `permissions` (jsonb) - explicit permissions for this grant
    - `reason` (text) - required reason for temporary access
    - `auto_revoked` (boolean) - whether auto-revocation occurred
    - `auto_revoked_at` (timestamptz, nullable) - when auto-revocation occurred
    - `manually_revoked` (boolean) - whether manually revoked before expiry
    - `manually_revoked_by` (uuid, nullable, FK to user_profiles) - who manually revoked
    - `manually_revoked_at` (timestamptz, nullable) - when manually revoked
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - All temporary grants must have explicit time bounds
  - Auto-revocation is enforced by system
  - All grants are audited

  ## Enforcement Rules
  1. starts_at must be before ends_at
  2. Auto-revocation happens at ends_at
  3. Manual revocation before expiry is allowed
  4. Revoked grants cannot be reactivated
  5. Reason is mandatory

  ## Notes
  - is_active is computed at query time using:
    NOT manually_revoked AND NOT auto_revoked AND now() >= starts_at AND now() < ends_at
*/

CREATE TABLE IF NOT EXISTS temporary_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  granted_by uuid NOT NULL REFERENCES user_profiles(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  permissions jsonb NOT NULL DEFAULT '{}',
  reason text NOT NULL,
  auto_revoked boolean NOT NULL DEFAULT false,
  auto_revoked_at timestamptz,
  manually_revoked boolean NOT NULL DEFAULT false,
  manually_revoked_by uuid REFERENCES user_profiles(id),
  manually_revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (starts_at < ends_at)
);

ALTER TABLE temporary_access_grants ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_temporary_access_grants_user_id ON temporary_access_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_temporary_access_grants_resident_id ON temporary_access_grants(resident_id);
CREATE INDEX IF NOT EXISTS idx_temporary_access_grants_granted_by ON temporary_access_grants(granted_by);
CREATE INDEX IF NOT EXISTS idx_temporary_access_grants_ends_at ON temporary_access_grants(ends_at);

CREATE INDEX IF NOT EXISTS idx_temporary_access_grants_active ON temporary_access_grants(user_id, resident_id)
  WHERE NOT manually_revoked AND NOT auto_revoked;
