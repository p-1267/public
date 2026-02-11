/*
  # RLS Policies for ai_learning_inputs Table

  1. Purpose
    - Enforce permission-based access to AI learning inputs
    - SELECT requires VIEW_BRAIN_STATE permission
    - INSERT allowed for authenticated users (system stores observations)
    - UPDATE (acknowledge only) requires ACKNOWLEDGE_AI_INPUT permission
    - No DELETE (AI inputs must persist for learning)

  2. Policies
    - "Users with VIEW_BRAIN_STATE can read AI inputs" - SELECT policy
    - "Authenticated users can insert AI inputs" - INSERT policy
    - "Users with ACKNOWLEDGE_AI_INPUT can acknowledge" - UPDATE policy

  3. Security
    - All policies require authenticated user
    - AI is non-executing: stores only, never acts
    - Acknowledgment requires explicit permission
*/

CREATE POLICY "Users with VIEW_BRAIN_STATE can read AI inputs"
  ON ai_learning_inputs
  FOR SELECT
  TO authenticated
  USING (current_user_has_permission('VIEW_BRAIN_STATE'));

-- Any authenticated user can insert AI observations
CREATE POLICY "Authenticated users can insert AI inputs"
  ON ai_learning_inputs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Only users with ACKNOWLEDGE_AI_INPUT can acknowledge (update)
CREATE POLICY "Users with ACKNOWLEDGE_AI_INPUT can acknowledge"
  ON ai_learning_inputs
  FOR UPDATE
  TO authenticated
  USING (current_user_has_permission('ACKNOWLEDGE_AI_INPUT'))
  WITH CHECK (current_user_has_permission('ACKNOWLEDGE_AI_INPUT'));