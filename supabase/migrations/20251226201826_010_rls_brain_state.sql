/*
  # RLS Policies for brain_state Table

  1. Purpose
    - Enforce permission-based access to Brain state
    - SELECT requires VIEW_BRAIN_STATE permission
    - UPDATE requires MODIFY_BRAIN_STATE permission
    - No INSERT (single row constraint, already seeded)
    - No DELETE (Brain state must persist)

  2. Policies
    - "Users with VIEW_BRAIN_STATE can read state" - SELECT policy
    - "Users with MODIFY_BRAIN_STATE can update state" - UPDATE policy

  3. Security
    - All policies require authenticated user
    - Permission checked via helper function
*/

CREATE POLICY "Users with VIEW_BRAIN_STATE can read state"
  ON brain_state
  FOR SELECT
  TO authenticated
  USING (current_user_has_permission('VIEW_BRAIN_STATE'));

CREATE POLICY "Users with MODIFY_BRAIN_STATE can update state"
  ON brain_state
  FOR UPDATE
  TO authenticated
  USING (current_user_has_permission('MODIFY_BRAIN_STATE'))
  WITH CHECK (current_user_has_permission('MODIFY_BRAIN_STATE'));