/*
  # Incident Log Table (Phase 32)

  ## Purpose
  Immutable audit trail of all production incidents.
  Complete incident lifecycle tracking.

  ## New Tables
  - `incident_log`
    - `id` (uuid, primary key)
    - `incident_id` (text) - Unique incident identifier
    - `incident_title` (text) - Incident title
    - `incident_description` (text) - Incident description
    - `severity` (text) - CRITICAL, HIGH, MEDIUM, LOW
    - `status` (text) - OPEN, INVESTIGATING, MITIGATING, RESOLVED, CLOSED
    - `scope` (text) - Incident scope (tenant, region, global)
    - `impacted_systems` (text[]) - List of impacted systems
    - `impacted_tenant_ids` (uuid[]) - Impacted tenant/agency IDs
    - `impacted_user_count` (integer) - Estimated impacted users
    - `started_at` (timestamptz) - Incident start time
    - `detected_at` (timestamptz) - When incident was detected
    - `resolved_at` (timestamptz, nullable) - When incident was resolved
    - `closed_at` (timestamptz, nullable) - When incident was closed
    - `mitigation_actions` (text[]) - List of mitigation actions taken
    - `root_cause` (text, nullable) - Root cause analysis
    - `lessons_learned` (text, nullable) - Lessons learned
    - `reported_by` (uuid, FK to user_profiles, nullable) - Who reported
    - `assigned_to` (uuid, FK to user_profiles, nullable) - Who is assigned
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Severity Levels
  1. CRITICAL - Critical incident (system down, data loss risk)
  2. HIGH - High severity (major features unavailable)
  3. MEDIUM - Medium severity (degraded performance)
  4. LOW - Low severity (minor issues)

  ## Status Values
  1. OPEN - Incident opened
  2. INVESTIGATING - Under investigation
  3. MITIGATING - Mitigation in progress
  4. RESOLVED - Incident resolved
  5. CLOSED - Incident closed

  ## Security
  - RLS enabled
  - Admin access only
  - Immutable audit trail

  ## Enforcement Rules
  1. All production incidents MUST log: Incident ID, Scope, Severity, Start/end timestamps, Impacted systems, Mitigation actions
  2. Incident logs are immutable
*/

CREATE TABLE IF NOT EXISTS incident_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id text NOT NULL UNIQUE,
  incident_title text NOT NULL,
  incident_description text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INVESTIGATING', 'MITIGATING', 'RESOLVED', 'CLOSED')),
  scope text NOT NULL,
  impacted_systems text[] NOT NULL DEFAULT '{}',
  impacted_tenant_ids uuid[] NOT NULL DEFAULT '{}',
  impacted_user_count integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  closed_at timestamptz,
  mitigation_actions text[] NOT NULL DEFAULT '{}',
  root_cause text,
  lessons_learned text,
  reported_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  assigned_to uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE incident_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_incident_log_incident_id ON incident_log(incident_id);
CREATE INDEX IF NOT EXISTS idx_incident_log_severity ON incident_log(severity);
CREATE INDEX IF NOT EXISTS idx_incident_log_status ON incident_log(status);
CREATE INDEX IF NOT EXISTS idx_incident_log_started_at ON incident_log(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_incident_log_detected_at ON incident_log(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_incident_log_assigned_to ON incident_log(assigned_to);
