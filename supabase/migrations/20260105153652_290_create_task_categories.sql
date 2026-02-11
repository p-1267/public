/*
  # Task Categories and Templates

  1. New Tables
    - `task_categories`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, references agencies) - NULL for system-wide categories
      - `name` (text) - Category name (e.g., "Medication", "Nutrition", "Hygiene")
      - `category_type` (text) - clinical, nutrition, cooking, hygiene, housekeeping, cleaning, monitoring, external, temporary, emergency
      - `description` (text)
      - `default_priority` (text) - low, medium, high, critical
      - `default_risk_level` (text) - A, B, C (risk level)
      - `requires_evidence` (boolean)
      - `allows_skip` (boolean)
      - `escalation_minutes` (integer) - minutes until escalation
      - `color_code` (text) - for UI display
      - `icon` (text) - icon identifier
      - `is_active` (boolean)
      - `sort_order` (integer)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)
      - `created_by` (uuid)
      - `updated_at` (timestamptz)

    - `task_templates`
      - `id` (uuid, primary key)
      - `agency_id` (uuid, references agencies)
      - `category_id` (uuid, references task_categories)
      - `template_name` (text)
      - `description` (text)
      - `default_duration_minutes` (integer)
      - `default_priority` (text)
      - `default_risk_level` (text)
      - `requires_certification` (boolean)
      - `certification_types` (text[])
      - `required_evidence_types` (text[]) - photo, voice, note, metric, signature
      - `completion_checklist` (jsonb) - [{item, required}]
      - `safety_warnings` (text[])
      - `instructions` (text)
      - `is_active` (boolean)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)
      - `created_by` (uuid)

  2. Security
    - Enable RLS on both tables
    - Policies for agency-based access
*/

CREATE TABLE IF NOT EXISTS task_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  name text NOT NULL,
  category_type text NOT NULL CHECK (category_type IN (
    'clinical', 'nutrition', 'cooking', 'hygiene', 'housekeeping', 
    'cleaning', 'monitoring', 'external', 'temporary', 'emergency'
  )),
  description text,
  default_priority text NOT NULL DEFAULT 'medium' CHECK (default_priority IN ('low', 'medium', 'high', 'critical')),
  default_risk_level text NOT NULL DEFAULT 'B' CHECK (default_risk_level IN ('A', 'B', 'C')),
  requires_evidence boolean NOT NULL DEFAULT false,
  allows_skip boolean NOT NULL DEFAULT false,
  escalation_minutes integer,
  color_code text,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(agency_id, name)
);

CREATE TABLE IF NOT EXISTS task_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES task_categories(id) ON DELETE RESTRICT,
  template_name text NOT NULL,
  description text,
  default_duration_minutes integer,
  default_priority text NOT NULL DEFAULT 'medium' CHECK (default_priority IN ('low', 'medium', 'high', 'critical')),
  default_risk_level text NOT NULL DEFAULT 'B' CHECK (default_risk_level IN ('A', 'B', 'C')),
  requires_certification boolean NOT NULL DEFAULT false,
  certification_types text[] DEFAULT ARRAY[]::text[],
  required_evidence_types text[] DEFAULT ARRAY[]::text[],
  completion_checklist jsonb DEFAULT '[]'::jsonb,
  safety_warnings text[] DEFAULT ARRAY[]::text[],
  instructions text,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(agency_id, template_name)
);

CREATE INDEX IF NOT EXISTS idx_task_categories_agency ON task_categories(agency_id);
CREATE INDEX IF NOT EXISTS idx_task_categories_type ON task_categories(category_type);
CREATE INDEX IF NOT EXISTS idx_task_categories_active ON task_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_task_templates_agency ON task_templates(agency_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_category ON task_templates(category_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_active ON task_templates(is_active);

ALTER TABLE task_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view categories in their agency or system-wide"
  ON task_categories FOR SELECT
  TO authenticated
  USING (
    agency_id IS NULL OR
    agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Agency admins can manage categories"
  ON task_categories FOR ALL
  TO authenticated
  USING (
    agency_id IN (
      SELECT up.agency_id FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() 
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR')
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT up.agency_id FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() 
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR')
    )
  );

CREATE POLICY "Users can view templates in their agency"
  ON task_templates FOR SELECT
  TO authenticated
  USING (
    agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Agency admins can manage templates"
  ON task_templates FOR ALL
  TO authenticated
  USING (
    agency_id IN (
      SELECT up.agency_id FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() 
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR')
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT up.agency_id FROM user_profiles up
      INNER JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid() 
      AND r.name IN ('AGENCY_ADMIN', 'SUPERVISOR')
    )
  );
