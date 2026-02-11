/*
  # Optimize care_state_transitions RLS Policy

  1. Purpose
    - Optimize the auth.uid() call in care_state_transitions policy
    - The policy currently checks `auth.uid() IS NOT NULL` for each row
    - Since the policy is already restricted to authenticated role, this check is redundant

  2. Change
    - Replace `auth.uid() IS NOT NULL` with `true`
    - Authenticated users are guaranteed to have a non-null auth.uid()
    - Removes unnecessary per-row function evaluation

  3. Security
    - No change to access control
    - Policy still only applies to authenticated role
    - Performance optimization only
*/

DROP POLICY IF EXISTS "Authenticated users can read care transitions" ON care_state_transitions;

CREATE POLICY "Authenticated users can read care transitions"
  ON care_state_transitions FOR SELECT
  TO authenticated
  USING (true);
