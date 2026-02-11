/*
  # Optimize RLS Policies Auth Function Calls

  1. Purpose
    - Replace direct auth.uid() calls with (SELECT auth.uid())
    - Prevents re-evaluation of auth functions for each row
    - Improves query performance at scale

  2. Changes
    - Drop and recreate affected RLS policies with optimized auth calls
    - Applies to all policies that call auth.uid() or auth.jwt()

  3. Tables Affected
    - care_state_transitions
    - residents
    - user_profiles
    - brain_state
    - audit_log
    - agencies
    - family_resident_links
    - caregiver_assignments
    - senior_resident_links

  4. Security
    - No change to access control logic
    - Only performance optimization
*/

-- care_state_transitions: no auth.uid() used, just marking for completeness
-- Already optimal

-- residents: Seniors can view own resident record
DROP POLICY IF EXISTS "Seniors can view own resident record" ON residents;
CREATE POLICY "Seniors can view own resident record"
  ON residents FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT resident_id FROM senior_resident_links
      WHERE senior_user_id = (SELECT auth.uid())
      AND status = 'active'
    )
  );

-- residents: Users can register residents with permission
DROP POLICY IF EXISTS "Users can register residents with permission" ON residents;
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
DROP POLICY IF EXISTS "Users can update residents with permission" ON residents;
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

-- residents: Users can view residents in their agency
DROP POLICY IF EXISTS "Users can view residents in their agency" ON residents;
CREATE POLICY "Users can view residents in their agency"
  ON residents FOR SELECT
  TO authenticated
  USING (
    agency_id = (SELECT agency_id FROM user_profiles WHERE id = (SELECT auth.uid()))
  );

-- user_profiles: Seniors can view assigned caregivers profiles
DROP POLICY IF EXISTS "Seniors can view assigned caregivers profiles" ON user_profiles;
CREATE POLICY "Seniors can view assigned caregivers profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT ca.caregiver_user_id
      FROM caregiver_assignments ca
      JOIN senior_resident_links srl ON srl.resident_id = ca.resident_id
      WHERE srl.senior_user_id = (SELECT auth.uid())
      AND srl.status = 'active'
      AND ca.status = 'active'
    )
  );

-- user_profiles: Users can read own profile
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (id = (SELECT auth.uid()));

-- user_profiles: Users can update own display_name
DROP POLICY IF EXISTS "Users can update own display_name" ON user_profiles;
CREATE POLICY "Users can update own display_name"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

-- brain_state: Seniors can view global emergency status
DROP POLICY IF EXISTS "Seniors can view global emergency status" ON brain_state;
CREATE POLICY "Seniors can view global emergency status"
  ON brain_state FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON up.role_id = r.id
      WHERE up.id = (SELECT auth.uid())
      AND r.name = 'SENIOR'
    )
  );

-- audit_log: Seniors can view own care timeline
DROP POLICY IF EXISTS "Seniors can view own care timeline" ON audit_log;
CREATE POLICY "Seniors can view own care timeline"
  ON audit_log FOR SELECT
  TO authenticated
  USING (
    target_type = 'resident'
    AND target_id IN (
      SELECT resident_id FROM senior_resident_links
      WHERE senior_user_id = (SELECT auth.uid())
      AND status = 'active'
    )
  );

-- agencies: Users can update agencies with permission
DROP POLICY IF EXISTS "Users can update agencies with permission" ON agencies;
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

-- agencies: Users can view agencies with permission
DROP POLICY IF EXISTS "Users can view agencies with permission" ON agencies;
CREATE POLICY "Users can view agencies with permission"
  ON agencies FOR SELECT
  TO authenticated
  USING (
    id = (SELECT agency_id FROM user_profiles WHERE id = (SELECT auth.uid()))
  );

-- family_resident_links: Agency admin can create family links
DROP POLICY IF EXISTS "Agency admin can create family links" ON family_resident_links;
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
DROP POLICY IF EXISTS "Agency admin can revoke family links" ON family_resident_links;
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

-- family_resident_links: Agency admin can view agency family links
DROP POLICY IF EXISTS "Agency admin can view agency family links" ON family_resident_links;
CREATE POLICY "Agency admin can view agency family links"
  ON family_resident_links FOR SELECT
  TO authenticated
  USING (
    resident_id IN (
      SELECT r.id FROM residents r
      WHERE r.agency_id = (SELECT agency_id FROM user_profiles WHERE id = (SELECT auth.uid()))
    )
  );

-- family_resident_links: Family users can view own links
DROP POLICY IF EXISTS "Family users can view own links" ON family_resident_links;
CREATE POLICY "Family users can view own links"
  ON family_resident_links FOR SELECT
  TO authenticated
  USING (family_user_id = (SELECT auth.uid()));

-- caregiver_assignments: Seniors can view own caregiver assignments
DROP POLICY IF EXISTS "Seniors can view own caregiver assignments" ON caregiver_assignments;
CREATE POLICY "Seniors can view own caregiver assignments"
  ON caregiver_assignments FOR SELECT
  TO authenticated
  USING (
    resident_id IN (
      SELECT resident_id FROM senior_resident_links
      WHERE senior_user_id = (SELECT auth.uid())
      AND status = 'active'
    )
  );

-- caregiver_assignments: Users can create assignments with permission
DROP POLICY IF EXISTS "Users can create assignments with permission" ON caregiver_assignments;
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
DROP POLICY IF EXISTS "Users can update assignments with permission" ON caregiver_assignments;
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

-- caregiver_assignments: Users can view assignments in their agency
DROP POLICY IF EXISTS "Users can view assignments in their agency" ON caregiver_assignments;
CREATE POLICY "Users can view assignments in their agency"
  ON caregiver_assignments FOR SELECT
  TO authenticated
  USING (
    agency_id = (SELECT agency_id FROM user_profiles WHERE id = (SELECT auth.uid()))
  );

-- senior_resident_links: Agency admins can manage senior resident links
DROP POLICY IF EXISTS "Agency admins can manage senior resident links" ON senior_resident_links;
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

-- senior_resident_links: Seniors can view own resident link
DROP POLICY IF EXISTS "Seniors can view own resident link" ON senior_resident_links;
CREATE POLICY "Seniors can view own resident link"
  ON senior_resident_links FOR SELECT
  TO authenticated
  USING (senior_user_id = (SELECT auth.uid()));
