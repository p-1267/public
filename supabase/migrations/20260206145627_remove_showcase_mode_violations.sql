/*
  # Remove Showcase Mode Violations

  1. Purpose
    - Remove alternate logic paths for showcase mode
    - Ensure showcase uses same backend as live app
    - Keep data seeding functions (those are acceptable)

  2. Violations Removed
    - `complete_voice_transcription_showcase()` - alternate transcription path
    - `block_if_showcase_mode()` - mode-specific blocking
    - `check_showcase_mode_trigger()` - mode-specific triggers

  3. Rule Compliance
    - Showcase MUST use same RPCs as live app
    - Simulation injects data, not alternate logic
    - No mode-based behavior changes

  IMPORTANT: Data seeding functions (seed_*, create_showcase_*, get_showcase_*)
  are NOT removed - those are acceptable for test data injection.
*/

-- Drop the showcase-specific transcription completion function
-- This creates an alternate code path - violation
DROP FUNCTION IF EXISTS complete_voice_transcription_showcase(uuid, text, text, numeric);

-- Drop the showcase mode blocking function  
-- This changes behavior based on mode - violation
DROP FUNCTION IF EXISTS block_if_showcase_mode();

-- Drop the showcase mode trigger check
-- This changes behavior based on mode - violation
DROP FUNCTION IF EXISTS check_showcase_mode_trigger();

-- Note: We keep all seed_showcase_* and get_showcase_* functions
-- Those are acceptable because they only inject/query data, not change logic
