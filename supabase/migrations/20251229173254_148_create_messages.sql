/*
  # Messages Table (Phase 26)

  ## Purpose
  Actual messages within threads.
  All messages are scoped to thread context.

  ## New Tables
  - `messages`
    - `id` (uuid, primary key)
    - `thread_id` (uuid, FK to message_threads) - parent thread
    - `sender_id` (uuid, FK to user_profiles) - who sent
    - `sender_role` (text) - role at time of send
    - `message_type` (text) - TEXT, ATTACHMENT, SYSTEM_NOTICE, ACKNOWLEDGMENT
    - `content` (text) - message content
    - `sent_at` (timestamptz) - when sent
    - `is_offline_queued` (boolean) - sent while offline
    - `device_fingerprint` (text) - device used
    - `is_redacted` (boolean) - redaction status
    - `redacted_at` (timestamptz, nullable) - when redacted
    - `redacted_by` (uuid, FK to user_profiles, nullable) - who redacted
    - `redaction_reason` (text, nullable) - why redacted
    - `metadata` (jsonb) - additional data

  ## Security
  - RLS enabled
  - Sender must be active participant with can_send=true
  - SYSTEM_NOTICE is Brain-generated only

  ## Enforcement Rules
  1. Message types: TEXT, ATTACHMENT, SYSTEM_NOTICE, ACKNOWLEDGMENT
  2. SYSTEM_NOTICE is Brain-generated only
  3. Users CANNOT delete messages unilaterally
  4. Redaction creates visible tombstone
*/

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  sender_role text NOT NULL,
  message_type text NOT NULL CHECK (message_type IN ('TEXT', 'ATTACHMENT', 'SYSTEM_NOTICE', 'ACKNOWLEDGMENT')),
  content text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  is_offline_queued boolean NOT NULL DEFAULT false,
  device_fingerprint text,
  is_redacted boolean NOT NULL DEFAULT false,
  redacted_at timestamptz,
  redacted_by uuid REFERENCES user_profiles(id),
  redaction_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_sent_at ON messages(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_message_type ON messages(message_type);
CREATE INDEX IF NOT EXISTS idx_messages_is_redacted ON messages(is_redacted);
