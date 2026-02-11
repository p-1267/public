/*
  # Consent Registry Table (Phase 28)

  ## Purpose
  Main consent records with versioning.
  Only ONE active consent version allowed per resident/user context.

  ## New Tables
  - `consent_registry`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency context
    - `resident_id` (uuid, FK to residents, nullable) - resident if applicable
    - `user_id` (uuid, FK to user_profiles, nullable) - user if applicable
    - `consent_version` (integer) - version number
    - `granted_domains` (text[]) - array of domain keys
    - `granted_by` (uuid, FK to user_profiles) - who granted consent
    - `granted_by_relationship` (text, nullable) - relationship if legal representative
    - `legal_representative_id` (uuid, FK to legal_representatives, nullable) - representative if applicable
    - `language_context` (text) - language used
    - `device_fingerprint` (text) - device used
    - `status` (text) - ACTIVE, REVOKED, SUPERSEDED
    - `granted_at` (timestamptz) - when granted
    - `revoked_at` (timestamptz, nullable) - when revoked
    - `revoked_by` (uuid, FK to user_profiles, nullable) - who revoked
    - `revoked_reason` (text, nullable) - reason for revocation
    - `superseded_by` (uuid, FK to consent_registry, nullable) - superseded by newer version
    - `created_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Security
  - RLS enabled
  - Agency-isolated
  - Only ONE active consent version per resident/user

  ## Enforcement Rules
  1. Consent is explicit, versioned, and revocable
  2. Only ONE active consent version allowed per resident/user context
  3. Revocation has immediate effect
  4. Each consent record includes: version, granted domains, granted by, timestamp, language, device, status
*/

CREATE TABLE IF NOT EXISTS consent_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  consent_version integer NOT NULL DEFAULT 1,
  granted_domains text[] NOT NULL DEFAULT '{}',
  granted_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  granted_by_relationship text,
  legal_representative_id uuid,
  language_context text NOT NULL DEFAULT 'en',
  device_fingerprint text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'REVOKED', 'SUPERSEDED')),
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  revoked_reason text,
  superseded_by uuid REFERENCES consent_registry(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}',
  CHECK (resident_id IS NOT NULL OR user_id IS NOT NULL)
);

ALTER TABLE consent_registry ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_consent_registry_agency_id ON consent_registry(agency_id);
CREATE INDEX IF NOT EXISTS idx_consent_registry_resident_id ON consent_registry(resident_id);
CREATE INDEX IF NOT EXISTS idx_consent_registry_user_id ON consent_registry(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_registry_status ON consent_registry(status);
CREATE INDEX IF NOT EXISTS idx_consent_registry_granted_at ON consent_registry(granted_at DESC);
CREATE INDEX IF NOT EXISTS idx_consent_registry_granted_domains ON consent_registry USING GIN(granted_domains);

-- Unique constraint: Only ONE active consent per resident/user
CREATE UNIQUE INDEX IF NOT EXISTS idx_consent_registry_active_resident 
  ON consent_registry(agency_id, resident_id) 
  WHERE status = 'ACTIVE' AND resident_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_consent_registry_active_user 
  ON consent_registry(agency_id, user_id) 
  WHERE status = 'ACTIVE' AND user_id IS NOT NULL;
