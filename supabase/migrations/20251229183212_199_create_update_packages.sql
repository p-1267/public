/*
  # Update Packages Table (Phase 31)

  ## Purpose
  Stores update packages with cryptographic signatures.
  Unsigned updates MUST be rejected.

  ## New Tables
  - `update_packages`
    - `id` (uuid, primary key)
    - `package_version` (text) - Target version
    - `component_type` (text) - BRAIN_LOGIC, API_SCHEMA, CLIENT_APP
    - `change_classification` (text) - SECURITY, BUGFIX, FEATURE
    - `package_signature` (text) - Cryptographic signature
    - `signature_algorithm` (text) - Signature algorithm
    - `signed_by` (uuid, FK to user_profiles) - Who signed
    - `signed_at` (timestamptz) - When signed
    - `release_timestamp` (timestamptz) - Release timestamp
    - `backward_compatible` (boolean) - Backward compatibility declaration
    - `requires_admin_acknowledgment` (boolean) - Enforcement logic changes
    - `requires_user_notification` (boolean) - Affects user behavior
    - `package_url` (text, nullable) - Package download URL
    - `package_checksum` (text) - Package checksum
    - `package_size_bytes` (bigint) - Package size
    - `deployment_status` (text) - STAGED, CANARY, PARTIAL, FULL, ROLLED_BACK
    - `release_notes` (text) - Release notes
    - `breaking_changes` (text[]) - Breaking changes
    - `affected_components` (text[]) - Affected components
    - `created_by` (uuid, FK to user_profiles) - Who created
    - `created_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Change Classifications
  1. SECURITY - Security fixes (emergency patches allowed)
  2. BUGFIX - Bug fixes
  3. FEATURE - New features (non-enforcement)

  ## Deployment Stages
  1. STAGED - Staged for deployment
  2. CANARY - Canary deployment
  3. PARTIAL - Partial deployment
  4. FULL - Full deployment
  5. ROLLED_BACK - Rolled back

  ## Security
  - RLS enabled
  - Admin-only management
  - Signature verification required

  ## Enforcement Rules
  1. Every update package MUST include: Version identifier, Cryptographic signature, Release timestamp, Change classification, Backward compatibility declaration
  2. Unsigned updates MUST be rejected
  3. Updates MUST be staged (canary → partial → full)
  4. Emergency patches allowed ONLY for security fixes
  5. Enforcement logic changes require admin acknowledgment
  6. Users MUST be notified of updates affecting behavior
*/

CREATE TABLE IF NOT EXISTS update_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_version text NOT NULL,
  component_type text NOT NULL CHECK (component_type IN ('BRAIN_LOGIC', 'API_SCHEMA', 'CLIENT_APP')),
  change_classification text NOT NULL CHECK (change_classification IN ('SECURITY', 'BUGFIX', 'FEATURE')),
  package_signature text NOT NULL,
  signature_algorithm text NOT NULL DEFAULT 'SHA256-RSA',
  signed_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  signed_at timestamptz NOT NULL DEFAULT now(),
  release_timestamp timestamptz NOT NULL DEFAULT now(),
  backward_compatible boolean NOT NULL,
  requires_admin_acknowledgment boolean NOT NULL DEFAULT false,
  requires_user_notification boolean NOT NULL DEFAULT false,
  package_url text,
  package_checksum text NOT NULL,
  package_size_bytes bigint NOT NULL DEFAULT 0,
  deployment_status text NOT NULL DEFAULT 'STAGED' CHECK (deployment_status IN ('STAGED', 'CANARY', 'PARTIAL', 'FULL', 'ROLLED_BACK')),
  release_notes text NOT NULL DEFAULT '',
  breaking_changes text[] NOT NULL DEFAULT '{}',
  affected_components text[] NOT NULL DEFAULT '{}',
  created_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}',
  UNIQUE(package_version, component_type)
);

ALTER TABLE update_packages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_update_packages_component_type ON update_packages(component_type);
CREATE INDEX IF NOT EXISTS idx_update_packages_change_classification ON update_packages(change_classification);
CREATE INDEX IF NOT EXISTS idx_update_packages_deployment_status ON update_packages(deployment_status);
CREATE INDEX IF NOT EXISTS idx_update_packages_package_version ON update_packages(package_version);
CREATE INDEX IF NOT EXISTS idx_update_packages_backward_compatible ON update_packages(backward_compatible);
