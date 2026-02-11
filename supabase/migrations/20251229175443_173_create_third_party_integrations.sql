/*
  # Third-Party Integrations Table (Phase 28)

  ## Purpose
  Tracks third-party integrations and data sharing.
  Users can see what data is shared with third parties.

  ## New Tables
  - `third_party_integrations`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency context
    - `integration_name` (text) - name of integration
    - `third_party_name` (text) - name of third party
    - `integration_type` (text) - type of integration
    - `purpose` (text) - purpose of integration
    - `data_scope` (jsonb) - what data is shared
    - `consent_domain_required` (text) - consent domain required
    - `legal_basis` (text) - legal basis for sharing
    - `data_retention_period` (text) - how long data is retained
    - `privacy_policy_url` (text, nullable) - third party privacy policy
    - `is_active` (boolean) - active status
    - `activated_at` (timestamptz) - when activated
    - `deactivated_at` (timestamptz, nullable) - when deactivated
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Security
  - RLS enabled
  - Agency-isolated

  ## Enforcement Rules
  1. Purpose must be disclosed
  2. Data scope must be listed
  3. Sharing status must be visible
  4. Consent MUST explicitly cover it
  5. No implicit sharing allowed
*/

CREATE TABLE IF NOT EXISTS third_party_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  integration_name text NOT NULL,
  third_party_name text NOT NULL,
  integration_type text NOT NULL,
  purpose text NOT NULL,
  data_scope jsonb NOT NULL DEFAULT '{}',
  consent_domain_required text NOT NULL,
  legal_basis text NOT NULL,
  data_retention_period text NOT NULL,
  privacy_policy_url text,
  is_active boolean NOT NULL DEFAULT false,
  activated_at timestamptz,
  deactivated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE third_party_integrations ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_third_party_integrations_agency_id ON third_party_integrations(agency_id);
CREATE INDEX IF NOT EXISTS idx_third_party_integrations_is_active ON third_party_integrations(is_active);
CREATE INDEX IF NOT EXISTS idx_third_party_integrations_consent_domain ON third_party_integrations(consent_domain_required);
