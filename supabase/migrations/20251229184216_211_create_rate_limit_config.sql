/*
  # Rate Limit Configuration Table (Phase 32)

  ## Purpose
  Defines rate limiting rules for abuse protection and fair usage.
  Enforces per-user, per-device, per-API-key, per-tenant rate limits.

  ## New Tables
  - `rate_limit_config`
    - `id` (uuid, primary key)
    - `limit_scope` (text) - PER_USER, PER_DEVICE, PER_API_KEY, PER_TENANT
    - `resource_type` (text) - API endpoint or resource type
    - `limit_count` (integer) - Maximum allowed requests
    - `window_seconds` (integer) - Time window in seconds
    - `burst_allowance` (integer) - Additional burst capacity
    - `throttle_action` (text) - REJECT, QUEUE, SLOW_DOWN
    - `is_active` (boolean) - Is this limit active
    - `created_by` (uuid, FK to user_profiles) - Who created
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Limit Scopes
  1. PER_USER - Per user rate limit
  2. PER_DEVICE - Per device rate limit
  3. PER_API_KEY - Per API key rate limit
  4. PER_TENANT - Per tenant/agency quota

  ## Throttle Actions
  1. REJECT - Reject request with error
  2. QUEUE - Queue request for later
  3. SLOW_DOWN - Slow down request processing

  ## Security
  - RLS enabled
  - Admin-only management
  - Immutable audit trail

  ## Enforcement Rules
  1. Per-user rate limits enforced
  2. Per-device rate limits enforced
  3. Per-API-key rate limits enforced
  4. Per-tenant quotas enforced
  5. Exceeded limits MUST throttle safely
  6. Exceeded limits MUST return explicit errors
  7. Exceeded limits MUST be logged immutably
*/

CREATE TABLE IF NOT EXISTS rate_limit_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  limit_scope text NOT NULL CHECK (limit_scope IN ('PER_USER', 'PER_DEVICE', 'PER_API_KEY', 'PER_TENANT')),
  resource_type text NOT NULL,
  limit_count integer NOT NULL CHECK (limit_count > 0),
  window_seconds integer NOT NULL CHECK (window_seconds > 0),
  burst_allowance integer NOT NULL DEFAULT 0 CHECK (burst_allowance >= 0),
  throttle_action text NOT NULL DEFAULT 'REJECT' CHECK (throttle_action IN ('REJECT', 'QUEUE', 'SLOW_DOWN')),
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}',
  UNIQUE(limit_scope, resource_type)
);

ALTER TABLE rate_limit_config ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_rate_limit_config_limit_scope ON rate_limit_config(limit_scope);
CREATE INDEX IF NOT EXISTS idx_rate_limit_config_resource_type ON rate_limit_config(resource_type);
CREATE INDEX IF NOT EXISTS idx_rate_limit_config_is_active ON rate_limit_config(is_active);
