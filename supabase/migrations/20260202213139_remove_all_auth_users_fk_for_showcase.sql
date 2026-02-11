/*
  # Remove All Foreign Key Constraints to auth.users for Showcase
  
  ## Problem
  Multiple tables have FK constraints to auth.users that break showcase mode:
  - task_evidence.captured_by
  - task_dependencies.created_by
  - task_state_transitions.transitioned_by
  - escalation_policies.created_by
  - supervisor_reviews.reviewer_id
  - supervisor_reviews.escalated_to
  
  ## Solution
  Remove all these FK constraints for showcase compatibility.
  User IDs can reference user_profiles table directly.
  
  ## Security
  - Allows showcase mode with mock users
  - Application logic validates user references
  - Production can maintain constraints if needed
*/

-- task_evidence
ALTER TABLE task_evidence 
  DROP CONSTRAINT IF EXISTS task_evidence_captured_by_fkey;

-- task_dependencies  
ALTER TABLE task_dependencies 
  DROP CONSTRAINT IF EXISTS task_dependencies_created_by_fkey;

-- task_state_transitions
ALTER TABLE task_state_transitions 
  DROP CONSTRAINT IF EXISTS task_state_transitions_transitioned_by_fkey;

-- escalation_policies
ALTER TABLE escalation_policies 
  DROP CONSTRAINT IF EXISTS escalation_policies_created_by_fkey;

-- supervisor_reviews
ALTER TABLE supervisor_reviews 
  DROP CONSTRAINT IF EXISTS supervisor_reviews_reviewer_id_fkey;

ALTER TABLE supervisor_reviews 
  DROP CONSTRAINT IF EXISTS supervisor_reviews_escalated_to_fkey;

-- Add comments
COMMENT ON TABLE task_evidence IS 'Task evidence table. FK to auth.users removed for showcase mode.';
COMMENT ON TABLE supervisor_reviews IS 'Supervisor reviews table. FK to auth.users removed for showcase mode.';
