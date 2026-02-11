/*
  # Retention Audit Log Table (Phase 33)

  ## Purpose
  Immutable audit trail for all retention, archival, and erasure events.
  Complete traceability for compliance and legal requirements.

  ## New Tables
  - `retention_audit_log`
    - `id` (uuid, primary key)
    - `event_id` (text) - Unique event identifier
    - `event_type` (text) - POLICY_CREATED, POLICY_LOCKED, ARCHIVAL, ERASURE_REQUESTED, ERASURE_APPROVED, ERASURE_BLOCKED, ERASURE_COMPLETED, LEGAL_HOLD_APPLIED, LEGAL_HOLD_RELEASED
    - `record_id` (uuid, nullable) - Affected record
    - `record_table` (text, nullable) - Source table
    - `data_category` (text, nullable) - Data category
    - `action` (text) - ARCHIVE, ERASE, BLOCK
    - `legal_basis` (text) - Legal basis for action
    - `actor_id` (uuid, FK to user_profiles, nullable) - Who performed action (null for system)
    - `actor_type` (text) - USER, SYSTEM
    - `timestamp` (timestamptz) - When event occurred
    - `event_details` (jsonb) - Event details
    - `related_request_id` (text, nullable) - Related erasure request ID
    - `related_hold_id` (text, nullable) - Related legal hold ID
    - `created_at` (timestamptz)

  ## Event Types
  1. POLICY_CREATED - Retention policy created
  2. POLICY_LOCKED - Retention policy locked
  3. ARCHIVAL - Record archived
  4. ERASURE_REQUESTED - Erasure requested
  5. ERASURE_APPROVED - Erasure approved
  6. ERASURE_BLOCKED - Erasure blocked
  7. ERASURE_COMPLETED - Erasure completed
  8. LEGAL_HOLD_APPLIED - Legal hold applied
  9. LEGAL_HOLD_RELEASED - Legal hold released

  ## Action Values
  1. ARCHIVE - Archive action
  2. ERASE - Erase action
  3. BLOCK - Block action

  ## Actor Types
  1. USER - Action performed by user
  2. SYSTEM - Action performed by system

  ## Security
  - RLS enabled
  - Immutable (append-only)
  - Complete audit trail

  ## Enforcement Rules
  1. Every retention, archival, or erasure event MUST log: Record ID, Data category, Action (ARCHIVE/ERASE/BLOCK), Legal basis, Actor, Timestamp
  2. Audit logs are immutable
*/

CREATE TABLE IF NOT EXISTS retention_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text NOT NULL UNIQUE,
  event_type text NOT NULL CHECK (event_type IN ('POLICY_CREATED', 'POLICY_LOCKED', 'ARCHIVAL', 'ERASURE_REQUESTED', 'ERASURE_APPROVED', 'ERASURE_BLOCKED', 'ERASURE_COMPLETED', 'LEGAL_HOLD_APPLIED', 'LEGAL_HOLD_RELEASED')),
  record_id uuid,
  record_table text,
  data_category text CHECK (data_category IN ('MEDICAL_RECORD', 'CARE_LOG', 'ATTENDANCE_RECORD', 'FINANCIAL_RECORD', 'COMMUNICATION_RECORD', 'AUDIT_RECORD', 'SYSTEM_LOG')),
  action text CHECK (action IN ('ARCHIVE', 'ERASE', 'BLOCK')),
  legal_basis text NOT NULL,
  actor_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  actor_type text NOT NULL CHECK (actor_type IN ('USER', 'SYSTEM')),
  timestamp timestamptz NOT NULL DEFAULT now(),
  event_details jsonb NOT NULL DEFAULT '{}',
  related_request_id text,
  related_hold_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE retention_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_retention_audit_log_event_id ON retention_audit_log(event_id);
CREATE INDEX IF NOT EXISTS idx_retention_audit_log_event_type ON retention_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_retention_audit_log_record_table ON retention_audit_log(record_table);
CREATE INDEX IF NOT EXISTS idx_retention_audit_log_record_id ON retention_audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_retention_audit_log_data_category ON retention_audit_log(data_category);
CREATE INDEX IF NOT EXISTS idx_retention_audit_log_action ON retention_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_retention_audit_log_actor_id ON retention_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_retention_audit_log_timestamp ON retention_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_retention_audit_log_related_request_id ON retention_audit_log(related_request_id);
CREATE INDEX IF NOT EXISTS idx_retention_audit_log_related_hold_id ON retention_audit_log(related_hold_id);
