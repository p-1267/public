/*
  # Caregiver Rates Table (Phase 25)

  ## Purpose
  Defines payroll rates for caregivers.
  Read-only input for payroll calculation.

  ## New Tables
  - `caregiver_rates`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency context
    - `user_id` (uuid, FK to user_profiles) - caregiver
    - `role_name` (text) - role at time of rate
    - `hourly_rate` (numeric) - base hourly rate
    - `overtime_rate` (numeric) - overtime multiplier
    - `effective_start_date` (date) - when rate becomes active
    - `effective_end_date` (date, nullable) - when rate expires
    - `currency` (text) - currency code
    - `jurisdiction` (text) - legal jurisdiction
    - `is_active` (boolean) - currently active
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Agency-isolated
  - Finance admin can manage

  ## Enforcement Rules
  1. Payroll derived from sealed attendance + approved rates
  2. No manual time entry allowed
  3. Rate history preserved
*/

CREATE TABLE IF NOT EXISTS caregiver_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role_name text NOT NULL,
  hourly_rate numeric(10,2) NOT NULL CHECK (hourly_rate >= 0),
  overtime_rate numeric(4,2) NOT NULL DEFAULT 1.5 CHECK (overtime_rate >= 1.0),
  effective_start_date date NOT NULL,
  effective_end_date date,
  currency text NOT NULL DEFAULT 'USD',
  jurisdiction text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (effective_end_date IS NULL OR effective_end_date >= effective_start_date)
);

ALTER TABLE caregiver_rates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_caregiver_rates_agency_id ON caregiver_rates(agency_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_rates_user_id ON caregiver_rates(user_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_rates_effective_dates ON caregiver_rates(effective_start_date, effective_end_date);
CREATE INDEX IF NOT EXISTS idx_caregiver_rates_is_active ON caregiver_rates(is_active);
