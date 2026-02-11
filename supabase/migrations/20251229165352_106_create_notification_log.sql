/*
  # Notification Log Table (Phase 22)

  ## Purpose
  Immutable log of all notifications sent.
  Tracks delivery, policy overrides, and user interactions.

  ## New Tables
  - `notification_log`
    - `id` (uuid, primary key)
    - `resident_id` (uuid, FK to residents) - relevant resident
    - `recipient_user_id` (uuid, FK to user_profiles) - notification recipient
    - `notification_type` (text) - EMERGENCY, CRITICAL, IMPORTANT, INFORMATIONAL
    - `alert_type` (text) - specific alert type (e.g., FALL_DETECTED)
    - `message` (text) - notification message
    - `delivery_channels` (text[]) - channels used for delivery
    - `suppressed_by_preference` (boolean) - was it suppressed by user pref
    - `overridden_by_policy` (boolean) - was preference overridden by policy
    - `policy_override_reason` (text, nullable) - why policy overrode
    - `delivered_at` (timestamptz) - when delivered
    - `read_at` (timestamptz, nullable) - when read by user
    - `created_at` (timestamptz)

  ## Notification Types & Priority (Brain-Owned)
  - EMERGENCY: Immediate, multi-channel, cannot be suppressed
  - CRITICAL: Immediate, policy-controlled channels
  - IMPORTANT: Respect preferences within policy
  - INFORMATIONAL: Fully preference-controlled

  ## Security
  - RLS enabled
  - Immutable (append-only)
  - Complete delivery audit trail

  ## Enforcement Rules
  1. EMERGENCY: Immediate, multi-channel, cannot be suppressed
  2. CRITICAL: Immediate, policy-controlled channels
  3. IMPORTANT: Respect preferences within policy
  4. INFORMATIONAL: Fully preference-controlled
*/

CREATE TABLE IF NOT EXISTS notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  recipient_user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  notification_type text NOT NULL CHECK (notification_type IN ('EMERGENCY', 'CRITICAL', 'IMPORTANT', 'INFORMATIONAL')),
  alert_type text NOT NULL,
  message text NOT NULL,
  delivery_channels text[] NOT NULL,
  suppressed_by_preference boolean NOT NULL DEFAULT false,
  overridden_by_policy boolean NOT NULL DEFAULT false,
  policy_override_reason text,
  delivered_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notification_log_resident_id ON notification_log(resident_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_recipient_user_id ON notification_log(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_notification_log_notification_type ON notification_log(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_log_delivered_at ON notification_log(delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_log_read_at ON notification_log(read_at) WHERE read_at IS NULL;
