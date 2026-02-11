/*
  # Archival Log Table (Phase 33)

  ## Purpose
  Immutable audit trail of archival operations.
  Tracks non-destructive archival process.

  ## New Tables
  - `archival_log`
    - `id` (uuid, primary key)
    - `archival_id` (text) - Unique archival identifier
    - `record_id` (uuid) - Record being archived
    - `record_table` (text) - Source table
    - `data_category` (text) - Data category
    - `policy_id` (text) - Applied retention policy
    - `archival_reason` (text) - Reason for archival
    - `retention_period_expired` (boolean) - Did retention period expire
    - `archived_by` (uuid, FK to user_profiles, nullable) - Who archived (null for automatic)
    - `archived_at` (timestamptz) - When archived
    - `is_read_only` (boolean) - Is record read-only (MUST be true)
    - `is_queryable` (boolean) - Is record queryable (MUST be true)
    - `excluded_from_active_workflows` (boolean) - Excluded from workflows (MUST be true)
    - `metadata` (jsonb) - additional data

  ## Security
  - RLS enabled
  - Immutable audit trail
  - System-managed

  ## Enforcement Rules
  1. When retention period expires: Data moved to ARCHIVED state
  2. Data becomes read-only (is_read_only = true)
  3. Data remains queryable for audits (is_queryable = true)
  4. Data excluded from active workflows (excluded_from_active_workflows = true)
  5. No deletion occurs at archival stage
*/

CREATE TABLE IF NOT EXISTS archival_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archival_id text NOT NULL UNIQUE,
  record_id uuid NOT NULL,
  record_table text NOT NULL,
  data_category text NOT NULL CHECK (data_category IN ('MEDICAL_RECORD', 'CARE_LOG', 'ATTENDANCE_RECORD', 'FINANCIAL_RECORD', 'COMMUNICATION_RECORD', 'AUDIT_RECORD', 'SYSTEM_LOG')),
  policy_id text NOT NULL,
  archival_reason text NOT NULL,
  retention_period_expired boolean NOT NULL DEFAULT false,
  archived_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  archived_at timestamptz NOT NULL DEFAULT now(),
  is_read_only boolean NOT NULL DEFAULT true CHECK (is_read_only = true),
  is_queryable boolean NOT NULL DEFAULT true CHECK (is_queryable = true),
  excluded_from_active_workflows boolean NOT NULL DEFAULT true CHECK (excluded_from_active_workflows = true),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE archival_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_archival_log_archival_id ON archival_log(archival_id);
CREATE INDEX IF NOT EXISTS idx_archival_log_record_table ON archival_log(record_table);
CREATE INDEX IF NOT EXISTS idx_archival_log_record_id ON archival_log(record_id);
CREATE INDEX IF NOT EXISTS idx_archival_log_data_category ON archival_log(data_category);
CREATE INDEX IF NOT EXISTS idx_archival_log_policy_id ON archival_log(policy_id);
CREATE INDEX IF NOT EXISTS idx_archival_log_archived_at ON archival_log(archived_at DESC);
