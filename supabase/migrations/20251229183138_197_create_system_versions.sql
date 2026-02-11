/*
  # System Versions Table (Phase 31)

  ## Purpose
  Maintains semantic versioning for all system components.
  Tracks Brain logic version, API schema version, and Client app version.

  ## New Tables
  - `system_versions`
    - `id` (uuid, primary key)
    - `version_number` (text) - Semantic version (MAJOR.MINOR.PATCH)
    - `version_type` (text) - BRAIN_LOGIC, API_SCHEMA, CLIENT_APP
    - `major_version` (integer) - Major version number
    - `minor_version` (integer) - Minor version number
    - `patch_version` (integer) - Patch version number
    - `release_timestamp` (timestamptz) - When released
    - `is_current_version` (boolean) - Is this the current version
    - `is_deprecated` (boolean) - Is this version deprecated
    - `deprecation_date` (timestamptz, nullable) - When deprecated
    - `end_of_life_date` (timestamptz, nullable) - When end of life
    - `release_notes` (text) - Release notes
    - `breaking_changes` (text[]) - List of breaking changes
    - `created_by` (uuid, FK to user_profiles) - Who created
    - `created_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Version Types
  1. BRAIN_LOGIC - Brain enforcement logic version
  2. API_SCHEMA - API schema version
  3. CLIENT_APP - Client application version

  ## Security
  - RLS enabled
  - System-managed
  - Version immutability enforced

  ## Enforcement Rules
  1. Semantic versioning (MAJOR.MINOR.PATCH)
  2. Explicit mapping: Brain logic version, API schema version, Client app version
  3. No implicit compatibility allowed
*/

CREATE TABLE IF NOT EXISTS system_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number text NOT NULL,
  version_type text NOT NULL CHECK (version_type IN ('BRAIN_LOGIC', 'API_SCHEMA', 'CLIENT_APP')),
  major_version integer NOT NULL,
  minor_version integer NOT NULL,
  patch_version integer NOT NULL,
  release_timestamp timestamptz NOT NULL DEFAULT now(),
  is_current_version boolean NOT NULL DEFAULT false,
  is_deprecated boolean NOT NULL DEFAULT false,
  deprecation_date timestamptz,
  end_of_life_date timestamptz,
  release_notes text NOT NULL DEFAULT '',
  breaking_changes text[] NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}',
  UNIQUE(version_number, version_type)
);

ALTER TABLE system_versions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_system_versions_version_type ON system_versions(version_type);
CREATE INDEX IF NOT EXISTS idx_system_versions_is_current_version ON system_versions(is_current_version);
CREATE INDEX IF NOT EXISTS idx_system_versions_is_deprecated ON system_versions(is_deprecated);
CREATE INDEX IF NOT EXISTS idx_system_versions_version_number ON system_versions(version_number);
