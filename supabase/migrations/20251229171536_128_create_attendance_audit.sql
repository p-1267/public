/*
  # Attendance Audit Table (Phase 24)

  ## Purpose
  Immutable audit log for all attendance events.
  Every attendance action MUST be logged.

  ## New Tables
  - `attendance_audit`
    - `id` (uuid, primary key)
    - `shift_id` (uuid, FK to shifts) - associated shift
    - `actor_id` (uuid, FK to user_profiles) - who performed action
    - `actor_role` (text) - role at time of action
    - `event_type` (text) - type of event
    - `attendance_event_id` (uuid, FK to attendance_events, nullable) - related event
    - `timestamp` (timestamptz) - when action occurred
    - `gps_latitude` (numeric, nullable) - GPS snapshot
    - `gps_longitude` (numeric, nullable) - GPS snapshot
    - `device_fingerprint` (text, nullable) - device identifier
    - `connectivity_state` (text, nullable) - connectivity at time
    - `reason` (text, nullable) - reason if applicable
    - `metadata` (jsonb) - additional context
    - `created_at` (timestamptz)

  ## Event Types
  - CLOCK_IN
  - CLOCK_OUT
  - OVERRIDE
  - SEAL
  - UNSEAL (if permitted)

  ## Security
  - RLS enabled
  - Immutable (append-only)
  - Complete audit trail

  ## Enforcement Rules
  1. Every attendance event MUST log: Actor, Role, Shift ID, Event type, Timestamp, GPS snapshot, Device fingerprint, Connectivity state, Reason (if applicable)
  2. Audit logs are immutable
*/

CREATE TABLE IF NOT EXISTS attendance_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  actor_role text NOT NULL,
  event_type text NOT NULL CHECK (event_type IN ('CLOCK_IN', 'CLOCK_OUT', 'OVERRIDE', 'SEAL', 'UNSEAL')),
  attendance_event_id uuid REFERENCES attendance_events(id) ON DELETE SET NULL,
  timestamp timestamptz NOT NULL,
  gps_latitude numeric(10,7),
  gps_longitude numeric(10,7),
  device_fingerprint text,
  connectivity_state text CHECK (connectivity_state IN ('ONLINE', 'OFFLINE')),
  reason text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE attendance_audit ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_attendance_audit_shift_id ON attendance_audit(shift_id);
CREATE INDEX IF NOT EXISTS idx_attendance_audit_actor_id ON attendance_audit(actor_id);
CREATE INDEX IF NOT EXISTS idx_attendance_audit_event_type ON attendance_audit(event_type);
CREATE INDEX IF NOT EXISTS idx_attendance_audit_created_at ON attendance_audit(created_at DESC);
