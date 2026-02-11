/*
  # Device Health Log Table (Phase 21)

  ## Purpose
  Continuous monitoring log for device health and reliability.
  Brain uses this to evaluate device trust state.

  ## New Tables
  - `device_health_log`
    - `id` (uuid, primary key)
    - `device_id` (text, FK to device_registry.device_id) - device identifier
    - `resident_id` (uuid, FK to residents) - for quick filtering
    - `battery_level` (integer) - battery % at time of check
    - `signal_strength` (integer, nullable) - signal strength (0-100)
    - `data_freshness_seconds` (integer) - seconds since last data
    - `firmware_version` (text) - firmware version at time of check
    - `trust_state_at_check` (text) - trust state at time of check
    - `reliability_score` (numeric) - calculated reliability (0-100)
    - `health_issues` (text[], nullable) - array of detected issues
    - `check_type` (text) - AUTOMATIC, MANUAL, TRIGGERED
    - `evaluated_by` (text) - BRAIN, USER, SYSTEM
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Append-only (no updates/deletes)
  - Used by Brain for trust evaluation

  ## Enforcement Rules
  1. Brain continuously evaluates device health
  2. Health issues generate supervisor alerts
  3. Failures trigger data trust downgrade
  4. No silent failures
*/

CREATE TABLE IF NOT EXISTS device_health_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  battery_level integer NOT NULL CHECK (battery_level >= 0 AND battery_level <= 100),
  signal_strength integer CHECK (signal_strength >= 0 AND signal_strength <= 100),
  data_freshness_seconds integer NOT NULL CHECK (data_freshness_seconds >= 0),
  firmware_version text NOT NULL,
  trust_state_at_check text NOT NULL CHECK (trust_state_at_check IN (
    'TRUSTED',
    'LOW_BATTERY',
    'OFFLINE',
    'UNRELIABLE',
    'REVOKED'
  )),
  reliability_score numeric(5,2) CHECK (reliability_score >= 0 AND reliability_score <= 100),
  health_issues text[] DEFAULT '{}',
  check_type text NOT NULL CHECK (check_type IN ('AUTOMATIC', 'MANUAL', 'TRIGGERED')),
  evaluated_by text NOT NULL CHECK (evaluated_by IN ('BRAIN', 'USER', 'SYSTEM')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE device_health_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_device_health_log_device_id ON device_health_log(device_id);
CREATE INDEX IF NOT EXISTS idx_device_health_log_resident_id ON device_health_log(resident_id);
CREATE INDEX IF NOT EXISTS idx_device_health_log_created_at ON device_health_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_health_log_trust_state ON device_health_log(trust_state_at_check);
