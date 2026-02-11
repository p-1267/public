/*
  # Attendance Events Table (Phase 24)

  ## Purpose
  Core clock-in/clock-out records for attendance verification.
  If time cannot be proven, care cannot be billed.
  Attendance is evidence, not convenience.

  ## New Tables
  - `attendance_events`
    - `id` (uuid, primary key)
    - `shift_id` (uuid, FK to shifts) - associated shift
    - `user_id` (uuid, FK to user_profiles) - caregiver
    - `event_type` (text) - CLOCK_IN, CLOCK_OUT
    - `timestamp` (timestamptz) - server-verified timestamp
    - `gps_latitude` (numeric) - GPS coordinates
    - `gps_longitude` (numeric) - GPS coordinates
    - `gps_accuracy` (numeric) - accuracy in meters
    - `device_fingerprint` (text) - device identifier
    - `connectivity_state` (text) - ONLINE, OFFLINE
    - `is_offline_sync` (boolean) - synced after offline
    - `device_timestamp` (timestamptz) - device-reported time
    - `is_sealed` (boolean) - part of sealed shift
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Caregivers can create own events
  - Supervisors can view all events
  - Sealed events are immutable

  ## Enforcement Rules
  1. Each clock event MUST capture: User ID, Shift ID, Timestamp, GPS, Device fingerprint, Connectivity state
  2. Offline events marked and auditable
  3. Server-verified timestamp is truth
  4. Sealed events cannot be modified
*/

CREATE TABLE IF NOT EXISTS attendance_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('CLOCK_IN', 'CLOCK_OUT')),
  timestamp timestamptz NOT NULL DEFAULT now(),
  gps_latitude numeric(10,7),
  gps_longitude numeric(10,7),
  gps_accuracy numeric(10,2),
  device_fingerprint text NOT NULL,
  connectivity_state text NOT NULL CHECK (connectivity_state IN ('ONLINE', 'OFFLINE')),
  is_offline_sync boolean NOT NULL DEFAULT false,
  device_timestamp timestamptz NOT NULL,
  is_sealed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE attendance_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_attendance_events_shift_id ON attendance_events(shift_id);
CREATE INDEX IF NOT EXISTS idx_attendance_events_user_id ON attendance_events(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_events_event_type ON attendance_events(event_type);
CREATE INDEX IF NOT EXISTS idx_attendance_events_timestamp ON attendance_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_attendance_events_is_sealed ON attendance_events(is_sealed);
