/*
  # Resident Care Plan Anchors Table (Phase 20)

  ## Purpose
  Stores care plan expectations and anchors for residents.
  Anchors inform Brain expectations but do NOT auto-generate tasks.
  Deviations are logged, not auto-corrected.

  ## New Tables
  - `resident_care_plan_anchors`
    - `id` (uuid, primary key)
    - `resident_id` (uuid, FK to residents) - one anchor set per resident
    - `care_frequency` (text) - DAILY_MULTIPLE, DAILY, WEEKLY, etc.
    - `mobility_assistance_needs` (text[]) - array of needs
    - `behavioral_considerations` (text, nullable) - behavioral notes
    - `dietary_restrictions` (text[], nullable) - array of restrictions
    - `dietary_preferences` (text[], nullable) - array of preferences
    - `sleep_patterns` (jsonb) - typical sleep schedule
    - `known_triggers` (text[], nullable) - array of triggers or sensitivities
    - `communication_preferences` (text, nullable) - how resident prefers to communicate
    - `activity_preferences` (text[], nullable) - preferred activities
    - `social_needs` (text, nullable) - social interaction needs
    - `special_considerations` (text, nullable) - any special needs
    - `entered_by` (uuid, FK to user_profiles)
    - `language_context` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Security
  - RLS enabled
  - Protected information
  - Informs Brain logic

  ## Enforcement Rules
  1. Care plan anchors are expectations, not rigid rules
  2. Brain uses anchors to detect deviations
  3. Anchors do NOT auto-generate tasks
  4. Updates to anchors trigger Brain recalculation
*/

CREATE TABLE IF NOT EXISTS resident_care_plan_anchors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL UNIQUE REFERENCES residents(id) ON DELETE CASCADE,
  care_frequency text NOT NULL CHECK (care_frequency IN ('HOURLY', 'DAILY_MULTIPLE', 'DAILY', 'WEEKLY', 'AS_NEEDED')),
  mobility_assistance_needs text[] NOT NULL DEFAULT '{}',
  behavioral_considerations text,
  dietary_restrictions text[] DEFAULT '{}',
  dietary_preferences text[] DEFAULT '{}',
  sleep_patterns jsonb NOT NULL DEFAULT '{"typical_bedtime": "22:00", "typical_wake": "07:00"}',
  known_triggers text[] DEFAULT '{}',
  communication_preferences text,
  activity_preferences text[] DEFAULT '{}',
  social_needs text,
  special_considerations text,
  entered_by uuid NOT NULL REFERENCES user_profiles(id),
  language_context text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE resident_care_plan_anchors ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_resident_care_plan_anchors_resident_id ON resident_care_plan_anchors(resident_id);
