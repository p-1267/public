/*
  # Training Progress Table (Phase 27)

  ## Purpose
  Tracks user completion of training modules.
  Records when started, completed, dismissed.

  ## New Tables
  - `training_progress`
    - `id` (uuid, primary key)
    - `user_id` (uuid, FK to user_profiles) - user
    - `module_id` (uuid, FK to training_modules) - module
    - `started_at` (timestamptz) - when started
    - `completed_at` (timestamptz, nullable) - when completed
    - `dismissed_at` (timestamptz, nullable) - when dismissed
    - `progress_data` (jsonb) - step completion data
    - `is_completed` (boolean) - completion status
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - User can only manage own progress

  ## Enforcement Rules
  1. Track completion for mandatory modules
  2. Allow repeat completion for repeatable modules
*/

CREATE TABLE IF NOT EXISTS training_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  dismissed_at timestamptz,
  progress_data jsonb NOT NULL DEFAULT '{}',
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, module_id)
);

ALTER TABLE training_progress ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_training_progress_user_id ON training_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_module_id ON training_progress(module_id);
CREATE INDEX IF NOT EXISTS idx_training_progress_is_completed ON training_progress(is_completed);
CREATE INDEX IF NOT EXISTS idx_training_progress_started_at ON training_progress(started_at DESC);
