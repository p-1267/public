/*
  # Grant Anonymous Access to Showcase RPCs
  
  Allows anonymous users to call showcase-related RPC functions
  so the showcase mode can work without authentication.
*/

-- Grant execute on seed function
GRANT EXECUTE ON FUNCTION seed_senior_family_scenario() TO anon;

-- Grant on other functions if they exist
DO $$
DECLARE
  func_exists boolean;
BEGIN
  -- Check get_showcase_residents
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'get_showcase_residents'
  ) INTO func_exists;
  
  IF func_exists THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION get_showcase_residents TO anon';
  END IF;

  -- Check get_showcase_departments
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'get_showcase_departments'
  ) INTO func_exists;
  
  IF func_exists THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION get_showcase_departments TO anon';
  END IF;

  -- Check get_showcase_tasks
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' 
    AND p.proname = 'get_showcase_tasks'
  ) INTO func_exists;
  
  IF func_exists THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION get_showcase_tasks TO anon';
  END IF;
END $$;
