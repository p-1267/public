/*
  # Table Existence Checker Function

  1. Purpose
    - Provides RLS-free table existence verification for system readiness checks
    - Returns boolean indicating if all required tables exist in the schema

  2. Security
    - SECURITY DEFINER to bypass RLS
    - Only checks schema metadata, does not access data
    - Returns single boolean, no sensitive information exposed
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
  table_name text;
  table_exists boolean;
BEGIN
  FOREACH table_name IN ARRAY required_tables
  LOOP
    SELECT EXISTS (
      SELECT 1 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND tables.table_name = check_tables_exist.table_name
    ) INTO table_exists;
    
    IF NOT table_exists THEN
      RETURN false;
    END IF;
  END LOOP;
  
  RETURN true;
END;
$$;
