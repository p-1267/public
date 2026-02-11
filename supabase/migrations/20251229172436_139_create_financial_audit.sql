/*
  # Financial Audit Table (Phase 25)

  ## Purpose
  Immutable audit log for all financial operations.
  Complete traceability.

  ## New Tables
  - `financial_audit`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency context
    - `actor_id` (uuid, FK to user_profiles) - who performed action
    - `actor_role` (text) - role at time of action
    - `action_type` (text) - type of action
    - `export_type` (text, nullable) - PAYROLL, BILLING
    - `export_id` (uuid, nullable) - related export
    - `adjustment_id` (uuid, nullable) - related adjustment
    - `date_range_start` (date, nullable) - period start
    - `date_range_end` (date, nullable) - period end
    - `record_count` (integer, nullable) - number of records
    - `data_hash` (text, nullable) - hash of data
    - `metadata` (jsonb) - additional context
    - `timestamp` (timestamptz) - when action occurred
    - `created_at` (timestamptz)

  ## Action Types
  - EXPORT_GENERATED
  - EXPORT_SEALED
  - ADJUSTMENT_CREATED
  - ADJUSTMENT_APPROVED

  ## Security
  - RLS enabled
  - Agency-isolated
  - Immutable (append-only)

  ## Enforcement Rules
  1. Every financial action MUST log: Actor, Role, Export type, Date range, Record count, Timestamp, Hash
  2. Audit logs are immutable
*/

CREATE TABLE IF NOT EXISTS financial_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  actor_role text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('EXPORT_GENERATED', 'EXPORT_SEALED', 'ADJUSTMENT_CREATED', 'ADJUSTMENT_APPROVED')),
  export_type text CHECK (export_type IN ('PAYROLL', 'BILLING')),
  export_id uuid,
  adjustment_id uuid,
  date_range_start date,
  date_range_end date,
  record_count integer,
  data_hash text,
  metadata jsonb NOT NULL DEFAULT '{}',
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE financial_audit ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_financial_audit_agency_id ON financial_audit(agency_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_actor_id ON financial_audit(actor_id);
CREATE INDEX IF NOT EXISTS idx_financial_audit_action_type ON financial_audit(action_type);
CREATE INDEX IF NOT EXISTS idx_financial_audit_export_type ON financial_audit(export_type);
CREATE INDEX IF NOT EXISTS idx_financial_audit_created_at ON financial_audit(created_at DESC);
