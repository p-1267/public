/*
  # Attendance Overrides Table (Phase 24)

  ## Purpose
  Manual corrections to attendance records.
  Supervisor-only, fully audited, preserves original data.

  ## New Tables
  - `attendance_overrides`
    - `id` (uuid, primary key)
    - `attendance_event_id` (uuid, FK to attendance_events) - original event
    - `shift_id` (uuid, FK to shifts) - affected shift
    - `performed_by` (uuid, FK to user_profiles) - supervisor/admin
    - `performed_by_role` (text) - role at time of override
    - `override_type` (text) - type of override
    - `reason` (text) - mandatory reason
    - `before_value` (jsonb) - original data (preserved)
    - `after_value` (jsonb) - corrected data
    - `created_at` (timestamptz)

  ## Override Types
  - CLOCK_TIME_CORRECTION
  - LOCATION_CORRECTION
  - MISSING_CLOCK_IN
  - MISSING_CLOCK_OUT
  - EVENT_DELETION

  ## Security
  - RLS enabled
  - Only supervisors/admins can create
  - Immutable log

  ## Enforcement Rules
  1. Manual edits only by SUPERVISOR or AGENCY_ADMIN
  2. Reason is MANDATORY
  3. Before/after values recorded
  4. Original data preserved
  5. Overrides NEVER delete original records
*/

CREATE TABLE IF NOT EXISTS attendance_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attendance_event_id uuid REFERENCES attendance_events(id) ON DELETE SET NULL,
  shift_id uuid NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  performed_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  performed_by_role text NOT NULL,
  override_type text NOT NULL CHECK (override_type IN ('CLOCK_TIME_CORRECTION', 'LOCATION_CORRECTION', 'MISSING_CLOCK_IN', 'MISSING_CLOCK_OUT', 'EVENT_DELETION')),
  reason text NOT NULL,
  before_value jsonb,
  after_value jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE attendance_overrides ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_attendance_overrides_shift_id ON attendance_overrides(shift_id);
CREATE INDEX IF NOT EXISTS idx_attendance_overrides_attendance_event_id ON attendance_overrides(attendance_event_id);
CREATE INDEX IF NOT EXISTS idx_attendance_overrides_performed_by ON attendance_overrides(performed_by);
CREATE INDEX IF NOT EXISTS idx_attendance_overrides_created_at ON attendance_overrides(created_at DESC);
