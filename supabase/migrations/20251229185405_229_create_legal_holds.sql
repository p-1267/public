/*
  # Legal Holds Table (Phase 33)

  ## Purpose
  Manages legal holds that override retention and erasure policies.
  If legal hold is active: Erasure is blocked, Archival may proceed.

  ## New Tables
  - `legal_holds`
    - `id` (uuid, primary key)
    - `hold_id` (text) - Unique hold identifier
    - `hold_reason` (text) - Reason for hold
    - `hold_authority` (text) - Legal authority (court order, investigation, etc.)
    - `hold_reference` (text) - Reference number (case number, etc.)
    - `record_id` (uuid, nullable) - Specific record (null for scope-based hold)
    - `record_table` (text, nullable) - Source table
    - `hold_scope` (text) - SPECIFIC_RECORD, RESIDENT, AGENCY, DATA_CATEGORY, ALL
    - `scope_identifier` (text, nullable) - Scope identifier (resident_id, agency_id, etc.)
    - `data_category` (text, nullable) - Specific data category if applicable
    - `hold_status` (text) - ACTIVE, RELEASED
    - `blocks_erasure` (boolean) - Does this hold block erasure
    - `blocks_archival` (boolean) - Does this hold block archival
    - `applied_by` (uuid, FK to user_profiles) - Who applied hold
    - `applied_at` (timestamptz) - When hold applied
    - `released_by` (uuid, FK to user_profiles, nullable) - Who released hold
    - `released_at` (timestamptz, nullable) - When hold released
    - `release_reason` (text, nullable) - Reason for release
    - `created_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Hold Scope
  1. SPECIFIC_RECORD - Specific record hold
  2. RESIDENT - All records for resident
  3. AGENCY - All records for agency
  4. DATA_CATEGORY - All records in category
  5. ALL - All records

  ## Hold Status
  1. ACTIVE - Hold is active
  2. RELEASED - Hold is released

  ## Security
  - RLS enabled
  - SUPER_ADMIN only
  - Immutable audit trail

  ## Enforcement Rules
  1. If legal hold is active: Erasure is blocked
  2. Archival may proceed
  3. Hold reason and authority logged
*/

CREATE TABLE IF NOT EXISTS legal_holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hold_id text NOT NULL UNIQUE,
  hold_reason text NOT NULL,
  hold_authority text NOT NULL,
  hold_reference text NOT NULL,
  record_id uuid,
  record_table text,
  hold_scope text NOT NULL CHECK (hold_scope IN ('SPECIFIC_RECORD', 'RESIDENT', 'AGENCY', 'DATA_CATEGORY', 'ALL')),
  scope_identifier text,
  data_category text CHECK (data_category IN ('MEDICAL_RECORD', 'CARE_LOG', 'ATTENDANCE_RECORD', 'FINANCIAL_RECORD', 'COMMUNICATION_RECORD', 'AUDIT_RECORD', 'SYSTEM_LOG')),
  hold_status text NOT NULL DEFAULT 'ACTIVE' CHECK (hold_status IN ('ACTIVE', 'RELEASED')),
  blocks_erasure boolean NOT NULL DEFAULT true,
  blocks_archival boolean NOT NULL DEFAULT false,
  applied_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  applied_at timestamptz NOT NULL DEFAULT now(),
  released_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  released_at timestamptz,
  release_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE legal_holds ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_legal_holds_hold_id ON legal_holds(hold_id);
CREATE INDEX IF NOT EXISTS idx_legal_holds_hold_scope ON legal_holds(hold_scope);
CREATE INDEX IF NOT EXISTS idx_legal_holds_scope_identifier ON legal_holds(scope_identifier);
CREATE INDEX IF NOT EXISTS idx_legal_holds_record_table ON legal_holds(record_table);
CREATE INDEX IF NOT EXISTS idx_legal_holds_record_id ON legal_holds(record_id);
CREATE INDEX IF NOT EXISTS idx_legal_holds_hold_status ON legal_holds(hold_status);
CREATE INDEX IF NOT EXISTS idx_legal_holds_data_category ON legal_holds(data_category);
CREATE INDEX IF NOT EXISTS idx_legal_holds_applied_at ON legal_holds(applied_at DESC);
