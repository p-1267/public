/*
  # Integration Rate Limits Table (Phase 30)

  ## Purpose
  Tracks rate limit state for integrations.
  Enforces rate limiting to protect external systems and prevent abuse.

  ## New Tables
  - `integration_rate_limits`
    - `id` (uuid, primary key)
    - `integration_id` (uuid, FK to integration_registry) - related integration
    - `window_type` (text) - MINUTE, HOUR, DAY
    - `window_start` (timestamptz) - window start time
    - `window_end` (timestamptz) - window end time
    - `request_count` (integer) - requests in this window
    - `limit_threshold` (integer) - limit for this window
    - `limit_exceeded` (boolean) - limit exceeded flag
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Window Types
  1. MINUTE - Per-minute window
  2. HOUR - Per-hour window
  3. DAY - Per-day window

  ## Security
  - RLS enabled
  - System-managed

  ## Enforcement Rules
  1. Apply rate limits per integration
  2. Circuit-break on repeated failures
*/

CREATE TABLE IF NOT EXISTS integration_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES integration_registry(id) ON DELETE CASCADE,
  window_type text NOT NULL CHECK (window_type IN ('MINUTE', 'HOUR', 'DAY')),
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  limit_threshold integer NOT NULL,
  limit_exceeded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(integration_id, window_type, window_start)
);

ALTER TABLE integration_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_integration_rate_limits_integration_id ON integration_rate_limits(integration_id);
CREATE INDEX IF NOT EXISTS idx_integration_rate_limits_window_type ON integration_rate_limits(window_type);
CREATE INDEX IF NOT EXISTS idx_integration_rate_limits_window_start ON integration_rate_limits(window_start);
CREATE INDEX IF NOT EXISTS idx_integration_rate_limits_limit_exceeded ON integration_rate_limits(limit_exceeded);
