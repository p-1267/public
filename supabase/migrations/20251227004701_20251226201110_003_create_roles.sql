/*
  # Roles Table

  1. Purpose
    - Defines all system roles
    - Roles are owned by Brain state machine
    - Database persists role definitions

  2. New Tables
    - `roles`
      - `id` (uuid, primary key) - unique role identifier
      - `name` (text, unique) - role name (SUPER_ADMIN, AGENCY_ADMIN, etc.)
      - `description` (text) - human-readable description
      - `is_system_role` (boolean) - true if non-human internal role
      - `created_at` (timestamptz) - creation timestamp

  3. Seed Data
    - SUPER_ADMIN
    - AGENCY_ADMIN
    - SUPERVISOR
    - CAREGIVER
    - FAMILY_VIEWER
    - SYSTEM (non-human, internal)

  4. Security
    - RLS enabled
*/

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_system_role boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

INSERT INTO roles (name, description, is_system_role) VALUES
  ('SUPER_ADMIN', 'Super administrator with all permissions', false),
  ('AGENCY_ADMIN', 'Agency administrator with all except system-level permissions', false),
  ('SUPERVISOR', 'Supervisor with view/write care, view audit, acknowledge AI', false),
  ('CAREGIVER', 'Caregiver with write care, view own care context, trigger emergency', false),
  ('FAMILY_VIEWER', 'Family viewer with view care data only', false),
  ('SYSTEM', 'Non-human internal system role', true)
ON CONFLICT (name) DO NOTHING;