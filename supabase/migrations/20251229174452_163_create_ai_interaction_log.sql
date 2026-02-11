/*
  # AI Interaction Log Table (Phase 27)

  ## Purpose
  Immutable audit log for all AI interactions.
  Complete traceability for compliance.

  ## New Tables
  - `ai_interaction_log`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency context
    - `user_id` (uuid, FK to user_profiles) - user
    - `user_role` (text) - role at time of interaction
    - `interaction_type` (text) - SUGGESTION_DISPLAYED, SUGGESTION_ACCEPTED, SUGGESTION_DISMISSED, CONFIG_CHANGED
    - `suggestion_id` (uuid, nullable) - related suggestion
    - `suggestion_type` (text, nullable) - type of suggestion
    - `context_type` (text, nullable) - context
    - `context_id` (uuid, nullable) - related entity
    - `action_taken` (text) - ACCEPTED, DISMISSED, IGNORED
    - `device_fingerprint` (text, nullable) - device used
    - `metadata` (jsonb) - additional context
    - `timestamp` (timestamptz) - when interaction occurred
    - `created_at` (timestamptz)

  ## Interaction Types
  - SUGGESTION_DISPLAYED: Suggestion shown to user
  - SUGGESTION_ACCEPTED: User accepted suggestion
  - SUGGESTION_DISMISSED: User dismissed suggestion
  - CONFIG_CHANGED: User changed AI config
  - VOICE_GUIDANCE_USED: Voice guidance activated

  ## Security
  - RLS enabled
  - Agency-isolated
  - Immutable (append-only)

  ## Enforcement Rules
  1. Every AI interaction MUST log: User, Role, Context, AI suggestion type, Timestamp, Whether accepted or dismissed
  2. Logs are immutable
*/

CREATE TABLE IF NOT EXISTS ai_interaction_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  user_role text NOT NULL,
  interaction_type text NOT NULL CHECK (interaction_type IN ('SUGGESTION_DISPLAYED', 'SUGGESTION_ACCEPTED', 'SUGGESTION_DISMISSED', 'CONFIG_CHANGED', 'VOICE_GUIDANCE_USED', 'TRAINING_STARTED', 'TRAINING_COMPLETED')),
  suggestion_id uuid,
  suggestion_type text,
  context_type text,
  context_id uuid,
  action_taken text CHECK (action_taken IN ('ACCEPTED', 'DISMISSED', 'IGNORED', 'ENABLED', 'DISABLED', 'STARTED', 'COMPLETED')),
  device_fingerprint text,
  metadata jsonb NOT NULL DEFAULT '{}',
  timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_interaction_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_interaction_log_agency_id ON ai_interaction_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_ai_interaction_log_user_id ON ai_interaction_log(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_interaction_log_interaction_type ON ai_interaction_log(interaction_type);
CREATE INDEX IF NOT EXISTS idx_ai_interaction_log_suggestion_id ON ai_interaction_log(suggestion_id);
CREATE INDEX IF NOT EXISTS idx_ai_interaction_log_timestamp ON ai_interaction_log(timestamp DESC);
