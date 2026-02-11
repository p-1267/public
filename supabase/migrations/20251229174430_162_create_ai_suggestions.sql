/*
  # AI Suggestions Table (Phase 27)

  ## Purpose
  Stores AI-generated suggestions for users.
  Non-authoritative, non-executing, non-blocking.

  ## New Tables
  - `ai_suggestions`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency context
    - `user_id` (uuid, FK to user_profiles) - target user
    - `suggestion_type` (text) - REMINDER, BEST_PRACTICE, POLICY_EXPLANATION
    - `context_type` (text) - context of suggestion
    - `context_id` (uuid, nullable) - related entity
    - `title` (text) - suggestion title
    - `content` (text) - suggestion content
    - `priority` (text) - LOW, NORMAL, HIGH
    - `is_blocking` (boolean) - MUST ALWAYS BE FALSE
    - `displayed_at` (timestamptz, nullable) - when shown to user
    - `dismissed_at` (timestamptz, nullable) - when dismissed
    - `accepted_at` (timestamptz, nullable) - when accepted
    - `expires_at` (timestamptz, nullable) - expiration time
    - `is_active` (boolean) - active status
    - `created_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Security
  - RLS enabled
  - User can only see own suggestions

  ## Enforcement Rules
  1. Shadow AI MAY suggest: reminders, best-practice hints, policy explanations
  2. is_blocking MUST ALWAYS BE FALSE
  3. No AI output may: trigger an action, block an action, override policy, modify records
*/

CREATE TABLE IF NOT EXISTS ai_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  suggestion_type text NOT NULL CHECK (suggestion_type IN ('REMINDER', 'BEST_PRACTICE', 'POLICY_EXPLANATION')),
  context_type text,
  context_id uuid,
  title text NOT NULL,
  content text NOT NULL,
  priority text NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH')),
  is_blocking boolean NOT NULL DEFAULT false CHECK (is_blocking = false),
  displayed_at timestamptz,
  dismissed_at timestamptz,
  accepted_at timestamptz,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE ai_suggestions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_suggestions_agency_id ON ai_suggestions(agency_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_user_id ON ai_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_suggestion_type ON ai_suggestions(suggestion_type);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_is_active ON ai_suggestions(is_active);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_displayed_at ON ai_suggestions(displayed_at);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_created_at ON ai_suggestions(created_at DESC);
