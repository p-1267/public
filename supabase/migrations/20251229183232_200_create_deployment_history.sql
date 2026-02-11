/*
  # Deployment History Table (Phase 31)

  ## Purpose
  Tracks all deployment events with complete audit trail.
  Preserves audit continuity across rollbacks.

  ## New Tables
  - `deployment_history`
    - `id` (uuid, primary key)
    - `deployment_id` (text) - Unique deployment identifier
    - `package_id` (uuid, FK to update_packages) - Update package
    - `package_version` (text) - Target version
    - `component_type` (text) - BRAIN_LOGIC, API_SCHEMA, CLIENT_APP
    - `environment` (text) - DEVELOPMENT, SANDBOX, PRODUCTION
    - `deployment_action` (text) - DEPLOY, ROLLBACK
    - `deployment_stage` (text) - CANARY, PARTIAL, FULL
    - `deployment_status` (text) - IN_PROGRESS, COMPLETED, FAILED, ROLLED_BACK
    - `deployment_started_at` (timestamptz) - Start time
    - `deployment_completed_at` (timestamptz, nullable) - Completion time
    - `deployed_by` (uuid, FK to user_profiles) - Who deployed
    - `admin_acknowledged` (boolean) - Admin acknowledgment (for enforcement changes)
    - `acknowledged_by` (uuid, FK to user_profiles, nullable) - Who acknowledged
    - `acknowledged_at` (timestamptz, nullable) - When acknowledged
    - `health_check_passed` (boolean, nullable) - Health check result
    - `health_check_details` (jsonb) - Health check details
    - `failure_reason` (text, nullable) - Failure reason
    - `affected_clients` (integer) - Number of affected clients
    - `rollback_triggered` (boolean) - Was rollback triggered
    - `rollback_reason` (text, nullable) - Rollback reason
    - `previous_version` (text, nullable) - Previous version
    - `created_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Deployment Actions
  1. DEPLOY - Deploy update
  2. ROLLBACK - Rollback to previous version

  ## Deployment Stages
  1. CANARY - Canary deployment (small subset)
  2. PARTIAL - Partial deployment (larger subset)
  3. FULL - Full deployment (all clients)

  ## Deployment Status
  1. IN_PROGRESS - Deployment in progress
  2. COMPLETED - Deployment completed successfully
  3. FAILED - Deployment failed
  4. ROLLED_BACK - Deployment rolled back

  ## Environments
  1. DEVELOPMENT - Development environment
  2. SANDBOX - Sandbox environment
  3. PRODUCTION - Production environment

  ## Security
  - RLS enabled
  - Admin-only access
  - Immutable audit trail

  ## Enforcement Rules
  1. Updates MUST be staged (canary → partial → full)
  2. Rollback MUST NOT erase audit data
  3. Environment isolation enforced
  4. No cross-environment data leakage
*/

CREATE TABLE IF NOT EXISTS deployment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id text NOT NULL,
  package_id uuid REFERENCES update_packages(id) ON DELETE CASCADE,
  package_version text NOT NULL,
  component_type text NOT NULL CHECK (component_type IN ('BRAIN_LOGIC', 'API_SCHEMA', 'CLIENT_APP')),
  environment text NOT NULL CHECK (environment IN ('DEVELOPMENT', 'SANDBOX', 'PRODUCTION')),
  deployment_action text NOT NULL CHECK (deployment_action IN ('DEPLOY', 'ROLLBACK')),
  deployment_stage text NOT NULL CHECK (deployment_stage IN ('CANARY', 'PARTIAL', 'FULL')),
  deployment_status text NOT NULL CHECK (deployment_status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED', 'ROLLED_BACK')),
  deployment_started_at timestamptz NOT NULL DEFAULT now(),
  deployment_completed_at timestamptz,
  deployed_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  admin_acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  acknowledged_at timestamptz,
  health_check_passed boolean,
  health_check_details jsonb NOT NULL DEFAULT '{}',
  failure_reason text,
  affected_clients integer NOT NULL DEFAULT 0,
  rollback_triggered boolean NOT NULL DEFAULT false,
  rollback_reason text,
  previous_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE deployment_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_deployment_history_deployment_id ON deployment_history(deployment_id);
CREATE INDEX IF NOT EXISTS idx_deployment_history_package_id ON deployment_history(package_id);
CREATE INDEX IF NOT EXISTS idx_deployment_history_environment ON deployment_history(environment);
CREATE INDEX IF NOT EXISTS idx_deployment_history_deployment_action ON deployment_history(deployment_action);
CREATE INDEX IF NOT EXISTS idx_deployment_history_deployment_status ON deployment_history(deployment_status);
CREATE INDEX IF NOT EXISTS idx_deployment_history_deployment_started_at ON deployment_history(deployment_started_at DESC);
