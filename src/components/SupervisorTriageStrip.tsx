import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useShowcase } from '../contexts/ShowcaseContext';
import { AlertTriangle, Stethoscope, Users, Clock } from 'lucide-react';

interface TriageItem {
  id: string;
  resident_id: string;
  resident_name: string;
  title: string;
  severity: string;
  category: string;
  timestamp: string;
  age_hours: number;
  owner_role: string;
  status: string;
  metadata?: any;
}

interface EscalationItem {
  review_id: string;
  task_id: string;
  task_title: string;
  resident_id: string;
  resident_name: string;
  review_status: string;
  escalation_reason: string;
  urgency: string;
  escalated_at: string;
  age_hours: number;
}

export const SupervisorTriageStrip: React.FC = () => {
  const { mockAgencyId, currentScenario } = useShowcase();
  const [criticalItems, setCriticalItems] = useState<TriageItem[]>([]);
  const [escalations, setEscalations] = useState<EscalationItem[]>([]);
  const [operationalRisks, setOperationalRisks] = useState<TriageItem[]>([]);
  const [recentChanges, setRecentChanges] = useState<TriageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [escalating, setEscalating] = useState<string | null>(null);

  useEffect(() => {
    if (mockAgencyId) {
      loadTriageData();
    }
  }, [mockAgencyId]);

  const loadTriageData = async () => {
    if (!mockAgencyId) return;

    try {
      const [criticalRes, escalationsRes, operationalRes, recentRes] = await Promise.all([
        supabase
          .from('prioritized_issues')
          .select('*')
          .eq('agency_id', mockAgencyId)
          .in('issue_category', ['SAFETY', 'MEDICAL'])
          .gte('priority_score', 80)
          .eq('status', 'OPEN')
          .order('priority_score', { ascending: false })
          .limit(5),

        supabase.rpc('get_supervisor_escalation_queue', { p_agency_id: mockAgencyId }),

        supabase
          .from('prioritized_issues')
          .select('*')
          .eq('agency_id', mockAgencyId)
          .in('issue_category', ['STAFFING', 'WORKLOAD', 'CAPACITY'])
          .eq('status', 'OPEN')
          .order('priority_score', { ascending: false })
          .limit(5),

        supabase
          .from('prioritized_issues')
          .select('*')
          .eq('agency_id', mockAgencyId)
          .in('status', ['RESOLVED', 'ACKNOWLEDGED'])
          .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
          .order('updated_at', { ascending: false })
          .limit(5)
      ]);

      if (criticalRes.data) {
        setCriticalItems(criticalRes.data.map(mapIssueToTriageItem));
      }

      if (escalationsRes.data) {
        setEscalations(escalationsRes.data);
      }

      if (operationalRes.data) {
        setOperationalRisks(operationalRes.data.map(mapIssueToTriageItem));
      }

      if (recentRes.data) {
        setRecentChanges(recentRes.data.map(mapIssueToTriageItem));
      }

    } catch (error) {
      console.error('Failed to load triage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const mapIssueToTriageItem = (issue: any): TriageItem => ({
    id: issue.id,
    resident_id: issue.resident_id,
    resident_name: issue.resident_name || 'Unknown',
    title: issue.title,
    severity: issue.severity || 'medium',
    category: issue.issue_category,
    timestamp: issue.detected_at || issue.created_at,
    age_hours: issue.age_hours || 0,
    owner_role: issue.assigned_role || 'Unassigned',
    status: issue.status,
    metadata: issue.metadata
  });

  const handleEscalateToclinician = async (taskId: string) => {
    setEscalating(taskId);
    try {
      const { data, error } = await supabase.rpc('request_clinician_review', {
        p_task_id: taskId,
        p_reason: 'Supervisor escalation - requires clinical assessment',
        p_urgency: 'high'
      });

      if (error) throw error;

      await loadTriageData();
    } catch (error) {
      console.error('Failed to escalate to clinician:', error);
      alert('Failed to escalate to clinician');
    } finally {
      setEscalating(null);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-100 border-red-300 text-red-900';
      case 'high': return 'bg-orange-100 border-orange-300 text-orange-900';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-900';
      default: return 'bg-slate-100 border-slate-300 text-slate-900';
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'bg-red-600 text-white';
      case 'high': return 'bg-orange-600 text-white';
      case 'medium': return 'bg-yellow-600 text-white';
      default: return 'bg-slate-600 text-white';
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="text-sm text-slate-600">Loading triage data...</div>
      </div>
    );
  }

  const scenarioName = currentScenario?.name || 'Scenario Active';
  const totalNeedsAttention = criticalItems.length + escalations.length + operationalRisks.length;

  return (
    <div className="bg-white border border-slate-200 rounded-lg">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-slate-900">Supervisor Triage</h2>
            <div className="px-3 py-1 bg-slate-100 border border-slate-300 rounded text-xs font-semibold text-slate-700">
              {scenarioName}
            </div>
          </div>
          {totalNeedsAttention > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-lg font-bold text-red-900">
                {totalNeedsAttention} Need{totalNeedsAttention !== 1 ? 's' : ''} Attention
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 divide-x divide-slate-200">
        {/* LANE A: CRITICAL NOW */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-slate-900">Critical Now</h3>
            {criticalItems.length > 0 && (
              <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded">
                {criticalItems.length}
              </span>
            )}
          </div>

          {criticalItems.length === 0 ? (
            <div className="text-sm text-slate-500 italic">All clear</div>
          ) : (
            <div className="space-y-3">
              {criticalItems.map((item) => (
                <div key={item.id} className="bg-slate-50 border border-slate-200 rounded p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-sm text-slate-900">{item.resident_name}</div>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${getSeverityBadge(item.severity)}`}>
                      {item.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 mb-2">{item.title}</div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{item.owner_role}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.round(item.age_hours)}h ago
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LANE B: NEEDS CLINICIAN REVIEW */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Stethoscope className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-900">Clinician Review</h3>
            {escalations.length > 0 && (
              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded">
                {escalations.length}
              </span>
            )}
          </div>

          {escalations.length === 0 ? (
            <div className="text-sm text-slate-500 italic">No pending escalations</div>
          ) : (
            <div className="space-y-3">
              {escalations.map((item) => (
                <div key={item.review_id} className="bg-blue-50 border border-blue-200 rounded p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-sm text-slate-900">{item.resident_name}</div>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${getSeverityBadge(item.urgency)}`}>
                      {item.urgency.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 mb-2">{item.task_title}</div>
                  <div className="text-xs text-slate-600 mb-2">{item.escalation_reason}</div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-blue-700 font-semibold">Pending Review</span>
                    <span className="flex items-center gap-1 text-slate-600">
                      <Clock className="w-3 h-3" />
                      {Math.round(item.age_hours)}h ago
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LANE C: OPERATIONAL RISKS */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-orange-600" />
            <h3 className="font-bold text-slate-900">Operational Risks</h3>
            {operationalRisks.length > 0 && (
              <span className="px-2 py-0.5 bg-orange-600 text-white text-xs font-bold rounded">
                {operationalRisks.length}
              </span>
            )}
          </div>

          {operationalRisks.length === 0 ? (
            <div className="text-sm text-slate-500 italic">Operations normal</div>
          ) : (
            <div className="space-y-3">
              {operationalRisks.map((item) => (
                <div key={item.id} className="bg-orange-50 border border-orange-200 rounded p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-sm text-slate-900">{item.category}</div>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${getSeverityBadge(item.severity)}`}>
                      {item.severity.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 mb-2">{item.title}</div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{item.owner_role}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.round(item.age_hours)}h ago
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* LANE D: RECENT CHANGES */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-green-600" />
            <h3 className="font-bold text-slate-900">Recent Changes</h3>
            <span className="text-xs text-slate-500">(24h)</span>
          </div>

          {recentChanges.length === 0 ? (
            <div className="text-sm text-slate-500 italic">No recent updates</div>
          ) : (
            <div className="space-y-3">
              {recentChanges.map((item) => (
                <div key={item.id} className="bg-green-50 border border-green-200 rounded p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="font-semibold text-sm text-slate-900">{item.resident_name}</div>
                    <span className="px-2 py-0.5 bg-green-700 text-white text-xs font-bold rounded">
                      {item.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700 mb-2">{item.title}</div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>{item.owner_role}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {Math.round(item.age_hours)}h ago
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
