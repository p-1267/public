/*
  # Announcements Table (Phase 26)

  ## Purpose
  Agency-wide announcements with role-based targeting.
  Mandatory acknowledgment tracking.

  ## New Tables
  - `announcements`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency context
    - `created_by` (uuid, FK to user_profiles) - who created
    - `title` (text) - announcement title
    - `content` (text) - announcement content
    - `target_roles` (text[]) - array of role names
    - `requires_acknowledgment` (boolean) - must be acknowledged
    - `priority` (text) - LOW, NORMAL, HIGH, URGENT
    - `expires_at` (timestamptz, nullable) - expiration date
    - `created_at` (timestamptz)
    - `is_active` (boolean) - active status
    - `metadata` (jsonb)

  ## Security
  - RLS enabled
  - Agency Admins only
  - Role-based targeting

  ## Enforcement Rules
  1. Agency Admins MAY create announcements
  2. Target audience defined (role-based)
  3. Mandatory acknowledgment option
  4. Expiration date supported
  5. Acknowledgment status MUST be tracked
*/

CREATE TABLE IF NOT EXISTS announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  content text NOT NULL,
  target_roles text[] NOT NULL DEFAULT '{}',
  requires_acknowledgment boolean NOT NULL DEFAULT false,
  priority text NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_announcements_agency_id ON announcements(agency_id);
CREATE INDEX IF NOT EXISTS idx_announcements_created_by ON announcements(created_by);
CREATE INDEX IF NOT EXISTS idx_announcements_target_roles ON announcements USING GIN(target_roles);
CREATE INDEX IF NOT EXISTS idx_announcements_expires_at ON announcements(expires_at);
CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON announcements(is_active);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements(created_at DESC);
