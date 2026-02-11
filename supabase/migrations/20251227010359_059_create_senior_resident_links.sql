/*
  # Create Senior-Resident Links Table (Phase 14)

  1. New Table
    - `senior_resident_links` - Links senior users to their own resident record
    - Ensures a senior can only see their own data
    - Similar to family_resident_links structure

  2. Columns
    - `id` (uuid, primary key)
    - `senior_user_id` (uuid, references user_profiles.id)
    - `resident_id` (uuid, references residents.id)
    - `status` (text, 'active' or 'inactive')
    - `created_at` (timestamptz)
    - `created_by` (uuid, references user_profiles.id)

  3. Constraints
    - Unique constraint on (senior_user_id, resident_id)
    - One senior can only be linked to one resident (typically themselves)

  4. Security
    - Enable RLS
    - Seniors can view their own link only
    - Agency admins can manage links
*/

-- Create senior_resident_links table
CREATE TABLE IF NOT EXISTS senior_resident_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  senior_user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id),
  UNIQUE(senior_user_id, resident_id)
);

-- Enable RLS
ALTER TABLE senior_resident_links ENABLE ROW LEVEL SECURITY;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_senior_resident_links_senior_user ON senior_resident_links(senior_user_id);
CREATE INDEX IF NOT EXISTS idx_senior_resident_links_resident ON senior_resident_links(resident_id);