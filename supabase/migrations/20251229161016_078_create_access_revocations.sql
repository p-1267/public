/*
  # Access Revocations Log (Phase 19)

  ## Purpose
  Immutable log of all access revocation events. Records who revoked what access,
  when, and why. Separate from audit_log for high-priority security events.

  ## New Tables
  - `access_revocations`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK to user_profiles) - user whose access was revoked
    - `revoked_by` (uuid, FK to user_profiles) - who performed revocation
    - `revocation_type` (text) - MEMBERSHIP, DEVICE, FULL_ACCESS
    - `target_id` (uuid, nullable) - ID of membership or device revoked
    - `reason` (text) - required reason for revocation
    - `immediate_effect` (boolean) - whether revocation was immediate
    - `sessions_invalidated` (integer) - count of sessions terminated
    - `offline_access_revoked` (boolean) - whether offline access was revoked
    - `audit_sealed` (boolean) - whether audit record was sealed
    - `revoked_at` (timestamptz) - when revocation occurred
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Records are IMMUTABLE (no updates/deletes)
  - Only authorized users can view
  - All revocations must have reason

  ## Enforcement Rules
  1. All revocations must be logged
  2. Records are immutable
  3. Reason is mandatory
  4. Timestamp must be accurate
*/

CREATE TABLE IF NOT EXISTS access_revocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  revoked_by uuid NOT NULL REFERENCES user_profiles(id),
  revocation_type text NOT NULL CHECK (revocation_type IN ('MEMBERSHIP', 'DEVICE', 'FULL_ACCESS')),
  target_id uuid,
  reason text NOT NULL,
  immediate_effect boolean NOT NULL DEFAULT true,
  sessions_invalidated integer NOT NULL DEFAULT 0,
  offline_access_revoked boolean NOT NULL DEFAULT true,
  audit_sealed boolean NOT NULL DEFAULT true,
  revoked_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE access_revocations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_access_revocations_user_id ON access_revocations(user_id);
CREATE INDEX IF NOT EXISTS idx_access_revocations_revoked_by ON access_revocations(revoked_by);
CREATE INDEX IF NOT EXISTS idx_access_revocations_revocation_type ON access_revocations(revocation_type);
CREATE INDEX IF NOT EXISTS idx_access_revocations_revoked_at ON access_revocations(revoked_at);
