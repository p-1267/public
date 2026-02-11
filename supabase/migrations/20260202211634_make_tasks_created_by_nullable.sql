/*
  # Make tasks.created_by Nullable for Showcase Mode

  ## Problem
  Showcase seeding fails because:
  - created_by is NOT NULL and references auth.users
  - Showcase doesn't have authenticated users
  - Cannot insert tasks without valid user reference

  ## Solution
  Make created_by nullable for showcase compatibility.
  
  ## Impact
  - Allows showcase mode to create tasks without authentication
  - Production mode should still set created_by via application logic
  - Audit trail remains intact where users exist
*/

ALTER TABLE tasks ALTER COLUMN created_by DROP NOT NULL;
