/*
  # User Profiles Table

  1. Purpose
    - Links Supabase auth.users to system roles
    - Stores user profile data and role assignment
    - Brain logic layer uses this for permission checks

  2. New Tables
    - `user_profiles`
      - `id` (uuid, primary key) - references auth.users(id)
      - `role_id` (uuid, FK) - reference to roles table
      - `display_name` (text) - user display name
      - `is_active` (boolean) - whether user is active
      - `created_at` (timestamptz) - creation timestamp
      - `updated_at` (timestamptz) - last update timestamp

  3. Security
    - RLS enabled
    - Foreign key to auth.users for integrity

  4. Notes
    - One role per user (single role assignment)
    - Role changes are auditable via audit_log
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id),
  display_name text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_profiles_role_id ON user_profiles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);