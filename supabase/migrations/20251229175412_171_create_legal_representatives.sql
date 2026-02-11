/*
  # Legal Representatives Table (Phase 28)

  ## Purpose
  Records legal representatives authorized to provide consent.
  Tracks relationship and authority scope.

  ## New Tables
  - `legal_representatives`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency context
    - `resident_id` (uuid, FK to residents) - resident represented
    - `representative_user_id` (uuid, FK to user_profiles, nullable) - representative if system user
    - `representative_name` (text) - representative name
    - `relationship` (text) - relationship to resident
    - `authority_scope` (jsonb) - what representative can consent to
    - `jurisdiction` (text) - legal jurisdiction
    - `documentation_type` (text) - type of legal documentation
    - `documentation_reference` (text) - reference to legal documents
    - `verified_by` (uuid, FK to user_profiles) - who verified authority
    - `verified_at` (timestamptz) - when verified
    - `is_active` (boolean) - active status
    - `expires_at` (timestamptz, nullable) - expiration date if applicable
    - `revoked_at` (timestamptz, nullable) - when revoked
    - `revoked_by` (uuid, FK to user_profiles, nullable) - who revoked
    - `revoked_reason` (text, nullable) - reason for revocation
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Security
  - RLS enabled
  - Agency-isolated
  - Only active representatives can provide consent

  ## Enforcement Rules
  1. Relationship must be recorded
  2. Authority scope must be documented
  3. Revocation rules follow jurisdiction law
*/

CREATE TABLE IF NOT EXISTS legal_representatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  representative_user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  representative_name text NOT NULL,
  relationship text NOT NULL,
  authority_scope jsonb NOT NULL DEFAULT '{}',
  jurisdiction text NOT NULL,
  documentation_type text NOT NULL,
  documentation_reference text NOT NULL,
  verified_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  verified_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  revoked_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE legal_representatives ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_legal_representatives_agency_id ON legal_representatives(agency_id);
CREATE INDEX IF NOT EXISTS idx_legal_representatives_resident_id ON legal_representatives(resident_id);
CREATE INDEX IF NOT EXISTS idx_legal_representatives_representative_user_id ON legal_representatives(representative_user_id);
CREATE INDEX IF NOT EXISTS idx_legal_representatives_is_active ON legal_representatives(is_active);
CREATE INDEX IF NOT EXISTS idx_legal_representatives_expires_at ON legal_representatives(expires_at);
