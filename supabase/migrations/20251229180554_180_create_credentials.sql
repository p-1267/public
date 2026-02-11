/*
  # Credentials Table (Phase 29)

  ## Purpose
  Stores managed credentials for external integrations.
  Per-agency isolation, sandbox-first enforcement.

  ## New Tables
  - `credentials`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency context
    - `credential_type_id` (uuid, FK to credential_types) - credential type
    - `credential_name` (text) - user-defined name
    - `environment` (text) - SANDBOX, LIVE
    - `status` (text) - INACTIVE, SANDBOX_ACTIVE, LIVE_PENDING, LIVE_ACTIVE, REVOKED
    - `encrypted_credentials` (text) - encrypted credential data
    - `configuration` (jsonb) - additional configuration
    - `created_by` (uuid, FK to user_profiles) - who created
    - `created_at` (timestamptz)
    - `sandbox_activated_at` (timestamptz, nullable) - when sandbox activated
    - `sandbox_activated_by` (uuid, FK to user_profiles, nullable) - who activated sandbox
    - `live_activation_requested_at` (timestamptz, nullable) - when live activation requested
    - `live_activation_requested_by` (uuid, FK to user_profiles, nullable) - who requested live
    - `live_activated_at` (timestamptz, nullable) - when live activated
    - `live_activated_by` (uuid, FK to user_profiles, nullable) - who activated live
    - `live_activation_confirmation` (text, nullable) - typed confirmation phrase
    - `live_activation_device_fingerprint` (text, nullable) - device fingerprint
    - `revoked_at` (timestamptz, nullable) - when revoked
    - `revoked_by` (uuid, FK to user_profiles, nullable) - who revoked
    - `revoked_reason` (text, nullable) - reason for revocation
    - `last_rotated_at` (timestamptz, nullable) - last rotation timestamp
    - `updated_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Status Flow
  1. INACTIVE - Credential created but not activated
  2. SANDBOX_ACTIVE - Sandbox environment active
  3. LIVE_PENDING - Live activation requested but not confirmed
  4. LIVE_ACTIVE - Live environment active
  5. REVOKED - Credential revoked

  ## Security
  - RLS enabled
  - Per-agency isolation
  - Credentials are inert until explicitly unlocked
  - Sandbox first, live last

  ## Enforcement Rules
  1. All credentials start in SANDBOX mode
  2. Live activation requires explicit admin confirmation
  3. No live transactions permitted in sandbox
  4. Payment failures MUST NOT affect care execution
  5. AI credentials MUST NOT execute actions/trigger alerts/write records/override Brain logic
*/

CREATE TABLE IF NOT EXISTS credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  credential_type_id uuid NOT NULL REFERENCES credential_types(id) ON DELETE CASCADE,
  credential_name text NOT NULL,
  environment text NOT NULL DEFAULT 'SANDBOX' CHECK (environment IN ('SANDBOX', 'LIVE')),
  status text NOT NULL DEFAULT 'INACTIVE' CHECK (status IN ('INACTIVE', 'SANDBOX_ACTIVE', 'LIVE_PENDING', 'LIVE_ACTIVE', 'REVOKED')),
  encrypted_credentials text,
  configuration jsonb NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  sandbox_activated_at timestamptz,
  sandbox_activated_by uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  live_activation_requested_at timestamptz,
  live_activation_requested_by uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  live_activated_at timestamptz,
  live_activated_by uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  live_activation_confirmation text,
  live_activation_device_fingerprint text,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  revoked_reason text,
  last_rotated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE credentials ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_credentials_agency_id ON credentials(agency_id);
CREATE INDEX IF NOT EXISTS idx_credentials_credential_type_id ON credentials(credential_type_id);
CREATE INDEX IF NOT EXISTS idx_credentials_environment ON credentials(environment);
CREATE INDEX IF NOT EXISTS idx_credentials_status ON credentials(status);
CREATE INDEX IF NOT EXISTS idx_credentials_created_by ON credentials(created_by);
