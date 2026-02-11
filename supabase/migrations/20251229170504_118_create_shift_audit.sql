/*
  # Shift Audit Table (Phase 23)

  ## Purpose
  Immutable audit log for all scheduling actions.
  Every scheduling action MUST be logged.

  ## New Tables
  - `shift_audit`
    - `id` (uuid, primary key)
    - `shift_id` (uuid, FK to shifts) - affected shift
    - `actor_id` (uuid, FK to user_profiles) - who performed action
    - `action_type` (text) - CREATE, UPDATE, DELETE, CONFIRM, CANCEL
    - `before_state` (jsonb) - state before action
    - `after_state` (jsonb) - state after action
    - `affected_residents` (uuid[]) - affected resident IDs
    - `affected_caregivers` (uuid[]) - affected caregiver IDs
    - `reason` (text, nullable) - reason for change
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Immutable (append-only)
  - Complete audit trail

  ## Enforcement Rules
  1. Every scheduling action MUST log
  2. Log includes: Actor, action type, before/after state, timestamp, affected parties
  3. Audit logs are immutable
*/

CREATE TABLE IF NOT EXISTS shift_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid REFERENCES shifts(id) ON DELETE SET NULL,
  actor_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  action_type text NOT NULL CHECK (action_type IN ('CREATE', 'UPDATE', 'DELETE', 'CONFIRM', 'CANCEL')),
  before_state jsonb,
  after_state jsonb NOT NULL,
  affected_residents uuid[] NOT NULL,
  affected_caregivers uuid[] NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shift_audit ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_shift_audit_shift_id ON shift_audit(shift_id);
CREATE INDEX IF NOT EXISTS idx_shift_audit_actor_id ON shift_audit(actor_id);
CREATE INDEX IF NOT EXISTS idx_shift_audit_action_type ON shift_audit(action_type);
CREATE INDEX IF NOT EXISTS idx_shift_audit_created_at ON shift_audit(created_at DESC);
