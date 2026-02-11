/*
  # Resident Access Tokens for QR/Proximity Entry
  
  1. New Tables
    - `resident_access_tokens`
      - `id` (uuid, primary key)
      - `resident_id` (uuid, references residents)
      - `token` (text, unique) - QR code / proximity identifier
      - `token_type` (text) - 'qr_code', 'proximity', 'nfc'
      - `is_active` (boolean)
      - `expires_at` (timestamptz, nullable)
      - `created_at` (timestamptz)
      - `created_by` (uuid, references user_profiles)
      - `last_used_at` (timestamptz, nullable)
      - `use_count` (integer, default 0)
    
    - `resident_access_log`
      - `id` (uuid, primary key)
      - `resident_id` (uuid, references residents)
      - `token_id` (uuid, references resident_access_tokens)
      - `accessed_by` (uuid, references user_profiles) - caregiver who scanned
      - `access_method` (text) - 'qr_scan', 'proximity', 'nfc', 'manual'
      - `device_info` (jsonb) - device type, browser, etc.
      - `location_context` (text, nullable)
      - `duplicate_visit_detected` (boolean, default false)
      - `last_visit_by` (uuid, nullable, references user_profiles)
      - `last_visit_minutes_ago` (integer, nullable)
      - `accessed_at` (timestamptz)
  
  2. Security
    - Enable RLS on both tables
    - Caregivers can read tokens for their assigned residents
    - All authenticated users can log their own access
    - Supervisors and admins can read all access logs
  
  3. Indexes
    - Index on resident_id for fast lookups
    - Index on token for instant validation
    - Index on accessed_at for recent visit detection
*/

-- Create resident_access_tokens table
CREATE TABLE IF NOT EXISTS resident_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  token text UNIQUE NOT NULL,
  token_type text NOT NULL CHECK (token_type IN ('qr_code', 'proximity', 'nfc')),
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id),
  last_used_at timestamptz,
  use_count integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_resident_access_tokens_resident ON resident_access_tokens(resident_id);
CREATE INDEX IF NOT EXISTS idx_resident_access_tokens_token ON resident_access_tokens(token) WHERE is_active = true;

-- Create resident_access_log table
CREATE TABLE IF NOT EXISTS resident_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  token_id uuid REFERENCES resident_access_tokens(id) ON DELETE SET NULL,
  accessed_by uuid NOT NULL REFERENCES user_profiles(id),
  access_method text NOT NULL CHECK (access_method IN ('qr_scan', 'proximity', 'nfc', 'manual')),
  device_info jsonb DEFAULT '{}',
  location_context text,
  duplicate_visit_detected boolean DEFAULT false,
  last_visit_by uuid REFERENCES user_profiles(id),
  last_visit_minutes_ago integer,
  accessed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_resident_access_log_resident ON resident_access_log(resident_id);
CREATE INDEX IF NOT EXISTS idx_resident_access_log_accessed_by ON resident_access_log(accessed_by);
CREATE INDEX IF NOT EXISTS idx_resident_access_log_accessed_at ON resident_access_log(accessed_at DESC);

-- Enable RLS
ALTER TABLE resident_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE resident_access_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for resident_access_tokens
CREATE POLICY "Caregivers can view tokens for assigned residents"
  ON resident_access_tokens FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM caregiver_assignments
      WHERE caregiver_assignments.resident_id = resident_access_tokens.resident_id
      AND caregiver_assignments.caregiver_user_id = auth.uid()
      AND caregiver_assignments.status = 'active'
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role_id IN (
        SELECT id FROM roles WHERE name IN ('supervisor', 'agency_admin', 'super_admin')
      )
    )
  );

CREATE POLICY "Admins can manage tokens"
  ON resident_access_tokens FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role_id IN (
        SELECT id FROM roles WHERE name IN ('agency_admin', 'super_admin')
      )
    )
  );

-- RLS Policies for resident_access_log
CREATE POLICY "Users can view their own access logs"
  ON resident_access_log FOR SELECT
  TO authenticated
  USING (accessed_by = auth.uid());

CREATE POLICY "Supervisors and admins can view all access logs"
  ON resident_access_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role_id IN (
        SELECT id FROM roles WHERE name IN ('supervisor', 'agency_admin', 'super_admin')
      )
    )
  );

CREATE POLICY "Authenticated users can log their own access"
  ON resident_access_log FOR INSERT
  TO authenticated
  WITH CHECK (accessed_by = auth.uid());