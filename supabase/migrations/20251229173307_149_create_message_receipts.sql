/*
  # Message Receipts Table (Phase 26)

  ## Purpose
  Tracks delivery, read, and acknowledgment status.
  No manual manipulation allowed.

  ## New Tables
  - `message_receipts`
    - `id` (uuid, primary key)
    - `message_id` (uuid, FK to messages) - message
    - `user_id` (uuid, FK to user_profiles) - recipient
    - `delivered_at` (timestamptz, nullable) - when delivered
    - `read_at` (timestamptz, nullable) - when read
    - `acknowledged_at` (timestamptz, nullable) - when acknowledged
    - `device_fingerprint` (text, nullable) - device used
    - `created_at` (timestamptz)

  ## Security
  - RLS enabled
  - System-managed only
  - No manual manipulation

  ## Enforcement Rules
  1. System MUST record: Sent, Delivered, Read, Acknowledged timestamps
  2. No manual manipulation allowed
*/

CREATE TABLE IF NOT EXISTS message_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  delivered_at timestamptz,
  read_at timestamptz,
  acknowledged_at timestamptz,
  device_fingerprint text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE message_receipts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_message_receipts_message_id ON message_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_message_receipts_user_id ON message_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_message_receipts_read_at ON message_receipts(read_at);
CREATE INDEX IF NOT EXISTS idx_message_receipts_acknowledged_at ON message_receipts(acknowledged_at);
