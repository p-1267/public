/*
  # Analytics Domains Table (Phase 34)

  ## Purpose
  Defines explicitly scoped analytics domains.
  Analytics are read-only observers that explain what happened and what might happen.

  ## New Tables
  - `analytics_domains`
    - `id` (uuid, primary key)
    - `domain_id` (text) - Unique domain identifier
    - `domain_name` (text) - CARE_DELIVERY_TRENDS, WORKFORCE_UTILIZATION, ATTENDANCE_PATTERNS, DEVICE_RELIABILITY, INCIDENT_FREQUENCY, COMPLIANCE_INDICATORS
    - `domain_description` (text) - Description of domain
    - `is_read_only` (boolean) - MUST be true (analytics are observers)
    - `can_execute_actions` (boolean) - MUST be false (insights NEVER execute)
    - `can_block_workflows` (boolean) - MUST be false (analytics MUST NOT block)
    - `can_override_policy` (boolean) - MUST be false (no override allowed)
    - `is_active` (boolean) - Is domain active
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Analytics Domains
  1. CARE_DELIVERY_TRENDS - Care delivery trends
  2. WORKFORCE_UTILIZATION - Workforce utilization
  3. ATTENDANCE_PATTERNS - Attendance patterns
  4. DEVICE_RELIABILITY - Device reliability
  5. INCIDENT_FREQUENCY - Incident frequency
  6. COMPLIANCE_INDICATORS - Compliance indicators

  ## Security
  - RLS enabled
  - Read-only for all
  - System-managed

  ## Enforcement Rules
  1. Analytics are read-only observers (is_read_only = true)
  2. Insights MUST NEVER execute actions (can_execute_actions = false)
  3. Analytics MUST NOT block workflows (can_block_workflows = false)
  4. No analytics output may override policy (can_override_policy = false)
  5. Separation between Insight and Enforcement is mandatory
*/

CREATE TABLE IF NOT EXISTS analytics_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id text NOT NULL UNIQUE,
  domain_name text NOT NULL UNIQUE CHECK (domain_name IN ('CARE_DELIVERY_TRENDS', 'WORKFORCE_UTILIZATION', 'ATTENDANCE_PATTERNS', 'DEVICE_RELIABILITY', 'INCIDENT_FREQUENCY', 'COMPLIANCE_INDICATORS')),
  domain_description text NOT NULL,
  is_read_only boolean NOT NULL DEFAULT true CHECK (is_read_only = true),
  can_execute_actions boolean NOT NULL DEFAULT false CHECK (can_execute_actions = false),
  can_block_workflows boolean NOT NULL DEFAULT false CHECK (can_block_workflows = false),
  can_override_policy boolean NOT NULL DEFAULT false CHECK (can_override_policy = false),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE analytics_domains ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_analytics_domains_domain_id ON analytics_domains(domain_id);
CREATE INDEX IF NOT EXISTS idx_analytics_domains_domain_name ON analytics_domains(domain_name);
CREATE INDEX IF NOT EXISTS idx_analytics_domains_is_active ON analytics_domains(is_active);
