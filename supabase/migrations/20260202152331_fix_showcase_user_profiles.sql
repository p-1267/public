/*
  # Fix Showcase User Profiles FK Constraint
  
  Make the user_profiles.id foreign key to auth.users nullable
  so showcase data can work without real auth users.
*/

-- Drop the existing foreign key constraint
ALTER TABLE user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Recreate it as nullable (ON DELETE SET NULL)
-- This allows showcase profiles to exist without auth users
ALTER TABLE user_profiles 
  ADD CONSTRAINT user_profiles_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL
  NOT VALID;

-- Mark the constraint as DEFERRABLE so it doesn't check immediately
ALTER TABLE user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;
  
ALTER TABLE user_profiles 
  ADD CONSTRAINT user_profiles_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE SET NULL
  DEFERRABLE INITIALLY DEFERRED;
