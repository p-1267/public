/*
  # Audit Log Table

  1. Purpose
    - Append-only log of all system events
    - Records user actions for auditability
    - Brain logic layer inserts audit entries
    - Database is persistence only

  2. New Tables
    - `audit_log`
      - `id` (uuid, primary key) - unique entry identifier
      - `action_type` (text) - type of action performed
      - `actor_id` (uuid) - user who performed the action
      - `target_type` (text) - type of entity affected
      - `target_id` (uuid) - id of entity affected
      - `previous_state` (jsonb) - state before action
      - `new_state` (jsonb) - state after action
      - `metadata` (jsonb) - additional context
      - `brain_state_version` (bigint) - Brain state version at time of action
      - `created_at` (timestamptz) - when action occurred

  3. Security
    - RLS enabled
    - Append-only by design (no updates, no deletes)

  4. Notes
    - No triggers - Brain logic layer explicitly inserts entries
    - All entries reference Brain state version for correlation
*/

CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  actor_id uuid,
  target_type text,
  target_id uuid,
  previous_state jsonb,
  new_state jsonb,
  metadata jsonb,
  brain_state_version bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_audit_log_action_type ON audit_log(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_target_type ON audit_log(target_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_brain_state_version ON audit_log(brain_state_version);