/*
  # Family Notification Preferences Table (Phase 22)

  ## Purpose
  Notification preferences for family members.
  Critical and emergency alerts IGNORE quiet hours.
  Family CANNOT disable emergency notifications.

  ## New Tables
  - `family_notification_preferences`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK to user_profiles) - family member
    - `resident_id` (uuid, FK to residents) - which resident
    - `quiet_hours_start` (time, nullable) - quiet hours start time
    - `quiet_hours_end` (time, nullable) - quiet hours end time
    - `channel_in_app` (boolean) - in-app notifications
    - `channel_push` (boolean) - push notifications
    - `channel_sms` (boolean) - SMS notifications
    - `channel_email` (boolean) - email notifications (non-critical only)
    - `summary_frequency` (text) - DAILY, WEEKLY, NONE
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Agency policy overrides user preferences
  - Emergency alerts ignore all preferences

  ## Enforcement Rules
  1. Critical and emergency alerts IGNORE quiet hours
  2. Agency policy sets minimum alert visibility
  3. Family CANNOT disable emergency notifications
  4. All changes audited
*/

CREATE TABLE IF NOT EXISTS family_notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  quiet_hours_start time,
  quiet_hours_end time,
  channel_in_app boolean NOT NULL DEFAULT true,
  channel_push boolean NOT NULL DEFAULT true,
  channel_sms boolean NOT NULL DEFAULT false,
  channel_email boolean NOT NULL DEFAULT false,
  summary_frequency text NOT NULL DEFAULT 'DAILY' CHECK (summary_frequency IN ('DAILY', 'WEEKLY', 'NONE')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, resident_id)
);

ALTER TABLE family_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_family_notification_preferences_user_id ON family_notification_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_family_notification_preferences_resident_id ON family_notification_preferences(resident_id);
