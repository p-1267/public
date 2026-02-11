/*
  # Rollback History Table (Phase 31)

  ## Purpose
  Tracks all rollback events with complete audit trail.
  Preserves audit continuity, never erases audit data.

  ## New Tables
  - `rollback_history`
    - `id` (uuid, primary key)
    - `rollback_id` (text) - Unique rollback identifier
    - `original_deployment_id` (text) - Original deployment that was rolled back
    - `package_id` (uuid, FK to update_packages, nullable) - Original package
    - `rolled_back_version` (text) - Version that was rolled back
    - `target_version` (text) - Target rollback version (last known-good)
    - `component_type` (text) - BRAIN_LOGIC, API_SCHEMA, CLIENT_APP
    - `environment` (text) - DEVELOPMENT, SANDBOX, PRODUCTION
    - `rollback_trigger` (text) - MANUAL, AUTOMATIC_HEALTH_CHECK_FAILURE
    - `rollback_reason` (text) - Reason for rollback
    - `rollback_started_at` (timestamptz) - Start time
    - `rollback_completed_at` (timestamptz, nullable) - Completion time
    - `rolled_back_by` (uuid, FK to user_profiles) - Who triggered rollback
    - `rollback_status` (text) - IN_PROGRESS, COMPLETED, FAILED
    - `health_check_passed_after_rollback` (boolean, nullable) - Post-rollback health
    - `affected_clients` (integer) - Number of affected clients
    - `audit_continuity_preserved` (boolean) - Audit continuity preserved
    - `failure_details` (jsonb, nullable) - Failure details if rollback failed
    - `created_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Rollback Triggers
  1. MANUAL - Manually triggered by admin
  2. AUTOMATIC_HEALTH_CHECK_FAILURE - Automatically triggered by failed health checks

  ## Rollback Status
  1. IN_PROGRESS - Rollback in progress
  2. COMPLETED - Rollback completed successfully
  3. FAILED - Rollback failed

  ## Security
  - RLS enabled
  - Admin-only access
  - Immutable audit trail

  ## Enforcement Rules
  1. The system MUST support immediate rollback to last known-good version
  2. Automatic rollback on failed health checks
  3. Preservation of audit continuity across rollbacks
  4. Rollback MUST NOT erase audit data
*/

CREATE TABLE IF NOT EXISTS rollback_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rollback_id text NOT NULL UNIQUE,
  original_deployment_id text NOT NULL,
  package_id uuid REFERENCES update_packages(id) ON DELETE CASCADE,
  rolled_back_version text NOT NULL,
  target_version text NOT NULL,
  component_type text NOT NULL CHECK (component_type IN ('BRAIN_LOGIC', 'API_SCHEMA', 'CLIENT_APP')),
  environment text NOT NULL CHECK (environment IN ('DEVELOPMENT', 'SANDBOX', 'PRODUCTION')),
  rollback_trigger text NOT NULL CHECK (rollback_trigger IN ('MANUAL', 'AUTOMATIC_HEALTH_CHECK_FAILURE')),
  rollback_reason text NOT NULL,
  rollback_started_at timestamptz NOT NULL DEFAULT now(),
  rollback_completed_at timestamptz,
  rolled_back_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  rollback_status text NOT NULL CHECK (rollback_status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED')),
  health_check_passed_after_rollback boolean,
  affected_clients integer NOT NULL DEFAULT 0,
  audit_continuity_preserved boolean NOT NULL DEFAULT true,
  failure_details jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE rollback_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_rollback_history_rollback_id ON rollback_history(rollback_id);
CREATE INDEX IF NOT EXISTS idx_rollback_history_original_deployment_id ON rollback_history(original_deployment_id);
CREATE INDEX IF NOT EXISTS idx_rollback_history_environment ON rollback_history(environment);
CREATE INDEX IF NOT EXISTS idx_rollback_history_rollback_trigger ON rollback_history(rollback_trigger);
CREATE INDEX IF NOT EXISTS idx_rollback_history_rollback_status ON rollback_history(rollback_status);
CREATE INDEX IF NOT EXISTS idx_rollback_history_rollback_started_at ON rollback_history(rollback_started_at DESC);
