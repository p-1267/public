/*
  # Thread Participants Table (Phase 26)

  ## Purpose
  Defines who can access each thread.
  Enforces strict participant scoping.

  ## New Tables
  - `thread_participants`
    - `id` (uuid, primary key)
    - `thread_id` (uuid, FK to message_threads) - thread
    - `user_id` (uuid, FK to user_profiles) - participant
    - `role_name` (text) - role at time of addition
    - `can_send` (boolean) - can send messages
    - `can_read` (boolean) - can read messages
    - `added_by` (uuid, FK to user_profiles) - who added participant
    - `added_at` (timestamptz)
    - `removed_at` (timestamptz, nullable) - when removed
    - `is_active` (boolean) - active participant

  ## Security
  - RLS enabled
  - Participant must have active membership
  - Participant must have permission for context
  - Family users READ-ONLY unless explicitly permitted

  ## Enforcement Rules
  1. Participants MUST have active membership
  2. Participants MUST have permission for context
  3. Participants MUST be explicitly included
  4. Family users: READ-ONLY unless explicitly permitted
  5. Family users: Cannot initiate care or shift threads
*/

CREATE TABLE IF NOT EXISTS thread_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  role_name text NOT NULL,
  can_send boolean NOT NULL DEFAULT true,
  can_read boolean NOT NULL DEFAULT true,
  added_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  added_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  UNIQUE(thread_id, user_id)
);

ALTER TABLE thread_participants ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_thread_participants_thread_id ON thread_participants(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_participants_user_id ON thread_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_thread_participants_is_active ON thread_participants(is_active);
