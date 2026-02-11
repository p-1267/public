/*
  # Attendance Anomalies Table (Phase 24)

  ## Purpose
  Brain-detected fraud and anomaly flags.
  Flags are advisory, not blocking.
  Visible only to supervisors/admins.

  ## New Tables
  - `attendance_anomalies`
    - `id` (uuid, primary key)
    - `shift_id` (uuid, FK to shifts) - affected shift
    - `attendance_event_id` (uuid, FK to attendance_events, nullable) - specific event
    - `user_id` (uuid, FK to user_profiles) - caregiver
    - `anomaly_type` (text) - type of anomaly
    - `severity` (text) - LOW, MEDIUM, HIGH, CRITICAL
    - `description` (text) - human-readable description
    - `data` (jsonb) - supporting data
    - `is_acknowledged` (boolean) - acknowledged by supervisor
    - `acknowledged_by` (uuid, FK to user_profiles, nullable)
    - `acknowledged_at` (timestamptz, nullable)
    - `created_at` (timestamptz)

  ## Anomaly Types
  - IMPOSSIBLE_TRAVEL_TIME
  - OVERLAPPING_SHIFT
  - DUPLICATE_CLOCK_EVENT
  - REPEATED_LATE_CLOCK_IN
  - REPEATED_MANUAL_OVERRIDE
  - GEOLOCATION_DEVIATION

  ## Security
  - RLS enabled
  - Visible only to supervisors/admins
  - Immutable log

  ## Enforcement Rules
  1. Flags are advisory, not blocking
  2. Flags visible only to supervisors/admins
  3. All flags logged immutably
*/

CREATE TABLE IF NOT EXISTS attendance_anomalies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  attendance_event_id uuid REFERENCES attendance_events(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  anomaly_type text NOT NULL CHECK (anomaly_type IN ('IMPOSSIBLE_TRAVEL_TIME', 'OVERLAPPING_SHIFT', 'DUPLICATE_CLOCK_EVENT', 'REPEATED_LATE_CLOCK_IN', 'REPEATED_MANUAL_OVERRIDE', 'GEOLOCATION_DEVIATION')),
  severity text NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  description text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}',
  is_acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by uuid REFERENCES user_profiles(id),
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE attendance_anomalies ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_attendance_anomalies_shift_id ON attendance_anomalies(shift_id);
CREATE INDEX IF NOT EXISTS idx_attendance_anomalies_user_id ON attendance_anomalies(user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_anomalies_anomaly_type ON attendance_anomalies(anomaly_type);
CREATE INDEX IF NOT EXISTS idx_attendance_anomalies_severity ON attendance_anomalies(severity);
CREATE INDEX IF NOT EXISTS idx_attendance_anomalies_is_acknowledged ON attendance_anomalies(is_acknowledged);
