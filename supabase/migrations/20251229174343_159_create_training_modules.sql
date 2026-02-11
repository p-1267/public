/*
  # Training Modules Table (Phase 27)

  ## Purpose
  Stores training tutorials, walkthroughs, and guidance content.
  Role-specific, contextual, task-based training.

  ## New Tables
  - `training_modules`
    - `id` (uuid, primary key)
    - `agency_id` (uuid, FK to agencies, nullable) - agency-specific or global
    - `module_type` (text) - FIRST_TIME_WALKTHROUGH, CONTEXTUAL_TUTORIAL, TASK_BASED
    - `target_roles` (text[]) - array of role names
    - `title` (text) - module title
    - `description` (text) - module description
    - `content` (jsonb) - tutorial steps/content
    - `context_type` (text, nullable) - when to show (SHIFT_START, CARE_ACTION, etc.)
    - `is_mandatory` (boolean) - must be completed
    - `is_repeatable` (boolean) - can be repeated
    - `is_dismissible` (boolean) - can be dismissed
    - `display_order` (integer) - display order
    - `is_active` (boolean) - active status
    - `created_by` (uuid, FK to user_profiles) - who created
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    - `metadata` (jsonb) - additional data

  ## Security
  - RLS enabled
  - Role-based access

  ## Enforcement Rules
  1. Tutorials MUST be: non-blocking, dismissible, repeatable
  2. First-time user walkthroughs
  3. Contextual, task-based tutorials
  4. Role-specific guidance
*/

CREATE TABLE IF NOT EXISTS training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  module_type text NOT NULL CHECK (module_type IN ('FIRST_TIME_WALKTHROUGH', 'CONTEXTUAL_TUTORIAL', 'TASK_BASED')),
  target_roles text[] NOT NULL DEFAULT '{}',
  title text NOT NULL,
  description text NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  context_type text,
  is_mandatory boolean NOT NULL DEFAULT false,
  is_repeatable boolean NOT NULL DEFAULT true,
  is_dismissible boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'
);

ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_training_modules_agency_id ON training_modules(agency_id);
CREATE INDEX IF NOT EXISTS idx_training_modules_module_type ON training_modules(module_type);
CREATE INDEX IF NOT EXISTS idx_training_modules_target_roles ON training_modules USING GIN(target_roles);
CREATE INDEX IF NOT EXISTS idx_training_modules_context_type ON training_modules(context_type);
CREATE INDEX IF NOT EXISTS idx_training_modules_is_active ON training_modules(is_active);
CREATE INDEX IF NOT EXISTS idx_training_modules_display_order ON training_modules(display_order);
