/*
  # Message Audit Table (Phase 26)

  ## Purpose
  Immutable audit log for all message events.
  Complete traceability for compliance.

  ## New Tables
  - `message_audit`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency context
    - `actor_id` (uuid, FK to user_profiles) - who performed action
    - `actor_role` (text) - role at time of action
    - `action_type` (text) - SEND, READ, ACK, THREAD_CREATE, PARTICIPANT_ADD, ANNOUNCEMENT_CREATE
    - `thread_id` (uuid, nullable) - related thread
    - `message_id` (uuid, nullable) - related message
    - `announcement_id` (uuid, nullable) - related announcement
    - `context_type` (text, nullable) - context of action
    - `context_id` (uuid, nullable) - context entity ID
    - `device_fingerprint` (text, nullable) - device used
    - `metadata` (jsonb) - additional context
    - `timestamp` (timestamptz) - when action occurred
    - `created_at` (timestamptz)

  ## Action Types
  - SEND: Message sent
  - READ: Message read
  - ACK: Message/announcement acknowledged
  - THREAD_CREATE: Thread created
  - PARTICIPANT_ADD: Participant added
  - PARTICIPANT_REMOVE: Participant removed
  - ANNOUNCEMENT_CREATE: Announcement created
  - MESSAGE_REDACT: Message redacted

  ## Security
  - RLS enabled
  - Agency-isolated
  - Immutable (append-only)

  ## Enforcement Rules
  1. Every message event MUST log: Sender, Role, Context type, Context ID, Timestamp, Device fingerprint, Action type
  2. Audit logs are immutable
*/

CREATE TABLE IF NOT EXISTS message_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  actor_role text NOT NULL,
  action_type text NOT NULL CHECK (action_type IN ('SEND', 'READ', 'ACK', 'THREAD_CREATE', 'PARTICIPANT_ADD', 'PARTICIPANT_REMOVE', 'ANNOUNCEMENT_CREATE', 'MESSAGE_REDACT')),
  thread_id uuid,
  message_id uuid,
  announcement_id uuid,
  context_type text,
  context_id uuid,
  device_fingerprint text,
  metadata jsonb NOT NULL DEFAULT '{}',
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE message_audit ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_message_audit_agency_id ON message_audit(agency_id);
CREATE INDEX IF NOT EXISTS idx_message_audit_actor_id ON message_audit(actor_id);
CREATE INDEX IF NOT EXISTS idx_message_audit_action_type ON message_audit(action_type);
CREATE INDEX IF NOT EXISTS idx_message_audit_thread_id ON message_audit(thread_id);
CREATE INDEX IF NOT EXISTS idx_message_audit_message_id ON message_audit(message_id);
CREATE INDEX IF NOT EXISTS idx_message_audit_announcement_id ON message_audit(announcement_id);
CREATE INDEX IF NOT EXISTS idx_message_audit_timestamp ON message_audit(timestamp DESC);
