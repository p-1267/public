import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface IntelligenceSignal {
  id: string;
  signal_id: string;
  category: string;
  severity: string;
  resident_id: string;
  agency_id: string;
  title: string;
  description: string;
  reasoning: string;
  detected_at: string;
  requires_human_action: boolean;
  suggested_actions: string[];
  data_source: string[];
  dismissed: boolean;
  dismissed_by?: string;
  dismissed_at?: string;
  created_at: string;
}

interface RiskScore {
  category: string;
  score: number;
  trend: 'INCREASING' | 'STABLE' | 'DECREASING';
  factors: string[];
}

interface BrainAssessment {
  id: string;
  overall_status: 'ALL_CLEAR' | 'WATCH' | 'ATTENTION_NEEDED' | 'CRITICAL';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  primary_concern: string | null;
  reasoning: string;
  confidence_score: number;
  data_freshness: string;
  last_signal_detected_at: string | null;
  recommended_actions: string[];
  assessed_at: string;
}

interface Props {
  residentId?: string;
  view?: 'SENIOR' | 'FAMILY' | 'CAREGIVER' | 'SUPERVISOR';
}

export function AIIntelligenceDashboard({ residentId, view = 'SUPERVISOR' }: Props) {
  const [signals, setSignals] = useState<IntelligenceSignal[]>([]);
  const [riskScores, setRiskScores] = useState<RiskScore[]>([]);
  const [brainAssessment, setBrainAssessment] = useState<BrainAssessment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadIntelligenceData();

    const channel = supabase
      .channel('intelligence-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'intelligence_signals'
        },
        () => {
          console.log('[AIIntelligenceDashboard] Signal update received');
          loadIntelligenceData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'risk_scores'
        },
        () => {
          console.log('[AIIntelligenceDashboard] Risk score update received');
          loadIntelligenceData();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'resident_brain_assessments'
        },
        () => {
          console.log('[AIIntelligenceDashboard] Brain assessment update received');
          loadIntelligenceData();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [residentId]);

  const loadIntelligenceData = async () => {
    setLoading(true);

    if (residentId) {
      const [signalsRes, riskRes, brainRes] = await Promise.all([
        supabase
          .from('intelligence_signals')
          .select('*')
          .eq('resident_id', residentId)
          .order('detected_at', { ascending: false })
          .limit(10),
        supabase
          .from('risk_scores')
          .select('*')
          .eq('resident_id', residentId)
          .order('computed_at', { ascending: false })
          .limit(10),
        supabase
          .from('resident_brain_assessments')
          .select('*')
          .eq('resident_id', residentId)
          .order('assessed_at', { ascending: false })
          .limit(1)
          .maybeSingle()
      ]);

      if (!signalsRes.error) {
        setSignals(signalsRes.data || []);
      }

      if (!riskRes.error && riskRes.data) {
        const formattedRiskScores: RiskScore[] = riskRes.data.map(riskData => {
          const factors = riskData.contributing_factors || [];

          // Map DB trend_direction (improving/worsening/stable) to UI (DECREASING/INCREASING/STABLE)
          let trend: 'INCREASING' | 'STABLE' | 'DECREASING' = 'STABLE';
          if (riskData.trend_direction === 'worsening') trend = 'INCREASING';
          else if (riskData.trend_direction === 'improving') trend = 'DECREASING';
          else if (riskData.trend_direction === 'stable') trend = 'STABLE';

          return {
            category: riskData.risk_type || 'Unknown',
            score: riskData.current_score || 0,
            trend,
            factors: Array.isArray(factors) ? factors : Object.values(factors)
          };
        });

        setRiskScores(formattedRiskScores);
      }

      if (!brainRes.error && brainRes.data) {
        setBrainAssessment(brainRes.data);
      }
    }

    setLoading(false);
  };


  const getSeverityColor = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-100 border-red-500 text-red-900';
      case 'MAJOR':
        return 'bg-orange-100 border-orange-500 text-orange-900';
      case 'MODERATE':
        return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      case 'MINOR':
        return 'bg-blue-100 border-blue-500 text-blue-900';
      default:
        return 'bg-gray-100 border-gray-500 text-gray-900';
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 70) return 'text-red-600';
    if (score >= 40) return 'text-orange-600';
    if (score >= 20) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'INCREASING':
        return '↗️';
      case 'DECREASING':
        return '↘️';
      case 'STABLE':
        return '→';
      default:
        return '•';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ALL_CLEAR':
        return 'bg-green-50 border-green-500 text-green-900';
      case 'WATCH':
        return 'bg-yellow-50 border-yellow-500 text-yellow-900';
      case 'ATTENTION_NEEDED':
        return 'bg-orange-50 border-orange-500 text-orange-900';
      case 'CRITICAL':
        return 'bg-red-50 border-red-500 text-red-900';
      default:
        return 'bg-gray-50 border-gray-500 text-gray-900';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ALL_CLEAR':
        return '✅';
      case 'WATCH':
        return '👁️';
      case 'ATTENTION_NEEDED':
        return '⚠️';
      case 'CRITICAL':
        return '🚨';
      default:
        return '•';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'text-red-600';
      case 'high':
        return 'text-orange-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-green-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl text-gray-600">Loading intelligence data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="text-6xl">🧠</div>
            <div>
              <h1 className="text-5xl font-bold text-gray-900">AI Intelligence Dashboard</h1>
              <p className="text-2xl text-gray-600 mt-2">
                System reasoning, predictions, and pattern detection
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="bg-white rounded-2xl p-6 border-2 border-blue-300 shadow-lg">
            <div className="text-lg font-semibold text-gray-700 mb-2">Active Signals</div>
            <div className="text-5xl font-bold text-blue-600">{signals.length}</div>
            <div className="text-sm text-gray-600 mt-1">Requiring attention</div>
          </div>
          <div className="bg-white rounded-2xl p-6 border-2 border-orange-300 shadow-lg">
            <div className="text-lg font-semibold text-gray-700 mb-2">Requiring Action</div>
            <div className="text-5xl font-bold text-orange-600">
              {signals.filter(s => s.requires_human_action).length}
            </div>
            <div className="text-sm text-gray-600 mt-1">Need human intervention</div>
          </div>
          <div className="bg-white rounded-2xl p-6 border-2 border-green-300 shadow-lg">
            <div className="text-lg font-semibold text-gray-700 mb-2">Risk Scores</div>
            <div className="text-5xl font-bold text-green-600">{riskScores.length}</div>
            <div className="text-sm text-gray-600 mt-1">Categories tracked</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Risk Scores</h2>
          {riskScores.length > 0 ? (
            <div className="space-y-4">
              {riskScores.map((risk, index) => (
                <div key={index} className="border-b border-gray-200 pb-4 last:border-0">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-semibold text-lg text-gray-900">{risk.category}</div>
                    <div className="flex items-center gap-2">
                      <span className={`text-2xl font-bold ${getRiskColor(risk.score)}`}>
                        {risk.score}
                      </span>
                      <span className="text-xl">{getTrendIcon(risk.trend)}</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {Array.isArray(risk.factors) && risk.factors.length > 0
                      ? risk.factors.join(' • ')
                      : 'No factors available'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No risk score data available
            </div>
          )}
        </div>

        {brainAssessment && (
          <div className={`rounded-2xl p-8 border-4 shadow-lg mb-8 ${getStatusColor(brainAssessment.overall_status)}`}>
            <div className="flex items-center gap-4 mb-6">
              <div className="text-6xl">{getStatusIcon(brainAssessment.overall_status)}</div>
              <div>
                <h2 className="text-3xl font-bold mb-2">Brain Assessment</h2>
                <div className="flex items-center gap-4">
                  <span className="text-xl font-semibold">{brainAssessment.overall_status.replace('_', ' ')}</span>
                  <span className={`text-lg font-semibold ${getRiskLevelColor(brainAssessment.risk_level)}`}>
                    Risk: {brainAssessment.risk_level.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-600">
                    Confidence: {brainAssessment.confidence_score}%
                  </span>
                </div>
              </div>
            </div>

            {brainAssessment.primary_concern && (
              <div className="bg-white bg-opacity-60 rounded-lg p-4 mb-4">
                <div className="font-semibold text-gray-900 mb-1">Primary Concern:</div>
                <div className="text-lg">{brainAssessment.primary_concern}</div>
              </div>
            )}

            <div className="bg-white bg-opacity-60 rounded-lg p-6 mb-4">
              <div className="font-semibold text-gray-900 mb-3 text-lg">Brain Reasoning:</div>
              <div className="text-base leading-relaxed">{brainAssessment.reasoning}</div>
            </div>

            {brainAssessment.recommended_actions && brainAssessment.recommended_actions.length > 0 && (
              <div className="bg-white bg-opacity-80 rounded-lg p-6 mb-4">
                <div className="font-semibold text-gray-900 mb-3 text-lg">Recommended Actions:</div>
                <ul className="space-y-2">
                  {brainAssessment.recommended_actions.map((action, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <span className="text-xl mt-0.5">→</span>
                      <span className="text-base">{action}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between text-sm text-gray-600 bg-white bg-opacity-40 rounded-lg p-4">
              <div>
                Data freshness: <span className="font-semibold">{brainAssessment.data_freshness}</span>
              </div>
              <div>
                Last signal: <span className="font-semibold">
                  {brainAssessment.last_signal_detected_at
                    ? new Date(brainAssessment.last_signal_detected_at).toLocaleString()
                    : 'No recent signals'}
                </span>
              </div>
              <div>
                Assessed: <span className="font-semibold">
                  {new Date(brainAssessment.assessed_at).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-lg">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Intelligence Signals</h2>
          {signals.length > 0 ? (
            <div className="space-y-6">
              {signals.map((signal) => (
              <div
                key={signal.id}
                className={`border-2 rounded-xl p-6 ${getSeverityColor(signal.severity)}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-800 text-white">
                        {signal.severity}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-600 text-white">
                        {signal.category}
                      </span>
                      {signal.requires_human_action && (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-600 text-white">
                          ACTION REQUIRED
                        </span>
                      )}
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{signal.title}</h3>
                    <p className="text-lg mb-4">{signal.description}</p>
                  </div>
                </div>

                {signal.reasoning && (
                  <div className="bg-white bg-opacity-60 rounded-lg p-4 mb-4">
                    <div className="font-semibold text-gray-900 mb-2">AI Reasoning:</div>
                    <div className="text-sm text-gray-700">{signal.reasoning}</div>
                  </div>
                )}

                {signal.data_source && signal.data_source.length > 0 && (
                  <div className="bg-blue-50 border border-blue-300 rounded-lg p-4 mb-4">
                    <div className="font-semibold text-blue-900 mb-2">Data Sources:</div>
                    <div className="text-sm text-blue-800">
                      {signal.data_source.join(' • ')}
                    </div>
                  </div>
                )}

                {signal.suggested_actions && signal.suggested_actions.length > 0 && (
                  <div className="bg-green-50 border border-green-300 rounded-lg p-4">
                    <div className="font-semibold text-green-900 mb-2">Suggested Actions:</div>
                    <ul className="list-disc list-inside text-green-800 space-y-1">
                      {signal.suggested_actions.map((action, idx) => (
                        <li key={idx} className="text-sm">{action}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🔍</div>
              <div className="text-xl font-semibold">No intelligence signals detected</div>
              <div className="text-sm mt-2">Signals will appear when the AI detects patterns or risks</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
