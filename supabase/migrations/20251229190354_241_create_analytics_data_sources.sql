/*
  # Analytics Data Sources Table (Phase 34)

  ## Purpose
  Tracks data sources used for analytics (read-only).
  Analytics MUST consume ONLY sealed/archived/read-only data.

  ## New Tables
  - `analytics_data_sources`
    - `id` (uuid, primary key)
    - `source_id` (text) - Unique source identifier
    - `source_name` (text) - Source name
    - `source_type` (text) - SEALED_CARE_RECORDS, SEALED_ATTENDANCE_RECORDS, ARCHIVED_OPERATIONAL_DATA, EXTERNAL_OBSERVATIONS
    - `source_description` (text) - Description
    - `is_read_only` (boolean) - MUST be true
    - `is_sealed` (boolean) - Is data sealed/immutable
    - `is_archived` (boolean) - Is data archived
    - `allows_live_data` (boolean) - MUST be false (no live/mutable data)
    - `source_table` (text, nullable) - Source table name
    - `last_refresh_timestamp` (timestamptz) - Last refresh
    - `refresh_interval_hours` (integer) - Refresh interval
    - `is_active` (boolean) - Is source active
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Source Types
  1. SEALED_CARE_RECORDS - Sealed care records
  2. SEALED_ATTENDANCE_RECORDS - Sealed attendance records
  3. ARCHIVED_OPERATIONAL_DATA - Archived operational data
  4. EXTERNAL_OBSERVATIONS - External observations (read-only)

  ## Security
  - RLS enabled
  - Read-only enforcement
  - No live/mutable data allowed

  ## Enforcement Rules
  1. Analytics MUST consume ONLY: Sealed care records, Sealed attendance records, Archived operational data, External observations (read-only)
  2. No live or mutable data allowed (allows_live_data = false)
  3. All sources are read-only (is_read_only = true)
*/

CREATE TABLE IF NOT EXISTS analytics_data_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL UNIQUE,
  source_name text NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('SEALED_CARE_RECORDS', 'SEALED_ATTENDANCE_RECORDS', 'ARCHIVED_OPERATIONAL_DATA', 'EXTERNAL_OBSERVATIONS')),
  source_description text NOT NULL,
  is_read_only boolean NOT NULL DEFAULT true CHECK (is_read_only = true),
  is_sealed boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  allows_live_data boolean NOT NULL DEFAULT false CHECK (allows_live_data = false),
  source_table text,
  last_refresh_timestamp timestamptz NOT NULL DEFAULT now(),
  refresh_interval_hours integer NOT NULL DEFAULT 24,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE analytics_data_sources ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_analytics_data_sources_source_id ON analytics_data_sources(source_id);
CREATE INDEX IF NOT EXISTS idx_analytics_data_sources_source_type ON analytics_data_sources(source_type);
CREATE INDEX IF NOT EXISTS idx_analytics_data_sources_is_active ON analytics_data_sources(is_active);
CREATE INDEX IF NOT EXISTS idx_analytics_data_sources_last_refresh_timestamp ON analytics_data_sources(last_refresh_timestamp);
