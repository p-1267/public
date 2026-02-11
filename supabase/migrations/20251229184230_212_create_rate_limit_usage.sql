/*
  # Rate Limit Usage Table (Phase 32)

  ## Purpose
  Tracks actual rate limit usage and violations.
  Provides immutable audit trail for abuse detection.

  ## New Tables
  - `rate_limit_usage`
    - `id` (uuid, primary key)
    - `limit_config_id` (uuid, FK to rate_limit_config) - Associated limit
    - `limit_scope` (text) - PER_USER, PER_DEVICE, PER_API_KEY, PER_TENANT
    - `scope_identifier` (text) - User ID, device ID, API key, or tenant ID
    - `resource_type` (text) - Resource being accessed
    - `request_count` (integer) - Number of requests in window
    - `window_start` (timestamptz) - Window start time
    - `window_end` (timestamptz) - Window end time
    - `limit_exceeded` (boolean) - Was limit exceeded
    - `throttle_action_taken` (text, nullable) - Action taken if throttled
    - `created_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Security
  - RLS enabled
  - System-managed
  - Immutable audit trail

  ## Enforcement Rules
  1. All rate limit violations MUST be logged
  2. Audit trail is immutable
  3. Throttle actions MUST be recorded
*/

CREATE TABLE IF NOT EXISTS rate_limit_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  limit_config_id uuid REFERENCES rate_limit_config(id) ON DELETE CASCADE,
  limit_scope text NOT NULL CHECK (limit_scope IN ('PER_USER', 'PER_DEVICE', 'PER_API_KEY', 'PER_TENANT')),
  scope_identifier text NOT NULL,
  resource_type text NOT NULL,
  request_count integer NOT NULL DEFAULT 1,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  limit_exceeded boolean NOT NULL DEFAULT false,
  throttle_action_taken text CHECK (throttle_action_taken IN ('REJECT', 'QUEUE', 'SLOW_DOWN')),
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE rate_limit_usage ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_rate_limit_usage_limit_config_id ON rate_limit_usage(limit_config_id);
CREATE INDEX IF NOT EXISTS idx_rate_limit_usage_limit_scope ON rate_limit_usage(limit_scope);
CREATE INDEX IF NOT EXISTS idx_rate_limit_usage_scope_identifier ON rate_limit_usage(scope_identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limit_usage_resource_type ON rate_limit_usage(resource_type);
CREATE INDEX IF NOT EXISTS idx_rate_limit_usage_limit_exceeded ON rate_limit_usage(limit_exceeded);
CREATE INDEX IF NOT EXISTS idx_rate_limit_usage_window_start ON rate_limit_usage(window_start DESC);
CREATE INDEX IF NOT EXISTS idx_rate_limit_usage_created_at ON rate_limit_usage(created_at DESC);
