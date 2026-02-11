/*
  # Emergency State Transition Validation

  1. New Tables
    - `emergency_state_transitions`
      - `id` (serial, primary key)
      - `from_state` (text) - source state
      - `to_state` (text) - target state
      - `created_at` (timestamptz)

  2. Purpose
    - Defines ALLOWED state transitions for emergency_state
    - Database validates transitions but does NOT initiate them
    - All transition decisions owned by Brain logic layer

  3. Valid Transitions
    - NONE -> PENDING (escalation initiated)
    - PENDING -> ACTIVE (activation confirmed)
    - PENDING -> NONE (cancellation)
    - ACTIVE -> NONE (resolution)

  4. Security
    - RLS enabled, read-only for authenticated users
    - Only system can modify transition rules
*/

CREATE TABLE IF NOT EXISTS emergency_state_transitions (
  id serial PRIMARY KEY,
  from_state text NOT NULL,
  to_state text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(from_state, to_state)
);

INSERT INTO emergency_state_transitions (from_state, to_state) VALUES
  ('NONE', 'PENDING'),
  ('PENDING', 'ACTIVE'),
  ('PENDING', 'NONE'),
  ('ACTIVE', 'NONE')
ON CONFLICT (from_state, to_state) DO NOTHING;

ALTER TABLE emergency_state_transitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read transition rules"
  ON emergency_state_transitions
  FOR SELECT
  TO authenticated
  USING (true);
