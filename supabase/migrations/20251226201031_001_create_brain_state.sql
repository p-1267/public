/*
  # Brain State Table

  1. Purpose
    - Persistence layer for the Brain state machine
    - Stores current system state values
    - Brain logic layer owns all state transitions
    - Database is persistence only, not authoritative

  2. New Tables
    - `brain_state`
      - `id` (uuid, primary key) - single row identifier
      - `care_state` (text) - current care state, initially "UNINITIALIZED"
      - `emergency_state` (text) - current emergency state, initially "NONE"
      - `offline_online_state` (text) - current connectivity state, initially "ONLINE"
      - `state_version` (bigint) - monotonic version counter for optimistic locking
      - `last_transition_at` (timestamptz) - timestamp of last state change
      - `last_transition_by` (uuid) - user who triggered last transition
      - `created_at` (timestamptz) - row creation timestamp

  3. Security
    - RLS enabled
    - No policies created yet (will be added with permissions model)

  4. Constraints
    - Single row enforced via check constraint on id
    - State values are text to allow Brain logic to define valid transitions
*/

CREATE TABLE IF NOT EXISTS brain_state (
  id uuid PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
  care_state text NOT NULL DEFAULT 'UNINITIALIZED',
  emergency_state text NOT NULL DEFAULT 'NONE',
  offline_online_state text NOT NULL DEFAULT 'ONLINE',
  state_version bigint NOT NULL DEFAULT 1,
  last_transition_at timestamptz DEFAULT now(),
  last_transition_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT single_brain_state CHECK (id = '00000000-0000-0000-0000-000000000001'::uuid)
);

ALTER TABLE brain_state ENABLE ROW LEVEL SECURITY;

INSERT INTO brain_state (id, care_state, emergency_state, offline_online_state)
VALUES ('00000000-0000-0000-0000-000000000001'::uuid, 'UNINITIALIZED', 'NONE', 'ONLINE')
ON CONFLICT (id) DO NOTHING;