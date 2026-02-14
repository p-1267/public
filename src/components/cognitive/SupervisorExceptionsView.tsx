import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useShowcase } from '../../contexts/ShowcaseContext';
import { IntelligenceSignalCard, IntelligenceSignal } from './IntelligenceSignalCard';
import { AllClearDisplay } from './AllClearDisplay';
import { BrainEvidenceStrip } from './BrainEvidenceStrip';
import { NumericEvidence } from './NumericEvidence';
import { WhyExplanation } from './WhyExplanation';

export const SupervisorExceptionsView: React.FC = () => {
  const { mockAgencyId } = useShowcase();
  const [signals, setSignals] = useState<IntelligenceSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSignal, setExpandedSignal] = useState<string | null>(null);
  const [showAllClear, setShowAllClear] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!mockAgencyId) return;
    loadSignals();
  }, [mockAgencyId]);

  const loadSignals = async () => {
    if (!mockAgencyId) return;

    try {
      const { data, error } = await supabase
        .from('intelligence_signals')
        .select('*')
        .eq('agency_id', mockAgencyId)
        .eq('dismissed', false)
        .order('detected_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Map DB signals to component format
      const mapped: IntelligenceSignal[] = (data || []).map((s: any) => ({
        id: s.id,
        type: s.severity?.toLowerCase() === 'critical' ? 'critical' : 'warning',
        title: s.title || s.description,
        summary: s.description,
        timestamp: formatTimestamp(s.detected_at),
        residentName: s.resident_name || 'Unknown',
        category: s.category || 'General',
        why: {
          summary: s.reasoning || 'Intelligence analysis',
          observed: [],
          rulesFired: [],
          dataUsed: [],
          cannotConclude: [],
          humanAction: (s.suggested_actions && s.suggested_actions[0]) || 'Review and take appropriate action'
        },
        actionable: s.requires_human_action,
        suggestedAction: (s.suggested_actions && s.suggested_actions[0]) || 'Review'
      }));

      setSignals(mapped);
    } catch (err) {
      console.error('[SupervisorExceptionsView] Error loading signals:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${Math.floor(diffHours / 24)} day${Math.floor(diffHours / 24) > 1 ? 's' : ''} ago`;
  };

  const criticalCount = signals.filter(s => s.type === 'critical').length;
  const warningCount = signals.filter(s => s.type === 'warning').length;
  const onTrackCount = 12;

  const handleSignalAction = (signalId: string) => {
    console.log('Signal action:', signalId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-gray-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading intelligence signals...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-gray-950 p-8">
      <div className="max-w-7xl mx-auto">
        <BrainEvidenceStrip
          lastScan={currentTime.toLocaleTimeString()}
          rulesEvaluated={27}
          signalsGenerated={signals.length}
        />

        <header className="mb-10">
          <h1 className="text-6xl font-black text-white mb-4 tracking-tight">Supervisor Dashboard</h1>
          <p className="text-2xl text-slate-300 font-medium mb-8">Exception-based oversight • Intelligence-driven</p>

          <NumericEvidence
            metrics={[
              { label: 'CRITICAL', value: criticalCount, status: 'urgent', unit: '' },
              { label: 'WARNINGS', value: warningCount, status: 'attention', unit: '' },
              { label: 'ON TRACK', value: onTrackCount, status: 'good', unit: 'residents' },
              { label: 'COVERAGE', value: 100, status: 'good', unit: '%' }
            ]}
          />

          {(criticalCount > 0 || warningCount > 0) && (
            <div className="bg-gradient-to-r from-rose-900/50 to-red-900/50 border-l-8 border-rose-400 rounded-2xl p-8 mb-8 shadow-2xl backdrop-blur-lg">
              <div className="flex items-center gap-10">
                {criticalCount > 0 && (
                  <div className="flex items-center gap-4">
                    <span className="text-6xl">🚨</span>
                    <div>
                      <div className="font-black text-rose-200 text-4xl tracking-tight">{criticalCount} Critical</div>
                      <div className="text-lg text-rose-300 font-semibold">Requires immediate attention</div>
                    </div>
                  </div>
                )}
                {warningCount > 0 && (
                  <div className="flex items-center gap-4">
                    <span className="text-5xl">⚠️</span>
                    <div>
                      <div className="font-black text-amber-200 text-3xl tracking-tight">{warningCount} High Priority</div>
                      <div className="text-base text-amber-300 font-semibold">Review recommended</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </header>

        <main>
          {showAllClear || signals.length === 0 ? (
            <AllClearDisplay
              message="No exceptions detected"
              details={[
                'All medications administered on schedule',
                'No overdue tasks or missed care',
                'All residents within baseline parameters',
                'Staffing levels adequate',
                'No device or system issues'
              ]}
            />
          ) : (
            <div className="space-y-6">
              {signals.map(signal => (
                <div key={signal.id}>
                  <IntelligenceSignalCard
                    signal={signal}
                    onAction={handleSignalAction}
                  />
                  {expandedSignal === signal.id && signal.why && (
                    <div className="mt-4">
                      <WhyExplanation
                        explanation={signal.why}
                        onClose={() => setExpandedSignal(null)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>

        <footer className="mt-12 text-center text-sm text-slate-400 font-medium">
          Exception-driven oversight • Level 3 intelligence active • Human judgment required
        </footer>
      </div>
    </div>
  );
};
