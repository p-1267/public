/*
  # Shifts Table (Phase 23)

  ## Purpose
  Core shift definitions for workforce scheduling.
  Resident-centric scheduling model.
  Shifts are tentative until attendance verification (Phase 24).

  ## New Tables
  - `shifts`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - owning agency
    - `caregiver_id` (uuid, FK to user_profiles) - assigned caregiver
    - `start_time` (timestamptz) - shift start
    - `end_time` (timestamptz) - shift end
    - `location_context` (text) - location information
    - `expected_care_intensity` (text) - LOW, MEDIUM, HIGH, CRITICAL
    - `status` (text) - SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED
    - `is_tentative` (boolean) - tentative until attendance verified
    - `notes` (text, nullable) - additional notes
    - `created_by` (uuid, FK to user_profiles) - who created shift
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Only supervisors/admins can create/modify shifts
  - Shifts tentative until Phase 24 attendance verification

  ## Enforcement Rules
  1. Shifts are tentative until attendance verification
  2. All shifts must pass labor constraint validation
  3. No auto-assignment permitted
*/

CREATE TABLE IF NOT EXISTS shifts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  caregiver_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  location_context text NOT NULL,
  expected_care_intensity text NOT NULL CHECK (expected_care_intensity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status text NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  is_tentative boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_shift_times CHECK (end_time > start_time)
);

ALTER TABLE shifts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_shifts_agency_id ON shifts(agency_id);
CREATE INDEX IF NOT EXISTS idx_shifts_caregiver_id ON shifts(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_shifts_start_time ON shifts(start_time);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON shifts(status);
