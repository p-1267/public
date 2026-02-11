/*
  # Remove Tasks Foreign Key Constraints to auth.users for Showcase
  
  ## Problem
  bulk_assign_tasks fails with FK violation because:
  - tasks.owner_user_id, created_by, completed_by reference auth.users
  - Showcase user_profiles have UUIDs not in auth.users table
  - Cannot assign tasks to showcase users
  
  ## Solution
  Remove FK constraints from tasks to auth.users for showcase compatibility:
  - owner_user_id
  - created_by  
  - completed_by
  - escalated_to
  
  ## Impact
  - Allows showcase mode to work with mock users
  - Production should maintain these constraints via application logic
  - Data integrity validated at application level
*/

-- Drop FK constraints from tasks to auth.users
ALTER TABLE tasks 
  DROP CONSTRAINT IF EXISTS tasks_owner_user_id_fkey;

ALTER TABLE tasks 
  DROP CONSTRAINT IF EXISTS tasks_created_by_fkey;

ALTER TABLE tasks 
  DROP CONSTRAINT IF EXISTS tasks_completed_by_fkey;

ALTER TABLE tasks 
  DROP CONSTRAINT IF EXISTS tasks_escalated_to_fkey;

-- Add comment explaining why
COMMENT ON TABLE tasks IS 'Tasks table. FK constraints to auth.users removed for showcase mode compatibility. User IDs can reference user_profiles directly.';
