/*
  # Supervisor Reviews and Department Reports
  
  Creates tables for task review workflow and daily reporting.
*/

-- Supervisor Reviews Table
CREATE TABLE IF NOT EXISTS supervisor_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE UNIQUE,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  reviewer_id uuid NOT NULL REFERENCES auth.users(id),
  review_status text NOT NULL CHECK (review_status IN ('pending', 'approved', 'rejected', 'needs_revision', 'escalated')),
  review_decision text,
  reviewer_comments text,
  quality_rating integer CHECK (quality_rating >= 1 AND quality_rating <= 5),
  flagged_issues text[] DEFAULT ARRAY[]::text[],
  required_actions text[] DEFAULT ARRAY[]::text[],
  escalated_to uuid REFERENCES auth.users(id),
  escalation_reason text,
  reviewed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_supervisor_reviews_task ON supervisor_reviews(task_id);
CREATE INDEX idx_supervisor_reviews_reviewer ON supervisor_reviews(reviewer_id);
CREATE INDEX idx_supervisor_reviews_status ON supervisor_reviews(review_status);

-- Department Daily Reports
CREATE TABLE IF NOT EXISTS department_daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  shift_type text NOT NULL CHECK (shift_type IN ('day', 'evening', 'night', 'all')),
  total_tasks_assigned integer NOT NULL DEFAULT 0,
  tasks_completed integer NOT NULL DEFAULT 0,
  tasks_in_progress integer NOT NULL DEFAULT 0,
  tasks_overdue integer NOT NULL DEFAULT 0,
  staff_on_duty integer NOT NULL DEFAULT 0,
  residents_served integer NOT NULL DEFAULT 0,
  total_evidence_submitted integer NOT NULL DEFAULT 0,
  completion_rate_percent numeric(5,2),
  quality_score_avg numeric(5,2),
  issues_reported integer NOT NULL DEFAULT 0,
  escalations integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'in_progress',
  summary_notes text,
  metadata jsonb DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(department_id, report_date, shift_type)
);

CREATE INDEX idx_dept_daily_reports_department ON department_daily_reports(department_id);
CREATE INDEX idx_dept_daily_reports_date ON department_daily_reports(report_date DESC);

-- Enable RLS
ALTER TABLE supervisor_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_daily_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "View reviews" ON supervisor_reviews FOR SELECT TO authenticated
USING (task_id IN (SELECT id FROM tasks WHERE agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid())));

CREATE POLICY "Manage reviews" ON supervisor_reviews FOR ALL TO authenticated
USING (task_id IN (SELECT t.id FROM tasks t INNER JOIN user_profiles up ON up.agency_id = t.agency_id INNER JOIN roles r ON up.role_id = r.id WHERE up.id = auth.uid() AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')));

CREATE POLICY "View reports" ON department_daily_reports FOR SELECT TO authenticated
USING (department_id IN (SELECT id FROM departments WHERE agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid())));

CREATE POLICY "Manage reports" ON department_daily_reports FOR ALL TO authenticated
USING (department_id IN (SELECT d.id FROM departments d INNER JOIN user_profiles up ON up.agency_id = d.agency_id INNER JOIN roles r ON up.role_id = r.id WHERE up.id = auth.uid() AND r.name IN ('SUPERVISOR', 'AGENCY_ADMIN')));
