/*
  # Fix Table Existence Checker Function

  1. Changes
    - Fixed naming conflict in SQL query
    - Use proper variable reference in WHERE clause
*/

CREATE OR REPLACE FUNCTION check_tables_exist()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  required_tables text[] := ARRAY[
    'agencies',
    'residents',
    'caregiver_assignments',
    'family_resident_links',
    'senior_resident_links',
    'audit_log',
    'brain_state_history',
    'ai_learning_inputs'
  ];
  tbl_name text;
  tbl_exists boolean;
BEGIN
  FOREACH tbl_name IN ARRAY required_tables
  LOOP
    SELECT EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = tbl_name
    ) INTO tbl_exists;
    
    IF NOT tbl_exists THEN
      RETURN false;
    END IF;
  END LOOP;
  
  RETURN true;
END;
$$;
