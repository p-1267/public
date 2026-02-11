/*
  # Remove User Profiles FK Constraint for Showcase
  
  Temporarily remove the foreign key constraint from user_profiles to auth.users
  to allow showcase data to be seeded without real auth users.
  
  SECURITY NOTE: This is ONLY for showcase/demo purposes.
  Production systems should maintain this constraint.
*/

-- Drop the foreign key constraint entirely
ALTER TABLE user_profiles 
  DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Add a comment explaining why
COMMENT ON TABLE user_profiles IS 'User profiles table. FK to auth.users removed for showcase mode compatibility.';
