/*
  # System Degradation State Table (Phase 32)

  ## Purpose
  Manages degraded mode operation when critical subsystems fail.
  Ensures core care logging and emergency escalation remain available.

  ## New Tables
  - `system_degradation_state`
    - `id` (uuid, primary key)
    - `degradation_id` (text) - Unique degradation identifier
    - `subsystem_name` (text) - Affected subsystem
    - `subsystem_category` (text) - CRITICAL, IMPORTANT, NON_CRITICAL
    - `degradation_level` (text) - NONE, PARTIAL, SEVERE, CRITICAL
    - `is_degraded` (boolean) - Is system in degraded mode
    - `core_care_logging_available` (boolean) - Core care logging status (MUST remain true)
    - `emergency_escalation_available` (boolean) - Emergency escalation status (MUST remain true)
    - `disabled_features` (text[]) - List of disabled features
    - `degradation_reason` (text) - Reason for degradation
    - `degradation_started_at` (timestamptz, nullable) - When degradation started
    - `degradation_ended_at` (timestamptz, nullable) - When degradation ended
    - `recovery_action_taken` (text, nullable) - Recovery action
    - `ui_warning_message` (text, nullable) - Warning message for UI
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Subsystem Categories
  1. CRITICAL - Critical subsystem (care logging, emergency escalation)
  2. IMPORTANT - Important subsystem (reporting, analytics)
  3. NON_CRITICAL - Non-critical subsystem (nice-to-have features)

  ## Degradation Levels
  1. NONE - No degradation
  2. PARTIAL - Partial degradation (some features disabled)
  3. SEVERE - Severe degradation (many features disabled)
  4. CRITICAL - Critical degradation (only core features available)

  ## Security
  - RLS enabled
  - System-managed
  - Automatic degradation management

  ## Enforcement Rules
  1. If critical subsystems fail: Core care logging remains available
  2. Emergency escalation remains available
  3. Non-critical features are disabled
  4. UI clearly indicates degraded state
*/

CREATE TABLE IF NOT EXISTS system_degradation_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  degradation_id text NOT NULL UNIQUE,
  subsystem_name text NOT NULL,
  subsystem_category text NOT NULL CHECK (subsystem_category IN ('CRITICAL', 'IMPORTANT', 'NON_CRITICAL')),
  degradation_level text NOT NULL DEFAULT 'NONE' CHECK (degradation_level IN ('NONE', 'PARTIAL', 'SEVERE', 'CRITICAL')),
  is_degraded boolean NOT NULL DEFAULT false,
  core_care_logging_available boolean NOT NULL DEFAULT true,
  emergency_escalation_available boolean NOT NULL DEFAULT true,
  disabled_features text[] NOT NULL DEFAULT '{}',
  degradation_reason text,
  degradation_started_at timestamptz,
  degradation_ended_at timestamptz,
  recovery_action_taken text,
  ui_warning_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE system_degradation_state ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_system_degradation_state_subsystem_name ON system_degradation_state(subsystem_name);
CREATE INDEX IF NOT EXISTS idx_system_degradation_state_subsystem_category ON system_degradation_state(subsystem_category);
CREATE INDEX IF NOT EXISTS idx_system_degradation_state_degradation_level ON system_degradation_state(degradation_level);
CREATE INDEX IF NOT EXISTS idx_system_degradation_state_is_degraded ON system_degradation_state(is_degraded);
CREATE INDEX IF NOT EXISTS idx_system_degradation_state_degradation_started_at ON system_degradation_state(degradation_started_at DESC);
