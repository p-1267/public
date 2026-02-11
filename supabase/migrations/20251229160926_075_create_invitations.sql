/*
  # Invitations Table (Phase 19)

  ## Purpose
  Stores invitation records for new users. Invitations are single-use,
  time-bound, and explicitly define role, scope, and permissions.

  ## New Tables
  - `invitations`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency creating invitation
    - `invited_by` (uuid, FK to user_profiles) - user who created invitation
    - `target_email` (text, nullable) - invited user's email
    - `target_phone` (text, nullable) - invited user's phone
    - `intended_role_id` (uuid, FK to roles) - role to be assigned
    - `resident_scope` (uuid[], array) - array of resident IDs for access
    - `permission_set` (jsonb) - explicit permission overrides
    - `invitation_code` (text, unique) - unique code for verification
    - `expires_at` (timestamptz, nullable) - expiration timestamp
    - `accepted_at` (timestamptz, nullable) - when invitation was accepted
    - `accepted_by` (uuid, nullable, FK to user_profiles) - who accepted
    - `status` (text) - PENDING, ACCEPTED, EXPIRED, REVOKED
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Only AGENCY_ADMIN and SUPERVISOR (with permission) can create
  - Invitations are single-use
  - Auto-expire based on expires_at timestamp

  ## Enforcement Rules
  1. Email OR phone must be provided (at least one)
  2. Invitation codes are unique and cryptographically secure
  3. Invitations cannot be reused after acceptance
  4. Expired invitations cannot be accepted
  5. Revoked invitations cannot be accepted
*/

CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES user_profiles(id),
  target_email text,
  target_phone text,
  intended_role_id uuid NOT NULL REFERENCES roles(id),
  resident_scope uuid[] NOT NULL DEFAULT '{}',
  permission_set jsonb NOT NULL DEFAULT '{}',
  invitation_code text UNIQUE NOT NULL,
  expires_at timestamptz,
  accepted_at timestamptz,
  accepted_by uuid REFERENCES user_profiles(id),
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT at_least_one_contact CHECK (target_email IS NOT NULL OR target_phone IS NOT NULL)
);

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_invitations_agency_id ON invitations(agency_id);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON invitations(invited_by);
CREATE INDEX IF NOT EXISTS idx_invitations_target_email ON invitations(target_email);
CREATE INDEX IF NOT EXISTS idx_invitations_invitation_code ON invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON invitations(expires_at);
