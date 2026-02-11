/*
  # Shift Resident Assignments Table (Phase 23)

  ## Purpose
  Many-to-many relationship between shifts and residents.
  One shift can serve multiple residents.

  ## New Tables
  - `shift_resident_assignments`
    - `id` (uuid, primary key)
    - `shift_id` (uuid, FK to shifts) - shift
    - `resident_id` (uuid, FK to residents) - resident
    - `care_type` (text) - type of care for this resident in this shift
    - `estimated_duration_minutes` (integer) - estimated time for this resident
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Only supervisors/admins can create/modify assignments

  ## Enforcement Rules
  1. Each shift must have at least one resident
  2. Resident-centric scheduling model
*/

CREATE TABLE IF NOT EXISTS shift_resident_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  care_type text NOT NULL,
  estimated_duration_minutes integer NOT NULL CHECK (estimated_duration_minutes > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shift_id, resident_id)
);

ALTER TABLE shift_resident_assignments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_shift_resident_assignments_shift_id ON shift_resident_assignments(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_resident_assignments_resident_id ON shift_resident_assignments(resident_id);
