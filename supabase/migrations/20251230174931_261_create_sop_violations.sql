/*
  # Create SOP Violations Table

  1. New Tables
    - `sop_violations`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, foreign key to agencies, required)
      - `sop_rule_id` (uuid, foreign key to sop_extracted_rules, required)
      - `resident_id` (uuid, foreign key to residents, nullable)
      - `user_id` (uuid, foreign key to user_profiles, required)
      - `user_role` (text, role name at time of violation)
      - `violation_type` (enum: TIMING, DOSAGE, PROCEDURE, DOCUMENTATION, ESCALATION)
      - `severity` (enum: LOW, MODERATE, HIGH, CRITICAL)
      - `detected_at` (timestamptz, when violation detected)
      - `detected_by` (enum: SYSTEM_AUTOMATIC, SUPERVISOR_MANUAL, AUDIT_REVIEW)
      - `violation_details` (jsonb, context and evidence)
      - `action_context` (jsonb, what action triggered the violation)
      - `expected_behavior` (text, what should have happened)
      - `actual_behavior` (text, what actually happened)
      - `auto_escalated` (boolean, whether escalation was triggered)
      - `escalation_chain_id` (uuid, nullable, reference to escalation)
      - `supervisor_notified` (boolean)
      - `supervisor_id` (uuid, nullable, who was notified)
      - `remediation_required` (boolean)
      - `remediation_completed_at` (timestamptz, nullable)
      - `remediation_notes` (text, nullable)
      - `incident_created` (boolean, whether formal incident was created)
      - `incident_id` (uuid, nullable)
      - `acknowledged_by` (uuid, nullable)
      - `acknowledged_at` (timestamptz, nullable)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `sop_violations` table
    - Add policies for role-based access

  3. Indexes
    - Index on agency_id, sop_rule_id, resident_id, user_id
    - Index on violation_type, severity, detected_at
    - Index on auto_escalated, remediation_required
*/

-- Create enum types
DO $$ BEGIN
  CREATE TYPE violation_type AS ENUM ('TIMING', 'DOSAGE', 'PROCEDURE', 'DOCUMENTATION', 'ESCALATION');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE violation_severity AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE violation_detection_method AS ENUM ('SYSTEM_AUTOMATIC', 'SUPERVISOR_MANUAL', 'AUDIT_REVIEW');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create sop_violations table
CREATE TABLE IF NOT EXISTS sop_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  sop_rule_id uuid NOT NULL REFERENCES sop_extracted_rules(id) ON DELETE RESTRICT,
  resident_id uuid REFERENCES residents(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  user_role text NOT NULL,
  violation_type violation_type NOT NULL,
  severity violation_severity NOT NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  detected_by violation_detection_method NOT NULL,
  violation_details jsonb NOT NULL DEFAULT '{}'::jsonb,
  action_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  expected_behavior text NOT NULL,
  actual_behavior text NOT NULL,
  auto_escalated boolean NOT NULL DEFAULT false,
  escalation_chain_id uuid,
  supervisor_notified boolean NOT NULL DEFAULT false,
  supervisor_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  remediation_required boolean NOT NULL DEFAULT false,
  remediation_completed_at timestamptz,
  remediation_notes text,
  incident_created boolean NOT NULL DEFAULT false,
  incident_id uuid,
  acknowledged_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT remediation_logic CHECK (
    (remediation_required = false) OR 
    (remediation_required = true AND (remediation_completed_at IS NULL OR remediation_notes IS NOT NULL))
  ),
  CONSTRAINT acknowledgment_logic CHECK (
    (acknowledged_at IS NULL AND acknowledged_by IS NULL) OR
    (acknowledged_at IS NOT NULL AND acknowledged_by IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sop_violations_agency ON sop_violations(agency_id);
CREATE INDEX IF NOT EXISTS idx_sop_violations_rule ON sop_violations(sop_rule_id);
CREATE INDEX IF NOT EXISTS idx_sop_violations_resident ON sop_violations(resident_id) WHERE resident_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sop_violations_user ON sop_violations(user_id);
CREATE INDEX IF NOT EXISTS idx_sop_violations_type_severity ON sop_violations(violation_type, severity, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_sop_violations_escalated ON sop_violations(auto_escalated) WHERE auto_escalated = true;
CREATE INDEX IF NOT EXISTS idx_sop_violations_remediation ON sop_violations(remediation_required) WHERE remediation_required = true AND remediation_completed_at IS NULL;

-- Enable RLS
ALTER TABLE sop_violations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Agency admins can view all violations in their agency"
  ON sop_violations FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR')
    )
  );

CREATE POLICY "Users can view their own violations"
  ON sop_violations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create violations"
  ON sop_violations FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Supervisors can acknowledge violations"
  ON sop_violations FOR UPDATE
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR')
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR')
    )
  );