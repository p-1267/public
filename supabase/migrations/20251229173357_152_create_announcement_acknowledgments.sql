/*
  # Announcement Acknowledgments Table (Phase 26)

  ## Purpose
  Tracks who has acknowledged announcements.
  Required for compliance tracking.

  ## New Tables
  - `announcement_acknowledgments`
    - `id` (uuid, primary key)
    - `announcement_id` (uuid, FK to announcements) - announcement
    - `user_id` (uuid, FK to user_profiles) - who acknowledged
    - `acknowledged_at` (timestamptz) - when acknowledged
    - `device_fingerprint` (text, nullable) - device used
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - User can only acknowledge for themselves
  - Acknowledgment status tracked

  ## Enforcement Rules
  1. Acknowledgment status MUST be tracked
  2. Users acknowledge for themselves only
*/

CREATE TABLE IF NOT EXISTS announcement_acknowledgments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  announcement_id uuid NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  acknowledged_at timestamptz NOT NULL DEFAULT now(),
  device_fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

ALTER TABLE announcement_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_announcement_acknowledgments_announcement_id ON announcement_acknowledgments(announcement_id);
CREATE INDEX IF NOT EXISTS idx_announcement_acknowledgments_user_id ON announcement_acknowledgments(user_id);
CREATE INDEX IF NOT EXISTS idx_announcement_acknowledgments_acknowledged_at ON announcement_acknowledgments(acknowledged_at DESC);
