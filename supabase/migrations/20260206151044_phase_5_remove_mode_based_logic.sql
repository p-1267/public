/*
  # Phase 5: Remove All Mode-Based Conditional Logic

  ## Violations Fixed
  
  ### 1. Backend Mode-Based Logic
  - `is_showcase_mode()` function still exists
  - Creates different behavior based on mode
  - Violates: "Showcase = Live App" principle
  
  ### 2. System Config Table (showcase_mode flag)
  - system_config table holds showcase_mode flag
  - Enables environment-based behavior switching
  - Must be removed
  
  ## Global Rule Enforced
  Showcase MUST behave exactly like Live App:
  - No demo logic
  - No mock data
  - No placeholder flows
  - Same components, APIs, DB, state logic
  
  ## Strategy
  - Remove is_showcase_mode() function
  - Remove showcase_mode from system_config
  - Drop any triggers or policies using these functions
*/

-- ============================================================================
-- Drop Mode-Based Functions
-- ============================================================================

-- These were supposedly removed in 20260206145627, but is_showcase_mode still exists
DROP FUNCTION IF EXISTS is_showcase_mode();
DROP FUNCTION IF EXISTS block_if_showcase_mode();
DROP FUNCTION IF EXISTS check_showcase_mode_trigger();

-- ============================================================================
-- Remove Mode Flag from System Config
-- ============================================================================

-- Remove the showcase_mode configuration
DELETE FROM system_config WHERE key = 'showcase_mode';

-- ============================================================================
-- Documentation
-- ============================================================================

COMMENT ON TABLE system_config IS 
'System-wide configuration (excluding mode flags - use is_simulation data tag instead)';

-- ============================================================================
-- Verify No Mode-Based Triggers Exist
-- ============================================================================

-- Drop any triggers that might be checking showcase mode
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT DISTINCT tgname, relname
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    WHERE tgname LIKE '%showcase%' OR tgname LIKE '%mode%'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I CASCADE', r.tgname, r.relname);
    RAISE NOTICE 'Dropped mode-based trigger: % on %', r.tgname, r.relname;
  END LOOP;
END $$;
