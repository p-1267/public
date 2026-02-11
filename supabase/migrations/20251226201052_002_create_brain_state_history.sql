/*
  # Brain State History Table

  1. Purpose
    - Append-only log of all Brain state transitions
    - Provides complete auditability of state changes
    - Records previous and new state for each transition
    - Brain logic layer inserts records on state transitions

  2. New Tables
    - `brain_state_history`
      - `id` (uuid, primary key) - unique transition identifier
      - `state_version` (bigint) - version number after this transition
      - `previous_care_state` (text) - care state before transition
      - `new_care_state` (text) - care state after transition
      - `previous_emergency_state` (text) - emergency state before transition
      - `new_emergency_state` (text) - emergency state after transition
      - `previous_offline_online_state` (text) - connectivity state before transition
      - `new_offline_online_state` (text) - connectivity state after transition
      - `transition_reason` (text) - reason for the transition
      - `transitioned_by` (uuid) - user who triggered transition
      - `transitioned_at` (timestamptz) - when transition occurred

  3. Security
    - RLS enabled
    - Append-only by design (no updates, no deletes)

  4. Notes
    - No triggers - Brain logic layer explicitly inserts history records
    - Database is persistence only
*/

CREATE TABLE IF NOT EXISTS brain_state_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_version bigint NOT NULL,
  previous_care_state text,
  new_care_state text,
  previous_emergency_state text,
  new_emergency_state text,
  previous_offline_online_state text,
  new_offline_online_state text,
  transition_reason text,
  transitioned_by uuid,
  transitioned_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE brain_state_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_brain_state_history_version ON brain_state_history(state_version);
CREATE INDEX IF NOT EXISTS idx_brain_state_history_transitioned_at ON brain_state_history(transitioned_at);