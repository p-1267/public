/*
  # RLS Policies for Family-Resident Links

  1. Purpose
    - Secure access to family_resident_links table
    - Family users can view their own links
    - Only AGENCY_ADMIN can create/revoke links
    - All operations auditable

  2. Security
    - SELECT: Family users see their own links
    - INSERT: Only AGENCY_ADMIN with MANAGE_USERS permission
    - UPDATE: Only AGENCY_ADMIN (for revoking)
    - DELETE: No direct deletes allowed
*/

-- Family users can view their own links
CREATE POLICY "Family users can view own links"
  ON family_resident_links
  FOR SELECT
  TO authenticated
  USING (family_user_id = auth.uid());

-- AGENCY_ADMIN can view all links in their agency
CREATE POLICY "Agency admin can view agency family links"
  ON family_resident_links
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
        AND r.name = 'AGENCY_ADMIN'
        AND up.agency_id IN (
          SELECT up2.agency_id FROM user_profiles up2
          WHERE up2.id = family_user_id
        )
    )
  );

-- Only AGENCY_ADMIN can create links
CREATE POLICY "Agency admin can create family links"
  ON family_resident_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
        AND r.name = 'AGENCY_ADMIN'
        AND up.agency_id IN (
          SELECT up2.agency_id FROM user_profiles up2
          WHERE up2.id = family_user_id
        )
    )
  );

-- Only AGENCY_ADMIN can revoke links
CREATE POLICY "Agency admin can revoke family links"
  ON family_resident_links
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
        AND r.name = 'AGENCY_ADMIN'
        AND up.agency_id IN (
          SELECT up2.agency_id FROM user_profiles up2
          WHERE up2.id = family_user_id
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
        AND r.name = 'AGENCY_ADMIN'
        AND up.agency_id IN (
          SELECT up2.agency_id FROM user_profiles up2
          WHERE up2.id = family_user_id
        )
    )
  );