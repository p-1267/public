/*
  # RLS Policies for Caregiver Assignments Table

  ## Purpose
  Enforce row-level security for caregiver-resident assignments.
  Agency-scoped with explicit permission checks.

  ## Policies
  1. SELECT - View assignments in own agency
  2. INSERT - Create assignments with permission
  3. UPDATE - Modify assignments with permission
  4. DELETE - Not allowed (use status='removed' instead)

  ## Security Notes
  - All access is agency-scoped
  - Assignments are explicit (no auto-assignment)
  - Permissions verified via Brain system
*/

-- SELECT: View assignments in own agency
CREATE POLICY "Users can view assignments in their agency"
  ON caregiver_assignments FOR SELECT
  TO authenticated
  USING (
    (SELECT user_has_permission(auth.uid(), 'assignment.manage'))
    AND (
      -- SUPER_ADMIN sees all
      (SELECT user_has_permission(auth.uid(), 'system.override'))
      OR
      -- Same agency
      agency_id = (SELECT agency_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- INSERT: Create assignments with permission
CREATE POLICY "Users can create assignments with permission"
  ON caregiver_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT user_has_permission(auth.uid(), 'assignment.manage'))
    AND (
      -- SUPER_ADMIN can assign in any agency
      (SELECT user_has_permission(auth.uid(), 'system.override'))
      OR
      -- Must be in same agency
      agency_id = (SELECT agency_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- UPDATE: Modify assignments with permission
CREATE POLICY "Users can update assignments with permission"
  ON caregiver_assignments FOR UPDATE
  TO authenticated
  USING (
    (SELECT user_has_permission(auth.uid(), 'assignment.manage'))
    AND (
      -- SUPER_ADMIN can update any
      (SELECT user_has_permission(auth.uid(), 'system.override'))
      OR
      -- Same agency
      agency_id = (SELECT agency_id FROM user_profiles WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    (SELECT user_has_permission(auth.uid(), 'assignment.manage'))
    AND (
      -- SUPER_ADMIN can update any
      (SELECT user_has_permission(auth.uid(), 'system.override'))
      OR
      -- Same agency
      agency_id = (SELECT agency_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- DELETE: Explicitly deny
-- No DELETE policy = no one can delete
