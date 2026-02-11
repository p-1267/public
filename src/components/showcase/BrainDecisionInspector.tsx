import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface BrainDecision {
  id: string;
  resident_id: string;
  decision_type: string;
  observations: any[];
  patterns_detected: any[];
  risk_scores: Record<string, number>;
  reasoning: string;
  decision_output: any;
  confidence_score: number;
  execution_time_ms: number;
  created_at: string;
}

interface BrainDecisionInspectorProps {
  agencyId: string;
  residentId?: string;
}

export function BrainDecisionInspector({
  agencyId,
  residentId,
}: BrainDecisionInspectorProps) {
  const [decisions, setDecisions] = useState<BrainDecision[]>([]);
  const [selectedDecision, setSelectedDecision] = useState<BrainDecision | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadDecisions();
    const subscription = subscribeToDecisions();
    return () => {
      subscription.unsubscribe();
    };
  }, [agencyId, residentId, filterType]);

  const loadDecisions = async () => {
    setLoading(true);
    let query = supabase
      .from('brain_decision_log')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (residentId) {
      query = query.eq('resident_id', residentId);
    }

    if (filterType !== 'all') {
      query = query.eq('decision_type', filterType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading brain decisions:', error);
    } else {
      setDecisions(data || []);
    }
    setLoading(false);
  };

  const subscribeToDecisions = () => {
    return supabase
      .channel('brain_decisions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'brain_decision_log',
          filter: `agency_id=eq.${agencyId}`,
        },
        (payload) => {
          setDecisions((prev) => [payload.new as BrainDecision, ...prev].slice(0, 50));
        }
      )
      .subscribe();
  };

  const getDecisionTypeColor = (type: string) => {
    const colors = {
      observation: 'bg-blue-100 text-blue-800',
      pattern_detection: 'bg-blue-100 text-blue-800',
      risk_assessment: 'bg-orange-100 text-orange-800',
      action_recommendation: 'bg-green-100 text-green-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-bold text-red-900 mb-1">WP3: NOT IMPLEMENTED</h3>
            <p className="text-sm text-red-800">
              <strong>Brain Intelligence is NOT implemented.</strong> The decisions shown below are
              SEEDED MOCK DATA created during agency setup. No real observation, pattern
              detection, or risk prediction is occurring. This inspector shows what the
              logging infrastructure looks like, but no actual AI/intelligence exists yet.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Brain Decision Inspector (MOCK DATA ONLY)
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Infrastructure for visibility is ready. Intelligence itself is not implemented.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="observation">Observations</option>
            <option value="pattern_detection">Pattern Detection</option>
            <option value="risk_assessment">Risk Assessment</option>
            <option value="action_recommendation">Action Recommendation</option>
          </select>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Live</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading decisions...</div>
          ) : decisions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No brain decisions logged yet
            </div>
          ) : (
            decisions.map((decision) => (
              <button
                key={decision.id}
                onClick={() => setSelectedDecision(decision)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  selectedDecision?.id === decision.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getDecisionTypeColor(
                      decision.decision_type
                    )}`}
                  >
                    {decision.decision_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(decision.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-sm text-gray-700 line-clamp-2">
                  {decision.reasoning || 'No reasoning provided'}
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                  <span>
                    Confidence:{' '}
                    <span
                      className={`font-medium ${getConfidenceColor(
                        decision.confidence_score
                      )}`}
                    >
                      {(decision.confidence_score * 100).toFixed(0)}%
                    </span>
                  </span>
                  <span>{decision.execution_time_ms}ms</span>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="border-l-2 border-gray-200 pl-6">
          {selectedDecision ? (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Decision Type</h3>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getDecisionTypeColor(
                    selectedDecision.decision_type
                  )}`}
                >
                  {selectedDecision.decision_type.replace(/_/g, ' ')}
                </span>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Observations (What Brain Saw)
                </h3>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  {selectedDecision.observations.length > 0 ? (
                    selectedDecision.observations.map((obs, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium text-gray-700">{obs.type}:</span>{' '}
                        <span className="text-gray-600">{obs.value}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No observations recorded</p>
                  )}
                </div>
              </div>

              {selectedDecision.patterns_detected.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Patterns Detected (How Brain Analyzed)
                  </h3>
                  <div className="bg-blue-50 rounded-lg p-3 space-y-2">
                    {selectedDecision.patterns_detected.map((pattern, idx) => (
                      <div key={idx} className="text-sm text-gray-700">
                        {JSON.stringify(pattern)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Risk Scores (Why Brain Scored This Way)
                </h3>
                <div className="bg-orange-50 rounded-lg p-3 space-y-2">
                  {Object.entries(selectedDecision.risk_scores).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {key.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500"
                            style={{ width: `${value * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 w-10">
                          {(value * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Reasoning (Why Brain Decided)
                </h3>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
                  {selectedDecision.reasoning || 'No reasoning provided'}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Decision Output (What Brain Recommended)
                </h3>
                <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 overflow-x-auto">
                  {JSON.stringify(selectedDecision.decision_output, null, 2)}
                </pre>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div>
                  <span className="text-sm text-gray-600">Confidence Score:</span>
                  <span
                    className={`ml-2 text-lg font-bold ${getConfidenceColor(
                      selectedDecision.confidence_score
                    )}`}
                  >
                    {(selectedDecision.confidence_score * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  Execution Time:{' '}
                  <span className="font-medium text-gray-900">
                    {selectedDecision.execution_time_ms}ms
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Select a decision to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
