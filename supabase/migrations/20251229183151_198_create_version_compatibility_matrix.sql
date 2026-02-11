/*
  # Version Compatibility Matrix Table (Phase 31)

  ## Purpose
  Defines explicit compatibility between system component versions.
  No implicit compatibility allowed.

  ## New Tables
  - `version_compatibility_matrix`
    - `id` (uuid, primary key)
    - `brain_logic_version` (text) - Brain logic version
    - `api_schema_version` (text) - API schema version
    - `client_app_min_version` (text) - Minimum compatible client version
    - `client_app_max_version` (text, nullable) - Maximum compatible client version
    - `is_compatible` (boolean) - Compatibility status
    - `compatibility_notes` (text) - Compatibility notes
    - `verified_at` (timestamptz) - When verified
    - `verified_by` (uuid, FK to user_profiles) - Who verified
    - `created_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Security
  - RLS enabled
  - System-managed
  - Explicit compatibility only

  ## Enforcement Rules
  1. Compatibility matrix between versions
  2. No implicit compatibility allowed
  3. Clients MUST verify version compatibility on startup
  4. Incompatible clients MUST enter RESTRICTED MODE
*/

CREATE TABLE IF NOT EXISTS version_compatibility_matrix (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brain_logic_version text NOT NULL,
  api_schema_version text NOT NULL,
  client_app_min_version text NOT NULL,
  client_app_max_version text,
  is_compatible boolean NOT NULL DEFAULT true,
  compatibility_notes text NOT NULL DEFAULT '',
  verified_at timestamptz NOT NULL DEFAULT now(),
  verified_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}',
  UNIQUE(brain_logic_version, api_schema_version, client_app_min_version)
);

ALTER TABLE version_compatibility_matrix ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_version_compatibility_matrix_brain_logic_version ON version_compatibility_matrix(brain_logic_version);
CREATE INDEX IF NOT EXISTS idx_version_compatibility_matrix_api_schema_version ON version_compatibility_matrix(api_schema_version);
CREATE INDEX IF NOT EXISTS idx_version_compatibility_matrix_client_app_min_version ON version_compatibility_matrix(client_app_min_version);
CREATE INDEX IF NOT EXISTS idx_version_compatibility_matrix_is_compatible ON version_compatibility_matrix(is_compatible);
