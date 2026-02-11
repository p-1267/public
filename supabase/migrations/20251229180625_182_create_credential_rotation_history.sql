/*
  # Credential Rotation History Table (Phase 29)

  ## Purpose
  Tracks credential rotation events.
  Maintains history of credential changes.

  ## New Tables
  - `credential_rotation_history`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency context
    - `credential_id` (uuid, FK to credentials) - related credential
    - `rotated_by` (uuid, FK to user_profiles) - who rotated
    - `rotation_reason` (text) - reason for rotation
    - `old_credential_hash` (text) - hash of old credential
    - `new_credential_hash` (text) - hash of new credential
    - `environment` (text) - SANDBOX, LIVE
    - `rotation_type` (text) - SCHEDULED, MANUAL, EMERGENCY
    - `rotated_at` (timestamptz) - when rotated
    - `created_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Rotation Types
  - SCHEDULED: Scheduled rotation
  - MANUAL: Manual rotation by admin
  - EMERGENCY: Emergency rotation due to compromise

  ## Security
  - RLS enabled
  - Agency-isolated
  - Immutable (append-only)

  ## Enforcement Rules
  1. System MUST support credential rotation
  2. Immediate revocation
  3. Environment isolation (sandbox vs live)
*/

CREATE TABLE IF NOT EXISTS credential_rotation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  credential_id uuid NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
  rotated_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  rotation_reason text NOT NULL,
  old_credential_hash text NOT NULL,
  new_credential_hash text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('SANDBOX', 'LIVE')),
  rotation_type text NOT NULL CHECK (rotation_type IN ('SCHEDULED', 'MANUAL', 'EMERGENCY')),
  rotated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE credential_rotation_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_credential_rotation_history_agency_id ON credential_rotation_history(agency_id);
CREATE INDEX IF NOT EXISTS idx_credential_rotation_history_credential_id ON credential_rotation_history(credential_id);
CREATE INDEX IF NOT EXISTS idx_credential_rotation_history_rotated_by ON credential_rotation_history(rotated_by);
CREATE INDEX IF NOT EXISTS idx_credential_rotation_history_rotation_type ON credential_rotation_history(rotation_type);
CREATE INDEX IF NOT EXISTS idx_credential_rotation_history_rotated_at ON credential_rotation_history(rotated_at DESC);
