/*
  # Erasure Requests Table (Phase 33)

  ## Purpose
  Tracks erasure requests (right-to-erasure).
  Identity verification REQUIRED, Scope clearly defined, Jurisdiction evaluated, Outcome communicated clearly.

  ## New Tables
  - `erasure_requests`
    - `id` (uuid, primary key)
    - `request_id` (text) - Unique request identifier
    - `requester_id` (uuid, FK to user_profiles) - Who requested
    - `requester_identity_verified` (boolean) - Identity verification status (REQUIRED)
    - `identity_verification_method` (text) - Verification method
    - `identity_verified_by` (uuid, FK to user_profiles, nullable) - Who verified
    - `identity_verified_at` (timestamptz, nullable) - When verified
    - `request_scope` (text) - SPECIFIC_RECORD, ALL_MY_DATA, RESIDENT_DATA
    - `scope_details` (jsonb) - Detailed scope specification
    - `jurisdiction_country` (text) - Jurisdiction country
    - `jurisdiction_state` (text, nullable) - Jurisdiction state
    - `jurisdiction_allows_erasure` (boolean) - Does jurisdiction allow erasure
    - `request_status` (text) - PENDING_VERIFICATION, UNDER_REVIEW, APPROVED, REJECTED, COMPLETED, BLOCKED
    - `blocked_reason` (text, nullable) - Reason if blocked
    - `approval_decision` (text, nullable) - Approval decision details
    - `approved_by` (uuid, FK to user_profiles, nullable) - Who approved
    - `approved_at` (timestamptz, nullable) - When approved
    - `completed_at` (timestamptz, nullable) - When completed
    - `records_identified_count` (integer) - Number of records identified
    - `records_erased_count` (integer) - Number of records erased
    - `records_blocked_count` (integer) - Number of records blocked from erasure
    - `outcome_communicated_at` (timestamptz, nullable) - When outcome communicated
    - `outcome_communication_method` (text, nullable) - Communication method
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Request Scope
  1. SPECIFIC_RECORD - Specific record
  2. ALL_MY_DATA - All requester's data
  3. RESIDENT_DATA - All resident data (family/legal representative)

  ## Request Status
  1. PENDING_VERIFICATION - Awaiting identity verification
  2. UNDER_REVIEW - Under review
  3. APPROVED - Approved for erasure
  4. REJECTED - Rejected
  5. COMPLETED - Erasure completed
  6. BLOCKED - Blocked by legal hold or other constraint

  ## Security
  - RLS enabled
  - Identity verification REQUIRED
  - Complete audit trail

  ## Enforcement Rules
  1. Identity verification REQUIRED
  2. Scope clearly defined
  3. Jurisdiction evaluated
  4. Outcome communicated clearly
  5. No silent rejection
  6. Erasure MAY occur ONLY if: Jurisdiction allows, Data category permits, No legal hold, No audit dependency
  7. If ANY condition fails → BLOCK erasure
*/

CREATE TABLE IF NOT EXISTS erasure_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id text NOT NULL UNIQUE,
  requester_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  requester_identity_verified boolean NOT NULL DEFAULT false,
  identity_verification_method text,
  identity_verified_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  identity_verified_at timestamptz,
  request_scope text NOT NULL CHECK (request_scope IN ('SPECIFIC_RECORD', 'ALL_MY_DATA', 'RESIDENT_DATA')),
  scope_details jsonb NOT NULL DEFAULT '{}',
  jurisdiction_country text NOT NULL,
  jurisdiction_state text,
  jurisdiction_allows_erasure boolean NOT NULL DEFAULT false,
  request_status text NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (request_status IN ('PENDING_VERIFICATION', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED', 'BLOCKED')),
  blocked_reason text,
  approval_decision text,
  approved_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  approved_at timestamptz,
  completed_at timestamptz,
  records_identified_count integer NOT NULL DEFAULT 0,
  records_erased_count integer NOT NULL DEFAULT 0,
  records_blocked_count integer NOT NULL DEFAULT 0,
  outcome_communicated_at timestamptz,
  outcome_communication_method text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE erasure_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_erasure_requests_request_id ON erasure_requests(request_id);
CREATE INDEX IF NOT EXISTS idx_erasure_requests_requester_id ON erasure_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_erasure_requests_request_status ON erasure_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_erasure_requests_requester_identity_verified ON erasure_requests(requester_identity_verified);
CREATE INDEX IF NOT EXISTS idx_erasure_requests_jurisdiction_country ON erasure_requests(jurisdiction_country);
CREATE INDEX IF NOT EXISTS idx_erasure_requests_created_at ON erasure_requests(created_at DESC);
