/*
  # RLS Policies for brain_state_history Table

  1. Purpose
    - Enforce permission-based access to Brain state history
    - SELECT requires VIEW_BRAIN_STATE permission
    - INSERT requires MODIFY_BRAIN_STATE permission (Brain logic inserts on transitions)
    - No UPDATE (append-only, immutable history)
    - No DELETE (audit trail must persist)

  2. Policies
    - "Users with VIEW_BRAIN_STATE can read history" - SELECT policy
    - "Users with MODIFY_BRAIN_STATE can insert history" - INSERT policy

  3. Security
    - All policies require authenticated user
    - Append-only by design
*/

CREATE POLICY "Users with VIEW_BRAIN_STATE can read history"
  ON brain_state_history
  FOR SELECT
  TO authenticated
  USING (current_user_has_permission('VIEW_BRAIN_STATE'));

CREATE POLICY "Users with MODIFY_BRAIN_STATE can insert history"
  ON brain_state_history
  FOR INSERT
  TO authenticated
  WITH CHECK (current_user_has_permission('MODIFY_BRAIN_STATE'));