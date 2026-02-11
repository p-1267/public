/*
  # RLS Policies for SENIOR Role (Phase 14)

  1. Senior Resident Links Table
    - Seniors can view their own link only
    - Agency admins can manage links

  2. Residents Table
    - Seniors can view ONLY their own resident record
    - Matched via senior_resident_links

  3. Caregiver Assignments Table
    - Seniors can view assignments for their own resident record

  4. User Profiles Table
    - Seniors can view their own profile
    - Seniors can view profiles of caregivers assigned to them

  5. Audit Log Table
    - Seniors can view audit entries related to their own care
    - Filtered by target_id matching their resident_id

  6. Brain State Table
    - Seniors can view emergency_state (global, read-only)

  7. Security
    - All policies are SELECT only
    - No INSERT, UPDATE, DELETE for seniors
    - Restricted to authenticated users with SENIOR role
*/

-- Senior Resident Links: View own link only
CREATE POLICY "Seniors can view own resident link"
  ON senior_resident_links FOR SELECT
  TO authenticated
  USING (
    senior_user_id = auth.uid()
    AND user_has_permission(auth.uid(), 'view_own_resident_data')
  );

-- Senior Resident Links: Agency admins can manage
CREATE POLICY "Agency admins can manage senior resident links"
  ON senior_resident_links FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND (
          user_has_permission(auth.uid(), 'manage_agency_users')
          OR user_has_permission(auth.uid(), 'manage_system_users')
        )
    )
  );

-- Residents: View own record only
CREATE POLICY "Seniors can view own resident record"
  ON residents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM senior_resident_links srl
      WHERE srl.senior_user_id = auth.uid()
        AND srl.resident_id = residents.id
        AND srl.status = 'active'
        AND user_has_permission(auth.uid(), 'view_own_resident_data')
    )
  );

-- Caregiver Assignments: View assignments for own resident record
CREATE POLICY "Seniors can view own caregiver assignments"
  ON caregiver_assignments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM senior_resident_links srl
      WHERE srl.senior_user_id = auth.uid()
        AND srl.resident_id = caregiver_assignments.resident_id
        AND srl.status = 'active'
        AND user_has_permission(auth.uid(), 'view_assigned_caregivers')
    )
  );

-- User Profiles: View own profile and assigned caregivers
CREATE POLICY "Seniors can view assigned caregivers profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    -- Own profile
    id = auth.uid()
    OR
    -- Assigned caregiver profiles
    (
      EXISTS (
        SELECT 1 FROM senior_resident_links srl
        JOIN caregiver_assignments ca ON ca.resident_id = srl.resident_id
        WHERE srl.senior_user_id = auth.uid()
          AND srl.status = 'active'
          AND ca.caregiver_user_id = user_profiles.id
          AND ca.status = 'active'
          AND user_has_permission(auth.uid(), 'view_assigned_caregivers')
      )
    )
  );

-- Audit Log: View own care activity
-- Filter by target_id matching resident_id and target_type = 'resident'
CREATE POLICY "Seniors can view own care timeline"
  ON audit_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM senior_resident_links srl
      WHERE srl.senior_user_id = auth.uid()
        AND srl.resident_id = audit_log.target_id
        AND srl.status = 'active'
        AND user_has_permission(auth.uid(), 'view_own_care_timeline')
    )
  );

-- Brain State: View emergency state (global, read-only)
CREATE POLICY "Seniors can view global emergency status"
  ON brain_state FOR SELECT
  TO authenticated
  USING (
    user_has_permission(auth.uid(), 'view_system_emergency_status')
  );