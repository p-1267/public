/*
  # Remove Showcase Mode Architecture Violations

  ## Purpose
  Remove functions that create alternate logic paths for showcase mode.
  All functions must use single code path with is_simulation parameter.

  ## Functions Removed
  1. complete_voice_transcription_showcase - alternate transcription path
  2. mark_showcase_device_data_as_seeded - showcase-specific marking
  3. block_if_showcase_mode - mode-based blocking
  4. check_showcase_mode_trigger - mode-based trigger
  5. is_showcase_mode - mode detection helper

  ## Compliance
  After this migration, all runtime RPCs follow single-path architecture.
  Showcase mode uses same RPCs with is_simulation parameter for filtering.
*/

-- Drop showcase-specific RPC (alternate logic path)
DROP FUNCTION IF EXISTS complete_voice_transcription_showcase(uuid, text, text, numeric);

-- Drop device seeding marker (showcase-specific)
DROP FUNCTION IF EXISTS mark_showcase_device_data_as_seeded(uuid);

-- Drop mode-based blocking functions
DROP FUNCTION IF EXISTS block_if_showcase_mode();
DROP FUNCTION IF EXISTS check_showcase_mode_trigger();
DROP FUNCTION IF EXISTS is_showcase_mode();

-- Drop trigger if exists
DROP TRIGGER IF EXISTS prevent_showcase_modifications ON tasks;
DROP TRIGGER IF EXISTS prevent_showcase_modifications ON residents;
DROP TRIGGER IF EXISTS prevent_showcase_modifications ON user_profiles;

COMMENT ON SCHEMA public IS
'Phase 5 Compliant: No showcase-specific RPCs. All business logic uses single code path with is_simulation filtering.';
