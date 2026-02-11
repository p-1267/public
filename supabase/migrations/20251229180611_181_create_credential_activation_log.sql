/*
  # Credential Activation Log Table (Phase 29)

  ## Purpose
  Immutable audit log for all credential events.
  Complete traceability for compliance and security.

  ## New Tables
  - `credential_activation_log`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency context
    - `credential_id` (uuid, FK to credentials) - related credential
    - `actor_id` (uuid, FK to user_profiles) - who performed action
    - `actor_role` (text) - role at time of action
    - `credential_type` (text) - type of credential
    - `environment` (text) - SANDBOX, LIVE
    - `action` (text) - CREATE, ACTIVATE_SANDBOX, REQUEST_LIVE, ACTIVATE_LIVE, ROTATE, REVOKE
    - `confirmation_phrase` (text, nullable) - typed confirmation if applicable
    - `device_fingerprint` (text, nullable) - device used
    - `ip_address` (text, nullable) - IP address
    - `user_agent` (text, nullable) - user agent
    - `validation_result` (jsonb) - validation results
    - `timestamp` (timestamptz) - when action occurred
    - `created_at` (timestamptz)
    - `metadata` (jsonb) - additional context

  ## Actions
  - CREATE: Credential created
  - ACTIVATE_SANDBOX: Sandbox environment activated
  - REQUEST_LIVE: Live activation requested
  - ACTIVATE_LIVE: Live environment activated
  - ROTATE: Credential rotated
  - REVOKE: Credential revoked

  ## Security
  - RLS enabled
  - Agency-isolated
  - Immutable (append-only)

  ## Enforcement Rules
  1. Every credential event MUST log: Actor, Role, Credential type, Environment, Action, Timestamp, Device fingerprint
  2. Audit logs are immutable
  3. Credential activation is a security event, not a configuration toggle
*/

CREATE TABLE IF NOT EXISTS credential_activation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  credential_id uuid NOT NULL REFERENCES credentials(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  actor_role text NOT NULL,
  credential_type text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('SANDBOX', 'LIVE')),
  action text NOT NULL CHECK (action IN ('CREATE', 'ACTIVATE_SANDBOX', 'REQUEST_LIVE', 'ACTIVATE_LIVE', 'ROTATE', 'REVOKE')),
  confirmation_phrase text,
  device_fingerprint text,
  ip_address text,
  user_agent text,
  validation_result jsonb NOT NULL DEFAULT '{}',
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE credential_activation_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_credential_activation_log_agency_id ON credential_activation_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_credential_activation_log_credential_id ON credential_activation_log(credential_id);
CREATE INDEX IF NOT EXISTS idx_credential_activation_log_actor_id ON credential_activation_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_credential_activation_log_action ON credential_activation_log(action);
CREATE INDEX IF NOT EXISTS idx_credential_activation_log_environment ON credential_activation_log(environment);
CREATE INDEX IF NOT EXISTS idx_credential_activation_log_timestamp ON credential_activation_log(timestamp DESC);
