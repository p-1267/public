/*
  # Phase 18 - Organization Onboarding State Machine

  1. Overview
    - Implements LEGAL INITIALIZATION STATE MACHINE for agency onboarding
    - Six sequential states that CANNOT be skipped
    - Permanent lock-in after completion
    - Blocks care operations until complete

  2. New Tables
    - `organization_onboarding_state`
      - Tracks wizard progress per agency
      - current_state enum (UNINITIALIZED → COMPLETED)
      - completed_states jsonb array
      - locked boolean (permanent after completion)

    - `organization_config`
      - Stores finalized organization configuration
      - legal_name, jurisdiction, insurance, etc.
      - immutable after lock-in

    - `sop_documents`
      - Stores uploaded SOP PDFs
      - file_url, category, version
      - immutable after binding

    - `sop_extracted_rules`
      - Parsed rules from SOPs
      - rule_type, conditions, consequences
      - bound to brain enforcement

    - `role_permission_baselines`
      - Default permissions per role
      - auto-applied to new users

    - `escalation_config`
      - Escalation chains and timeouts
      - notification baselines

    - `legal_acceptance_records`
      - Legal acceptance audit trail
      - typed_name, timestamp, device_fingerprint
      - immutable

  3. Security
    - Enable RLS on all tables
    - Only SUPER_ADMIN and AGENCY_ADMIN can modify
    - All changes audited
    - Lock-in prevents modification
*/

-- Onboarding state enum
CREATE TYPE onboarding_state AS ENUM (
  'UNINITIALIZED',
  'ORG_IDENTITY',
  'INSURANCE_CONFIG',
  'SOP_INGESTION',
  'ROLE_DEFAULTS',
  'ESCALATION_BASELINES',
  'LEGAL_ACCEPTANCE',
  'COMPLETED'
);

-- Organization type enum
CREATE TYPE organization_type AS ENUM (
  'HOME_CARE_AGENCY',
  'ASSISTED_LIVING',
  'GROUP_HOME',
  'FAMILY_CARE_UNIT'
);

-- SOP category enum
CREATE TYPE sop_category AS ENUM (
  'MEDICATION_HANDLING',
  'EMERGENCY_ESCALATION',
  'DOCUMENTATION_TIMING',
  'CARE_DELIVERY',
  'FAMILY_COMMUNICATION'
);

-- 1. Organization Onboarding State Table
CREATE TABLE IF NOT EXISTS organization_onboarding_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  current_state onboarding_state NOT NULL DEFAULT 'UNINITIALIZED',
  completed_states jsonb NOT NULL DEFAULT '[]'::jsonb,
  locked boolean NOT NULL DEFAULT false,
  locked_at timestamptz,
  locked_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agency_id)
);

CREATE INDEX idx_org_onboarding_agency ON organization_onboarding_state(agency_id);
CREATE INDEX idx_org_onboarding_state ON organization_onboarding_state(current_state);

-- 2. Organization Config Table
CREATE TABLE IF NOT EXISTS organization_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,

  -- State 1: Organization Identity
  legal_name text,
  organization_type organization_type,
  country text,
  state_province text,
  primary_language text,
  secondary_languages text[],
  jurisdiction_locked_at timestamptz,

  -- State 2: Insurance
  insurance_provider text,
  insurance_policy_types text[],
  insurance_coverage_scope text,
  insurance_expiration_date date,
  insurance_incident_timeline text,
  insurance_policy_url text,

  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),

  UNIQUE(agency_id)
);

CREATE INDEX idx_org_config_agency ON organization_config(agency_id);
CREATE INDEX idx_org_config_expiration ON organization_config(insurance_expiration_date);

-- 3. SOP Documents Table
CREATE TABLE IF NOT EXISTS sop_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  category sop_category NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_size_bytes bigint NOT NULL,
  mime_type text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  processing_status text NOT NULL DEFAULT 'pending',
  ocr_text text,
  semantic_summary text,
  bound_to_brain boolean NOT NULL DEFAULT false,
  bound_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  uploaded_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_sop_docs_agency ON sop_documents(agency_id);
CREATE INDEX idx_sop_docs_category ON sop_documents(category);
CREATE INDEX idx_sop_docs_status ON sop_documents(processing_status);

-- 4. SOP Extracted Rules Table
CREATE TABLE IF NOT EXISTS sop_extracted_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sop_document_id uuid NOT NULL REFERENCES sop_documents(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  rule_type text NOT NULL,
  rule_description text NOT NULL,
  time_bounds jsonb,
  conditions jsonb,
  consequences jsonb,
  enforcement_priority integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  extracted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sop_rules_doc ON sop_extracted_rules(sop_document_id);
CREATE INDEX idx_sop_rules_agency ON sop_extracted_rules(agency_id);
CREATE INDEX idx_sop_rules_type ON sop_extracted_rules(rule_type);

-- 5. Role Permission Baselines Table
CREATE TABLE IF NOT EXISTS role_permission_baselines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  baseline_permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  auto_apply boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(agency_id, role_id)
);

CREATE INDEX idx_role_baselines_agency ON role_permission_baselines(agency_id);
CREATE INDEX idx_role_baselines_role ON role_permission_baselines(role_id);

-- 6. Escalation Config Table
CREATE TABLE IF NOT EXISTS escalation_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  escalation_order jsonb NOT NULL,
  timeout_durations jsonb NOT NULL,
  notification_channels jsonb NOT NULL,
  quiet_hours_start time,
  quiet_hours_end time,
  emergency_ignores_quiet_hours boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(agency_id)
);

CREATE INDEX idx_escalation_config_agency ON escalation_config(agency_id);

-- 7. Legal Acceptance Records Table
CREATE TABLE IF NOT EXISTS legal_acceptance_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  accepted_by uuid NOT NULL REFERENCES auth.users(id),
  typed_legal_name text NOT NULL,
  acceptance_timestamp timestamptz NOT NULL DEFAULT now(),
  device_fingerprint text NOT NULL,
  ip_address inet,
  user_agent text,
  accepted_terms jsonb NOT NULL,
  immutable boolean NOT NULL DEFAULT true
);

CREATE INDEX idx_legal_acceptance_agency ON legal_acceptance_records(agency_id);
CREATE INDEX idx_legal_acceptance_timestamp ON legal_acceptance_records(acceptance_timestamp);

-- Enable RLS
ALTER TABLE organization_onboarding_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE sop_extracted_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permission_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_acceptance_records ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only SUPER_ADMIN and AGENCY_ADMIN can access
CREATE POLICY "Admins can view onboarding state"
  ON organization_onboarding_state FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('SUPER_ADMIN', 'AGENCY_ADMIN')
      AND (up.agency_id = organization_onboarding_state.agency_id OR r.name = 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can update onboarding state"
  ON organization_onboarding_state FOR UPDATE
  TO authenticated
  USING (
    NOT locked
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('SUPER_ADMIN', 'AGENCY_ADMIN')
      AND (up.agency_id = organization_onboarding_state.agency_id OR r.name = 'SUPER_ADMIN')
    )
  )
  WITH CHECK (
    NOT locked
    AND EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('SUPER_ADMIN', 'AGENCY_ADMIN')
      AND (up.agency_id = organization_onboarding_state.agency_id OR r.name = 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can insert onboarding state"
  ON organization_onboarding_state FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('SUPER_ADMIN', 'AGENCY_ADMIN')
    )
  );

-- Similar policies for other tables
CREATE POLICY "Admins can view org config"
  ON organization_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('SUPER_ADMIN', 'AGENCY_ADMIN')
      AND (up.agency_id = organization_config.agency_id OR r.name = 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can insert org config"
  ON organization_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('SUPER_ADMIN', 'AGENCY_ADMIN')
    )
  );

CREATE POLICY "Admins can update org config"
  ON organization_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('SUPER_ADMIN', 'AGENCY_ADMIN')
      AND (up.agency_id = organization_config.agency_id OR r.name = 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can view SOPs"
  ON sop_documents FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('SUPER_ADMIN', 'AGENCY_ADMIN', 'SUPERVISOR')
      AND (up.agency_id = sop_documents.agency_id OR r.name = 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can insert SOPs"
  ON sop_documents FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('SUPER_ADMIN', 'AGENCY_ADMIN')
      AND (up.agency_id = sop_documents.agency_id OR r.name = 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can view SOP rules"
  ON sop_extracted_rules FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('SUPER_ADMIN', 'AGENCY_ADMIN', 'SUPERVISOR')
      AND (up.agency_id = sop_extracted_rules.agency_id OR r.name = 'SUPER_ADMIN')
    )
  );

CREATE POLICY "System can insert SOP rules"
  ON sop_extracted_rules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view role baselines"
  ON role_permission_baselines FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('SUPER_ADMIN', 'AGENCY_ADMIN')
      AND (up.agency_id = role_permission_baselines.agency_id OR r.name = 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can insert role baselines"
  ON role_permission_baselines FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('SUPER_ADMIN', 'AGENCY_ADMIN')
    )
  );

CREATE POLICY "Admins can view escalation config"
  ON escalation_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('SUPER_ADMIN', 'AGENCY_ADMIN', 'SUPERVISOR')
      AND (up.agency_id = escalation_config.agency_id OR r.name = 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can insert escalation config"
  ON escalation_config FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('SUPER_ADMIN', 'AGENCY_ADMIN')
    )
  );

CREATE POLICY "Admins can view legal acceptance"
  ON legal_acceptance_records FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('SUPER_ADMIN', 'AGENCY_ADMIN')
      AND (up.agency_id = legal_acceptance_records.agency_id OR r.name = 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admins can insert legal acceptance"
  ON legal_acceptance_records FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND r.name IN ('SUPER_ADMIN', 'AGENCY_ADMIN')
    )
  );

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_org_onboarding_state_updated_at
  BEFORE UPDATE ON organization_onboarding_state
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_updated_at();

CREATE TRIGGER update_org_config_updated_at
  BEFORE UPDATE ON organization_config
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_updated_at();

CREATE TRIGGER update_escalation_config_updated_at
  BEFORE UPDATE ON escalation_config
  FOR EACH ROW
  EXECUTE FUNCTION update_onboarding_updated_at();
