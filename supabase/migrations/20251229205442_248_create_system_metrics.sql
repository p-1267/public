/*
  # System-Level Metrics Table

  1. Purpose
    - Track global system-level metrics (capacity, saturation)
    - Monitor overall system health
    - Support horizontal scaling decisions
    - No tenant-specific data

  2. New Tables
    - `system_metrics`
      - `metric_id` (uuid, primary key)
      - `metric_timestamp` (timestamptz, required)
      - `metric_type` (text, required: CAPACITY, SATURATION, HEALTH)
      - `metric_component` (text, required: DB, API, QUEUE, WORKER, etc.)
      - `metric_value` (numeric, required)
      - `metric_unit` (text, required)
      - `aggregation_window` (text)
      - `metadata` (jsonb)

  3. Security
    - RLS enabled
    - Only system admins can read

  4. Constraints
    - metric_type must be valid enum
    - metric_value must be non-negative
*/

CREATE TABLE IF NOT EXISTS system_metrics (
  metric_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_timestamp timestamptz NOT NULL DEFAULT now(),
  metric_type text NOT NULL CHECK (metric_type IN ('CAPACITY', 'SATURATION', 'HEALTH', 'THROUGHPUT', 'ERROR_RATE')),
  metric_component text NOT NULL,
  metric_value numeric NOT NULL CHECK (metric_value >= 0),
  metric_unit text NOT NULL,
  aggregation_window text CHECK (aggregation_window IN ('minute', 'hour', 'day', 'month')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(metric_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_system_metrics_component ON system_metrics(metric_component);

ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
