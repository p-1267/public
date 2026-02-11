/*
  # Tenant Encryption Boundaries

  1. Purpose
    - Define per-tenant encryption configurations
    - Support key rotation without downtime
    - Maintain encryption boundaries at scale
    - Enable independent tenant security posture

  2. New Tables
    - `tenant_encryption_boundaries`
      - `boundary_id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key to agencies.id, required, unique)
      - `encryption_key_version` (integer, required, >= 1)
      - `key_rotation_enabled` (boolean, default true)
      - `last_key_rotation` (timestamptz)
      - `next_key_rotation` (timestamptz)
      - `rotation_frequency_days` (integer, default 90, > 0)
      - `encryption_algorithm` (text, required)
      - `key_status` (text, required: ACTIVE, ROTATING, ROTATED)
      - `key_metadata` (jsonb, encrypted settings)

  3. Security
    - RLS enabled
    - Only super_admin can access
    - Security posture must not weaken with scale

  4. Constraints
    - tenant_id required and unique (hard isolation)
    - encryption_key_version must be positive
    - rotation_frequency_days must be positive
    - key_status must be valid enum
*/

CREATE TABLE IF NOT EXISTS tenant_encryption_boundaries (
  boundary_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL UNIQUE REFERENCES agencies(id) ON DELETE CASCADE,
  encryption_key_version integer NOT NULL DEFAULT 1 CHECK (encryption_key_version >= 1),
  key_rotation_enabled boolean DEFAULT true,
  last_key_rotation timestamptz,
  next_key_rotation timestamptz,
  rotation_frequency_days integer DEFAULT 90 CHECK (rotation_frequency_days > 0),
  encryption_algorithm text NOT NULL DEFAULT 'AES-256-GCM',
  key_status text NOT NULL DEFAULT 'ACTIVE' CHECK (key_status IN ('ACTIVE', 'ROTATING', 'ROTATED')),
  key_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_rotation_dates CHECK (next_key_rotation IS NULL OR last_key_rotation IS NULL OR next_key_rotation > last_key_rotation)
);

CREATE INDEX IF NOT EXISTS idx_tenant_encryption_tenant ON tenant_encryption_boundaries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_encryption_rotation ON tenant_encryption_boundaries(next_key_rotation) WHERE key_rotation_enabled = true AND key_status = 'ACTIVE';

ALTER TABLE tenant_encryption_boundaries ENABLE ROW LEVEL SECURITY;
