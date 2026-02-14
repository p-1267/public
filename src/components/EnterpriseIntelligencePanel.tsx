import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useShowcase } from '../contexts/ShowcaseContext';
import { AlertCircle, TrendingUp, TrendingDown, Minus, Clock } from 'lucide-react';

interface IntelligenceSignal {
  id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  reasoning: string;
  detected_at: string;
  requires_human_action: boolean;
  suggested_actions: string[];
}

export function EnterpriseIntelligencePanel() {
  const { mockAgencyId } = useShowcase();
  const [signals, setSignals] = useState<IntelligenceSignal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!mockAgencyId) return;

    const loadSignals = async () => {
      const { data, error } = await supabase
        .from('intelligence_signals')
        .select('*')
        .eq('agency_id', mockAgencyId)
        .eq('dismissed', false)
        .order('detected_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[EnterpriseIntelligencePanel] Error loading signals:', error);
      } else {
        setSignals(data || []);
      }
      setLoading(false);
    };

    loadSignals();
  }, [mockAgencyId]);

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-red-700 bg-red-50 border-red-300';
      case 'high': return 'text-orange-700 bg-orange-50 border-orange-300';
      case 'medium': return 'text-slate-700 bg-slate-50 border-slate-300';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-slate-50">
        <div className="text-slate-600">Loading intelligence signals...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-900 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <div>
            <h1 className="text-xl font-bold text-white">Intelligence Monitoring</h1>
            <p className="text-sm text-slate-300">AI-powered early warning system</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="bg-slate-100 border-b border-slate-300">
        <div className="grid grid-cols-3 gap-px bg-slate-300">
          <div className="bg-white px-4 py-3">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Active Signals</div>
            <div className="text-2xl font-bold text-slate-900">{signals.length}</div>
          </div>
          <div className="bg-white px-4 py-3">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Require Action</div>
            <div className="text-2xl font-bold text-slate-900">
              {signals.filter(s => s.requires_human_action).length}
            </div>
          </div>
          <div className="bg-white px-4 py-3">
            <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">Critical</div>
            <div className="text-2xl font-bold text-red-700">
              {signals.filter(s => s.severity.toLowerCase() === 'critical').length}
            </div>
          </div>
        </div>
      </div>

      {/* Signals List */}
      <div className="p-6 space-y-4">
        {signals.length === 0 ? (
          <div className="text-center py-16 bg-white rounded border border-slate-200">
            <div className="text-slate-400 text-lg mb-2">No active intelligence signals</div>
            <div className="text-slate-500 text-sm">System is monitoring all residents continuously</div>
          </div>
        ) : (
          signals.map((signal) => (
            <div
              key={signal.id}
              className="bg-white border border-slate-200 rounded shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wide rounded border ${getSeverityColor(signal.severity)}`}>
                      {signal.severity}
                    </span>
                    <span className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600 bg-slate-100 rounded">
                      {signal.category}
                    </span>
                    {signal.requires_human_action && (
                      <span className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-red-700 bg-red-50 rounded border border-red-200">
                        Action Required
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500">
                    <Clock className="w-3 h-3" />
                    {new Date(signal.detected_at).toLocaleString()}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-slate-900 mb-2">{signal.title}</h3>

                {/* Description */}
                <p className="text-sm text-slate-700 mb-3">{signal.description}</p>

                {/* Reasoning */}
                <div className="bg-slate-50 border border-slate-200 rounded p-3 mb-3">
                  <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">AI Reasoning</div>
                  <p className="text-sm text-slate-700">{signal.reasoning}</p>
                </div>

                {/* Suggested Actions */}
                {signal.suggested_actions && signal.suggested_actions.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Suggested Actions</div>
                    <ul className="space-y-1">
                      {signal.suggested_actions.map((action, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="text-slate-400 mt-0.5">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
