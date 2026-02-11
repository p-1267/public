/*
  # Payroll Exports Table (Phase 25)

  ## Purpose
  Immutable payroll export records.
  Sealed exports cannot be modified.

  ## New Tables
  - `payroll_exports`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency context
    - `export_version` (integer) - version number
    - `start_date` (date) - period start
    - `end_date` (date) - period end
    - `format` (text) - CSV, JSON
    - `generated_by` (uuid, FK to user_profiles) - who generated
    - `generated_at` (timestamptz) - when generated
    - `record_count` (integer) - number of records
    - `total_hours` (numeric) - total hours
    - `total_amount` (numeric) - total payroll amount
    - `data_hash` (text) - hash of export data
    - `export_data` (jsonb) - actual export payload
    - `is_sealed` (boolean) - sealed status
    - `sealed_at` (timestamptz, nullable) - when sealed
    - `sealed_by` (uuid, FK to user_profiles, nullable) - who sealed
    - `jurisdiction` (text) - legal jurisdiction
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Agency-isolated
  - Sealed exports are immutable

  ## Enforcement Rules
  1. Sealed exports are IMMUTABLE
  2. Regeneration creates new version, never overwrites
  3. Each export includes: Source record IDs, Generation timestamp, Export version, Jurisdiction context
*/

CREATE TABLE IF NOT EXISTS payroll_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  export_version integer NOT NULL DEFAULT 1,
  start_date date NOT NULL,
  end_date date NOT NULL,
  format text NOT NULL CHECK (format IN ('CSV', 'JSON')),
  generated_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  generated_at timestamptz NOT NULL DEFAULT now(),
  record_count integer NOT NULL DEFAULT 0,
  total_hours numeric(12,2) NOT NULL DEFAULT 0,
  total_amount numeric(15,2) NOT NULL DEFAULT 0,
  data_hash text NOT NULL,
  export_data jsonb NOT NULL DEFAULT '{}',
  is_sealed boolean NOT NULL DEFAULT false,
  sealed_at timestamptz,
  sealed_by uuid REFERENCES user_profiles(id),
  jurisdiction text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

ALTER TABLE payroll_exports ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_payroll_exports_agency_id ON payroll_exports(agency_id);
CREATE INDEX IF NOT EXISTS idx_payroll_exports_date_range ON payroll_exports(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_payroll_exports_is_sealed ON payroll_exports(is_sealed);
CREATE INDEX IF NOT EXISTS idx_payroll_exports_generated_at ON payroll_exports(generated_at DESC);
