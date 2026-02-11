/*
  # Agency Notification Policy Table (Phase 22)

  ## Purpose
  Agency-level notification policy that overrides user preferences.
  Agency guardrails override all user preferences.
  Overrides are silent and automatic.

  ## New Tables
  - `agency_notification_policy`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency
    - `mandatory_alert_types` (text[]) - alert types that are mandatory
    - `emergency_channels` (text[]) - channels forced for emergencies
    - `critical_channels` (text[]) - channels forced for critical alerts
    - `allow_quiet_hours` (boolean) - whether quiet hours are allowed
    - `max_suppression_hours` (integer) - max hours alerts can be suppressed
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Only agency admins can update
  - Policy automatically enforced on all notifications

  ## Enforcement Rules
  1. Agency guardrails override all user preferences
  2. Overrides are silent and automatic
  3. No UI may expose control that violates policy
  4. All changes audited
*/

CREATE TABLE IF NOT EXISTS agency_notification_policy (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL UNIQUE REFERENCES agencies(id) ON DELETE CASCADE,
  mandatory_alert_types text[] NOT NULL DEFAULT '{"EMERGENCY", "CRITICAL"}',
  emergency_channels text[] NOT NULL DEFAULT '{"IN_APP", "PUSH", "SMS"}',
  critical_channels text[] NOT NULL DEFAULT '{"IN_APP", "PUSH"}',
  allow_quiet_hours boolean NOT NULL DEFAULT false,
  max_suppression_hours integer NOT NULL DEFAULT 0 CHECK (max_suppression_hours >= 0 AND max_suppression_hours <= 24),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE agency_notification_policy ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_agency_notification_policy_agency_id ON agency_notification_policy(agency_id);
