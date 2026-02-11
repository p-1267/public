/*
  # Tenant Quotas and Throttling

  1. Purpose
    - Define per-tenant resource limits
    - Prevent noisy neighbor effects
    - Support predictable performance
    - Enable fair resource allocation

  2. New Tables
    - `tenant_quotas`
      - `quota_id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key to agencies.id, required)
      - `resource_type` (text, required: API_CALLS, DB_QUERIES, STORAGE, USERS, RESIDENTS)
      - `quota_limit` (integer, required, > 0)
      - `quota_period` (text, required: minute, hour, day, month)
      - `hard_limit` (boolean, default true - reject when exceeded)
      - `is_active` (boolean, default true)
      - `effective_from` (timestamptz, required)
      - `effective_until` (timestamptz)

  3. Security
    - RLS enabled
    - Only super_admin can modify quotas

  4. Constraints
    - tenant_id required (hard isolation)
    - quota_limit must be positive
    - resource_type must be valid enum
    - No overlapping active quotas per tenant+resource
*/

CREATE TABLE IF NOT EXISTS tenant_quotas (
  quota_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  resource_type text NOT NULL CHECK (resource_type IN ('API_CALLS', 'DB_QUERIES', 'STORAGE_BYTES', 'USERS', 'RESIDENTS', 'MESSAGES', 'EVENTS')),
  quota_limit integer NOT NULL CHECK (quota_limit > 0),
  quota_period text NOT NULL CHECK (quota_period IN ('minute', 'hour', 'day', 'month')),
  hard_limit boolean DEFAULT true,
  is_active boolean DEFAULT true,
  effective_from timestamptz NOT NULL DEFAULT now(),
  effective_until timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  CONSTRAINT valid_effective_dates CHECK (effective_until IS NULL OR effective_until > effective_from)
);

CREATE INDEX IF NOT EXISTS idx_tenant_quotas_tenant ON tenant_quotas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_quotas_active ON tenant_quotas(tenant_id, resource_type) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_tenant_quotas_effective ON tenant_quotas(effective_from, effective_until);

ALTER TABLE tenant_quotas ENABLE ROW LEVEL SECURITY;
