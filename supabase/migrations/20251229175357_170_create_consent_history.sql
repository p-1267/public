/*
  # Consent History Table (Phase 28)

  ## Purpose
  Immutable audit log of all consent events.
  Complete traceability for compliance.

  ## New Tables
  - `consent_history`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency context
    - `consent_id` (uuid, FK to consent_registry) - related consent
    - `resident_id` (uuid, FK to residents, nullable) - resident if applicable
    - `user_id` (uuid, FK to user_profiles, nullable) - user if applicable
    - `actor_id` (uuid, FK to user_profiles) - who performed action
    - `actor_role` (text) - role at time of action
    - `consent_domain` (text) - domain affected
    - `action` (text) - GRANT, REVOKE, SUPERSEDE
    - `consent_version` (integer) - version number
    - `language_context` (text) - language used
    - `device_fingerprint` (text) - device used
    - `ip_address` (text, nullable) - IP address
    - `user_agent` (text, nullable) - user agent
    - `timestamp` (timestamptz) - when action occurred
    - `metadata` (jsonb) - additional context
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Agency-isolated
  - Immutable (append-only)

  ## Enforcement Rules
  1. Every consent event MUST log: Actor, Role, Consent domain, Action (GRANT/REVOKE), Version, Timestamp, Device fingerprint, Language context
  2. Audit logs are immutable
*/

CREATE TABLE IF NOT EXISTS consent_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  consent_id uuid NOT NULL REFERENCES consent_registry(id) ON DELETE CASCADE,
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  actor_role text NOT NULL,
  consent_domain text NOT NULL,
  action text NOT NULL CHECK (action IN ('GRANT', 'REVOKE', 'SUPERSEDE')),
  consent_version integer NOT NULL,
  language_context text NOT NULL,
  device_fingerprint text,
  ip_address text,
  user_agent text,
  timestamp timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE consent_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_consent_history_agency_id ON consent_history(agency_id);
CREATE INDEX IF NOT EXISTS idx_consent_history_consent_id ON consent_history(consent_id);
CREATE INDEX IF NOT EXISTS idx_consent_history_resident_id ON consent_history(resident_id);
CREATE INDEX IF NOT EXISTS idx_consent_history_user_id ON consent_history(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_history_actor_id ON consent_history(actor_id);
CREATE INDEX IF NOT EXISTS idx_consent_history_action ON consent_history(action);
CREATE INDEX IF NOT EXISTS idx_consent_history_timestamp ON consent_history(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_consent_history_consent_domain ON consent_history(consent_domain);
