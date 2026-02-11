/*
  # Care State Transitions Table

  1. New Tables
    - `care_state_transitions`
      - `id` (uuid, primary key)
      - `from_state` (text, not null) - source care state
      - `to_state` (text, not null) - target care state
      - `created_at` (timestamptz)

  2. Purpose
    - Defines the ONLY valid transitions between care states
    - Database validates transitions strictly - no inference or fallbacks
    - Invalid transitions are rejected with explicit errors

  3. Valid States
    - IDLE: No active care session
    - PREPARING: Care session being set up
    - ACTIVE: Care session in progress
    - PAUSED: Care session temporarily suspended
    - COMPLETING: Care session wrapping up

  4. Security
    - RLS enabled
    - Read-only for authenticated users (lookup only)
    - No insert/update/delete policies (seed data only)
*/

CREATE TABLE IF NOT EXISTS care_state_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_state text NOT NULL,
  to_state text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(from_state, to_state)
);

ALTER TABLE care_state_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read care transitions"
  ON care_state_transitions
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

INSERT INTO care_state_transitions (from_state, to_state) VALUES
  ('IDLE', 'PREPARING'),
  ('PREPARING', 'ACTIVE'),
  ('PREPARING', 'IDLE'),
  ('ACTIVE', 'PAUSED'),
  ('ACTIVE', 'COMPLETING'),
  ('PAUSED', 'ACTIVE'),
  ('PAUSED', 'COMPLETING'),
  ('COMPLETING', 'IDLE')
ON CONFLICT (from_state, to_state) DO NOTHING;