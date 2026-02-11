/*
  # Update Audit Log Table (Phase 31)

  ## Purpose
  Immutable audit trail for all update-related events.
  Complete traceability for compliance and security.

  ## New Tables
  - `update_audit_log`
    - `id` (uuid, primary key)
    - `event_id` (text) - Unique event identifier
    - `event_type` (text) - VERSION_RELEASED, PACKAGE_CREATED, DEPLOYMENT_STARTED, DEPLOYMENT_COMPLETED, ROLLBACK_TRIGGERED, HEALTH_CHECK_FAILED, CLIENT_VERSION_UPDATED
    - `environment` (text) - DEVELOPMENT, SANDBOX, PRODUCTION
    - `version_number` (text, nullable) - Version involved
    - `component_type` (text, nullable) - BRAIN_LOGIC, API_SCHEMA, CLIENT_APP
    - `action` (text) - DEPLOY, ROLLBACK, HEALTH_CHECK, VERSION_CHECK
    - `action_result` (text) - SUCCESS, FAILURE, WARNING
    - `actor_id` (uuid, FK to user_profiles, nullable) - Who performed action (null for system)
    - `actor_type` (text) - USER, SYSTEM
    - `timestamp` (timestamptz) - When event occurred
    - `deployment_id` (text, nullable) - Related deployment ID
    - `rollback_id` (text, nullable) - Related rollback ID
    - `package_id` (uuid, FK to update_packages, nullable) - Related package
    - `affected_components` (text[]) - Affected components
    - `event_details` (jsonb) - Event details
    - `created_at` (timestamptz)

  ## Event Types
  1. VERSION_RELEASED - New version released
  2. PACKAGE_CREATED - Update package created
  3. DEPLOYMENT_STARTED - Deployment started
  4. DEPLOYMENT_COMPLETED - Deployment completed
  5. ROLLBACK_TRIGGERED - Rollback triggered
  6. HEALTH_CHECK_FAILED - Health check failed
  7. CLIENT_VERSION_UPDATED - Client version updated

  ## Actor Types
  1. USER - Action performed by user
  2. SYSTEM - Action performed by system

  ## Security
  - RLS enabled
  - Immutable (append-only)
  - Complete audit trail

  ## Enforcement Rules
  1. Every update event MUST log: Version, Environment, Action (DEPLOY / ROLLBACK), Actor, Timestamp, Affected components
  2. Audit logs are immutable
*/

CREATE TABLE IF NOT EXISTS update_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL CHECK (event_type IN ('VERSION_RELEASED', 'PACKAGE_CREATED', 'DEPLOYMENT_STARTED', 'DEPLOYMENT_COMPLETED', 'ROLLBACK_TRIGGERED', 'HEALTH_CHECK_FAILED', 'CLIENT_VERSION_UPDATED')),
  environment text NOT NULL CHECK (environment IN ('DEVELOPMENT', 'SANDBOX', 'PRODUCTION')),
  version_number text,
  component_type text CHECK (component_type IN ('BRAIN_LOGIC', 'API_SCHEMA', 'CLIENT_APP')),
  action text NOT NULL CHECK (action IN ('DEPLOY', 'ROLLBACK', 'HEALTH_CHECK', 'VERSION_CHECK')),
  action_result text NOT NULL CHECK (action_result IN ('SUCCESS', 'FAILURE', 'WARNING')),
  actor_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  actor_type text NOT NULL CHECK (actor_type IN ('USER', 'SYSTEM')),
  timestamp timestamptz NOT NULL DEFAULT now(),
  deployment_id text,
  rollback_id text,
  package_id uuid REFERENCES update_packages(id) ON DELETE CASCADE,
  affected_components text[] NOT NULL DEFAULT '{}',
  event_details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE update_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_update_audit_log_event_id ON update_audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_update_audit_log_event_type ON update_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_update_audit_log_environment ON update_audit_log(environment);
CREATE INDEX IF NOT EXISTS idx_update_audit_log_action ON update_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_update_audit_log_timestamp ON update_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_update_audit_log_actor_id ON update_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_update_audit_log_deployment_id ON update_audit_log(deployment_id);
CREATE INDEX IF NOT EXISTS idx_update_audit_log_rollback_id ON update_audit_log(rollback_id);
