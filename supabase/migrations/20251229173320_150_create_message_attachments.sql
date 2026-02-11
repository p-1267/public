/*
  # Message Attachments Table (Phase 26)

  ## Purpose
  File attachments for messages.
  Subject to virus scanning and size limits.

  ## New Tables
  - `message_attachments`
    - `id` (uuid, primary key)
    - `message_id` (uuid, FK to messages) - parent message
    - `file_name` (text) - original filename
    - `file_type` (text) - MIME type
    - `file_size` (bigint) - size in bytes
    - `storage_path` (text) - path in storage
    - `uploaded_by` (uuid, FK to user_profiles) - who uploaded
    - `uploaded_at` (timestamptz)
    - `is_virus_scanned` (boolean) - scan status
    - `scan_result` (text, nullable) - scan result
    - `scan_timestamp` (timestamptz, nullable) - when scanned
    - `is_accessible` (boolean) - can be downloaded

  ## Security
  - RLS enabled
  - Attachments are virus-scanned
  - File size limits enforced

  ## Enforcement Rules
  1. Attachments (PDF, Image) supported
  2. Attachments are virus-scanned
  3. File size limits enforced
*/

CREATE TABLE IF NOT EXISTS message_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL CHECK (file_size > 0),
  storage_path text NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  is_virus_scanned boolean NOT NULL DEFAULT false,
  scan_result text,
  scan_timestamp timestamptz,
  is_accessible boolean NOT NULL DEFAULT false
);

ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON message_attachments(message_id);
CREATE INDEX IF NOT EXISTS idx_message_attachments_uploaded_by ON message_attachments(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_message_attachments_is_virus_scanned ON message_attachments(is_virus_scanned);
CREATE INDEX IF NOT EXISTS idx_message_attachments_is_accessible ON message_attachments(is_accessible);
