/*
  # AI Learning Inputs Table

  1. Purpose
    - Stores AI observations for learning
    - AI is non-executing: stores only, never acts
    - Requires explicit human acknowledgment
    - No foreign keys to action tables (enforces non-execution)

  2. New Tables
    - `ai_learning_inputs`
      - `id` (uuid, primary key) - unique input identifier
      - `input_type` (text) - type of AI observation
      - `input_data` (jsonb) - the observation data
      - `source_user_id` (uuid) - user context when input was generated
      - `acknowledged` (boolean) - whether human has acknowledged
      - `acknowledged_by_user_id` (uuid) - user who acknowledged
      - `acknowledged_at` (timestamptz) - when acknowledged
      - `brain_state_version` (bigint) - Brain state version at time of input
      - `created_at` (timestamptz) - when input was created

  3. Security
    - RLS enabled
    - No triggers that execute actions
    - No foreign keys to action tables

  4. Constraints
    - AI inputs are stored only
    - AI inputs require explicit human acknowledgment
    - AI inputs never modify brain_state
*/

CREATE TABLE IF NOT EXISTS ai_learning_inputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  input_type text NOT NULL,
  input_data jsonb NOT NULL,
  source_user_id uuid,
  acknowledged boolean NOT NULL DEFAULT false,
  acknowledged_by_user_id uuid,
  acknowledged_at timestamptz,
  brain_state_version bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_learning_inputs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_ai_learning_inputs_input_type ON ai_learning_inputs(input_type);
CREATE INDEX IF NOT EXISTS idx_ai_learning_inputs_acknowledged ON ai_learning_inputs(acknowledged);
CREATE INDEX IF NOT EXISTS idx_ai_learning_inputs_created_at ON ai_learning_inputs(created_at);