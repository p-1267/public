/*
  # Data Integrity Checks Table (Phase 32)

  ## Purpose
  Background consistency verification for data integrity guarantees.
  Enforces idempotent writes, exactly-once semantics, referential integrity.

  ## New Tables
  - `data_integrity_checks`
    - `id` (uuid, primary key)
    - `check_id` (text) - Unique check identifier
    - `check_type` (text) - REFERENTIAL_INTEGRITY, IDEMPOTENCY, CONSISTENCY, ORPHAN_DETECTION
    - `table_name` (text) - Table being checked
    - `check_scope` (text) - FULL, SAMPLE, INCREMENTAL
    - `check_started_at` (timestamptz) - Check start time
    - `check_completed_at` (timestamptz, nullable) - Check completion time
    - `check_status` (text) - IN_PROGRESS, PASSED, FAILED, WARNING
    - `records_checked` (integer) - Number of records checked
    - `violations_found` (integer) - Number of violations
    - `violation_details` (jsonb) - Details of violations
    - `auto_repair_attempted` (boolean) - Was auto-repair attempted
    - `auto_repair_success` (boolean, nullable) - Was auto-repair successful
    - `requires_manual_intervention` (boolean) - Requires manual fix
    - `created_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Check Types
  1. REFERENTIAL_INTEGRITY - Check foreign key constraints
  2. IDEMPOTENCY - Verify idempotent operation tracking
  3. CONSISTENCY - Check data consistency
  4. ORPHAN_DETECTION - Detect orphaned records

  ## Check Scope
  1. FULL - Full table scan
  2. SAMPLE - Sample-based check
  3. INCREMENTAL - Check recent changes only

  ## Check Status
  1. IN_PROGRESS - Check in progress
  2. PASSED - Check passed
  3. FAILED - Check failed
  4. WARNING - Check found issues

  ## Security
  - RLS enabled
  - System-managed
  - Automatic checks

  ## Enforcement Rules
  1. Idempotent writes enforced
  2. Exactly-once semantics where required
  3. Referential integrity checks
  4. Background consistency verification
*/

CREATE TABLE IF NOT EXISTS data_integrity_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_id text NOT NULL UNIQUE,
  check_type text NOT NULL CHECK (check_type IN ('REFERENTIAL_INTEGRITY', 'IDEMPOTENCY', 'CONSISTENCY', 'ORPHAN_DETECTION')),
  table_name text NOT NULL,
  check_scope text NOT NULL CHECK (check_scope IN ('FULL', 'SAMPLE', 'INCREMENTAL')),
  check_started_at timestamptz NOT NULL DEFAULT now(),
  check_completed_at timestamptz,
  check_status text NOT NULL DEFAULT 'IN_PROGRESS' CHECK (check_status IN ('IN_PROGRESS', 'PASSED', 'FAILED', 'WARNING')),
  records_checked integer NOT NULL DEFAULT 0,
  violations_found integer NOT NULL DEFAULT 0,
  violation_details jsonb NOT NULL DEFAULT '{}',
  auto_repair_attempted boolean NOT NULL DEFAULT false,
  auto_repair_success boolean,
  requires_manual_intervention boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE data_integrity_checks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_data_integrity_checks_check_id ON data_integrity_checks(check_id);
CREATE INDEX IF NOT EXISTS idx_data_integrity_checks_check_type ON data_integrity_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_data_integrity_checks_table_name ON data_integrity_checks(table_name);
CREATE INDEX IF NOT EXISTS idx_data_integrity_checks_check_status ON data_integrity_checks(check_status);
CREATE INDEX IF NOT EXISTS idx_data_integrity_checks_violations_found ON data_integrity_checks(violations_found);
CREATE INDEX IF NOT EXISTS idx_data_integrity_checks_requires_manual_intervention ON data_integrity_checks(requires_manual_intervention);
CREATE INDEX IF NOT EXISTS idx_data_integrity_checks_check_started_at ON data_integrity_checks(check_started_at DESC);
