/**
 * WP3: Brain Intelligence Layer Showcase
 *
 * Demonstrates complete intelligence pipeline:
 * - Observation aggregation
 * - Baseline modeling
 * - Anomaly detection
 * - Risk scoring
 * - Prioritization
 * - Explainability
 *
 * Acceptance Criteria:
 * ≥5 resident risk flags + ≥5 caregiver workload flags
 * Each with confidence score + explanation + evidence links
 * Ranked list + drill-down + action suggestions
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface RiskFlag {
  id: string;
  category: 'resident' | 'caregiver';
  riskType: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  confidence: number;
  targetName: string;
  targetId: string;
  contributingFactors: Array<{ factor: string; weight: number; description: string }>;
  suggestedActions: Array<{ action: string; priority: number; rationale: string }>;
  trendDirection?: string;
  anomalyCount: number;
}

interface PrioritizedIssue {
  id: string;
  title: string;
  description: string;
  category: string;
  priorityScore: number;
  urgencyScore: number;
  severityScore: number;
  confidenceScore: number;
  status: string;
  residentName?: string;
  caregiverName?: string;
  suggestedActions: any[];
  createdAt: string;
}

interface Explanation {
  narrativeSummary: string;
  narrativeText: string;
  reasoningChain: Array<{ step: number; reasoning: string; confidence: number }>;
  evidenceLinks: Array<{ type: string; id: string; description: string }>;
  confidenceExplanation: string;
}

export function WP3BrainIntelligenceShowcase({ agencyId }: { agencyId: string }) {
  const [loading, setLoading] = useState(false);
  const [computing, setComputing] = useState(false);
  const [residentFlags, setResidentFlags] = useState<RiskFlag[]>([]);
  const [caregiverFlags, setCaregiverFlags] = useState<RiskFlag[]>([]);
  const [prioritizedIssues, setPrioritizedIssues] = useState<PrioritizedIssue[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<PrioritizedIssue | null>(null);
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [computeResult, setComputeResult] = useState<any>(null);
  const [stats, setStats] = useState({
    observations: 0,
    baselines: 0,
    anomalies: 0,
    risks: 0,
    issues: 0,
  });

  useEffect(() => {
    loadBrainIntelligence();
  }, [agencyId]);

  const seedRawEvents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('seed_wp3_raw_events', {
        p_agency_id: agencyId,
      });

      if (error) throw error;

      alert(`Raw events seeded:\n${JSON.stringify(data, null, 2)}`);
      await loadBrainIntelligence();
    } catch (error: any) {
      alert(`Error seeding raw events: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const runBrainCompute = async () => {
    setComputing(true);
    try {
      const { data, error } = await supabase.rpc('run_brain_intelligence', {
        p_agency_id: agencyId,
      });

      if (error) throw error;

      setComputeResult(data);
      alert(`Brain computation complete:\n${JSON.stringify(data, null, 2)}`);
      await loadBrainIntelligence();
    } catch (error: any) {
      alert(`Error running Brain compute: ${error.message}`);
    } finally {
      setComputing(false);
    }
  };

  const loadBrainIntelligence = async () => {
    setLoading(true);
    try {
      // Load statistics
      const [obsCount, baselinesCount, anomaliesCount, risksCount, issuesCount] = await Promise.all([
        supabase.from('observation_events').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
        supabase.from('resident_baselines').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
        supabase.from('anomaly_detections').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
        supabase.from('risk_scores').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
        supabase.from('prioritized_issues').select('id', { count: 'exact', head: true }).eq('agency_id', agencyId),
      ]);

      setStats({
        observations: obsCount.count || 0,
        baselines: baselinesCount.count || 0,
        anomalies: anomaliesCount.count || 0,
        risks: risksCount.count || 0,
        issues: issuesCount.count || 0,
      });

      // Load resident risk flags
      const { data: residentRisks } = await supabase
        .from('risk_scores')
        .select(`
          *,
          resident:residents(first_name, last_name)
        `)
        .eq('agency_id', agencyId)
        .eq('risk_category', 'resident_health')
        .order('current_score', { ascending: false })
        .limit(10);

      if (residentRisks) {
        const flags: RiskFlag[] = residentRisks.map((r: any) => ({
          id: r.id,
          category: 'resident' as const,
          riskType: r.risk_type,
          riskLevel: r.risk_level,
          score: r.current_score,
          confidence: r.confidence_score,
          targetName: r.resident ? `${r.resident.first_name} ${r.resident.last_name}` : 'Unknown',
          targetId: r.resident_id,
          contributingFactors: r.contributing_factors || [],
          suggestedActions: r.suggested_interventions || [],
          trendDirection: r.trend_direction,
          anomalyCount: r.anomaly_ids?.length || 0,
        }));
        setResidentFlags(flags);
      }

      // Load caregiver risk flags
      const { data: caregiverRisks } = await supabase
        .from('risk_scores')
        .select(`
          *,
          caregiver:user_profiles(full_name)
        `)
        .eq('agency_id', agencyId)
        .eq('risk_category', 'caregiver_performance')
        .order('current_score', { ascending: false })
        .limit(10);

      if (caregiverRisks) {
        const flags: RiskFlag[] = caregiverRisks.map((r: any) => ({
          id: r.id,
          category: 'caregiver' as const,
          riskType: r.risk_type,
          riskLevel: r.risk_level,
          score: r.current_score,
          confidence: r.confidence_score,
          targetName: r.caregiver?.full_name || 'Unknown',
          targetId: r.caregiver_id,
          contributingFactors: r.contributing_factors || [],
          suggestedActions: r.suggested_interventions || [],
          trendDirection: r.trend_direction,
          anomalyCount: r.anomaly_ids?.length || 0,
        }));
        setCaregiverFlags(flags);
      }

      // Load prioritized issues
      const { data: issues } = await supabase
        .from('prioritized_issues')
        .select(`
          *,
          resident:residents(first_name, last_name),
          caregiver:user_profiles(full_name)
        `)
        .eq('agency_id', agencyId)
        .in('status', ['new', 'acknowledged'])
        .order('priority_score', { ascending: false })
        .limit(20);

      if (issues) {
        const formattedIssues: PrioritizedIssue[] = issues.map((i: any) => ({
          id: i.id,
          title: i.title,
          description: i.description,
          category: i.issue_category,
          priorityScore: i.priority_score,
          urgencyScore: i.urgency_score,
          severityScore: i.severity_score,
          confidenceScore: i.confidence_score,
          status: i.status,
          residentName: i.resident ? `${i.resident.first_name} ${i.resident.last_name}` : undefined,
          caregiverName: i.caregiver?.full_name,
          suggestedActions: i.suggested_actions || [],
          createdAt: i.created_at,
        }));
        setPrioritizedIssues(formattedIssues);
      }
    } catch (error) {
      console.error('Error loading Brain intelligence:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadExplanation = async (issueId: string) => {
    try {
      const { data } = await supabase
        .from('explainability_narratives')
        .select('*')
        .eq('subject_type', 'prioritized_issue')
        .eq('subject_id', issueId)
        .maybeSingle();

      if (data) {
        setExplanation({
          narrativeSummary: data.narrative_summary,
          narrativeText: data.narrative_text,
          reasoningChain: data.reasoning_chain || [],
          evidenceLinks: data.evidence_links || [],
          confidenceExplanation: data.confidence_explanation,
        });
      }
    } catch (error) {
      console.error('Error loading explanation:', error);
    }
  };

  const handleIssueClick = async (issue: PrioritizedIssue) => {
    setSelectedIssue(issue);
    await loadExplanation(issue.id);
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'critical':
        return 'bg-red-100 border-red-500 text-red-900';
      case 'high':
        return 'bg-orange-100 border-orange-500 text-orange-900';
      case 'medium':
        return 'bg-yellow-100 border-yellow-500 text-yellow-900';
      default:
        return 'bg-blue-100 border-blue-500 text-blue-900';
    }
  };

  const getAcceptanceStatus = () => {
    const residentCount = residentFlags.length;
    const caregiverCount = caregiverFlags.length;
    const residentPass = residentCount >= 5;
    const caregiverPass = caregiverCount >= 5;
    const allPass = residentPass && caregiverPass;

    return { residentCount, caregiverCount, residentPass, caregiverPass, allPass };
  };

  const acceptance = getAcceptanceStatus();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Loading Brain Intelligence...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          WP3: Brain Intelligence Layer - TRUTH ENFORCED
        </h1>
        <p className="text-gray-600">
          Brain COMPUTES intelligence from raw events (not pre-seeded flags)
        </p>
      </div>

      {/* Control Panel */}
      <div className="bg-blue-50 rounded-lg shadow-sm border-2 border-blue-500 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-3">Computation Controls</h2>
        <div className="flex gap-3">
          <button
            onClick={seedRawEvents}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Seeding...' : '1. Seed Raw Events (30 days)'}
          </button>
          <button
            onClick={runBrainCompute}
            disabled={computing}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
          >
            {computing ? 'Computing...' : '2. Run Brain Compute'}
          </button>
        </div>
        {computeResult && (
          <div className="mt-4 p-3 bg-white rounded border border-blue-300">
            <div className="text-sm font-semibold mb-2">Last Compute Result:</div>
            <div className="text-xs font-mono text-gray-700">
              Observations: {computeResult.observations_aggregated} |
              Baselines: {computeResult.baselines_calculated} |
              Anomalies: {computeResult.anomalies_detected} |
              Risks: {computeResult.risks_scored} |
              Issues: {computeResult.issues_prioritized}
            </div>
            <div className="text-xs text-green-700 font-semibold mt-1">
              ✓ {computeResult.proof}
            </div>
          </div>
        )}
      </div>

      {/* Acceptance Status */}
      <div className={`rounded-lg shadow-sm border-2 p-6 ${acceptance.allPass ? 'bg-green-50 border-green-500' : 'bg-yellow-50 border-yellow-500'}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className={`text-3xl ${acceptance.allPass ? 'text-green-600' : 'text-yellow-600'}`}>
            {acceptance.allPass ? '✓' : '⚠'}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              WP3 Acceptance: {acceptance.allPass ? 'PASS' : 'NEEDS MORE DATA'}
            </h2>
            <p className="text-sm text-gray-600">
              Required: ≥5 resident flags + ≥5 caregiver flags with explanations
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className={`p-3 rounded ${acceptance.residentPass ? 'bg-green-100' : 'bg-red-100'}`}>
            <div className="text-2xl font-bold">{acceptance.residentCount} / 5</div>
            <div className="text-sm">Resident Risk Flags</div>
          </div>
          <div className={`p-3 rounded ${acceptance.caregiverPass ? 'bg-green-100' : 'bg-red-100'}`}>
            <div className="text-2xl font-bold">{acceptance.caregiverCount} / 5</div>
            <div className="text-sm">Caregiver Workload Flags</div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Observations', value: stats.observations },
          { label: 'Baselines', value: stats.baselines },
          { label: 'Anomalies', value: stats.anomalies },
          { label: 'Risk Scores', value: stats.risks },
          { label: 'Issues', value: stats.issues },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Prioritized Issues List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Prioritized Issues (Ranked by Urgency × Severity × Confidence)
        </h2>
        <div className="space-y-3">
          {prioritizedIssues.map((issue, index) => (
            <div
              key={issue.id}
              onClick={() => handleIssueClick(issue)}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="text-2xl font-bold text-gray-400">#{index + 1}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{issue.title}</h3>
                    <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                      {issue.category}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{issue.description.substring(0, 150)}...</p>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Priority: {issue.priorityScore}</span>
                    <span>Urgency: {issue.urgencyScore}</span>
                    <span>Severity: {issue.severityScore}</span>
                    <span>Confidence: {(issue.confidenceScore * 100).toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drill-down view */}
      {selectedIssue && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Issue Drill-Down + Explanation</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Issue Details</h3>
              <p className="text-gray-700">{selectedIssue.description}</p>
            </div>

            {explanation && (
              <>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Why Flagged (Explanation)</h3>
                  <p className="text-gray-700 mb-2">{explanation.narrativeText}</p>
                  <p className="text-sm text-gray-600 italic">{explanation.confidenceExplanation}</p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Reasoning Chain</h3>
                  <div className="space-y-2">
                    {explanation.reasoningChain.map((step) => (
                      <div key={step.step} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
                          {step.step}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-700">{step.reasoning}</p>
                          <p className="text-xs text-gray-500">Confidence: {(step.confidence * 100).toFixed(0)}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Supporting Evidence</h3>
                  <div className="space-y-1">
                    {explanation.evidenceLinks.map((link, idx) => (
                      <div key={idx} className="text-sm text-gray-600">
                        • {link.type}: {link.description}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Suggested Actions</h3>
              <div className="space-y-2">
                {selectedIssue.suggestedActions.map((action: any, idx: number) => (
                  <div key={idx} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded bg-green-100 text-green-800 flex items-center justify-center font-bold text-xs">
                      {action.priority}
                    </div>
                    <div className="flex-1 text-sm text-gray-700">{action.action}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Risk Flags Summary */}
      <div className="grid grid-cols-2 gap-6">
        {/* Resident Flags */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Resident Risk Flags ({residentFlags.length})</h2>
          <div className="space-y-3">
            {residentFlags.slice(0, 5).map((flag) => (
              <div key={flag.id} className={`border-l-4 p-3 rounded ${getRiskLevelColor(flag.riskLevel)}`}>
                <div className="font-semibold">{flag.targetName}</div>
                <div className="text-sm">{flag.riskType.replace(/_/g, ' ')}</div>
                <div className="text-xs mt-1">
                  Score: {flag.score} | Confidence: {(flag.confidence * 100).toFixed(0)}% | {flag.anomalyCount} anomalies
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Caregiver Flags */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Caregiver Workload Flags ({caregiverFlags.length})</h2>
          <div className="space-y-3">
            {caregiverFlags.slice(0, 5).map((flag) => (
              <div key={flag.id} className={`border-l-4 p-3 rounded ${getRiskLevelColor(flag.riskLevel)}`}>
                <div className="font-semibold">{flag.targetName}</div>
                <div className="text-sm">{flag.riskType.replace(/_/g, ' ')}</div>
                <div className="text-xs mt-1">
                  Score: {flag.score} | Confidence: {(flag.confidence * 100).toFixed(0)}% | {flag.anomalyCount} anomalies
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
