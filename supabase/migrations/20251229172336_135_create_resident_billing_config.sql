/*
  # Resident Billing Configuration Table (Phase 25)

  ## Purpose
  Defines billing rules and rates for residents.
  Read-only input for billing calculation.

  ## New Tables
  - `resident_billing_config`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency context
    - `resident_id` (uuid, FK to residents) - resident
    - `service_type` (text) - type of service
    - `billing_rate` (numeric) - rate per unit
    - `billing_unit` (text) - HOURLY, VISIT, DAILY
    - `insurance_provider` (text) - insurance name
    - `insurance_policy_number` (text) - policy ID
    - `coverage_percentage` (numeric) - % covered by insurance
    - `effective_start_date` (date) - when config becomes active
    - `effective_end_date` (date, nullable) - when config expires
    - `currency` (text) - currency code
    - `is_active` (boolean) - currently active
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Agency-isolated
  - Finance admin can manage

  ## Enforcement Rules
  1. Billing derived from sealed attendance + resident eligibility
  2. Billing uses care delivered, not scheduled
  3. Missing attendance → no billable unit
  4. All billable units trace to attendance IDs
*/

CREATE TABLE IF NOT EXISTS resident_billing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  service_type text NOT NULL,
  billing_rate numeric(10,2) NOT NULL CHECK (billing_rate >= 0),
  billing_unit text NOT NULL CHECK (billing_unit IN ('HOURLY', 'VISIT', 'DAILY')),
  insurance_provider text,
  insurance_policy_number text,
  coverage_percentage numeric(5,2) CHECK (coverage_percentage >= 0 AND coverage_percentage <= 100),
  effective_start_date date NOT NULL,
  effective_end_date date,
  currency text NOT NULL DEFAULT 'USD',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (effective_end_date IS NULL OR effective_end_date >= effective_start_date)
);

ALTER TABLE resident_billing_config ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_resident_billing_config_agency_id ON resident_billing_config(agency_id);
CREATE INDEX IF NOT EXISTS idx_resident_billing_config_resident_id ON resident_billing_config(resident_id);
CREATE INDEX IF NOT EXISTS idx_resident_billing_config_effective_dates ON resident_billing_config(effective_start_date, effective_end_date);
CREATE INDEX IF NOT EXISTS idx_resident_billing_config_is_active ON resident_billing_config(is_active);
