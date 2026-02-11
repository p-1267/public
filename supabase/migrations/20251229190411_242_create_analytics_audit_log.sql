/*
  # Analytics Audit Log Table (Phase 34)

  ## Purpose
  Immutable audit trail for all analytics generation events.
  Every analytics generation MUST be logged.

  ## New Tables
  - `analytics_audit_log`
    - `id` (uuid, primary key)
    - `event_id` (text) - Unique event identifier
    - `event_type` (text) - INSIGHT_GENERATED, INSIGHT_VIEWED, INSIGHT_MARKED_STALE, ANALYTICS_FAILED
    - `insight_id` (text, nullable) - Associated insight
    - `domain_id` (text, nullable) - Associated domain
    - `insight_type` (text, nullable) - DESCRIPTIVE, DIAGNOSTIC, PREDICTIVE
    - `data_sources` (text[]) - Data sources used
    - `time_range_start` (timestamptz, nullable) - Analysis time range start
    - `time_range_end` (timestamptz, nullable) - Analysis time range end
    - `actor` (text) - SYSTEM (actor)
    - `timestamp` (timestamptz) - When event occurred
    - `failure_reason` (text, nullable) - Failure reason if applicable
    - `event_details` (jsonb) - Event details
    - `created_at` (timestamptz)

  ## Event Types
  1. INSIGHT_GENERATED - Insight generated
  2. INSIGHT_VIEWED - Insight viewed by user
  3. INSIGHT_MARKED_STALE - Insight marked as stale
  4. ANALYTICS_FAILED - Analytics generation failed

  ## Security
  - RLS enabled
  - Immutable (append-only)
  - Complete audit trail

  ## Enforcement Rules
  1. Every analytics generation MUST log: Insight type, Data sources, Time range, Actor (system), Timestamp
  2. Audit logs are immutable
  3. Failure handling: If analytics generation fails, core system remains unaffected, failure logged, clear error surfaced to admins, no cascading impact allowed
*/

CREATE TABLE IF NOT EXISTS analytics_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL CHECK (event_type IN ('INSIGHT_GENERATED', 'INSIGHT_VIEWED', 'INSIGHT_MARKED_STALE', 'ANALYTICS_FAILED')),
  insight_id text,
  domain_id text,
  insight_type text CHECK (insight_type IN ('DESCRIPTIVE', 'DIAGNOSTIC', 'PREDICTIVE')),
  data_sources text[] NOT NULL DEFAULT '{}',
  time_range_start timestamptz,
  time_range_end timestamptz,
  actor text NOT NULL DEFAULT 'SYSTEM',
  timestamp timestamptz NOT NULL DEFAULT now(),
  failure_reason text,
  event_details jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE analytics_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_analytics_audit_log_event_id ON analytics_audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_analytics_audit_log_event_type ON analytics_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_audit_log_insight_id ON analytics_audit_log(insight_id);
CREATE INDEX IF NOT EXISTS idx_analytics_audit_log_domain_id ON analytics_audit_log(domain_id);
CREATE INDEX IF NOT EXISTS idx_analytics_audit_log_timestamp ON analytics_audit_log(timestamp DESC);
