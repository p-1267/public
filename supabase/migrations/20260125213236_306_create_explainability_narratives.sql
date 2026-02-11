/*
  # Explainability Narratives - "Why Flagged" Documentation

  1. Purpose
    - Provide human-readable explanations for every Brain decision
    - Link explanations to supporting evidence
    - Enable transparency and trust in AI-grade intelligence

  2. Narrative Types
    - Anomaly detection explanations
    - Risk score justifications
    - Priority calculation breakdowns
    - Intervention recommendations

  3. Schema
    - Plain English narrative
    - Evidence links (tasks, observations, baselines)
    - Confidence and reasoning chain
    - Regulation/compliance references
*/

CREATE TABLE IF NOT EXISTS explainability_narratives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  
  subject_type text NOT NULL CHECK (subject_type IN ('anomaly', 'risk_score', 'prioritized_issue', 'intervention')),
  subject_id uuid NOT NULL,
  
  narrative_type text NOT NULL CHECK (narrative_type IN ('detection_explanation', 'risk_justification', 'priority_reasoning', 'intervention_rationale')),
  
  narrative_text text NOT NULL,
  narrative_summary text NOT NULL,
  
  reasoning_chain jsonb DEFAULT '[]'::jsonb,
  
  evidence_links jsonb DEFAULT '[]'::jsonb,
  
  baseline_references jsonb DEFAULT '[]'::jsonb,
  
  confidence_explanation text,
  
  regulatory_references text[],
  
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_explainability_narratives_agency ON explainability_narratives(agency_id);
CREATE INDEX IF NOT EXISTS idx_explainability_narratives_subject ON explainability_narratives(subject_type, subject_id);
CREATE INDEX IF NOT EXISTS idx_explainability_narratives_type ON explainability_narratives(narrative_type);

ALTER TABLE explainability_narratives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view agency explainability narratives"
  ON explainability_narratives FOR SELECT
  TO authenticated
  USING (agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()));

CREATE POLICY "System can create explainability narratives"
  ON explainability_narratives FOR INSERT
  TO authenticated
  WITH CHECK (agency_id IN (SELECT agency_id FROM user_profiles WHERE id = auth.uid()));
