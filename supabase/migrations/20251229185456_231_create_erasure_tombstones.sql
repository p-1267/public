/*
  # Erasure Tombstones Table (Phase 33)

  ## Purpose
  Immutable tombstone records proving erasure execution.
  Original content MUST NOT be recoverable.

  ## New Tables
  - `erasure_tombstones`
    - `id` (uuid, primary key)
    - `tombstone_id` (text) - Unique tombstone identifier
    - `erasure_request_id` (text, FK to erasure_requests) - Associated request
    - `record_id` (uuid) - Original record ID
    - `record_table` (text) - Original record table
    - `data_category` (text) - Data category
    - `erasure_method` (text) - CRYPTOGRAPHIC_DESTRUCTION, OVERWRITE, DELETION
    - `erasure_reason` (text) - Reason for erasure
    - `legal_basis` (text) - Legal basis (GDPR Article 17, CCPA, etc.)
    - `erased_by` (uuid, FK to user_profiles) - Who performed erasure
    - `erased_at` (timestamptz) - When erased
    - `verification_hash` (text) - Hash proving erasure
    - `is_recoverable` (boolean) - Is original content recoverable (MUST be false)
    - `metadata` (jsonb) - additional data (no PII)

  ## Erasure Method
  1. CRYPTOGRAPHIC_DESTRUCTION - Cryptographic key destruction
  2. OVERWRITE - Secure overwrite
  3. DELETION - Standard deletion

  ## Security
  - RLS enabled
  - Immutable (append-only)
  - Original content MUST NOT be recoverable

  ## Enforcement Rules
  1. Record is cryptographically destroyed
  2. Tombstone record created
  3. Erasure reason logged
  4. Actor logged
  5. Timestamp logged
  6. Original content MUST NOT be recoverable (is_recoverable = false)
*/

CREATE TABLE IF NOT EXISTS erasure_tombstones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tombstone_id text NOT NULL UNIQUE,
  erasure_request_id text,
  record_id uuid NOT NULL,
  record_table text NOT NULL,
  data_category text NOT NULL CHECK (data_category IN ('MEDICAL_RECORD', 'CARE_LOG', 'ATTENDANCE_RECORD', 'FINANCIAL_RECORD', 'COMMUNICATION_RECORD', 'AUDIT_RECORD', 'SYSTEM_LOG')),
  erasure_method text NOT NULL CHECK (erasure_method IN ('CRYPTOGRAPHIC_DESTRUCTION', 'OVERWRITE', 'DELETION')),
  erasure_reason text NOT NULL,
  legal_basis text NOT NULL,
  erased_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  erased_at timestamptz NOT NULL DEFAULT now(),
  verification_hash text NOT NULL,
  is_recoverable boolean NOT NULL DEFAULT false CHECK (is_recoverable = false),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE erasure_tombstones ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_erasure_tombstones_tombstone_id ON erasure_tombstones(tombstone_id);
CREATE INDEX IF NOT EXISTS idx_erasure_tombstones_erasure_request_id ON erasure_tombstones(erasure_request_id);
CREATE INDEX IF NOT EXISTS idx_erasure_tombstones_record_table ON erasure_tombstones(record_table);
CREATE INDEX IF NOT EXISTS idx_erasure_tombstones_record_id ON erasure_tombstones(record_id);
CREATE INDEX IF NOT EXISTS idx_erasure_tombstones_data_category ON erasure_tombstones(data_category);
CREATE INDEX IF NOT EXISTS idx_erasure_tombstones_erased_at ON erasure_tombstones(erased_at DESC);
CREATE INDEX IF NOT EXISTS idx_erasure_tombstones_erased_by ON erasure_tombstones(erased_by);
