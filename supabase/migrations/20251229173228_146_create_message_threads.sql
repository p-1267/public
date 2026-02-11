/*
  # Message Threads Table (Phase 26)

  ## Purpose
  Thread container with mandatory context scoping.
  No context-less messaging allowed.

  ## New Tables
  - `message_threads`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency context
    - `context_type` (text) - RESIDENT_THREAD, SHIFT_THREAD, INCIDENT_THREAD, ANNOUNCEMENT_THREAD
    - `context_id` (uuid) - FK to relevant entity
    - `subject` (text) - thread subject
    - `created_by` (uuid, FK to user_profiles) - who created
    - `created_at` (timestamptz)
    - `last_message_at` (timestamptz, nullable) - when last message sent
    - `is_active` (boolean) - thread active status
    - `metadata` (jsonb) - additional context

  ## Security
  - RLS enabled
  - Agency-isolated
  - Context-based access control

  ## Enforcement Rules
  1. Every message MUST be bound to exactly ONE context
  2. No context-less messaging allowed
  3. Context types: RESIDENT_THREAD, SHIFT_THREAD, INCIDENT_THREAD, ANNOUNCEMENT_THREAD
*/

CREATE TABLE IF NOT EXISTS message_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  context_type text NOT NULL CHECK (context_type IN ('RESIDENT_THREAD', 'SHIFT_THREAD', 'INCIDENT_THREAD', 'ANNOUNCEMENT_THREAD')),
  context_id uuid NOT NULL,
  subject text NOT NULL,
  created_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_message_threads_agency_id ON message_threads(agency_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_context_type ON message_threads(context_type);
CREATE INDEX IF NOT EXISTS idx_message_threads_context_id ON message_threads(context_id);
CREATE INDEX IF NOT EXISTS idx_message_threads_created_by ON message_threads(created_by);
CREATE INDEX IF NOT EXISTS idx_message_threads_last_message_at ON message_threads(last_message_at DESC NULLS LAST);
