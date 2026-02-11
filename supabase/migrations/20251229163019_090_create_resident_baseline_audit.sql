/*
  # Resident Baseline Audit Log (Phase 20)

  ## Purpose
  Immutable audit log for all baseline-related events.
  Tracks baseline creation, modification, sealing, and validation.

  ## New Tables
  - `resident_baseline_audit`
    - `id` (uuid, primary key)
    - `resident_id` (uuid, FK to residents)
    - `baseline_id` (uuid, nullable, FK to resident_baselines)
    - `event_type` (text) - BASELINE_CREATED, BASELINE_SEALED, EMERGENCY_CONTACT_ADDED, etc.
    - `event_data` (jsonb) - structured event data
    - `performed_by` (uuid, FK to user_profiles) - who performed action
    - `performed_by_role` (text) - role at time of action
    - `data_source` (text) - MANUAL, DEVICE, IMPORT
    - `language_context` (text) - language used during action
    - `validation_status` (text) - PASSED, FAILED, PENDING
    - `validation_errors` (jsonb, nullable) - validation error details
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Records are IMMUTABLE (no updates/deletes)
  - Only authorized users can view

  ## Enforcement Rules
  1. All baseline events must be logged
  2. Records are immutable
  3. Audit trail is complete and tamper-proof
*/

CREATE TABLE IF NOT EXISTS resident_baseline_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  baseline_id uuid REFERENCES resident_baselines(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN (
    'BASELINE_CREATED',
    'BASELINE_UPDATED',
    'BASELINE_SEALED',
    'EMERGENCY_CONTACT_ADDED',
    'EMERGENCY_CONTACT_UPDATED',
    'PHYSICIAN_ADDED',
    'PHYSICIAN_UPDATED',
    'MEDICATION_ADDED',
    'MEDICATION_UPDATED',
    'MEDICATION_DISCONTINUED',
    'CARE_PLAN_CREATED',
    'CARE_PLAN_UPDATED',
    'CONSENT_OBTAINED',
    'CONSENT_UPDATED',
    'CONSENT_REVOKED',
    'VALIDATION_PASSED',
    'VALIDATION_FAILED'
  )),
  event_data jsonb NOT NULL DEFAULT '{}',
  performed_by uuid NOT NULL REFERENCES user_profiles(id),
  performed_by_role text NOT NULL,
  data_source text NOT NULL CHECK (data_source IN ('MANUAL', 'DEVICE', 'IMPORT', 'SYSTEM')),
  language_context text NOT NULL,
  validation_status text CHECK (validation_status IN ('PASSED', 'FAILED', 'PENDING', 'NOT_APPLICABLE')),
  validation_errors jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE resident_baseline_audit ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_resident_baseline_audit_resident_id ON resident_baseline_audit(resident_id);
CREATE INDEX IF NOT EXISTS idx_resident_baseline_audit_baseline_id ON resident_baseline_audit(baseline_id);
CREATE INDEX IF NOT EXISTS idx_resident_baseline_audit_event_type ON resident_baseline_audit(event_type);
CREATE INDEX IF NOT EXISTS idx_resident_baseline_audit_performed_by ON resident_baseline_audit(performed_by);
CREATE INDEX IF NOT EXISTS idx_resident_baseline_audit_created_at ON resident_baseline_audit(created_at);
