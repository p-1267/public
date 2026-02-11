/*
  # AI Assistance Configuration Table (Phase 27)

  ## Purpose
  User and agency preferences for AI assistance.
  Allows disabling AI without affecting enforcement.

  ## New Tables
  - `ai_assistance_config`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies) - agency context
    - `user_id` (uuid, FK to user_profiles, nullable) - user-specific or agency-wide
    - `is_enabled` (boolean) - AI assistance enabled
    - `shadow_ai_enabled` (boolean) - Shadow AI observation enabled
    - `voice_guidance_enabled` (boolean) - Voice-first guidance enabled
    - `suggestion_types_enabled` (text[]) - allowed suggestion types
    - `observation_scope` (jsonb) - what AI can observe
    - `consent_given_at` (timestamptz, nullable) - when user consented
    - `consent_withdrawn_at` (timestamptz, nullable) - when consent withdrawn
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Users manage own config
  - Admins manage agency config

  ## Enforcement Rules
  1. Users MUST be able to: See when AI assistance is active, View what data AI can observe, Disable AI assistance
  2. Disabling AI MUST NOT affect enforcement
*/

CREATE TABLE IF NOT EXISTS ai_assistance_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT true,
  shadow_ai_enabled boolean NOT NULL DEFAULT true,
  voice_guidance_enabled boolean NOT NULL DEFAULT false,
  suggestion_types_enabled text[] NOT NULL DEFAULT ARRAY['REMINDER', 'BEST_PRACTICE', 'POLICY_EXPLANATION'],
  observation_scope jsonb NOT NULL DEFAULT '{"workflow_patterns": true, "repeated_errors": true, "delayed_actions": true, "incomplete_documentation": true}',
  consent_given_at timestamptz,
  consent_withdrawn_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agency_id, user_id)
);

ALTER TABLE ai_assistance_config ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_assistance_config_agency_id ON ai_assistance_config(agency_id);
CREATE INDEX IF NOT EXISTS idx_ai_assistance_config_user_id ON ai_assistance_config(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_assistance_config_is_enabled ON ai_assistance_config(is_enabled);
CREATE INDEX IF NOT EXISTS idx_ai_assistance_config_shadow_ai_enabled ON ai_assistance_config(shadow_ai_enabled);
