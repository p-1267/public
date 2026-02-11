/*
  # Analytics Insights Table (Phase 34)

  ## Purpose
  Stores analytics insights (read-only observations).
  Insights explain what happened and what might happen — they never decide what must happen.

  ## New Tables
  - `analytics_insights`
    - `id` (uuid, primary key)
    - `insight_id` (text) - Unique insight identifier
    - `domain_id` (text, FK to analytics_domains) - Associated domain
    - `insight_type` (text) - DESCRIPTIVE, DIAGNOSTIC, PREDICTIVE (no prescriptive)
    - `insight_title` (text) - Insight title
    - `insight_summary` (text) - Short summary
    - `insight_details` (jsonb) - Detailed insight data
    - `data_sources` (text[]) - Data sources used (read-only)
    - `time_range_start` (timestamptz) - Analysis time range start
    - `time_range_end` (timestamptz) - Analysis time range end
    - `confidence_level` (numeric) - Confidence level (0.0 to 1.0)
    - `is_stale` (boolean) - Is data stale
    - `is_incomplete` (boolean) - Is dataset incomplete
    - `data_freshness_timestamp` (timestamptz) - When data was fresh
    - `stale_threshold_hours` (integer) - Hours before marked stale
    - `generated_by` (text) - SYSTEM (actor)
    - `generated_at` (timestamptz) - When generated
    - `visible_to_roles` (text[]) - Roles that can view (AGENCY_ADMIN, SUPERVISOR)
    - `visible_to_family` (boolean) - Is visible to family (view-only)
    - `visible_to_caregivers` (boolean) - Is visible to caregivers (view-only)
    - `is_read_only` (boolean) - MUST be true
    - `can_trigger_action` (boolean) - MUST be false
    - `created_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Insight Types
  1. DESCRIPTIVE - What happened
  2. DIAGNOSTIC - Why it happened
  3. PREDICTIVE - Risk trends (no prescriptive/executing insights)

  ## Security
  - RLS enabled
  - Read-only access
  - Role-based visibility

  ## Enforcement Rules
  1. Insights MUST be clearly labeled as "Insights" (presentation layer)
  2. No language implying obligation or requirement (presentation layer)
  3. Confidence levels must be displayed where applicable
  4. Stale data MUST be labeled (is_stale flag)
  5. Incomplete datasets MUST be disclosed (is_incomplete flag)
  6. Analytics are read-only (is_read_only = true)
  7. Insights cannot trigger actions (can_trigger_action = false)
*/

CREATE TABLE IF NOT EXISTS analytics_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id text NOT NULL UNIQUE,
  domain_id text NOT NULL,
  insight_type text NOT NULL CHECK (insight_type IN ('DESCRIPTIVE', 'DIAGNOSTIC', 'PREDICTIVE')),
  insight_title text NOT NULL,
  insight_summary text NOT NULL,
  insight_details jsonb NOT NULL DEFAULT '{}',
  data_sources text[] NOT NULL DEFAULT '{}',
  time_range_start timestamptz NOT NULL,
  time_range_end timestamptz NOT NULL,
  confidence_level numeric NOT NULL CHECK (confidence_level >= 0.0 AND confidence_level <= 1.0),
  is_stale boolean NOT NULL DEFAULT false,
  is_incomplete boolean NOT NULL DEFAULT false,
  data_freshness_timestamp timestamptz NOT NULL DEFAULT now(),
  stale_threshold_hours integer NOT NULL DEFAULT 24,
  generated_by text NOT NULL DEFAULT 'SYSTEM',
  generated_at timestamptz NOT NULL DEFAULT now(),
  visible_to_roles text[] NOT NULL DEFAULT '{"AGENCY_ADMIN", "SUPERVISOR"}',
  visible_to_family boolean NOT NULL DEFAULT false,
  visible_to_caregivers boolean NOT NULL DEFAULT false,
  is_read_only boolean NOT NULL DEFAULT true CHECK (is_read_only = true),
  can_trigger_action boolean NOT NULL DEFAULT false CHECK (can_trigger_action = false),
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE analytics_insights ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_analytics_insights_insight_id ON analytics_insights(insight_id);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_domain_id ON analytics_insights(domain_id);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_insight_type ON analytics_insights(insight_type);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_is_stale ON analytics_insights(is_stale);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_generated_at ON analytics_insights(generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_time_range_start ON analytics_insights(time_range_start);
CREATE INDEX IF NOT EXISTS idx_analytics_insights_time_range_end ON analytics_insights(time_range_end);
