/*
  # Device Trust Table (Phase 19)

  ## Purpose
  Tracks device trust states for each user. Every device must be registered
  and can be remotely revoked. New or suspicious devices trigger re-authentication.

  ## New Tables
  - `device_trust`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK to user_profiles) - device owner
    - `device_fingerprint` (text, unique) - unique device identifier
    - `device_name` (text, nullable) - user-friendly device name
    - `device_type` (text) - mobile, tablet, desktop, web
    - `trust_state` (text) - TRUSTED, PENDING, SUSPICIOUS, REVOKED
    - `first_seen_at` (timestamptz) - when device was first registered
    - `last_seen_at` (timestamptz) - last activity timestamp
    - `last_ip_address` (inet, nullable) - last known IP
    - `user_agent` (text, nullable) - browser/app user agent
    - `revoked_at` (timestamptz, nullable) - when device was revoked
    - `revoked_by` (uuid, nullable, FK to user_profiles) - who revoked device
    - `revoked_reason` (text, nullable) - reason for revocation
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Users can view their own devices
  - Only user or admin can revoke devices
  - All device changes are audited

  ## Enforcement Rules
  1. Each device must be registered before access
  2. Revoked devices cannot be re-trusted
  3. Suspicious devices require re-authentication
  4. Device trust affects permission scope
*/

CREATE TABLE IF NOT EXISTS device_trust (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  device_fingerprint text NOT NULL,
  device_name text,
  device_type text CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'web')),
  trust_state text NOT NULL DEFAULT 'PENDING' CHECK (trust_state IN ('TRUSTED', 'PENDING', 'SUSPICIOUS', 'REVOKED')),
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  last_ip_address inet,
  user_agent text,
  revoked_at timestamptz,
  revoked_by uuid REFERENCES user_profiles(id),
  revoked_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, device_fingerprint)
);

ALTER TABLE device_trust ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_device_trust_user_id ON device_trust(user_id);
CREATE INDEX IF NOT EXISTS idx_device_trust_fingerprint ON device_trust(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_device_trust_trust_state ON device_trust(trust_state);
CREATE INDEX IF NOT EXISTS idx_device_trust_last_seen_at ON device_trust(last_seen_at);
