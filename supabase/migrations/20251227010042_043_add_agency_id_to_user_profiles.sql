/*
  # Add Agency ID to User Profiles

  ## Purpose
  Links users to their managing agency for multi-tenant access control.
  Enables agency-scoped user management and permission enforcement.

  ## Changes
  - Add `agency_id` column to `user_profiles` table
    - References agencies(id)
    - Nullable (allows system users without agency)
    - Indexed for query performance
    - Cascade on agency deletion (rare, use archive instead)

  ## Security
  - Maintains existing RLS policies
  - Agency affiliation checked via permission system
  - No automatic assignment on insert

  ## Important Notes
  1. Existing users will have NULL agency_id (system users)
  2. New users MUST be assigned agency_id via invite_user RPC
  3. Agency changes are auditable via existing trigger
  4. SUPER_ADMIN users may have NULL agency_id
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'agency_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_profiles_agency_id ON user_profiles(agency_id);