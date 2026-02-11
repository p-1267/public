/*
  # Financial Adjustments Table (Phase 25)

  ## Purpose
  Non-destructive corrections to financial records.
  Preserves original data.

  ## New Tables
  - `financial_adjustments`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency context
    - `adjustment_type` (text) - PAYROLL, BILLING
    - `original_export_id` (uuid) - reference to original export
    - `original_record_id` (text) - specific record ID
    - `adjustment_reason` (text) - mandatory reason
    - `original_value` (jsonb) - preserved original data
    - `adjusted_value` (jsonb) - corrected data
    - `amount_delta` (numeric) - change in amount
    - `performed_by` (uuid, FK to user_profiles) - who made adjustment
    - `performed_by_role` (text) - role at time
    - `is_approved` (boolean) - approval status
    - `approved_by` (uuid, FK to user_profiles, nullable) - who approved
    - `approved_at` (timestamptz, nullable) - when approved
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Agency-isolated
  - Finance admin only

  ## Enforcement Rules
  1. Create adjustment entry (not edit)
  2. Reference original record
  3. Provide reason (mandatory)
  4. Preserve original data
  5. No deletion allowed
*/

CREATE TABLE IF NOT EXISTS financial_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  adjustment_type text NOT NULL CHECK (adjustment_type IN ('PAYROLL', 'BILLING')),
  original_export_id uuid NOT NULL,
  original_record_id text NOT NULL,
  adjustment_reason text NOT NULL,
  original_value jsonb NOT NULL,
  adjusted_value jsonb NOT NULL,
  amount_delta numeric(15,2) NOT NULL,
  performed_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  performed_by_role text NOT NULL,
  is_approved boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES user_profiles(id),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE financial_adjustments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_financial_adjustments_agency_id ON financial_adjustments(agency_id);
CREATE INDEX IF NOT EXISTS idx_financial_adjustments_adjustment_type ON financial_adjustments(adjustment_type);
CREATE INDEX IF NOT EXISTS idx_financial_adjustments_original_export_id ON financial_adjustments(original_export_id);
CREATE INDEX IF NOT EXISTS idx_financial_adjustments_is_approved ON financial_adjustments(is_approved);
CREATE INDEX IF NOT EXISTS idx_financial_adjustments_created_at ON financial_adjustments(created_at DESC);
