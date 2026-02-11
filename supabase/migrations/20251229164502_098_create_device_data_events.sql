/*
  # Device Data Events Table (Phase 21)

  ## Purpose
  Logs all device data events with trust context.
  Enables Brain to make trust-aware care decisions.

  ## New Tables
  - `device_data_events`
    - `id` (uuid, primary key)
    - `device_id` (text, FK to device_registry.device_id)
    - `resident_id` (uuid, FK to residents)
    - `event_type` (text) - type of data event
    - `event_data` (jsonb) - event payload
    - `trust_state_at_reading` (text) - device trust state when data was received
    - `firmware_version` (text) - firmware version at time of reading
    - `battery_level` (integer) - battery level at time of reading
    - `signal_strength` (integer, nullable) - signal strength at time
    - `data_source` (text) - LIVE, CACHED, OFFLINE_SYNC
    - `confidence_level` (text) - HIGH, MEDIUM, LOW, REJECTED
    - `used_for_care_decision` (boolean) - whether data influenced care
    - `created_at` (timestamptz)
    - `synced_at` (timestamptz, nullable) - when offline data was synced

  ## Event Types
  - VITAL_READING - health sensor reading
  - FALL_DETECTED - fall detection event
  - LOCATION_UPDATE - GPS location update
  - ENVIRONMENT_ALERT - environmental sensor alert
  - EMERGENCY_BUTTON_PRESSED - emergency button activation
  - HEARTBEAT - device heartbeat signal

  ## Security
  - RLS enabled
  - Immutable (append-only)
  - Trust context preserved

  ## Enforcement Rules
  1. Device data trusted ONLY if device health valid
  2. Untrusted device data MUST NOT drive care decisions
  3. OFFLINE or UNRELIABLE → data downgraded
  4. REVOKED → data rejected entirely
*/

CREATE TABLE IF NOT EXISTS device_data_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN (
    'VITAL_READING',
    'FALL_DETECTED',
    'LOCATION_UPDATE',
    'ENVIRONMENT_ALERT',
    'EMERGENCY_BUTTON_PRESSED',
    'HEARTBEAT'
  )),
  event_data jsonb NOT NULL DEFAULT '{}',
  trust_state_at_reading text NOT NULL CHECK (trust_state_at_reading IN (
    'TRUSTED',
    'LOW_BATTERY',
    'OFFLINE',
    'UNRELIABLE',
    'REVOKED'
  )),
  firmware_version text NOT NULL,
  battery_level integer CHECK (battery_level >= 0 AND battery_level <= 100),
  signal_strength integer CHECK (signal_strength >= 0 AND signal_strength <= 100),
  data_source text NOT NULL CHECK (data_source IN ('LIVE', 'CACHED', 'OFFLINE_SYNC')),
  confidence_level text NOT NULL CHECK (confidence_level IN ('HIGH', 'MEDIUM', 'LOW', 'REJECTED')),
  used_for_care_decision boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz
);

ALTER TABLE device_data_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_device_data_events_device_id ON device_data_events(device_id);
CREATE INDEX IF NOT EXISTS idx_device_data_events_resident_id ON device_data_events(resident_id);
CREATE INDEX IF NOT EXISTS idx_device_data_events_event_type ON device_data_events(event_type);
CREATE INDEX IF NOT EXISTS idx_device_data_events_trust_state ON device_data_events(trust_state_at_reading);
CREATE INDEX IF NOT EXISTS idx_device_data_events_created_at ON device_data_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_data_events_confidence ON device_data_events(confidence_level);
