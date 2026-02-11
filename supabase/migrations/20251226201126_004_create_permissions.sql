/*
  # Permissions Table

  1. Purpose
    - Defines all system permissions
    - Permissions are owned by Brain state machine
    - Database persists permission definitions

  2. New Tables
    - `permissions`
      - `id` (uuid, primary key) - unique permission identifier
      - `name` (text, unique) - permission name
      - `description` (text) - human-readable description
      - `created_at` (timestamptz) - creation timestamp

  3. Seed Data
    - VIEW_BRAIN_STATE
    - MODIFY_BRAIN_STATE
    - VIEW_AUDIT_LOG
    - VIEW_CARE_DATA
    - WRITE_CARE_DATA
    - VIEW_EMERGENCY_STATE
    - TRIGGER_EMERGENCY
    - ACKNOWLEDGE_AI_INPUT
    - MANAGE_USERS
    - MANAGE_ROLES

  4. Security
    - RLS enabled
*/

CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

INSERT INTO permissions (name, description) VALUES
  ('VIEW_BRAIN_STATE', 'View current Brain state'),
  ('MODIFY_BRAIN_STATE', 'Modify Brain state (trigger transitions)'),
  ('VIEW_AUDIT_LOG', 'View audit log entries'),
  ('VIEW_CARE_DATA', 'View care data'),
  ('WRITE_CARE_DATA', 'Write care data'),
  ('VIEW_EMERGENCY_STATE', 'View emergency state'),
  ('TRIGGER_EMERGENCY', 'Trigger emergency state transitions'),
  ('ACKNOWLEDGE_AI_INPUT', 'Acknowledge AI learning inputs'),
  ('MANAGE_USERS', 'Manage system users'),
  ('MANAGE_ROLES', 'Manage roles and permissions')
ON CONFLICT (name) DO NOTHING;