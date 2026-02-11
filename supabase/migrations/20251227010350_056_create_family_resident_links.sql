/*
  # Family-Resident Links Table

  1. Purpose
    - Links FAMILY_VIEWER users to specific residents
    - Enables explicit, auditable access control for family members
    - Supports read-only trust visibility (Phase 13)

  2. New Tables
    - `family_resident_links`
      - `id` (uuid, primary key) - unique link identifier
      - `family_user_id` (uuid, FK → user_profiles.id) - family member
      - `resident_id` (uuid, FK → residents.id) - linked resident
      - `status` (text) - active or revoked
      - `created_at` (timestamptz) - link creation timestamp
      - `created_by` (uuid, FK → user_profiles.id) - who created the link

  3. Relationships
    - One family user can view multiple residents
    - One resident can have multiple family viewers
    - No implicit access
    - Soft delete via status field (no physical deletes)

  4. Security
    - RLS enabled
    - Only AGENCY_ADMIN can create/revoke links
    - FAMILY_VIEWER has read-only access to their own links
    - All changes audited
*/

CREATE TABLE IF NOT EXISTS family_resident_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id),
  CONSTRAINT unique_family_resident UNIQUE (family_user_id, resident_id)
);

ALTER TABLE family_resident_links ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_family_resident_links_family_user ON family_resident_links(family_user_id);
CREATE INDEX IF NOT EXISTS idx_family_resident_links_resident ON family_resident_links(resident_id);
CREATE INDEX IF NOT EXISTS idx_family_resident_links_status ON family_resident_links(status);