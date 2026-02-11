/*
  # Scenario Modeling RPCs (Phase 3)

  1. Purpose
    - Create what-if scenarios
    - Calculate cost, risk, compliance deltas
    - Read-only decision modeling

  2. Functions
    - `create_scenario_model` - Create new scenario
    - `calculate_scenario_impact` - Run delta calculations
    - `archive_scenario_model` - Archive old scenarios
*/

CREATE OR REPLACE FUNCTION create_scenario_model(
  p_agency_id uuid,
  p_model_name text,
  p_model_type text,
  p_model_description text,
  p_baseline_config jsonb,
  p_proposed_config jsonb,
  p_created_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_model_id uuid;
  v_result jsonb;
BEGIN
  INSERT INTO scenario_models (
    agency_id,
    model_name,
    model_type,
    model_description,
    baseline_config,
    proposed_config,
    created_by
  ) VALUES (
    p_agency_id,
    p_model_name,
    p_model_type,
    p_model_description,
    p_baseline_config,
    p_proposed_config,
    p_created_by
  )
  RETURNING id INTO v_model_id;

  SELECT jsonb_build_object(
    'model_id', v_model_id,
    'name', p_model_name,
    'type', p_model_type,
    'created_at', now()
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION calculate_scenario_impact(
  p_model_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_model record;
  v_cost_delta numeric;
  v_risk_delta numeric;
  v_compliance_delta numeric;
  v_quality_delta numeric;
  v_efficiency_delta numeric;
  v_result_id uuid;
  v_result jsonb;
BEGIN
  SELECT * INTO v_model FROM scenario_models WHERE id = p_model_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Model not found';
  END IF;

  IF v_model.model_type = 'STAFFING' THEN
    v_cost_delta := (
      COALESCE((v_model.proposed_config->>'staff_count')::numeric, 0) - 
      COALESCE((v_model.baseline_config->>'staff_count')::numeric, 0)
    ) * COALESCE((v_model.baseline_config->>'avg_salary')::numeric, 50000) / 12;
    
    v_risk_delta := (
      COALESCE((v_model.baseline_config->>'staff_count')::numeric, 0) - 
      COALESCE((v_model.proposed_config->>'staff_count')::numeric, 0)
    ) * 0.05;
    
    v_quality_delta := (
      COALESCE((v_model.proposed_config->>'staff_count')::numeric, 0) - 
      COALESCE((v_model.baseline_config->>'staff_count')::numeric, 0)
    ) * 0.03;
    
  ELSIF v_model.model_type = 'VISIT_FREQUENCY' THEN
    v_cost_delta := (
      COALESCE((v_model.proposed_config->>'visits_per_week')::numeric, 0) - 
      COALESCE((v_model.baseline_config->>'visits_per_week')::numeric, 0)
    ) * COALESCE((v_model.baseline_config->>'cost_per_visit')::numeric, 50) * 4;
    
    v_risk_delta := (
      COALESCE((v_model.baseline_config->>'visits_per_week')::numeric, 0) - 
      COALESCE((v_model.proposed_config->>'visits_per_week')::numeric, 0)
    ) * 0.1;
    
  ELSIF v_model.model_type = 'CARE_INTENSITY' THEN
    v_cost_delta := (
      COALESCE((v_model.proposed_config->>'hours_per_visit')::numeric, 0) - 
      COALESCE((v_model.baseline_config->>'hours_per_visit')::numeric, 0)
    ) * COALESCE((v_model.baseline_config->>'hourly_rate')::numeric, 25) * 
      COALESCE((v_model.baseline_config->>'visits_per_month')::numeric, 20);
    
  ELSIF v_model.model_type = 'AUTOMATION' THEN
    v_cost_delta := COALESCE((v_model.proposed_config->>'technology_cost')::numeric, 0) - 
                     COALESCE((v_model.baseline_config->>'technology_cost')::numeric, 0);
    
    v_efficiency_delta := COALESCE((v_model.proposed_config->>'automation_level')::numeric, 0) - 
                          COALESCE((v_model.baseline_config->>'automation_level')::numeric, 0);
  END IF;

  v_compliance_delta := 0;
  v_quality_delta := COALESCE(v_quality_delta, 0);
  v_efficiency_delta := COALESCE(v_efficiency_delta, 0);

  INSERT INTO scenario_model_results (
    model_id,
    cost_delta_monthly,
    cost_delta_annual,
    risk_score_delta,
    compliance_exposure_delta,
    quality_score_delta,
    efficiency_delta,
    detailed_breakdown,
    assumptions_used,
    confidence_level,
    calculation_engine
  ) VALUES (
    p_model_id,
    v_cost_delta,
    v_cost_delta * 12,
    v_risk_delta,
    v_compliance_delta,
    v_quality_delta,
    v_efficiency_delta,
    jsonb_build_object(
      'baseline', v_model.baseline_config,
      'proposed', v_model.proposed_config,
      'calculations', jsonb_build_object(
        'cost_delta', v_cost_delta,
        'risk_delta', v_risk_delta,
        'quality_delta', v_quality_delta
      )
    ),
    v_model.baseline_config,
    0.75,
    'DELTA_CALCULATOR_V1'
  )
  RETURNING id INTO v_result_id;

  SELECT jsonb_build_object(
    'result_id', v_result_id,
    'model_id', p_model_id,
    'cost_delta_monthly', v_cost_delta,
    'cost_delta_annual', v_cost_delta * 12,
    'risk_score_delta', v_risk_delta,
    'compliance_exposure_delta', v_compliance_delta,
    'quality_score_delta', v_quality_delta,
    'efficiency_delta', v_efficiency_delta,
    'confidence_level', 0.75
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION archive_scenario_model(
  p_model_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE scenario_models
  SET is_archived = true, updated_at = now()
  WHERE id = p_model_id;

  RETURN jsonb_build_object(
    'model_id', p_model_id,
    'archived', true
  );
END;
$$;
