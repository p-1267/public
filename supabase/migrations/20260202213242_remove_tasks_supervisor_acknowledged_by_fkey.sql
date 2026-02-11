/*
  # Remove tasks.supervisor_acknowledged_by FK Constraint
  
  ## Problem
  batch_review_tasks fails because tasks.supervisor_acknowledged_by 
  references auth.users which doesn't contain showcase user IDs.
  
  ## Solution
  Remove the FK constraint for showcase compatibility.
*/

ALTER TABLE tasks 
  DROP CONSTRAINT IF EXISTS tasks_supervisor_acknowledged_by_fkey;
