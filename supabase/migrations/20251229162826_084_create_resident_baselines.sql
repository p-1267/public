/*
  # Resident Baselines Table (Phase 20)

  ## Purpose
  Stores IMMUTABLE baseline health snapshots for residents.
  Baseline establishes ground truth reference frame for:
  - Medical deviation detection
  - Emergency escalation
  - Audit defensibility
  - Insurance justification

  ## New Tables
  - `resident_baselines`
    - `id` (uuid, primary key)
    - `resident_id` (uuid, FK to residents) - one baseline per resident
    - `baseline_version` (integer) - version number (starts at 1)
    - `blood_pressure_systolic` (integer) - baseline systolic BP
    - `blood_pressure_diastolic` (integer) - baseline diastolic BP
    - `heart_rate` (integer) - baseline heart rate (BPM)
    - `weight_kg` (numeric) - baseline weight in kg
    - `mobility_status` (text) - INDEPENDENT, ASSISTED, WHEELCHAIR, BEDBOUND
    - `cognitive_status` (text) - NORMAL, MILD_IMPAIRMENT, MODERATE_IMPAIRMENT, SEVERE_IMPAIRMENT
    - `fall_risk_level` (text) - LOW, MODERATE, HIGH, VERY_HIGH
    - `baseline_notes` (text, nullable) - additional baseline context
    - `data_source` (text) - MANUAL, DEVICE, IMPORT
    - `entered_by` (uuid, FK to user_profiles) - who entered baseline
    - `entered_by_role` (text) - role at time of entry
    - `language_context` (text) - language used during entry
    - `is_sealed` (boolean) - whether baseline is locked
    - `sealed_at` (timestamptz, nullable) - when baseline was sealed
    - `sealed_by` (uuid, nullable, FK to user_profiles) - who sealed baseline
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Only authorized users can create/view baselines
  - Sealed baselines are IMMUTABLE

  ## Enforcement Rules
  1. One active baseline per resident
  2. Baseline is LOCKED after sealing (is_sealed = true)
  3. Sealed baselines cannot be modified
  4. Future baselines create new version (baseline_version++)
  5. All baseline changes are audited
*/

CREATE TABLE IF NOT EXISTS resident_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  baseline_version integer NOT NULL DEFAULT 1,
  blood_pressure_systolic integer NOT NULL CHECK (blood_pressure_systolic > 0 AND blood_pressure_systolic < 300),
  blood_pressure_diastolic integer NOT NULL CHECK (blood_pressure_diastolic > 0 AND blood_pressure_diastolic < 200),
  heart_rate integer NOT NULL CHECK (heart_rate > 0 AND heart_rate < 300),
  weight_kg numeric(5,2) NOT NULL CHECK (weight_kg > 0 AND weight_kg < 500),
  mobility_status text NOT NULL CHECK (mobility_status IN ('INDEPENDENT', 'ASSISTED', 'WHEELCHAIR', 'BEDBOUND')),
  cognitive_status text NOT NULL CHECK (cognitive_status IN ('NORMAL', 'MILD_IMPAIRMENT', 'MODERATE_IMPAIRMENT', 'SEVERE_IMPAIRMENT')),
  fall_risk_level text NOT NULL CHECK (fall_risk_level IN ('LOW', 'MODERATE', 'HIGH', 'VERY_HIGH')),
  baseline_notes text,
  data_source text NOT NULL CHECK (data_source IN ('MANUAL', 'DEVICE', 'IMPORT')),
  entered_by uuid NOT NULL REFERENCES user_profiles(id),
  entered_by_role text NOT NULL,
  language_context text NOT NULL,
  is_sealed boolean NOT NULL DEFAULT false,
  sealed_at timestamptz,
  sealed_by uuid REFERENCES user_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(resident_id, baseline_version)
);

ALTER TABLE resident_baselines ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_resident_baselines_resident_id ON resident_baselines(resident_id);
CREATE INDEX IF NOT EXISTS idx_resident_baselines_is_sealed ON resident_baselines(is_sealed);
CREATE INDEX IF NOT EXISTS idx_resident_baselines_entered_by ON resident_baselines(entered_by);
