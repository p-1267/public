import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface ScenarioModel {
  id: string;
  name: string;
  model_type: 'STAFFING' | 'VISIT_FREQUENCY' | 'CARE_INTENSITY' | 'AUTOMATION';
  baseline_assumptions: any;
  scenario_adjustments: any;
  calculated_impact?: {
    cost_delta_monthly: number;
    cost_delta_annual: number;
    risk_score_delta: number;
    quality_score_delta: number;
    efficiency_delta: number;
    confidence_level: number;
    detailed_breakdown: any;
  };
}

export function ScenarioModelingConsole() {
  const [models, setModels] = useState<ScenarioModel[]>([]);
  const [creating, setCreating] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('STAFFING');
  const [modelName, setModelName] = useState('');
  const [loading, setLoading] = useState(false);

  const modelTypes = [
    { type: 'STAFFING', label: 'Staffing Levels', description: 'Adjust caregiver ratios and shift patterns' },
    { type: 'VISIT_FREQUENCY', label: 'Visit Frequency', description: 'Change how often residents receive care' },
    { type: 'CARE_INTENSITY', label: 'Care Intensity', description: 'Modify level of care per visit' },
    { type: 'AUTOMATION', label: 'Automation', description: 'Impact of task automation and AI assistance' }
  ];

  const createScenario = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_scenario_model', {
        p_name: modelName,
        p_model_type: selectedType,
        p_baseline_assumptions: {
          current_caregivers: 20,
          current_residents: 50,
          current_avg_visits_per_day: 4,
          current_labor_cost_per_hour: 25,
          current_overhead_percentage: 30
        },
        p_scenario_adjustments: {
          caregiver_delta: selectedType === 'STAFFING' ? 2 : 0,
          visit_frequency_delta: selectedType === 'VISIT_FREQUENCY' ? 1 : 0,
          care_minutes_delta: selectedType === 'CARE_INTENSITY' ? 15 : 0,
          automation_percentage: selectedType === 'AUTOMATION' ? 25 : 0
        }
      });

      if (error) throw error;

      const { data: impactData, error: impactError } = await supabase.rpc('calculate_scenario_impact', {
        p_model_id: data.id
      });

      if (impactError) throw impactError;

      const newModel = {
        ...data,
        calculated_impact: impactData
      };

      setModels([...models, newModel]);
      setCreating(false);
      setModelName('');
    } catch (err) {
      console.error('Failed to create scenario:', err);
      alert('Failed to create scenario. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Executive Scenario Modeling</h2>
          <div className="text-sm text-gray-600 mt-1">What-If Planning for Strategic Decisions</div>
        </div>
        <button
          onClick={() => setCreating(!creating)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {creating ? 'Cancel' : '+ New Scenario'}
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-300 rounded p-4">
        <div className="text-sm font-bold text-blue-900 mb-2">About Scenario Modeling</div>
        <div className="text-sm text-blue-800">
          Model the financial, operational, and quality impacts of strategic decisions before implementing them.
          Each scenario calculates cost deltas, risk changes, quality impacts, and efficiency gains with confidence levels.
        </div>
      </div>

      {creating && (
        <div className="bg-white border-2 border-blue-500 rounded-lg p-6">
          <h3 className="text-xl font-bold mb-4">Create New Scenario</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Scenario Name</label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                placeholder="e.g., Increase staffing by 2 caregivers"
                className="w-full border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Model Type</label>
              <div className="grid grid-cols-2 gap-3">
                {modelTypes.map((type) => (
                  <div
                    key={type.type}
                    onClick={() => setSelectedType(type.type)}
                    className={`border-2 rounded-lg p-3 cursor-pointer transition-all ${
                      selectedType === type.type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    <div className="font-semibold text-sm mb-1">{type.label}</div>
                    <div className="text-xs text-gray-600">{type.description}</div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={createScenario}
              disabled={!modelName || loading}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Calculating...' : 'Calculate Impact'}
            </button>
          </div>
        </div>
      )}

      {models.length === 0 && !creating && (
        <div className="bg-gray-50 border border-gray-300 rounded p-8 text-center">
          <div className="text-4xl mb-4">📊</div>
          <div className="text-lg font-semibold text-gray-700">No Scenarios Yet</div>
          <div className="text-sm text-gray-600 mt-2">
            Create your first scenario to see projected impacts
          </div>
        </div>
      )}

      <div className="space-y-4">
        {models.map((model) => (
          <div key={model.id} className="bg-white border-2 border-gray-300 rounded-lg p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold">{model.name}</h3>
                <div className="text-sm text-gray-600">{model.model_type.replace(/_/g, ' ')}</div>
              </div>
              {model.calculated_impact && (
                <div className="text-right">
                  <div className="text-xs text-gray-600 mb-1">CONFIDENCE</div>
                  <div className="text-2xl font-bold">{Math.round(model.calculated_impact.confidence_level * 100)}%</div>
                </div>
              )}
            </div>

            {model.calculated_impact && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className={`border-2 rounded-lg p-4 ${
                    model.calculated_impact.cost_delta_monthly < 0
                      ? 'bg-green-50 border-green-300'
                      : 'bg-red-50 border-red-300'
                  }`}>
                    <div className="text-xs font-semibold text-gray-600 mb-1">MONTHLY COST DELTA</div>
                    <div className={`text-3xl font-bold ${
                      model.calculated_impact.cost_delta_monthly < 0 ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {model.calculated_impact.cost_delta_monthly >= 0 ? '+' : ''}
                      ${model.calculated_impact.cost_delta_monthly.toLocaleString()}
                    </div>
                  </div>

                  <div className={`border-2 rounded-lg p-4 ${
                    model.calculated_impact.cost_delta_annual < 0
                      ? 'bg-green-50 border-green-300'
                      : 'bg-red-50 border-red-300'
                  }`}>
                    <div className="text-xs font-semibold text-gray-600 mb-1">ANNUAL COST DELTA</div>
                    <div className={`text-3xl font-bold ${
                      model.calculated_impact.cost_delta_annual < 0 ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {model.calculated_impact.cost_delta_annual >= 0 ? '+' : ''}
                      ${model.calculated_impact.cost_delta_annual.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-orange-50 border border-orange-300 rounded p-3">
                    <div className="text-xs font-semibold text-orange-600 mb-1">RISK SCORE Δ</div>
                    <div className="text-2xl font-bold text-orange-900">
                      {model.calculated_impact.risk_score_delta >= 0 ? '+' : ''}
                      {model.calculated_impact.risk_score_delta.toFixed(1)}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-300 rounded p-3">
                    <div className="text-xs font-semibold text-blue-600 mb-1">QUALITY SCORE Δ</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {model.calculated_impact.quality_score_delta >= 0 ? '+' : ''}
                      {model.calculated_impact.quality_score_delta.toFixed(1)}
                    </div>
                  </div>

                  <div className="bg-purple-50 border border-purple-300 rounded p-3">
                    <div className="text-xs font-semibold text-purple-600 mb-1">EFFICIENCY Δ</div>
                    <div className="text-2xl font-bold text-purple-900">
                      {model.calculated_impact.efficiency_delta >= 0 ? '+' : ''}
                      {model.calculated_impact.efficiency_delta.toFixed(1)}%
                    </div>
                  </div>
                </div>

                {model.calculated_impact.detailed_breakdown && (
                  <div className="bg-gray-50 border border-gray-300 rounded p-3">
                    <div className="text-sm font-bold text-gray-900 mb-2">Detailed Breakdown</div>
                    <pre className="text-xs text-gray-700 overflow-auto">
                      {JSON.stringify(model.calculated_impact.detailed_breakdown, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
