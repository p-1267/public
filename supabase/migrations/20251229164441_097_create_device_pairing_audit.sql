/*
  # Device Pairing Audit Table (Phase 21)

  ## Purpose
  Immutable audit log for device pairing flow.
  Tracks all steps of pairing process.

  ## New Tables
  - `device_pairing_audit`
    - `id` (uuid, primary key)
    - `device_id` (text) - device identifier
    - `resident_id` (uuid, FK to residents) - target resident
    - `pairing_session_id` (uuid) - groups pairing steps
    - `pairing_step` (text) - step in pairing flow
    - `step_status` (text) - SUCCESS, FAILED, PENDING
    - `step_data` (jsonb) - step-specific data
    - `performed_by` (uuid, FK to user_profiles) - who performed step
    - `performed_by_role` (text) - role at time of step
    - `error_message` (text, nullable) - error if step failed
    - `created_at` (timestamptz)

  ## Pairing Steps (STRICT ORDER)
  1. DISCOVERY - Device discovered
  2. IDENTITY_VERIFICATION - Device identity verified
  3. RESIDENT_BINDING - Device bound to resident
  4. CAPABILITY_DETECTION - Device capabilities detected
  5. TEST_SIGNAL - Test signal validated
  6. REGISTRATION_CONFIRMATION - Registration confirmed

  ## Security
  - RLS enabled
  - Immutable (append-only)
  - Complete audit trail

  ## Enforcement Rules
  1. No silent pairing
  2. No background pairing
  3. No auto-binding
  4. All steps logged
*/

CREATE TABLE IF NOT EXISTS device_pairing_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL,
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  pairing_session_id uuid NOT NULL,
  pairing_step text NOT NULL CHECK (pairing_step IN (
    'DISCOVERY',
    'IDENTITY_VERIFICATION',
    'RESIDENT_BINDING',
    'CAPABILITY_DETECTION',
    'TEST_SIGNAL',
    'REGISTRATION_CONFIRMATION'
  )),
  step_status text NOT NULL CHECK (step_status IN ('SUCCESS', 'FAILED', 'PENDING')),
  step_data jsonb NOT NULL DEFAULT '{}',
  performed_by uuid NOT NULL REFERENCES user_profiles(id),
  performed_by_role text NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE device_pairing_audit ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_device_pairing_audit_device_id ON device_pairing_audit(device_id);
CREATE INDEX IF NOT EXISTS idx_device_pairing_audit_resident_id ON device_pairing_audit(resident_id);
CREATE INDEX IF NOT EXISTS idx_device_pairing_audit_session_id ON device_pairing_audit(pairing_session_id);
CREATE INDEX IF NOT EXISTS idx_device_pairing_audit_performed_by ON device_pairing_audit(performed_by);
CREATE INDEX IF NOT EXISTS idx_device_pairing_audit_created_at ON device_pairing_audit(created_at DESC);
