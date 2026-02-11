/*
  # Executive Scenario Modeling (Phase 3 — Gap 3)

  1. Purpose
    - Read-only what-if modeling for decision-making
    - Staffing, visit frequency, care intensity modeling
    - Cost, risk, and compliance delta calculations

  2. New Tables
    - `scenario_models`
      - Saved scenario configurations
    
    - `scenario_model_results`
      - Calculated deltas and impacts
    
    - `scenario_model_assumptions`
      - Input parameters and constraints

  3. Enforcement
    - Read-only modeling
    - No execution
    - Decision support only
*/

CREATE TABLE IF NOT EXISTS scenario_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  model_name text NOT NULL,
  model_type text NOT NULL CHECK (model_type IN ('STAFFING', 'VISIT_FREQUENCY', 'CARE_INTENSITY', 'AUTOMATION', 'COMBINED')),
  model_description text,
  baseline_config jsonb NOT NULL,
  proposed_config jsonb NOT NULL,
  created_by uuid NOT NULL REFERENCES user_profiles(id),
  is_archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scenario_model_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES scenario_models(id) ON DELETE CASCADE,
  calculation_timestamp timestamptz NOT NULL DEFAULT now(),
  cost_delta_monthly numeric(15,2),
  cost_delta_annual numeric(15,2),
  risk_score_delta numeric(5,2),
  compliance_exposure_delta numeric(5,2),
  quality_score_delta numeric(5,2),
  efficiency_delta numeric(5,2),
  detailed_breakdown jsonb NOT NULL,
  assumptions_used jsonb NOT NULL,
  confidence_level numeric(3,2) NOT NULL CHECK (confidence_level BETWEEN 0 AND 1),
  calculation_engine text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scenario_model_assumptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES scenario_models(id) ON DELETE CASCADE,
  assumption_category text NOT NULL CHECK (assumption_category IN ('LABOR_COST', 'VISIT_DURATION', 'RESIDENT_ACUITY', 'COMPLIANCE_OVERHEAD', 'TECHNOLOGY_COST')),
  assumption_key text NOT NULL,
  assumption_value jsonb NOT NULL,
  source text NOT NULL CHECK (source IN ('HISTORICAL_DATA', 'INDUSTRY_BENCHMARK', 'MANUAL_INPUT', 'REGULATORY_REQUIREMENT')),
  confidence_level numeric(3,2) CHECK (confidence_level BETWEEN 0 AND 1),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE scenario_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_model_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenario_model_assumptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_scenario_models_agency ON scenario_models(agency_id);
CREATE INDEX IF NOT EXISTS idx_scenario_models_type ON scenario_models(model_type);
CREATE INDEX IF NOT EXISTS idx_scenario_results_model ON scenario_model_results(model_id);
CREATE INDEX IF NOT EXISTS idx_scenario_assumptions_model ON scenario_model_assumptions(model_id);

CREATE POLICY "Agency admins can view their scenarios"
  ON scenario_models FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.id = auth.uid()
        AND up.agency_id = scenario_models.agency_id
    )
  );

CREATE POLICY "Agency admins can create scenarios"
  ON scenario_models FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = auth.uid()
        AND up.agency_id = scenario_models.agency_id
        AND r.name IN ('AGENCY_ADMIN', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Agency admins can view scenario results"
  ON scenario_model_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN scenario_models sm ON sm.id = scenario_model_results.model_id
      WHERE up.id = auth.uid()
        AND up.agency_id = sm.agency_id
    )
  );

CREATE POLICY "Agency admins can view assumptions"
  ON scenario_model_assumptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN scenario_models sm ON sm.id = scenario_model_assumptions.model_id
      WHERE up.id = auth.uid()
        AND up.agency_id = sm.agency_id
    )
  );
