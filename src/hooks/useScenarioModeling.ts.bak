import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ScenarioModel {
  id: string;
  agency_id: string;
  model_name: string;
  model_type: string;
  model_description?: string;
  baseline_config: any;
  proposed_config: any;
  created_at: string;
}

export interface ScenarioResult {
  id: string;
  model_id: string;
  cost_delta_monthly?: number;
  cost_delta_annual?: number;
  risk_score_delta?: number;
  compliance_exposure_delta?: number;
  quality_score_delta?: number;
  efficiency_delta?: number;
  detailed_breakdown: any;
  confidence_level: number;
  created_at: string;
}

export function useScenarioModeling(agencyId?: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createScenario = useCallback(async (params: {
    modelName: string;
    modelType: string;
    modelDescription?: string;
    baselineConfig: any;
    proposedConfig: any;
  }) => {
    if (!agencyId) throw new Error('Agency ID required');

    setLoading(true);
    setError(null);

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id;

      const { data, error: insertError } = await supabase
        .from('scenario_models')
        .insert({
          agency_id: agencyId,
          model_name: params.modelName,
          model_type: params.modelType,
          model_description: params.modelDescription,
          baseline_config: params.baselineConfig,
          proposed_config: params.proposedConfig,
          created_by: userId
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  const calculateScenario = useCallback(async (modelId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data: model } = await supabase
        .from('scenario_models')
        .select('*')
        .eq('id', modelId)
        .single();

      if (!model) throw new Error('Model not found');

      const baseline = model.baseline_config;
      const proposed = model.proposed_config;

      let costDelta = 0;
      let riskDelta = 0;
      let complianceDelta = 0;

      if (model.model_type === 'STAFFING') {
        const baselineStaff = baseline.staff_count || 0;
        const proposedStaff = proposed.staff_count || 0;
        const avgSalary = baseline.avg_salary || 50000;
        costDelta = (proposedStaff - baselineStaff) * avgSalary / 12;
        riskDelta = (baselineStaff - proposedStaff) * 0.05;
      }

      if (model.model_type === 'VISIT_FREQUENCY') {
        const baselineVisits = baseline.visits_per_week || 0;
        const proposedVisits = proposed.visits_per_week || 0;
        const costPerVisit = baseline.cost_per_visit || 50;
        costDelta = (proposedVisits - baselineVisits) * costPerVisit * 4;
        riskDelta = (baselineVisits - proposedVisits) * 0.1;
      }

      const { data, error: insertError } = await supabase
        .from('scenario_model_results')
        .insert({
          model_id: modelId,
          cost_delta_monthly: costDelta,
          cost_delta_annual: costDelta * 12,
          risk_score_delta: riskDelta,
          compliance_exposure_delta: complianceDelta,
          quality_score_delta: 0,
          efficiency_delta: 0,
          detailed_breakdown: {
            baseline,
            proposed,
            calculations: { costDelta, riskDelta }
          },
          assumptions_used: baseline,
          confidence_level: 0.75,
          calculation_engine: 'BASIC_DELTA_CALCULATOR'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getScenarios = useCallback(async () => {
    if (!agencyId) return [];

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('scenario_models')
        .select('*')
        .eq('agency_id', agencyId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      return data as ScenarioModel[];
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  const getScenarioResults = useCallback(async (modelId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('scenario_model_results')
        .select('*')
        .eq('model_id', modelId)
        .order('calculation_timestamp', { ascending: false });

      if (queryError) throw queryError;

      return data as ScenarioResult[];
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    createScenario,
    calculateScenario,
    getScenarios,
    getScenarioResults
  };
}
