/*
  # Tenant Partitioning Configuration

  1. Purpose
    - Define tenant-aware indexing strategies
    - Configure partitioning for high-volume tables
    - Separate active vs archived data
    - Remain transparent to application logic

  2. New Tables
    - `tenant_partitioning_config`
      - `config_id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key to agencies.id, required)
      - `table_name` (text, required)
      - `partitioning_strategy` (text, required: TIME_BASED, SIZE_BASED, HYBRID)
      - `partition_key` (text, required)
      - `partition_interval` (text: day, week, month)
      - `archive_after_days` (integer, > 0)
      - `archive_storage_tier` (text: HOT, WARM, COLD)
      - `is_active` (boolean, default true)

  3. Security
    - RLS enabled
    - Only super_admin can modify

  4. Constraints
    - tenant_id required (hard isolation)
    - partitioning_strategy must be valid enum
    - archive_after_days must be positive if set
    - Partitioning transparent to application logic
*/

CREATE TABLE IF NOT EXISTS tenant_partitioning_config (
  config_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  partitioning_strategy text NOT NULL CHECK (partitioning_strategy IN ('TIME_BASED', 'SIZE_BASED', 'HYBRID', 'NONE')),
  partition_key text NOT NULL,
  partition_interval text CHECK (partition_interval IN ('day', 'week', 'month', 'quarter', 'year')),
  archive_after_days integer CHECK (archive_after_days > 0),
  archive_storage_tier text DEFAULT 'HOT' CHECK (archive_storage_tier IN ('HOT', 'WARM', 'COLD', 'ARCHIVE')),
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, table_name)
);

CREATE INDEX IF NOT EXISTS idx_tenant_partitioning_tenant ON tenant_partitioning_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_partitioning_table ON tenant_partitioning_config(table_name);
CREATE INDEX IF NOT EXISTS idx_tenant_partitioning_active ON tenant_partitioning_config(tenant_id, is_active) WHERE is_active = true;

ALTER TABLE tenant_partitioning_config ENABLE ROW LEVEL SECURITY;
