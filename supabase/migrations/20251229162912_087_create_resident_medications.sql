/*
  # Resident Medications Table (Phase 20)

  ## Purpose
  Stores baseline medication list for residents.
  Required before any medication logging can occur.
  Interaction checks run immediately on creation.

  ## New Tables
  - `resident_medications`
    - `id` (uuid, primary key)
    - `resident_id` (uuid, FK to residents)
    - `medication_name` (text) - medication name
    - `dosage` (text) - dosage amount and unit
    - `frequency` (text) - how often taken
    - `route` (text) - ORAL, TOPICAL, INJECTION, etc.
    - `schedule` (jsonb) - structured schedule (times of day)
    - `prescriber_name` (text) - prescribing physician
    - `is_prn` (boolean) - whether PRN (as needed)
    - `is_controlled` (boolean) - whether controlled substance
    - `start_date` (date) - when medication started
    - `end_date` (date, nullable) - when medication ends (if known)
    - `indication` (text, nullable) - what it's for
    - `side_effects_to_monitor` (text, nullable) - known side effects
    - `special_instructions` (text, nullable) - special handling
    - `is_active` (boolean) - whether currently active
    - `entered_by` (uuid, FK to user_profiles)
    - `language_context` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Protected health information
  - Audit all changes

  ## Enforcement Rules
  1. No medication logging allowed until baseline medications initialized
  2. High-risk/controlled medications trigger supervisor alerts
  3. Interaction checks run on creation
  4. PRN medications have special logging rules
*/

CREATE TABLE IF NOT EXISTS resident_medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  medication_name text NOT NULL,
  dosage text NOT NULL,
  frequency text NOT NULL,
  route text NOT NULL CHECK (route IN ('ORAL', 'TOPICAL', 'INJECTION', 'INHALATION', 'RECTAL', 'SUBLINGUAL', 'OTHER')),
  schedule jsonb NOT NULL DEFAULT '{}',
  prescriber_name text NOT NULL,
  is_prn boolean NOT NULL DEFAULT false,
  is_controlled boolean NOT NULL DEFAULT false,
  start_date date NOT NULL,
  end_date date,
  indication text,
  side_effects_to_monitor text,
  special_instructions text,
  is_active boolean NOT NULL DEFAULT true,
  entered_by uuid NOT NULL REFERENCES user_profiles(id),
  language_context text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_date_range CHECK (end_date IS NULL OR end_date > start_date)
);

ALTER TABLE resident_medications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_resident_medications_resident_id ON resident_medications(resident_id);
CREATE INDEX IF NOT EXISTS idx_resident_medications_is_active ON resident_medications(resident_id, is_active);
CREATE INDEX IF NOT EXISTS idx_resident_medications_is_prn ON resident_medications(resident_id, is_prn);
CREATE INDEX IF NOT EXISTS idx_resident_medications_is_controlled ON resident_medications(is_controlled) WHERE is_controlled = true;
