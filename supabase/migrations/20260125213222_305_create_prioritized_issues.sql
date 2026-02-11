/*
  # Prioritized Issues - Ranked Decision Support

  1. Purpose
    - Provide supervisors with ranked list of issues requiring attention
    - Combine urgency, severity, confidence into priority score
    - Link to anomalies, risk scores, and suggested actions

  2. Priority Calculation
    - urgency (time-sensitive) × severity (impact) × confidence (reliability)
    - Adjustments for resident acuity, regulatory requirements
    - Human review status tracking

  3. Schema
    - Issue description and context
    - Priority score (0-100)
    - Status tracking
    - Action recommendations
    - Evidence and explanation links
*/

CREATE TABLE IF NOT EXISTS prioritized_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  
  issue_type text NOT NULL,
  issue_category text NOT NULL CHECK (issue_category IN ('resident_health', 'caregiver_performance', 'operational', 'compliance')),
  
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE,
  caregiver_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  
  title text NOT NULL,
  description text NOT NULL,
  
  priority_score integer NOT NULL CHECK (priority_score >= 0 AND priority_score <= 100),
  urgency_score integer NOT NULL CHECK (urgency_score >= 0 AND urgency_score <= 100),
  severity_score integer NOT NULL CHECK (severity_score >= 0 AND severity_score <= 100),
  confidence_score numeric NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  risk_score_id uuid REFERENCES risk_scores(id) ON DELETE SET NULL,
  anomaly_ids uuid[],
  
  suggested_actions jsonb DEFAULT '[]'::jsonb,
  
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'investigating', 'action_taken', 'resolved', 'dismissed')),
  assigned_to uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  assigned_at timestamptz,
  
  acknowledged_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  acknowledged_at timestamptz,
  
  resolved_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolution_notes text,
  
  expires_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prioritized_issues_agency ON prioritized_issues(agency_id);
CREATE INDEX IF NOT EXISTS idx_prioritized_issues_resident ON prioritized_issues(resident_id) WHERE resident_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prioritized_issues_caregiver ON prioritized_issues(caregiver_id) WHERE caregiver_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prioritized_issues_category ON prioritized_issues(issue_category);
CREATE INDEX IF NOT EXISTS idx_prioritized_issues_priority ON prioritized_issues(priority_score DESC);
CREATE INDEX IF NOT EXISTS idx_prioritized_issues_status ON prioritized_issues(status);
CREATE INDEX IF NOT EXISTS idx_prioritized_issues_created_at ON prioritized_issues(created_at DESC);

ALTER TABLE prioritized_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view agency prioritized issues"
  ON prioritized_issues FOR SELECT
  TO authenticated
  USING (agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "Supervisors can manage prioritized issues"
  ON prioritized_issues FOR ALL
  TO authenticated
  USING (agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()))
  WITH CHECK (agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()));
