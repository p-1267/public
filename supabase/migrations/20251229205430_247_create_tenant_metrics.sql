/*
  # Tenant Metrics Table

  1. Purpose
    - Track operational metrics per tenant (agency)
    - Enable tenant-level monitoring without accessing tenant data
    - Support SLO/SLA indicators
    - Detect noisy neighbor effects

  2. New Tables
    - `tenant_metrics`
      - `metric_id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key to agencies.id, required)
      - `metric_timestamp` (timestamptz, required)
      - `metric_type` (text, required: USAGE, ERROR, LATENCY, CAPACITY)
      - `metric_component` (text, required: API, DB, QUEUE, WORKER, etc.)
      - `metric_value` (numeric, required)
      - `metric_unit` (text, required: requests, ms, bytes, count, etc.)
      - `aggregation_window` (text: minute, hour, day)
      - `metadata` (jsonb)

  3. Security
    - RLS enabled
    - System observability without tenant data access

  4. Constraints
    - metric_type must be valid enum
    - metric_value must be non-negative
    - tenant_id required (hard isolation)
*/

CREATE TABLE IF NOT EXISTS tenant_metrics (
  metric_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  metric_timestamp timestamptz NOT NULL DEFAULT now(),
  metric_type text NOT NULL CHECK (metric_type IN ('USAGE', 'ERROR', 'LATENCY', 'CAPACITY', 'SATURATION')),
  metric_component text NOT NULL,
  metric_value numeric NOT NULL CHECK (metric_value >= 0),
  metric_unit text NOT NULL,
  aggregation_window text CHECK (aggregation_window IN ('minute', 'hour', 'day', 'month')),
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_metrics_tenant ON tenant_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_metrics_timestamp ON tenant_metrics(metric_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tenant_metrics_type ON tenant_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_tenant_metrics_component ON tenant_metrics(metric_component);
CREATE INDEX IF NOT EXISTS idx_tenant_metrics_lookup ON tenant_metrics(tenant_id, metric_type, metric_timestamp DESC);

ALTER TABLE tenant_metrics ENABLE ROW LEVEL SECURITY;
