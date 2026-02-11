/*
  # Caregiver Availability Table (Phase 23)

  ## Purpose
  Track caregiver availability for scheduling.
  Used to validate shift assignments.

  ## New Tables
  - `caregiver_availability`
    - `id` (uuid, primary key)
    - `caregiver_id` (uuid, FK to user_profiles) - caregiver
    - `day_of_week` (integer) - 0 = Sunday, 6 = Saturday
    - `start_time` (time) - available from
    - `end_time` (time) - available until
    - `is_recurring` (boolean) - weekly recurring availability
    - `specific_date` (date, nullable) - specific date override
    - `is_available` (boolean) - available or unavailable
    - `notes` (text, nullable) - reason for unavailability
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Supervisors/admins can view and manage

  ## Enforcement Rules
  1. Availability used for scheduling validation
  2. Specific date overrides recurring availability
*/

CREATE TABLE IF NOT EXISTS caregiver_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caregiver_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  day_of_week integer CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  is_recurring boolean NOT NULL DEFAULT true,
  specific_date date,
  is_available boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT valid_availability_times CHECK (end_time > start_time),
  CONSTRAINT recurring_or_specific CHECK (
    (is_recurring = true AND day_of_week IS NOT NULL AND specific_date IS NULL) OR
    (is_recurring = false AND specific_date IS NOT NULL)
  )
);

ALTER TABLE caregiver_availability ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_caregiver_availability_caregiver_id ON caregiver_availability(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_caregiver_availability_day_of_week ON caregiver_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_caregiver_availability_specific_date ON caregiver_availability(specific_date);
