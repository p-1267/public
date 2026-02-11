/*
  # Integration Registry Table (Phase 30)

  ## Purpose
  Registers third-party integrations for external data ingestion.
  Each integration is explicitly typed and per-agency isolated.

  ## New Tables
  - `integration_registry`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency context
    - `integration_type` (text) - PHARMACY, LABORATORY, EHR_HIE, EMERGENCY_SERVICES, WEARABLE_HEALTH
    - `provider_name` (text) - provider name
    - `credential_id` (uuid, FK to credentials) - credential reference from Phase 29
    - `supported_data_domains` (text[]) - supported data domains
    - `read_only` (boolean) - read-only flag
    - `limited_write` (boolean) - limited write flag
    - `required_consent_domains` (text[]) - required consent domains
    - `status` (text) - INACTIVE, ACTIVE, SUSPENDED
    - `enabled_by_agency` (boolean) - agency explicitly enabled
    - `configuration` (jsonb) - integration configuration
    - `created_by` (uuid, FK to user_profiles) - who created
    - `created_at` (timestamptz)
    - `activated_at` (timestamptz, nullable) - when activated
    - `activated_by` (uuid, FK to user_profiles, nullable) - who activated
    - `suspended_at` (timestamptz, nullable) - when suspended
    - `suspended_by` (uuid, FK to user_profiles, nullable) - who suspended
    - `suspended_reason` (text, nullable) - suspension reason
    - `updated_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Integration Types
  1. PHARMACY - Pharmacy systems (medications)
  2. LABORATORY - Laboratory systems (test results)
  3. EHR_HIE - EHR / HIE systems (clinical records)
  4. EMERGENCY_SERVICES - Emergency services interfaces (read-only)
  5. WEARABLE_HEALTH - Wearable / external health platforms (read-only)

  ## Status Flow
  1. INACTIVE - Integration registered but not active (default)
  2. ACTIVE - Integration active and ingesting data
  3. SUSPENDED - Integration suspended (circuit-breaker or admin action)

  ## Security
  - RLS enabled
  - Per-agency isolation
  - Default status = INACTIVE

  ## Enforcement Rules
  1. External systems are data sources only, never authorities
  2. Each integration is explicitly typed
  3. Default status = INACTIVE
  4. All integrations are per-agency isolated
*/

CREATE TABLE IF NOT EXISTS integration_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  integration_type text NOT NULL CHECK (integration_type IN ('PHARMACY', 'LABORATORY', 'EHR_HIE', 'EMERGENCY_SERVICES', 'WEARABLE_HEALTH')),
  provider_name text NOT NULL,
  credential_id uuid NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
  supported_data_domains text[] NOT NULL DEFAULT '{}',
  read_only boolean NOT NULL DEFAULT true,
  limited_write boolean NOT NULL DEFAULT false,
  required_consent_domains text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'INACTIVE' CHECK (status IN ('INACTIVE', 'ACTIVE', 'SUSPENDED')),
  enabled_by_agency boolean NOT NULL DEFAULT false,
  configuration jsonb NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  activated_at timestamptz,
  activated_by uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  suspended_at timestamptz,
  suspended_by uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  suspended_reason text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE integration_registry ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_integration_registry_agency_id ON integration_registry(agency_id);
CREATE INDEX IF NOT EXISTS idx_integration_registry_integration_type ON integration_registry(integration_type);
CREATE INDEX IF NOT EXISTS idx_integration_registry_credential_id ON integration_registry(credential_id);
CREATE INDEX IF NOT EXISTS idx_integration_registry_status ON integration_registry(status);
CREATE INDEX IF NOT EXISTS idx_integration_registry_enabled_by_agency ON integration_registry(enabled_by_agency);
