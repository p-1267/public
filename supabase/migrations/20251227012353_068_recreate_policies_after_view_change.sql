/*
  # Recreate RLS Policies After View Recreation

  1. Purpose
    - Recreate policies that were dropped by CASCADE when recreating user_effective_permissions view
    - These policies depend on the view to check permissions

  2. Policies Recreated
    - residents: INSERT and UPDATE policies for MANAGE_RESIDENTS permission
    - agencies: UPDATE policy for MANAGE_AGENCIES permission
    - family_resident_links: INSERT and UPDATE policies for MANAGE_FAMILY_LINKS permission
    - caregiver_assignments: INSERT and UPDATE policies for MANAGE_ASSIGNMENTS permission
    - senior_resident_links: ALL policy for MANAGE_SENIOR_LINKS permission

  3. Security
    - All policies reference user_effective_permissions view
    - Identical logic to original policies
    - No change to access control
*/

-- residents: Users can register residents with permission
CREATE POLICY "Users can register residents with permission"
  ON residents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_effective_permissions
      WHERE permission_name = 'MANAGE_RESIDENTS'
      AND granted = true
    )
    AND agency_id = (SELECT agency_id FROM user_profiles WHERE id = (SELECT auth.uid()))
  );

-- residents: Users can update residents with permission
CREATE POLICY "Users can update residents with permission"
  ON residents FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_effective_permissions
      WHERE permission_name = 'MANAGE_RESIDENTS'
      AND granted = true
    )
    AND agency_id = (SELECT agency_id FROM user_profiles WHERE id = (SELECT auth.uid()))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_effective_permissions
      WHERE permission_name = 'MANAGE_RESIDENTS'
      AND granted = true
    )
    AND agency_id = (SELECT agency_id FROM user_profiles WHERE id = (SELECT auth.uid()))
  );

-- agencies: Users can update agencies with permission
CREATE POLICY "Users can update agencies with permission"
  ON agencies FOR UPDATE
  TO authenticated
  USING (
    id = (SELECT agency_id FROM user_profiles WHERE id = (SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM user_effective_permissions
      WHERE permission_name = 'MANAGE_AGENCIES'
      AND granted = true
    )
  )
  WITH CHECK (
    id = (SELECT agency_id FROM user_profiles WHERE id = (SELECT auth.uid()))
    AND EXISTS (
      SELECT 1 FROM user_effective_permissions
      WHERE permission_name = 'MANAGE_AGENCIES'
      AND granted = true
    )
  );

-- family_resident_links: Agency admin can create family links
CREATE POLICY "Agency admin can create family links"
  ON family_resident_links FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_effective_permissions
      WHERE permission_name = 'MANAGE_FAMILY_LINKS'
      AND granted = true
    )
    AND resident_id IN (
      SELECT r.id FROM residents r
      WHERE r.agency_id = (SELECT agency_id FROM user_profiles WHERE id = (SELECT auth.uid()))
    )
  );

-- family_resident_links: Agency admin can revoke family links
CREATE POLICY "Agency admin can revoke family links"
  ON family_resident_links FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_effective_permissions
      WHERE permission_name = 'MANAGE_FAMILY_LINKS'
      AND granted = true
    )
    AND resident_id IN (
      SELECT r.id FROM residents r
      WHERE r.agency_id = (SELECT agency_id FROM user_profiles WHERE id = (SELECT auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_effective_permissions
      WHERE permission_name = 'MANAGE_FAMILY_LINKS'
      AND granted = true
    )
    AND resident_id IN (
      SELECT r.id FROM residents r
      WHERE r.agency_id = (SELECT agency_id FROM user_profiles WHERE id = (SELECT auth.uid()))
    )
  );

-- caregiver_assignments: Users can create assignments with permission
CREATE POLICY "Users can create assignments with permission"
  ON caregiver_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_effective_permissions
      WHERE permission_name = 'MANAGE_ASSIGNMENTS'
      AND granted = true
    )
    AND agency_id = (SELECT agency_id FROM user_profiles WHERE id = (SELECT auth.uid()))
  );

-- caregiver_assignments: Users can update assignments with permission
CREATE POLICY "Users can update assignments with permission"
  ON caregiver_assignments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_effective_permissions
      WHERE permission_name = 'MANAGE_ASSIGNMENTS'
      AND granted = true
    )
    AND agency_id = (SELECT agency_id FROM user_profiles WHERE id = (SELECT auth.uid()))
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_effective_permissions
      WHERE permission_name = 'MANAGE_ASSIGNMENTS'
      AND granted = true
    )
    AND agency_id = (SELECT agency_id FROM user_profiles WHERE id = (SELECT auth.uid()))
  );

-- senior_resident_links: Agency admins can manage senior resident links
CREATE POLICY "Agency admins can manage senior resident links"
  ON senior_resident_links FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_effective_permissions
      WHERE permission_name = 'MANAGE_SENIOR_LINKS'
      AND granted = true
    )
    AND resident_id IN (
      SELECT r.id FROM residents r
      WHERE r.agency_id = (SELECT agency_id FROM user_profiles WHERE id = (SELECT auth.uid()))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_effective_permissions
      WHERE permission_name = 'MANAGE_SENIOR_LINKS'
      AND granted = true
    )
    AND resident_id IN (
      SELECT r.id FROM residents r
      WHERE r.agency_id = (SELECT agency_id FROM user_profiles WHERE id = (SELECT auth.uid()))
    )
  );
