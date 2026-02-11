/*
  # Client Version Status Table (Phase 31)

  ## Purpose
  Tracks client version compatibility and update status.
  Enforces version verification on startup and incompatible client restrictions.

  ## New Tables
  - `client_version_status`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK to user_profiles) - User/client
    - `device_id` (text) - Device identifier
    - `client_version` (text) - Current client version
    - `brain_logic_version` (text) - Expected brain logic version
    - `api_schema_version` (text) - Expected API schema version
    - `is_compatible` (boolean) - Compatibility status
    - `compatibility_check_result` (jsonb) - Compatibility check details
    - `client_mode` (text) - NORMAL, RESTRICTED, OFFLINE
    - `last_version_check` (timestamptz) - Last version check
    - `last_successful_sync` (timestamptz, nullable) - Last successful sync
    - `update_available` (boolean) - Update available
    - `update_required` (boolean) - Update required (breaking changes)
    - `available_update_version` (text, nullable) - Available update version
    - `update_notified_at` (timestamptz, nullable) - When user notified
    - `offline_since` (timestamptz, nullable) - Offline since
    - `needs_version_sync` (boolean) - Needs version sync on reconnect
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Client Modes
  1. NORMAL - Normal operation
  2. RESTRICTED - Restricted mode (incompatible version)
  3. OFFLINE - Offline mode

  ## Security
  - RLS enabled
  - Per-user isolation
  - Automatic compatibility enforcement

  ## Enforcement Rules
  1. Clients MUST verify version compatibility on startup
  2. Incompatible clients MUST enter RESTRICTED MODE
  3. Offline clients MUST sync version status on reconnect
  4. No undefined runtime states allowed
*/

CREATE TABLE IF NOT EXISTS client_version_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  device_id text NOT NULL,
  client_version text NOT NULL,
  brain_logic_version text NOT NULL,
  api_schema_version text NOT NULL,
  is_compatible boolean NOT NULL DEFAULT true,
  compatibility_check_result jsonb NOT NULL DEFAULT '{}',
  client_mode text NOT NULL DEFAULT 'NORMAL' CHECK (client_mode IN ('NORMAL', 'RESTRICTED', 'OFFLINE')),
  last_version_check timestamptz NOT NULL DEFAULT now(),
  last_successful_sync timestamptz,
  update_available boolean NOT NULL DEFAULT false,
  update_required boolean NOT NULL DEFAULT false,
  available_update_version text,
  update_notified_at timestamptz,
  offline_since timestamptz,
  needs_version_sync boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}',
  UNIQUE(user_id, device_id)
);

ALTER TABLE client_version_status ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_client_version_status_user_id ON client_version_status(user_id);
CREATE INDEX IF NOT EXISTS idx_client_version_status_device_id ON client_version_status(device_id);
CREATE INDEX IF NOT EXISTS idx_client_version_status_is_compatible ON client_version_status(is_compatible);
CREATE INDEX IF NOT EXISTS idx_client_version_status_client_mode ON client_version_status(client_mode);
CREATE INDEX IF NOT EXISTS idx_client_version_status_update_required ON client_version_status(update_required);
CREATE INDEX IF NOT EXISTS idx_client_version_status_needs_version_sync ON client_version_status(needs_version_sync);
