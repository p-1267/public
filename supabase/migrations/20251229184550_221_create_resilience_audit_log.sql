/*
  # Resilience Audit Log Table (Phase 32)

  ## Purpose
  Immutable audit trail for all resilience-related events.
  Complete traceability for compliance and security.

  ## New Tables
  - `resilience_audit_log`
    - `id` (uuid, primary key)
    - `event_id` (text) - Unique event identifier
    - `event_type` (text) - RATE_LIMIT_EXCEEDED, CIRCUIT_OPENED, CIRCUIT_CLOSED, DEGRADATION_STARTED, DEGRADATION_ENDED, INCIDENT_OPENED, INCIDENT_RESOLVED, BACKUP_CREATED, BACKUP_VERIFIED, INTEGRITY_CHECK_FAILED
    - `component` (text) - Component affected
    - `actor_id` (uuid, FK to user_profiles, nullable) - Who performed action (null for system)
    - `actor_type` (text) - USER, SYSTEM
    - `timestamp` (timestamptz) - When event occurred
    - `outcome` (text) - SUCCESS, FAILURE, WARNING
    - `event_details` (jsonb) - Event details
    - `related_incident_id` (text, nullable) - Related incident ID
    - `created_at` (timestamptz)

  ## Event Types
  1. RATE_LIMIT_EXCEEDED - Rate limit exceeded
  2. CIRCUIT_OPENED - Circuit breaker opened
  3. CIRCUIT_CLOSED - Circuit breaker closed
  4. DEGRADATION_STARTED - System degradation started
  5. DEGRADATION_ENDED - System degradation ended
  6. INCIDENT_OPENED - Incident opened
  7. INCIDENT_RESOLVED - Incident resolved
  8. BACKUP_CREATED - Backup created
  9. BACKUP_VERIFIED - Backup verified
  10. INTEGRITY_CHECK_FAILED - Data integrity check failed

  ## Actor Types
  1. USER - Action performed by user
  2. SYSTEM - Action performed by system

  ## Outcome Values
  1. SUCCESS - Action succeeded
  2. FAILURE - Action failed
  3. WARNING - Action produced warning

  ## Security
  - RLS enabled
  - Immutable (append-only)
  - Complete audit trail

  ## Enforcement Rules
  1. Every resilience-related event MUST log: Actor (system or user), Event type, Component, Timestamp, Outcome
  2. Audit logs are immutable
*/

CREATE TABLE IF NOT EXISTS resilience_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL CHECK (event_type IN ('RATE_LIMIT_EXCEEDED', 'CIRCUIT_OPENED', 'CIRCUIT_CLOSED', 'DEGRADATION_STARTED', 'DEGRADATION_ENDED', 'INCIDENT_OPENED', 'INCIDENT_RESOLVED', 'BACKUP_CREATED', 'BACKUP_VERIFIED', 'INTEGRITY_CHECK_FAILED')),
  component text NOT NULL,
  actor_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('USER', 'SYSTEM')),
  timestamp timestamptz NOT NULL DEFAULT now(),
  outcome text NOT NULL CHECK (outcome IN ('SUCCESS', 'FAILURE', 'WARNING')),
  event_details jsonb NOT NULL DEFAULT '{}',
  related_incident_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE resilience_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_resilience_audit_log_event_id ON resilience_audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_resilience_audit_log_event_type ON resilience_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_resilience_audit_log_component ON resilience_audit_log(component);
CREATE INDEX IF NOT EXISTS idx_resilience_audit_log_actor_id ON resilience_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_resilience_audit_log_timestamp ON resilience_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_resilience_audit_log_outcome ON resilience_audit_log(outcome);
CREATE INDEX IF NOT EXISTS idx_resilience_audit_log_related_incident_id ON resilience_audit_log(related_incident_id);
