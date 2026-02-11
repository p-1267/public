/*
  # Workload Signals Table (Phase 23)

  ## Purpose
  Brain-detected workload and fatigue signals.
  Advisory only - MUST NOT block scheduling.
  Visible only to supervisors/admins.

  ## New Tables
  - `workload_signals`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency
    - `caregiver_id` (uuid, FK to user_profiles) - affected caregiver
    - `signal_type` (text) - type of signal
    - `severity` (text) - LOW, MEDIUM, HIGH, CRITICAL
    - `description` (text) - human-readable description
    - `data` (jsonb) - supporting data
    - `start_date` (date) - period start
    - `end_date` (date) - period end
    - `is_acknowledged` (boolean) - acknowledged by supervisor
    - `acknowledged_by` (uuid, FK to user_profiles, nullable)
    - `acknowledged_at` (timestamptz, nullable)
    - `created_at` (timestamptz)

  ## Signal Types
  - EXCESSIVE_CONSECUTIVE_SHIFTS
  - HIGH_RESIDENT_RATIO
  - REPEATED_EMERGENCY_CORRELATION
  - OVERTIME_RISK

  ## Security
  - RLS enabled
  - Visible only to supervisors/admins

  ## Enforcement Rules
  1. Signals are advisory only
  2. Signals MUST NOT block scheduling
  3. Signals visible only to supervisors/admins
*/

CREATE TABLE IF NOT EXISTS workload_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  caregiver_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  signal_type text NOT NULL CHECK (signal_type IN ('EXCESSIVE_CONSECUTIVE_SHIFTS', 'HIGH_RESIDENT_RATIO', 'REPEATED_EMERGENCY_CORRELATION', 'OVERTIME_RISK')),
  severity text NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  description text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid REFERENCES user_profiles(id),
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE workload_signals ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_workload_signals_agency_id ON workload_signals(agency_id);
CREATE INDEX IF NOT EXISTS idx_workload_signals_caregiver_id ON workload_signals(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_workload_signals_signal_type ON workload_signals(signal_type);
CREATE INDEX IF NOT EXISTS idx_workload_signals_severity ON workload_signals(severity);
CREATE INDEX IF NOT EXISTS idx_workload_signals_is_acknowledged ON workload_signals(is_acknowledged);
