/*
  # Backup Manifest Table (Phase 32)

  ## Purpose
  Tracks all automated backups for disaster recovery.
  Supports point-in-time recovery and backup verification.

  ## New Tables
  - `backup_manifest`
    - `id` (uuid, primary key)
    - `backup_id` (text) - Unique backup identifier
    - `backup_type` (text) - FULL, INCREMENTAL, DIFFERENTIAL
    - `backup_scope` (text) - DATABASE, FILES, CONFIGURATION, ALL
    - `backup_timestamp` (timestamptz) - When backup was taken
    - `backup_size_bytes` (bigint) - Backup size
    - `backup_location` (text) - Backup storage location
    - `backup_checksum` (text) - Backup checksum
    - `encryption_enabled` (boolean) - Is backup encrypted (MUST be true)
    - `encryption_algorithm` (text) - Encryption algorithm
    - `is_isolated` (boolean) - Is backup isolated from production (MUST be true)
    - `retention_days` (integer) - Retention period
    - `expires_at` (timestamptz) - Expiration timestamp
    - `backup_status` (text) - IN_PROGRESS, COMPLETED, FAILED, VERIFIED
    - `verification_status` (text, nullable) - PENDING, PASSED, FAILED
    - `verified_at` (timestamptz, nullable) - When backup was verified
    - `can_restore_from` (boolean) - Can restore from this backup
    - `created_by` (uuid, FK to user_profiles, nullable) - Who triggered (null for auto)
    - `created_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Backup Types
  1. FULL - Full backup
  2. INCREMENTAL - Incremental backup
  3. DIFFERENTIAL - Differential backup

  ## Backup Scope
  1. DATABASE - Database backup
  2. FILES - File backup
  3. CONFIGURATION - Configuration backup
  4. ALL - Complete system backup

  ## Backup Status
  1. IN_PROGRESS - Backup in progress
  2. COMPLETED - Backup completed
  3. FAILED - Backup failed
  4. VERIFIED - Backup verified

  ## Security
  - RLS enabled
  - Admin access only
  - Backups MUST be encrypted and isolated

  ## Enforcement Rules
  1. Regular automated backups
  2. Point-in-time recovery support
  3. Backup integrity verification
  4. Recovery drills (test restores)
  5. Backups MUST be encrypted and isolated
*/

CREATE TABLE IF NOT EXISTS backup_manifest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id text NOT NULL UNIQUE,
  backup_type text NOT NULL CHECK (backup_type IN ('FULL', 'INCREMENTAL', 'DIFFERENTIAL')),
  backup_scope text NOT NULL CHECK (backup_scope IN ('DATABASE', 'FILES', 'CONFIGURATION', 'ALL')),
  backup_timestamp timestamptz NOT NULL DEFAULT now(),
  backup_size_bytes bigint NOT NULL DEFAULT 0,
  backup_location text NOT NULL,
  backup_checksum text NOT NULL,
  encryption_enabled boolean NOT NULL DEFAULT true,
  encryption_algorithm text NOT NULL DEFAULT 'AES-256-GCM',
  is_isolated boolean NOT NULL DEFAULT true,
  retention_days integer NOT NULL DEFAULT 90,
  expires_at timestamptz NOT NULL,
  backup_status text NOT NULL DEFAULT 'IN_PROGRESS' CHECK (backup_status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED', 'VERIFIED')),
  verification_status text CHECK (verification_status IN ('PENDING', 'PASSED', 'FAILED')),
  verified_at timestamptz,
  can_restore_from boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE backup_manifest ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_backup_manifest_backup_id ON backup_manifest(backup_id);
CREATE INDEX IF NOT EXISTS idx_backup_manifest_backup_type ON backup_manifest(backup_type);
CREATE INDEX IF NOT EXISTS idx_backup_manifest_backup_timestamp ON backup_manifest(backup_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_backup_manifest_backup_status ON backup_manifest(backup_status);
CREATE INDEX IF NOT EXISTS idx_backup_manifest_verification_status ON backup_manifest(verification_status);
CREATE INDEX IF NOT EXISTS idx_backup_manifest_can_restore_from ON backup_manifest(can_restore_from);
CREATE INDEX IF NOT EXISTS idx_backup_manifest_expires_at ON backup_manifest(expires_at);
