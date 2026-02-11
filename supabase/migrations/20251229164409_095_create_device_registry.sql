/*
  # Device Registry Table (Phase 21)

  ## Purpose
  Authoritative registry for all paired devices.
  Devices are first-class actors, not accessories.

  ## New Tables
  - `device_registry`
    - `id` (uuid, primary key)
    - `device_id` (text, unique) - manufacturer device identifier
    - `resident_id` (uuid, FK to residents) - bound resident
    - `device_type` (text) - BLE_HEALTH_SENSOR, WIFI_FALL_DETECTION, GPS_TRACKER, ENVIRONMENTAL_SENSOR, EMERGENCY_BUTTON
    - `device_name` (text) - human-readable name
    - `manufacturer` (text) - device manufacturer
    - `model` (text) - device model
    - `firmware_version` (text) - current firmware version
    - `battery_level` (integer) - current battery % (0-100)
    - `trust_state` (text) - TRUSTED, LOW_BATTERY, OFFLINE, UNRELIABLE, REVOKED
    - `last_seen_at` (timestamptz) - last data received
    - `last_health_check_at` (timestamptz) - last health evaluation
    - `capabilities` (jsonb) - device capabilities
    - `pairing_actor` (uuid, FK to user_profiles) - who paired the device
    - `pairing_timestamp` (timestamptz) - when device was paired
    - `revoked_at` (timestamptz, nullable) - when device was revoked
    - `revoked_by` (uuid, nullable, FK to user_profiles) - who revoked
    - `revocation_reason` (text, nullable) - why device was revoked
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Registry is immutable except for health updates
  - REVOKED devices cannot be re-trusted

  ## Enforcement Rules
  1. Each device has exactly one trust state
  2. OFFLINE or UNRELIABLE → data downgraded
  3. LOW_BATTERY → supervisor alert
  4. REVOKED → data rejected entirely
  5. REVOKED devices CANNOT be re-trusted
*/

CREATE TABLE IF NOT EXISTS device_registry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL UNIQUE,
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  device_type text NOT NULL CHECK (device_type IN (
    'BLE_HEALTH_SENSOR',
    'WIFI_FALL_DETECTION',
    'GPS_TRACKER',
    'ENVIRONMENTAL_SENSOR',
    'EMERGENCY_BUTTON'
  )),
  device_name text NOT NULL,
  manufacturer text NOT NULL,
  model text NOT NULL,
  firmware_version text NOT NULL,
  battery_level integer CHECK (battery_level >= 0 AND battery_level <= 100),
  trust_state text NOT NULL CHECK (trust_state IN (
    'TRUSTED',
    'LOW_BATTERY',
    'OFFLINE',
    'UNRELIABLE',
    'REVOKED'
  )),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_health_check_at timestamptz NOT NULL DEFAULT now(),
  capabilities jsonb NOT NULL DEFAULT '{}',
  pairing_actor uuid NOT NULL REFERENCES user_profiles(id),
  pairing_timestamp timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES user_profiles(id),
  revocation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT revoked_requires_reason CHECK (
    (trust_state = 'REVOKED' AND revoked_at IS NOT NULL AND revoked_by IS NOT NULL AND revocation_reason IS NOT NULL)
    OR trust_state != 'REVOKED'
  )
);

ALTER TABLE device_registry ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_device_registry_resident_id ON device_registry(resident_id);
CREATE INDEX IF NOT EXISTS idx_device_registry_device_id ON device_registry(device_id);
CREATE INDEX IF NOT EXISTS idx_device_registry_trust_state ON device_registry(trust_state);
CREATE INDEX IF NOT EXISTS idx_device_registry_device_type ON device_registry(device_type);
CREATE INDEX IF NOT EXISTS idx_device_registry_last_seen ON device_registry(last_seen_at);
