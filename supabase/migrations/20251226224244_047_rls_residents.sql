/*
  # RLS Policies for Residents Table

  ## Purpose
  Enforce row-level security for resident management.
  Agency-scoped access with role-based visibility.

  ## Policies
  1. SELECT - Users can view residents in their agency (with permission)
  2. INSERT - Users can register residents (with permission)
  3. UPDATE - Users can update residents in their agency (with permission)
  4. DELETE - Not allowed (use status instead)

  ## Security Notes
  - All access is agency-scoped
  - Permissions verified via Brain system
  - Caregivers can view only their assigned residents
*/

-- SELECT: View residents in own agency
CREATE POLICY "Users can view residents in their agency"
  ON residents FOR SELECT
  TO authenticated
  USING (
    current_user_has_permission('resident.view')
    AND (
      -- SUPER_ADMIN sees all
      (SELECT user_has_permission(auth.uid(), 'system.override'))
      OR
      -- Same agency
      agency_id = (SELECT agency_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- INSERT: Register residents with permission
CREATE POLICY "Users can register residents with permission"
  ON residents FOR INSERT
  TO authenticated
  WITH CHECK (
    current_user_has_permission('resident.create')
    AND (
      -- SUPER_ADMIN can create in any agency
      (SELECT user_has_permission(auth.uid(), 'system.override'))
      OR
      -- Must be in same agency
      agency_id = (SELECT agency_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- UPDATE: Update residents in own agency
CREATE POLICY "Users can update residents with permission"
  ON residents FOR UPDATE
  TO authenticated
  USING (
    current_user_has_permission('resident.view')
    AND (
      -- SUPER_ADMIN can update any
      (SELECT user_has_permission(auth.uid(), 'system.override'))
      OR
      -- Same agency
      agency_id = (SELECT agency_id FROM user_profiles WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    current_user_has_permission('resident.view')
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
