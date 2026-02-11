/*
  # Accessibility Preference Audit Table (Phase 22)

  ## Purpose
  Immutable audit log for all preference and accessibility changes.
  Every preference change must be logged.

  ## New Tables
  - `accessibility_preference_audit`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK to user_profiles) - user making change
    - `user_role` (text) - role at time of change
    - `preference_type` (text) - ACCESSIBILITY, NOTIFICATION_PREFERENCE, NOTIFICATION_POLICY
    - `preference_key` (text) - specific setting changed
    - `previous_value` (jsonb) - value before change
    - `new_value` (jsonb) - value after change
    - `device_fingerprint` (text, nullable) - device identifier
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - Immutable (append-only)
  - Complete audit trail

  ## Enforcement Rules
  1. Every preference or accessibility change MUST log
  2. Log includes: Actor, Role, Previous value, New value, Timestamp, Device fingerprint
  3. Audit logs are immutable
*/

CREATE TABLE IF NOT EXISTS accessibility_preference_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  user_role text NOT NULL,
  preference_type text NOT NULL CHECK (preference_type IN ('ACCESSIBILITY', 'NOTIFICATION_PREFERENCE', 'NOTIFICATION_POLICY')),
  preference_key text NOT NULL,
  previous_value jsonb,
  new_value jsonb NOT NULL,
  device_fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE accessibility_preference_audit ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_accessibility_preference_audit_user_id ON accessibility_preference_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_accessibility_preference_audit_preference_type ON accessibility_preference_audit(preference_type);
CREATE INDEX IF NOT EXISTS idx_accessibility_preference_audit_created_at ON accessibility_preference_audit(created_at DESC);
