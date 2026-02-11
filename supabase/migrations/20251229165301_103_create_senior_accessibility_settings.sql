/*
  # Senior Accessibility Settings Table (Phase 22)

  ## Purpose
  Persistent accessibility settings for senior users.
  Accessibility settings are safety controls, not preferences.

  ## New Tables
  - `senior_accessibility_settings`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK to user_profiles) - senior user
    - `text_size` (text) - SMALL, MEDIUM, LARGE, EXTRA_LARGE
    - `high_contrast_mode` (boolean) - high contrast display
    - `button_spacing` (text) - COMPACT, STANDARD, SPACIOUS
    - `simplified_ui_mode` (boolean) - simplified interface
    - `voice_readback_enabled` (boolean) - voice read-back
    - `voice_readback_speed` (numeric) - 0.5 to 2.0
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Settings must be respected across all screens
  - Settings cached offline
  - Brain-initiated emergency UI overrides all personalization

  ## Enforcement Rules
  1. Settings respected across all screens
  2. Settings cached offline
  3. Brain emergency UI overrides all personalization
  4. All changes audited
*/

CREATE TABLE IF NOT EXISTS senior_accessibility_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES user_profiles(id) ON DELETE CASCADE,
  text_size text NOT NULL DEFAULT 'MEDIUM' CHECK (text_size IN ('SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE')),
  high_contrast_mode boolean NOT NULL DEFAULT false,
  button_spacing text NOT NULL DEFAULT 'STANDARD' CHECK (button_spacing IN ('COMPACT', 'STANDARD', 'SPACIOUS')),
  simplified_ui_mode boolean NOT NULL DEFAULT false,
  voice_readback_enabled boolean NOT NULL DEFAULT false,
  voice_readback_speed numeric(3,2) NOT NULL DEFAULT 1.0 CHECK (voice_readback_speed >= 0.5 AND voice_readback_speed <= 2.0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE senior_accessibility_settings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_senior_accessibility_settings_user_id ON senior_accessibility_settings(user_id);
