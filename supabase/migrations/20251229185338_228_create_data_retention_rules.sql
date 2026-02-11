/*
  # Data Retention Rules Table (Phase 33)

  ## Purpose
  Applies retention policies to specific data records.
  Tracks retention state and archival eligibility.

  ## New Tables
  - `data_retention_rules`
    - `id` (uuid, primary key)
    - `record_id` (uuid) - Reference to source record
    - `record_table` (text) - Source table name
    - `data_category` (text) - MEDICAL_RECORD, CARE_LOG, etc.
    - `policy_id` (text, FK to jurisdictional_retention_policies) - Applied policy
    - `retention_state` (text) - ACTIVE, ARCHIVED, ERASED
    - `created_at` (timestamptz) - Record creation time
    - `retention_expires_at` (timestamptz) - When retention expires
    - `eligible_for_archival_at` (timestamptz) - When eligible for archival
    - `archived_at` (timestamptz, nullable) - When archived
    - `eligible_for_erasure_at` (timestamptz, nullable) - When eligible for erasure
    - `erased_at` (timestamptz, nullable) - When erased
    - `legal_hold_active` (boolean) - Is legal hold active
    - `audit_dependency_exists` (boolean) - Does audit dependency exist
    - `is_protected` (boolean) - Is protected from erasure (audit/legal records)
    - `metadata` (jsonb) - additional data

  ## Retention States
  1. ACTIVE - Record is active
  2. ARCHIVED - Record is archived (read-only, queryable, excluded from active workflows)
  3. ERASED - Record is erased (tombstone only)

  ## Security
  - RLS enabled
  - System-managed
  - Immutable state transitions

  ## Enforcement Rules
  1. When retention period expires: Data moved to ARCHIVED state
  2. Data becomes read-only
  3. Data remains queryable for audits
  4. Data excluded from active workflows
  5. No deletion occurs at archival stage
  6. Audit and legal records are never erased (is_protected = true)
*/

CREATE TABLE IF NOT EXISTS data_retention_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL,
  record_table text NOT NULL,
  data_category text NOT NULL CHECK (data_category IN ('MEDICAL_RECORD', 'CARE_LOG', 'ATTENDANCE_RECORD', 'FINANCIAL_RECORD', 'COMMUNICATION_RECORD', 'AUDIT_RECORD', 'SYSTEM_LOG')),
  policy_id text NOT NULL,
  retention_state text NOT NULL DEFAULT 'ACTIVE' CHECK (retention_state IN ('ACTIVE', 'ARCHIVED', 'ERASED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  retention_expires_at timestamptz NOT NULL,
  eligible_for_archival_at timestamptz NOT NULL,
  archived_at timestamptz,
  eligible_for_erasure_at timestamptz,
  erased_at timestamptz,
  legal_hold_active boolean NOT NULL DEFAULT false,
  audit_dependency_exists boolean NOT NULL DEFAULT false,
  is_protected boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}',
  UNIQUE(record_table, record_id)
);

ALTER TABLE data_retention_rules ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_data_retention_rules_record_table ON data_retention_rules(record_table);
CREATE INDEX IF NOT EXISTS idx_data_retention_rules_record_id ON data_retention_rules(record_id);
CREATE INDEX IF NOT EXISTS idx_data_retention_rules_data_category ON data_retention_rules(data_category);
CREATE INDEX IF NOT EXISTS idx_data_retention_rules_policy_id ON data_retention_rules(policy_id);
CREATE INDEX IF NOT EXISTS idx_data_retention_rules_retention_state ON data_retention_rules(retention_state);
CREATE INDEX IF NOT EXISTS idx_data_retention_rules_retention_expires_at ON data_retention_rules(retention_expires_at);
CREATE INDEX IF NOT EXISTS idx_data_retention_rules_eligible_for_archival_at ON data_retention_rules(eligible_for_archival_at);
CREATE INDEX IF NOT EXISTS idx_data_retention_rules_legal_hold_active ON data_retention_rules(legal_hold_active);
CREATE INDEX IF NOT EXISTS idx_data_retention_rules_is_protected ON data_retention_rules(is_protected);
