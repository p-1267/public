/*
  # System Health Checks Table (Phase 31)

  ## Purpose
  Continuous monitoring of system health with automatic rollback on failures.
  Failures MUST generate alerts without disrupting care execution.

  ## New Tables
  - `system_health_checks`
    - `id` (uuid, primary key)
    - `check_id` (text) - Unique check identifier
    - `environment` (text) - DEVELOPMENT, SANDBOX, PRODUCTION
    - `check_type` (text) - VERSION_DRIFT, UPDATE_SUCCESS, CLIENT_COMPATIBILITY, CRITICAL_SERVICE_UPTIME
    - `component_type` (text, nullable) - BRAIN_LOGIC, API_SCHEMA, CLIENT_APP
    - `check_timestamp` (timestamptz) - When check was performed
    - `check_status` (text) - PASSED, FAILED, WARNING
    - `check_details` (jsonb) - Check details and metrics
    - `expected_value` (text, nullable) - Expected value
    - `actual_value` (text, nullable) - Actual value
    - `deviation_detected` (boolean) - Deviation from expected
    - `alert_generated` (boolean) - Was alert generated
    - `alert_severity` (text, nullable) - CRITICAL, HIGH, MEDIUM, LOW
    - `rollback_triggered` (boolean) - Was automatic rollback triggered
    - `rollback_id` (text, nullable) - Rollback ID if triggered
    - `care_execution_disrupted` (boolean) - Did this disrupt care execution (MUST be false)
    - `created_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Check Types
  1. VERSION_DRIFT - Monitor version drift
  2. UPDATE_SUCCESS - Monitor update success/failure
  3. CLIENT_COMPATIBILITY - Monitor client compatibility
  4. CRITICAL_SERVICE_UPTIME - Monitor critical service uptime

  ## Check Status
  1. PASSED - Check passed
  2. FAILED - Check failed
  3. WARNING - Check warning

  ## Alert Severity
  1. CRITICAL - Critical severity
  2. HIGH - High severity
  3. MEDIUM - Medium severity
  4. LOW - Low severity

  ## Security
  - RLS enabled
  - System-managed
  - Automatic monitoring

  ## Enforcement Rules
  1. The system MUST continuously monitor: Version drift, Update success/failure, Client compatibility, Critical service uptime
  2. Failures MUST generate alerts without disrupting care execution
  3. Automatic rollback on failed health checks
*/

CREATE TABLE IF NOT EXISTS system_health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id text NOT NULL,
  environment text NOT NULL CHECK (environment IN ('DEVELOPMENT', 'SANDBOX', 'PRODUCTION')),
  check_type text NOT NULL CHECK (check_type IN ('VERSION_DRIFT', 'UPDATE_SUCCESS', 'CLIENT_COMPATIBILITY', 'CRITICAL_SERVICE_UPTIME')),
  component_type text CHECK (component_type IN ('BRAIN_LOGIC', 'API_SCHEMA', 'CLIENT_APP')),
  check_timestamp timestamptz NOT NULL DEFAULT now(),
  check_status text NOT NULL CHECK (check_status IN ('PASSED', 'FAILED', 'WARNING')),
  check_details jsonb NOT NULL DEFAULT '{}',
  expected_value text,
  actual_value text,
  deviation_detected boolean NOT NULL DEFAULT false,
  alert_generated boolean NOT NULL DEFAULT false,
  alert_severity text CHECK (alert_severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
  rollback_triggered boolean NOT NULL DEFAULT false,
  rollback_id text,
  care_execution_disrupted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE system_health_checks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_system_health_checks_check_id ON system_health_checks(check_id);
CREATE INDEX IF NOT EXISTS idx_system_health_checks_environment ON system_health_checks(environment);
CREATE INDEX IF NOT EXISTS idx_system_health_checks_check_type ON system_health_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_system_health_checks_check_status ON system_health_checks(check_status);
CREATE INDEX IF NOT EXISTS idx_system_health_checks_check_timestamp ON system_health_checks(check_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_checks_rollback_triggered ON system_health_checks(rollback_triggered);
