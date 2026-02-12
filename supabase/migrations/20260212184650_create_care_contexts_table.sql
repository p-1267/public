/*
  # Create Care Contexts Table

  1. New Table
    - `care_contexts`
      - `id` (uuid, primary key)
      - `resident_id` (uuid, foreign key to residents)
      - `management_mode` (text enum: SELF, FAMILY_MANAGED, AGENCY_MANAGED)
      - `care_setting` (text enum: IN_HOME, FACILITY)
      - `service_model` (text enum: NONE, DIRECT_HIRE, AGENCY_HOME_CARE, AGENCY_FACILITY)
      - `agency_id` (uuid, nullable, foreign key to agencies)
      - `family_admin_user_id` (uuid, nullable, foreign key to user_profiles)
      - `supervision_enabled` (boolean)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Constraints
    - Only ONE active context per resident

  3. Security
    - Enable RLS
    - Add policies for authenticated users
*/

-- Create care_contexts table
CREATE TABLE IF NOT EXISTS care_contexts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  management_mode text NOT NULL CHECK (management_mode IN ('SELF', 'FAMILY_MANAGED', 'AGENCY_MANAGED')),
  care_setting text NOT NULL CHECK (care_setting IN ('IN_HOME', 'FACILITY')),
  service_model text NOT NULL CHECK (service_model IN ('NONE', 'DIRECT_HIRE', 'AGENCY_HOME_CARE', 'AGENCY_FACILITY')),
  agency_id uuid REFERENCES agencies(id) ON DELETE SET NULL,
  family_admin_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  supervision_enabled boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create unique constraint: only one active context per resident
CREATE UNIQUE INDEX IF NOT EXISTS care_contexts_active_per_resident 
  ON care_contexts(resident_id) 
  WHERE is_active = true;

-- Create index on resident_id
CREATE INDEX IF NOT EXISTS idx_care_contexts_resident_id ON care_contexts(resident_id);

-- Enable RLS
ALTER TABLE care_contexts ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read care contexts
CREATE POLICY "Authenticated users can read care contexts"
  ON care_contexts FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert care contexts
CREATE POLICY "Authenticated users can insert care contexts"
  ON care_contexts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update care contexts
CREATE POLICY "Authenticated users can update care contexts"
  ON care_contexts FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Anonymous users can read care contexts (for showcase)
CREATE POLICY "Anonymous users can read care contexts"
  ON care_contexts FOR SELECT
  TO anon
  USING (true);

-- Policy: Anonymous users can insert care contexts (for showcase)
CREATE POLICY "Anonymous users can insert care contexts"
  ON care_contexts FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Anonymous users can update care contexts (for showcase)
CREATE POLICY "Anonymous users can update care contexts"
  ON care_contexts FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
