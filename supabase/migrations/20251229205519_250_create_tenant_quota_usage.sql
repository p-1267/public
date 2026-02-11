/*
  # Tenant Quota Usage Tracking

  1. Purpose
    - Track current usage against quotas
    - Enable real-time throttling decisions
    - Detect quota violations
    - Support predictable response times under load

  2. New Tables
    - `tenant_quota_usage`
      - `usage_id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key to agencies.id, required)
      - `resource_type` (text, required)
      - `usage_period_start` (timestamptz, required)
      - `usage_period_end` (timestamptz, required)
      - `usage_count` (integer, required, >= 0)
      - `quota_limit` (integer, required)
      - `quota_exceeded` (boolean, computed)
      - `first_exceeded_at` (timestamptz)

  3. Security
    - RLS enabled
    - Tenant isolation enforced

  4. Constraints
    - tenant_id required (hard isolation)
    - usage_count must be non-negative
    - usage_period_end > usage_period_start
*/

CREATE TABLE IF NOT EXISTS tenant_quota_usage (
  usage_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  resource_type text NOT NULL CHECK (resource_type IN ('API_CALLS', 'DB_QUERIES', 'STORAGE_BYTES', 'USERS', 'RESIDENTS', 'MESSAGES', 'EVENTS')),
  usage_period_start timestamptz NOT NULL,
  usage_period_end timestamptz NOT NULL,
  usage_count integer NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  quota_limit integer NOT NULL,
  quota_exceeded boolean GENERATED ALWAYS AS (usage_count > quota_limit) STORED,
  first_exceeded_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_usage_period CHECK (usage_period_end > usage_period_start)
);

CREATE INDEX IF NOT EXISTS idx_tenant_quota_usage_tenant ON tenant_quota_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_quota_usage_period ON tenant_quota_usage(tenant_id, resource_type, usage_period_start DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_quota_usage_exceeded ON tenant_quota_usage(tenant_id, quota_exceeded) WHERE quota_exceeded = true;

ALTER TABLE tenant_quota_usage ENABLE ROW LEVEL SECURITY;
