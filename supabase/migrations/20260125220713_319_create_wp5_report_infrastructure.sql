/*
  # WP5: AI-Generated Reports Infrastructure - Truth Enforced

  1. Purpose
    - Reports are DERIVED INTELLIGENCE, not templates
    - Computed from real operational + Brain data
    - Change when underlying data changes

  2. Core Tables
    - report_templates: Versioned prompts (NOT fill-in templates)
    - generated_reports: Computed reports with metadata
    - report_source_data_hashes: Track what data was used
    - report_edits: Supervisor edits logged
    - report_generation_log: Audit trail

  3. Truth Enforcement
    - No static templates
    - No pre-seeded reports
    - Reports change when data changes
*/

-- Report Templates (Versioned Prompts, NOT Fill-In Templates)
CREATE TABLE IF NOT EXISTS report_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL CHECK (report_type IN ('shift_report', 'daily_summary', 'incident_narrative', 'family_update')),
  version int NOT NULL,
  
  prompt_template text NOT NULL, -- Instructions for narrative generation
  data_extraction_rules jsonb NOT NULL, -- What data to pull and how
  redaction_rules jsonb, -- Privacy rules (especially for family)
  
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES user_profiles(id),
  
  UNIQUE(report_type, version)
);

CREATE INDEX IF NOT EXISTS idx_report_templates_type ON report_templates(report_type, is_active);

-- Generated Reports (Computed Output)
CREATE TABLE IF NOT EXISTS generated_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  report_type text NOT NULL,
  template_id uuid NOT NULL REFERENCES report_templates(id),
  template_version int NOT NULL,
  
  -- Report Context
  report_date date NOT NULL,
  shift_id uuid REFERENCES shifts(id),
  department_id uuid REFERENCES departments(id),
  resident_id uuid REFERENCES residents(id),
  incident_id uuid, -- For incident narratives
  
  -- Generated Content
  report_title text NOT NULL,
  report_content jsonb NOT NULL, -- Structured narrative with sections
  evidence_links jsonb NOT NULL, -- Links to tasks, photos, vitals, meds, Brain outputs
  
  -- Source Data Tracking
  source_data_hash text NOT NULL, -- Hash of input data (for change detection)
  source_data_snapshot jsonb NOT NULL, -- What data was used
  
  -- Brain Intelligence
  brain_findings jsonb, -- Risks, anomalies, trends from WP3
  
  -- Metadata
  generated_at timestamptz NOT NULL DEFAULT now(),
  generated_by_system boolean NOT NULL DEFAULT true,
  generation_method text NOT NULL DEFAULT 'heuristic_v1',
  
  -- State
  is_superseded boolean NOT NULL DEFAULT false, -- True if regenerated
  superseded_by uuid REFERENCES generated_reports(id),
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_generated_reports_agency ON generated_reports(agency_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_type ON generated_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_generated_reports_date ON generated_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_generated_reports_shift ON generated_reports(shift_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_department ON generated_reports(department_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_resident ON generated_reports(resident_id);

-- Report Source Data Hashes (Change Detection)
CREATE TABLE IF NOT EXISTS report_source_data_hashes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES generated_reports(id) ON DELETE CASCADE,
  
  data_type text NOT NULL, -- 'tasks', 'vitals', 'meds', 'incidents', 'brain_outputs'
  data_entity_id uuid NOT NULL, -- ID of the specific data entity
  data_hash text NOT NULL, -- Hash of the entity data
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_source_hashes_report ON report_source_data_hashes(report_id);
CREATE INDEX IF NOT EXISTS idx_report_source_hashes_entity ON report_source_data_hashes(data_entity_id);

-- Report Edits (Supervisor Modifications)
CREATE TABLE IF NOT EXISTS report_edits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid NOT NULL REFERENCES generated_reports(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  
  edited_by uuid NOT NULL REFERENCES user_profiles(id),
  edit_timestamp timestamptz NOT NULL DEFAULT now(),
  
  section_edited text NOT NULL, -- Which section was modified
  original_content text NOT NULL,
  edited_content text NOT NULL,
  edit_reason text,
  
  is_redaction boolean NOT NULL DEFAULT false, -- Privacy edit
  is_correction boolean NOT NULL DEFAULT false, -- Factual correction
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_edits_report ON report_edits(report_id);
CREATE INDEX IF NOT EXISTS idx_report_edits_editor ON report_edits(edited_by);

-- Report Generation Log (Audit Trail)
CREATE TABLE IF NOT EXISTS report_generation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  report_id uuid REFERENCES generated_reports(id) ON DELETE SET NULL,
  
  report_type text NOT NULL,
  generation_trigger text NOT NULL, -- 'manual', 'scheduled', 'data_change', 'regeneration'
  triggered_by uuid REFERENCES user_profiles(id),
  
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message text,
  
  data_extracted_count int,
  evidence_links_count int,
  brain_findings_count int,
  
  processing_started_at timestamptz,
  processing_completed_at timestamptz,
  processing_duration_ms int,
  
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_report_generation_log_agency ON report_generation_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_report_generation_log_type ON report_generation_log(report_type);
CREATE INDEX IF NOT EXISTS idx_report_generation_log_status ON report_generation_log(status);

-- RLS Policies
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_source_data_hashes ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_generation_log ENABLE ROW LEVEL SECURITY;

-- Report templates: Read by authenticated
CREATE POLICY "Users can view report templates"
  ON report_templates FOR SELECT
  TO authenticated
  USING (true);

-- Generated reports: Read by agency members
CREATE POLICY "Users can view reports in their agency"
  ON generated_reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.agency_id = generated_reports.agency_id
    )
  );

-- Report source hashes: Read by agency members
CREATE POLICY "Users can view report source hashes in their agency"
  ON report_source_data_hashes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM generated_reports
      JOIN user_profiles ON user_profiles.agency_id = generated_reports.agency_id
      WHERE generated_reports.id = report_source_data_hashes.report_id
      AND user_profiles.id = auth.uid()
    )
  );

-- Report edits: Insert by authenticated, read by agency members
CREATE POLICY "Users can edit reports in their agency"
  ON report_edits FOR INSERT
  TO authenticated
  WITH CHECK (
    edited_by = auth.uid()
  );

CREATE POLICY "Users can view report edits in their agency"
  ON report_edits FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.agency_id = report_edits.agency_id
    )
  );

-- Report generation log: Read by agency members
CREATE POLICY "Users can view report generation log in their agency"
  ON report_generation_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.agency_id = report_generation_log.agency_id
    )
  );

-- Seed Default Report Templates (Prompts, NOT Fill-In)
INSERT INTO report_templates (report_type, version, prompt_template, data_extraction_rules, redaction_rules, is_active) VALUES
(
  'shift_report',
  1,
  'Generate a concise shift handoff report covering: completed tasks, outstanding issues, resident status changes, and any incidents. Focus on actionable information for the incoming shift.',
  '{
    "required_data": ["tasks", "vitals", "medications", "incidents", "brain_anomalies"],
    "time_window": "shift_duration",
    "grouping": "by_resident",
    "priority_order": ["critical_items", "status_changes", "routine_tasks"]
  }'::jsonb,
  '{
    "exclude_fields": [],
    "audience": "caregivers"
  }'::jsonb,
  true
),
(
  'daily_summary',
  1,
  'Generate a comprehensive daily summary report for department management covering: task completion rates, resident health trends, staffing metrics, and any exceptions requiring attention.',
  '{
    "required_data": ["tasks", "vitals", "medications", "attendance", "brain_risks"],
    "time_window": "24_hours",
    "grouping": "by_department",
    "metrics": ["completion_rate", "exception_count", "health_trends"]
  }'::jsonb,
  '{
    "exclude_fields": [],
    "audience": "supervisors"
  }'::jsonb,
  true
),
(
  'incident_narrative',
  1,
  'Generate a detailed incident narrative reconstructing the timeline, involved parties, actions taken, and outcomes. Include all relevant evidence and context.',
  '{
    "required_data": ["incident_record", "tasks_around_time", "vitals_around_time", "brain_warnings"],
    "time_window": "incident_context",
    "grouping": "chronological",
    "detail_level": "comprehensive"
  }'::jsonb,
  '{
    "exclude_fields": [],
    "audience": "administrators"
  }'::jsonb,
  true
),
(
  'family_update',
  1,
  'Generate a family-friendly update covering: daily activities, health status (general), social interactions, and any notable events. Use warm, reassuring tone.',
  '{
    "required_data": ["tasks", "vitals_summary", "activities", "positive_events"],
    "time_window": "24_hours",
    "grouping": "by_category",
    "detail_level": "general"
  }'::jsonb,
  '{
    "exclude_fields": ["medication_names", "medical_diagnoses", "internal_notes", "staff_names"],
    "redact_medical_details": true,
    "tone": "family_friendly",
    "audience": "family"
  }'::jsonb,
  true
);
