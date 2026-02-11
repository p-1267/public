/*
  # RLS Policies for Agencies Table

  ## Purpose
  Enforce row-level security for agency management operations.
  Only authorized roles can view/modify agency data.

  ## Policies
  1. SELECT - AGENCY_ADMIN can view their own agency, SUPER_ADMIN can view all
  2. INSERT - Only users with agency.create permission
  3. UPDATE - Only users with agency.update permission for their agency
  4. DELETE - Not allowed (use status='archived' instead)

  ## Security Notes
  - All policies check authentication
  - Permissions verified via Brain permission system
  - Agency-scoped access enforced
*/

-- SELECT: AGENCY_ADMIN sees own agency, SUPER_ADMIN sees all
CREATE POLICY "Users can view agencies with permission"
  ON agencies FOR SELECT
  TO authenticated
  USING (
    current_user_has_permission('agency.view')
    AND (
      -- SUPER_ADMIN sees all
      (SELECT user_has_permission(auth.uid(), 'system.override'))
      OR
      -- AGENCY_ADMIN sees their own agency
      id = (SELECT agency_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- INSERT: Only users with agency.create permission
CREATE POLICY "Users can create agencies with permission"
  ON agencies FOR INSERT
  TO authenticated
  WITH CHECK (
    current_user_has_permission('agency.create')
  );

-- UPDATE: Only users with agency.update permission for their agency
CREATE POLICY "Users can update agencies with permission"
  ON agencies FOR UPDATE
  TO authenticated
  USING (
    current_user_has_permission('agency.update')
    AND (
      -- SUPER_ADMIN can update any
      (SELECT user_has_permission(auth.uid(), 'system.override'))
      OR
      -- AGENCY_ADMIN can update their own
      id = (SELECT agency_id FROM user_profiles WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    current_user_has_permission('agency.update')
    AND (
      -- SUPER_ADMIN can update any
      (SELECT user_has_permission(auth.uid(), 'system.override'))
      OR
      -- AGENCY_ADMIN can update their own
      id = (SELECT agency_id FROM user_profiles WHERE id = auth.uid())
    )
  );

-- DELETE: Explicitly deny (use status='archived' instead)
-- No DELETE policy = no one can delete
