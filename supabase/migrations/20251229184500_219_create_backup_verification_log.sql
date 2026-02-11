/*
  # Backup Verification Log Table (Phase 32)

  ## Purpose
  Tracks backup verification and recovery drill results.
  Ensures backups are restorable.

  ## New Tables
  - `backup_verification_log`
    - `id` (uuid, primary key)
    - `backup_id` (text, FK to backup_manifest) - Associated backup
    - `verification_type` (text) - INTEGRITY_CHECK, RESTORE_TEST, RECOVERY_DRILL
    - `verification_status` (text) - IN_PROGRESS, PASSED, FAILED
    - `verification_started_at` (timestamptz) - Start time
    - `verification_completed_at` (timestamptz, nullable) - Completion time
    - `checksum_verified` (boolean) - Was checksum verified
    - `restore_tested` (boolean) - Was restore tested
    - `restore_duration_seconds` (integer, nullable) - Restore duration
    - `verification_errors` (text[], nullable) - List of errors
    - `verification_details` (jsonb) - Verification details
    - `verified_by` (uuid, FK to user_profiles, nullable) - Who verified
    - `created_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Verification Types
  1. INTEGRITY_CHECK - Verify backup integrity (checksum)
  2. RESTORE_TEST - Test backup restore
  3. RECOVERY_DRILL - Full recovery drill

  ## Verification Status
  1. IN_PROGRESS - Verification in progress
  2. PASSED - Verification passed
  3. FAILED - Verification failed

  ## Security
  - RLS enabled
  - Admin access only
  - Immutable audit trail

  ## Enforcement Rules
  1. Backup integrity verification required
  2. Recovery drills (test restores) required
  3. All verification attempts MUST be logged
*/

CREATE TABLE IF NOT EXISTS backup_verification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id text NOT NULL,
  verification_type text NOT NULL CHECK (verification_type IN ('INTEGRITY_CHECK', 'RESTORE_TEST', 'RECOVERY_DRILL')),
  verification_status text NOT NULL DEFAULT 'IN_PROGRESS' CHECK (verification_status IN ('IN_PROGRESS', 'PASSED', 'FAILED')),
  verification_started_at timestamptz NOT NULL DEFAULT now(),
  verification_completed_at timestamptz,
  checksum_verified boolean NOT NULL DEFAULT false,
  restore_tested boolean NOT NULL DEFAULT false,
  restore_duration_seconds integer,
  verification_errors text[],
  verification_details jsonb NOT NULL DEFAULT '{}',
  verified_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE backup_verification_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_backup_verification_log_backup_id ON backup_verification_log(backup_id);
CREATE INDEX IF NOT EXISTS idx_backup_verification_log_verification_type ON backup_verification_log(verification_type);
CREATE INDEX IF NOT EXISTS idx_backup_verification_log_verification_status ON backup_verification_log(verification_status);
CREATE INDEX IF NOT EXISTS idx_backup_verification_log_verification_started_at ON backup_verification_log(verification_started_at DESC);
CREATE INDEX IF NOT EXISTS idx_backup_verification_log_verified_by ON backup_verification_log(verified_by);
