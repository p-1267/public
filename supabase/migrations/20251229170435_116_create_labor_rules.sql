/*
  # Labor Rules Table (Phase 23)

  ## Purpose
  Jurisdictional labor constraints for workforce compliance.
  Maximum shift length, minimum rest periods, weekly hour limits.

  ## New Tables
  - `labor_rules`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency
    - `rule_name` (text) - descriptive name
    - `jurisdiction` (text) - jurisdiction/region
    - `max_shift_length_hours` (numeric) - maximum shift length
    - `min_rest_period_hours` (numeric) - minimum rest between shifts
    - `max_weekly_hours` (numeric) - maximum weekly hours
    - `max_consecutive_shifts` (integer) - maximum consecutive shifts
    - `is_active` (boolean) - rule is active
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Only agency admins can create/modify rules

  ## Enforcement Rules
  1. Violations MUST be flagged before assignment confirmation
  2. Rules are advisory but visible
*/

CREATE TABLE IF NOT EXISTS labor_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  rule_name text NOT NULL,
  jurisdiction text NOT NULL,
  max_shift_length_hours numeric(5,2) NOT NULL CHECK (max_shift_length_hours > 0),
  min_rest_period_hours numeric(5,2) NOT NULL CHECK (min_rest_period_hours >= 0),
  max_weekly_hours numeric(5,2) CHECK (max_weekly_hours > 0),
  max_consecutive_shifts integer CHECK (max_consecutive_shifts > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE labor_rules ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_labor_rules_agency_id ON labor_rules(agency_id);
CREATE INDEX IF NOT EXISTS idx_labor_rules_is_active ON labor_rules(is_active);
