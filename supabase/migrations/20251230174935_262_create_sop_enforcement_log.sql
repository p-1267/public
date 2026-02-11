/*
  # Create SOP Enforcement Log Table

  1. New Tables
    - `sop_enforcement_log`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, foreign key to agencies, required)
      - `sop_rule_id` (uuid, foreign key to sop_extracted_rules, required)
      - `resident_id` (uuid, foreign key to residents, nullable)
      - `user_id` (uuid, foreign key to user_profiles, required)
      - `user_role` (text, role name at time of enforcement)
      - `enforcement_type` (enum: BLOCK, WARN, LOG, ESCALATE)
      - `enforcement_result` (enum: BLOCKED, WARNING_SHOWN, LOGGED_ONLY, ESCALATED, OVERRIDDEN)
      - `triggered_at` (timestamptz, when enforcement triggered)
      - `action_attempted` (text, what action was attempted)
      - `action_context` (jsonb, full context of the action)
      - `rule_condition_met` (text, which condition triggered)
      - `enforcement_message` (text, message shown to user)
      - `override_by` (uuid, nullable, who overrode the enforcement)
      - `override_reason` (text, nullable)
      - `override_at` (timestamptz, nullable)
      - `violation_created_id` (uuid, nullable, reference to sop_violations)
      - `brain_state_version` (integer, state version at enforcement time)
      - `created_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `sop_enforcement_log` table
    - Immutable audit trail (no UPDATE/DELETE)

  3. Indexes
    - Index on agency_id, sop_rule_id, resident_id, user_id
    - Index on enforcement_type, enforcement_result, triggered_at
    - Index on violation_created_id
*/

-- Create enum types
DO $$ BEGIN
  CREATE TYPE enforcement_type AS ENUM ('BLOCK', 'WARN', 'LOG', 'ESCALATE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE enforcement_result AS ENUM ('BLOCKED', 'WARNING_SHOWN', 'LOGGED_ONLY', 'ESCALATED', 'OVERRIDDEN');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create sop_enforcement_log table
CREATE TABLE IF NOT EXISTS sop_enforcement_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  sop_rule_id uuid NOT NULL REFERENCES sop_extracted_rules(id) ON DELETE RESTRICT,
  resident_id uuid REFERENCES residents(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE RESTRICT,
  user_role text NOT NULL,
  enforcement_type enforcement_type NOT NULL,
  enforcement_result enforcement_result NOT NULL,
  triggered_at timestamptz NOT NULL DEFAULT now(),
  action_attempted text NOT NULL,
  action_context jsonb NOT NULL DEFAULT '{}'::jsonb,
  rule_condition_met text NOT NULL,
  enforcement_message text NOT NULL,
  override_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  override_reason text,
  override_at timestamptz,
  violation_created_id uuid REFERENCES sop_violations(id) ON DELETE SET NULL,
  brain_state_version integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT override_logic CHECK (
    (enforcement_result != 'OVERRIDDEN' AND override_by IS NULL AND override_at IS NULL) OR
    (enforcement_result = 'OVERRIDDEN' AND override_by IS NOT NULL AND override_at IS NOT NULL AND override_reason IS NOT NULL)
  )
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sop_enforcement_agency ON sop_enforcement_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_sop_enforcement_rule ON sop_enforcement_log(sop_rule_id);
CREATE INDEX IF NOT EXISTS idx_sop_enforcement_resident ON sop_enforcement_log(resident_id) WHERE resident_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sop_enforcement_user ON sop_enforcement_log(user_id);
CREATE INDEX IF NOT EXISTS idx_sop_enforcement_type_result ON sop_enforcement_log(enforcement_type, enforcement_result, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_sop_enforcement_violation ON sop_enforcement_log(violation_created_id) WHERE violation_created_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sop_enforcement_overridden ON sop_enforcement_log(override_by) WHERE override_by IS NOT NULL;

-- Enable RLS
ALTER TABLE sop_enforcement_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Immutable audit trail)
CREATE POLICY "Agency admins and supervisors can view enforcement log"
  ON sop_enforcement_log FOR SELECT
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

CREATE POLICY "Users can view their own enforcement log"
  ON sop_enforcement_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create enforcement log entries"
  ON sop_enforcement_log FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- NO UPDATE OR DELETE POLICIES - Immutable audit trail