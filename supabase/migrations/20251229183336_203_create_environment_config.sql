/*
  # Environment Configuration Table (Phase 31)

  ## Purpose
  Defines isolated environments with strict separation.
  No cross-environment data leakage allowed.

  ## New Tables
  - `environment_config`
    - `id` (uuid, primary key)
    - `environment_name` (text) - DEVELOPMENT, SANDBOX, PRODUCTION
    - `environment_slug` (text) - Unique environment slug
    - `is_active` (boolean) - Is environment active
    - `current_brain_logic_version` (text) - Current brain logic version
    - `current_api_schema_version` (text) - Current API schema version
    - `current_client_app_version` (text) - Current client app version
    - `allows_experimental_features` (boolean) - Experimental features allowed
    - `requires_signature_verification` (boolean) - Signature verification required
    - `auto_rollback_enabled` (boolean) - Auto rollback on health check failure
    - `health_check_interval_seconds` (integer) - Health check interval
    - `max_deployment_duration_minutes` (integer) - Max deployment duration
    - `isolation_enforced` (boolean) - Isolation enforced
    - `data_leakage_prevention` (boolean) - Data leakage prevention enabled
    - `created_by` (uuid, FK to user_profiles) - Who created
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Environments
  1. DEVELOPMENT - Development environment (experimental features allowed)
  2. SANDBOX - Sandbox environment (testing)
  3. PRODUCTION - Production environment (strict controls)

  ## Security
  - RLS enabled
  - Admin-only management
  - Strict environment isolation

  ## Enforcement Rules
  1. Separate environments MUST exist for: DEVELOPMENT, SANDBOX, PRODUCTION
  2. No cross-environment data leakage allowed
  3. Environment isolation enforced
*/

CREATE TABLE IF NOT EXISTS environment_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  environment_name text NOT NULL UNIQUE CHECK (environment_name IN ('DEVELOPMENT', 'SANDBOX', 'PRODUCTION')),
  environment_slug text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  current_brain_logic_version text NOT NULL DEFAULT '1.0.0',
  current_api_schema_version text NOT NULL DEFAULT '1.0.0',
  current_client_app_version text NOT NULL DEFAULT '1.0.0',
  allows_experimental_features boolean NOT NULL DEFAULT false,
  requires_signature_verification boolean NOT NULL DEFAULT true,
  auto_rollback_enabled boolean NOT NULL DEFAULT true,
  health_check_interval_seconds integer NOT NULL DEFAULT 300,
  max_deployment_duration_minutes integer NOT NULL DEFAULT 60,
  isolation_enforced boolean NOT NULL DEFAULT true,
  data_leakage_prevention boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE environment_config ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_environment_config_environment_name ON environment_config(environment_name);
CREATE INDEX IF NOT EXISTS idx_environment_config_is_active ON environment_config(is_active);
