/*
  # RLS Policies for audit_log Table

  1. Purpose
    - Enforce permission-based access to audit log
    - SELECT requires VIEW_AUDIT_LOG permission
    - INSERT allowed for authenticated users (Brain logic inserts)
    - No UPDATE (append-only, immutable)
    - No DELETE (audit trail must persist)

  2. Policies
    - "Users with VIEW_AUDIT_LOG can read audit log" - SELECT policy
    - "Authenticated users can insert audit entries" - INSERT policy

  3. Security
    - All policies require authenticated user
    - Append-only by design
*/

CREATE POLICY "Users with VIEW_AUDIT_LOG can read audit log"
  ON audit_log
  FOR SELECT
  TO authenticated
  USING (current_user_has_permission('VIEW_AUDIT_LOG'));

-- Any authenticated user can insert (Brain logic layer controls what gets logged)
CREATE POLICY "Authenticated users can insert audit entries"
  ON audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);