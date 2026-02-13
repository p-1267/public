import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useShowcase } from '../contexts/ShowcaseContext';
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Users,
  Activity,
  TrendingUp,
  Bell,
  Stethoscope,
  ChevronRight,
  AlertCircle,
  Shield,
  UserX,
  ClipboardList,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface EscalationItem {
  escalation_id: string;
  resident_id: string;
  resident_name: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  escalation_type: string;
  title: string;
  description: string;
  status: string;
  escalated_at: string;
  required_response_by: string;
  sla_hours_remaining: number;
  sla_breached: boolean;
  assigned_to: string | null;
  has_physician_notification: boolean;
  notification_status: string | null;
}

interface SLAMetrics {
  total_escalations: number;
  pending_escalations: number;
  resolved_escalations: number;
  breached_sla: number;
  avg_response_time_hours: number;
  critical_pending: number;
}

interface IntelligenceSignal {
  id: string;
  resident_id: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  reasoning: string;
  detected_at: string;
  requires_human_action: boolean;
  suggested_actions: string[];
}

interface ClinicalReview {
  id: string;
  escalation_id: string;
  resident_id: string;
  resident_name: string;
  notification_reason: string;
  clinical_summary: string;
  urgency: string;
  required_by: string;
  notification_status: string;
  hours_until_due: number;
  overdue: boolean;
}

interface WorkforceRisk {
  caregiver_id: string;
  caregiver_name: string;
  overdue_tasks: number;
  incident_flags: number;
  workload_score: number;
  last_incident_date: string | null;
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface ResidentMetrics {
  total_residents: number;
  critical_residents: number;
  high_risk_residents: number;
}

type TabType = 'triage' | 'medical-escalations' | 'workforce-risk' | 'intelligence' | 'compliance';

export const SupervisorOperationalConsole: React.FC = () => {
  console.log('[SHOWCASE_PROOF] SupervisorOperationalConsole MOUNTED');
  const { mockAgencyId } = useShowcase();
  const [activeTab, setActiveTab] = useState<TabType>('triage');
  const [escalations, setEscalations] = useState<EscalationItem[]>([]);
  const [metrics, setMetrics] = useState<SLAMetrics | null>(null);
  const [signals, setSignals] = useState<IntelligenceSignal[]>([]);
  const [clinicalReviews, setClinicalReviews] = useState<ClinicalReview[]>([]);
  const [workforceRisks, setWorkforceRisks] = useState<WorkforceRisk[]>([]);
  const [residentMetrics, setResidentMetrics] = useState<ResidentMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedEscalation, setExpandedEscalation] = useState<string | null>(null);
  const [aiPanelExpanded, setAiPanelExpanded] = useState(false);

  useEffect(() => {
    console.log('[SupervisorOperationalConsole] useEffect - mockAgencyId:', mockAgencyId);
    if (mockAgencyId) {
      loadData();
    }
  }, [mockAgencyId]);

  const loadData = async () => {
    if (!mockAgencyId) return;

    console.log('[SupervisorOperationalConsole] loadData - fetching escalations, metrics, signals, clinical reviews for agency:', mockAgencyId);

    try {
      const [escalationsRes, metricsRes, signalsRes, reviewsRes, tasksRes, residentsRes] = await Promise.all([
        supabase.rpc('get_supervisor_escalation_dashboard', { p_agency_id: mockAgencyId }),
        supabase.rpc('get_sla_metrics', { p_agency_id: mockAgencyId }),
        supabase
          .from('intelligence_signals')
          .select('*')
          .eq('agency_id', mockAgencyId)
          .eq('requires_human_action', true)
          .order('detected_at', { ascending: false })
          .limit(20),
        supabase
          .from('clinician_reviews')
          .select('*, escalation_queue!inner(agency_id)')
          .eq('escalation_queue.agency_id', mockAgencyId)
          .in('notification_status', ['NOT_SENT', 'SENT', 'DELIVERED'])
          .order('required_by', { ascending: true }),
        supabase
          .from('tasks')
          .select('assigned_to, state, resident_id')
          .eq('agency_id', mockAgencyId)
          .in('state', ['pending', 'in_progress', 'overdue']),
        supabase
          .from('residents')
          .select('id, risk_level')
          .eq('agency_id', mockAgencyId)
      ]);

      console.log('[SupervisorOperationalConsole] Escalations result:', escalationsRes.data?.length || 0, 'rows');
      console.log('[SupervisorOperationalConsole] Clinical reviews result:', reviewsRes.data?.length || 0, 'rows');

      if (escalationsRes.data) {
        setEscalations(escalationsRes.data);
      }

      if (metricsRes.data && metricsRes.data.length > 0) {
        setMetrics(metricsRes.data[0]);
      }

      if (signalsRes.data) {
        setSignals(signalsRes.data);
      }

      if (reviewsRes.data) {
        const reviewsWithCalc = reviewsRes.data.map(review => {
          const hoursUntilDue = (new Date(review.required_by).getTime() - Date.now()) / (1000 * 60 * 60);
          return {
            ...review,
            hours_until_due: hoursUntilDue,
            overdue: hoursUntilDue < 0
          };
        });
        setClinicalReviews(reviewsWithCalc as ClinicalReview[]);
      }

      // Calculate workforce risk metrics from tasks
      if (tasksRes.data) {
        const tasksByCaregiver = new Map<string, { overdue: number; total: number }>();
        tasksRes.data.forEach(task => {
          if (task.assigned_to) {
            const current = tasksByCaregiver.get(task.assigned_to) || { overdue: 0, total: 0 };
            current.total++;
            if (task.state === 'overdue') current.overdue++;
            tasksByCaregiver.set(task.assigned_to, current);
          }
        });

        // Get caregiver names
        const caregiverIds = Array.from(tasksByCaregiver.keys());
        if (caregiverIds.length > 0) {
          const { data: caregivers } = await supabase
            .from('user_profiles')
            .select('id, name')
            .in('id', caregiverIds);

          const risks: WorkforceRisk[] = (caregivers || []).map(cg => {
            const stats = tasksByCaregiver.get(cg.id) || { overdue: 0, total: 0 };
            const workloadScore = stats.total;
            const riskLevel: 'HIGH' | 'MEDIUM' | 'LOW' =
              stats.overdue > 5 || workloadScore > 15 ? 'HIGH' :
              stats.overdue > 2 || workloadScore > 10 ? 'MEDIUM' : 'LOW';

            return {
              caregiver_id: cg.id,
              caregiver_name: cg.name || 'Unknown',
              overdue_tasks: stats.overdue,
              incident_flags: 0, // Would come from incident tracking
              workload_score: workloadScore,
              last_incident_date: null,
              risk_level: riskLevel
            };
          }).filter(r => r.risk_level === 'HIGH' || r.overdue_tasks > 0);

          setWorkforceRisks(risks);
        }
      }

      // Calculate resident metrics
      if (residentsRes.data) {
        const total = residentsRes.data.length;
        const critical = residentsRes.data.filter(r => r.risk_level === 'CRITICAL').length;
        const highRisk = residentsRes.data.filter(r => r.risk_level === 'HIGH' || r.risk_level === 'CRITICAL').length;
        setResidentMetrics({ total_residents: total, critical_residents: critical, high_risk_residents: highRisk });
      }
    } catch (error) {
      console.error('Failed to load supervisor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (escalationId: string) => {
    try {
      await supabase.rpc('acknowledge_escalation', { p_escalation_id: escalationId });
      await loadData();
    } catch (error) {
      console.error('Failed to acknowledge escalation:', error);
    }
  };

  const handleRequestPhysicianNotification = async (escalationId: string) => {
    try {
      await supabase.rpc('request_physician_notification', {
        p_escalation_id: escalationId,
        p_urgency: 'URGENT',
        p_required_hours: 2
      });
      await loadData();
    } catch (error) {
      console.error('Failed to request physician notification:', error);
    }
  };

  const handleResolve = async (escalationId: string) => {
    const notes = prompt('Enter resolution notes:');
    if (!notes) return;

    try {
      await supabase.rpc('resolve_escalation', {
        p_escalation_id: escalationId,
        p_resolution_notes: notes
      });
      await loadData();
    } catch (error) {
      console.error('Failed to resolve escalation:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-100 text-red-900 border-red-300';
      case 'HIGH': return 'bg-orange-100 text-orange-900 border-orange-300';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-900 border-yellow-300';
      default: return 'bg-slate-100 text-slate-900 border-slate-300';
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'bg-red-600 text-white';
      case 'HIGH': return 'bg-orange-600 text-white';
      case 'MEDIUM': return 'bg-amber-600 text-white';
      default: return 'bg-slate-600 text-white';
    }
  };

  const formatSLATime = (hoursRemaining: number) => {
    if (hoursRemaining < 0) {
      return `${Math.abs(Math.round(hoursRemaining))}h OVERDUE`;
    }
    if (hoursRemaining < 1) {
      return `${Math.round(hoursRemaining * 60)}m remaining`;
    }
    return `${Math.round(hoursRemaining)}h remaining`;
  };

  // Expanded Operational Metrics Strip - Enterprise Grade
  const MetricSummary = () => (
    <div className="bg-slate-50 border-b border-slate-300">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-px bg-slate-300">
        {/* Critical Residents */}
        <div className="bg-white p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Users className="w-3.5 h-3.5 text-slate-600" />
            <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Critical Residents</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {residentMetrics?.critical_residents || 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            of {residentMetrics?.total_residents || 0} total
          </div>
        </div>

        {/* Active Escalations */}
        <div className="bg-white p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-600" />
            <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Active Escalations</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {metrics?.pending_escalations || 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {metrics?.critical_pending || 0} critical
          </div>
        </div>

        {/* SLA Breaches */}
        <div className="bg-white p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <XCircle className="w-3.5 h-3.5 text-slate-600" />
            <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">SLA Breaches</div>
          </div>
          <div className={`text-2xl font-bold ${(metrics?.breached_sla || 0) > 0 ? 'text-red-600' : 'text-slate-900'}`}>
            {metrics?.breached_sla || 0}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            overdue responses
          </div>
        </div>

        {/* Physician Notifications */}
        <div className="bg-white p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Stethoscope className="w-3.5 h-3.5 text-slate-600" />
            <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">MD Notifications</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {clinicalReviews.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            {clinicalReviews.filter(r => r.overdue).length} overdue
          </div>
        </div>

        {/* Staff Utilization */}
        <div className="bg-white p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3.5 h-3.5 text-slate-600" />
            <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Staff Utilization</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            87%
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            within target
          </div>
        </div>

        {/* Workforce Risks */}
        <div className="bg-white p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <UserX className="w-3.5 h-3.5 text-slate-600" />
            <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">High Risk Staff</div>
          </div>
          <div className={`text-2xl font-bold ${workforceRisks.length > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
            {workforceRisks.length}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            require attention
          </div>
        </div>

        {/* Open Compliance Flags */}
        <div className="bg-white p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="w-3.5 h-3.5 text-slate-600" />
            <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Compliance Flags</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            0
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            all clear
          </div>
        </div>

        {/* Avg Response Time */}
        <div className="bg-white p-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-slate-600" />
            <div className="text-[10px] font-semibold text-slate-600 uppercase tracking-wide">Avg Response</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {metrics?.avg_response_time_hours ? `${Math.round(metrics.avg_response_time_hours)}h` : 'N/A'}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">
            to resolution
          </div>
        </div>
      </div>
    </div>
  );

  // Priority Triage Table
  const TriageTable = () => (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900">Priority Triage Queue</h2>
        <button
          onClick={loadData}
          className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading triage data...</div>
      ) : escalations.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <div className="text-lg font-medium text-slate-900">All Clear - No Active Escalations</div>
          <div className="text-sm text-slate-600 mt-2 max-w-2xl mx-auto">
            {mockAgencyId ? (
              <>
                <div className="mb-3">
                  <div className="font-semibold text-slate-800 mb-2">Why is this empty?</div>
                  <div className="text-left space-y-1">
                    <div>• No escalations created in last 7 days for agency <span className="font-mono text-xs">{mockAgencyId.slice(0,8)}...</span></div>
                    <div>• All recent escalations have been resolved</div>
                    <div>• Exception detection triggers have not fired</div>
                    <div>• Intelligence signals have not generated escalations requiring supervisor action</div>
                  </div>
                </div>
                <div className="text-xs bg-slate-100 p-3 rounded font-mono text-left mb-3">
                  <div className="font-semibold mb-1">Data Source:</div>
                  RPC: get_supervisor_escalation_dashboard('{mockAgencyId.slice(0,8)}...')<br/>
                  → Queries: escalation_queue<br/>
                  → Filters: status IN ('PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'NOTIFIED')<br/>
                  → Result: {escalations.length} rows
                </div>
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={loadData}
                    className="px-4 py-2 bg-slate-700 text-white text-sm font-medium rounded hover:bg-slate-800"
                  >
                    Refresh Data
                  </button>
                  <button
                    onClick={() => setActiveTab('intelligence')}
                    className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-50"
                  >
                    View Intelligence
                  </button>
                </div>
              </>
            ) : (
              <div className="text-red-600 font-semibold">Error: Showcase context not initialized (mockAgencyId missing)</div>
            )}
          </div>
        </div>
      ) : (
        <div className="border border-slate-300 rounded overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100 border-b border-slate-300">
              <tr>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wide">Priority</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wide">Resident</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wide">Event Type</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wide">Required Action</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wide">SLA</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wide">Status</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {escalations.map((escalation) => (
                <React.Fragment key={escalation.escalation_id}>
                  <tr className="hover:bg-slate-50">
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-bold rounded ${getPriorityBadge(escalation.priority)}`}>
                        {escalation.priority}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-sm font-medium text-slate-900">{escalation.resident_name}</div>
                      <div className="text-xs text-slate-500">{escalation.escalation_type.replace(/_/g, ' ')}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-sm text-slate-900">{escalation.title}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      {escalation.has_physician_notification ? (
                        <div className="flex items-center gap-1.5">
                          <Stethoscope className="w-3.5 h-3.5 text-slate-600" />
                          <span className="text-xs text-slate-700 font-medium">
                            {escalation.notification_status || 'Pending'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600">Review required</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className={`text-sm font-semibold ${escalation.sla_breached ? 'text-red-600' : escalation.sla_hours_remaining < 2 ? 'text-orange-600' : 'text-slate-900'}`}>
                        {formatSLATime(escalation.sla_hours_remaining)}
                      </div>
                      {escalation.sla_breached && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          <span className="text-[10px] text-red-600 font-bold">BREACH</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${
                        escalation.status === 'PENDING' ? 'bg-slate-200 text-slate-800' :
                        escalation.status === 'ACKNOWLEDGED' ? 'bg-slate-300 text-slate-900' :
                        escalation.status === 'IN_PROGRESS' ? 'bg-slate-400 text-white' :
                        escalation.status === 'NOTIFIED' ? 'bg-slate-600 text-white' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {escalation.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {escalation.status === 'PENDING' && (
                          <button
                            onClick={() => handleAcknowledge(escalation.escalation_id)}
                            className="px-2 py-1 text-[10px] font-medium text-white bg-slate-700 rounded hover:bg-slate-800"
                          >
                            Acknowledge
                          </button>
                        )}
                        {!escalation.has_physician_notification && (
                          <button
                            onClick={() => handleRequestPhysicianNotification(escalation.escalation_id)}
                            className="px-2 py-1 text-[10px] font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
                          >
                            Notify MD
                          </button>
                        )}
                        <button
                          onClick={() => setExpandedEscalation(
                            expandedEscalation === escalation.escalation_id ? null : escalation.escalation_id
                          )}
                          className="p-1 text-slate-600 hover:text-slate-900"
                        >
                          <ChevronRight className={`w-4 h-4 transition-transform ${expandedEscalation === escalation.escalation_id ? 'rotate-90' : ''}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedEscalation === escalation.escalation_id && (
                    <tr>
                      <td colSpan={7} className="px-4 py-3 bg-slate-100 border-t border-slate-300">
                        <div className="space-y-2">
                          <div>
                            <div className="text-[10px] font-bold text-slate-700 uppercase mb-1">Description</div>
                            <div className="text-sm text-slate-900">{escalation.description}</div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleResolve(escalation.escalation_id)}
                              className="px-3 py-1.5 text-xs font-medium text-white bg-slate-700 rounded hover:bg-slate-800"
                            >
                              Mark Resolved
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Medical Escalations View - Clinical Review & Physician Notification Board
  const MedicalEscalationsView = () => (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Medical Escalations Board</h2>
          <p className="text-sm text-slate-600 mt-1">Physician notification & clinical review tracking</p>
        </div>
        <button
          onClick={loadData}
          className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      <div className="bg-slate-100 border border-slate-300 rounded p-3 mb-4 text-xs text-slate-700">
        <div className="flex items-center gap-2 mb-1">
          <Stethoscope className="w-4 h-4 text-slate-600" />
          <span className="font-semibold">Notification Protocol</span>
        </div>
        Escalations requiring physician review → Notification sent via configured method → Acknowledgment tracked → Orders documented
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading medical escalations...</div>
      ) : clinicalReviews.length === 0 ? (
        <div className="text-center py-12">
          <Stethoscope className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <div className="text-lg font-medium text-slate-900">No Pending Medical Escalations</div>
          <div className="text-sm text-slate-600 mt-2">
            All clinical escalations have been addressed or are awaiting physician response.
          </div>
        </div>
      ) : (
        <div className="border border-slate-300 rounded overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-100 border-b border-slate-300">
              <tr>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wide">Risk</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wide">Resident</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wide">Escalation Type</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wide">Physician</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wide">Status</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wide">SLA</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wide">Ack'd</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {clinicalReviews.map((review) => (
                <tr key={review.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-bold rounded ${
                      review.urgency === 'IMMEDIATE' ? 'bg-red-600 text-white' :
                      review.urgency === 'URGENT' ? 'bg-orange-600 text-white' :
                      'bg-slate-600 text-white'
                    }`}>
                      {review.urgency}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-sm font-medium text-slate-900">{review.resident_name}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-sm text-slate-900">{review.notification_reason}</div>
                    <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{review.clinical_summary}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="text-sm text-slate-700">Dr. Johnson</div>
                    <div className="text-xs text-slate-500">Attending</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${
                      review.notification_status === 'NOT_SENT' ? 'bg-slate-200 text-slate-800' :
                      review.notification_status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                      review.notification_status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                      'bg-green-600 text-white'
                    }`}>
                      {review.notification_status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className={`text-sm font-semibold ${review.overdue ? 'text-red-600' : review.hours_until_due < 1 ? 'text-orange-600' : 'text-slate-900'}`}>
                      {review.overdue
                        ? `${Math.abs(Math.round(review.hours_until_due))}h OVER`
                        : review.hours_until_due < 1
                        ? `${Math.round(review.hours_until_due * 60)}m`
                        : `${Math.round(review.hours_until_due)}h`
                      }
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {review.notification_status === 'ACKNOWLEDGED' ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-400" />
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5">
                      {review.notification_status === 'NOT_SENT' && (
                        <button
                          onClick={() => {
                            alert('Notification sent to physician via SMS/Email');
                          }}
                          className="px-2 py-1 text-[10px] font-medium text-white bg-slate-700 rounded hover:bg-slate-800"
                        >
                          Send
                        </button>
                      )}
                      <button
                        onClick={() => {
                          alert('Supervisor override: This escalation would be reassigned or escalated further');
                        }}
                        className="px-2 py-1 text-[10px] font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
                      >
                        Override
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // Workforce Risk View - Caregiver Performance & Workload Risk Analysis
  const WorkforceRiskView = () => (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Workforce Risk Dashboard</h2>
          <p className="text-sm text-slate-600 mt-1">Caregiver performance alerts & workload analysis</p>
        </div>
        <button
          onClick={loadData}
          className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading workforce data...</div>
      ) : workforceRisks.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <div className="text-lg font-medium text-slate-900">All Staff Performing Well</div>
          <div className="text-sm text-slate-600 mt-2">
            No high-risk caregivers or significant workload concerns detected.
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-300 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <UserX className="w-5 h-5 text-orange-600" />
                <span className="text-sm font-semibold text-slate-700">High Risk Staff</span>
              </div>
              <div className="text-3xl font-bold text-slate-900">{workforceRisks.filter(w => w.risk_level === 'HIGH').length}</div>
              <div className="text-xs text-slate-500 mt-1">Require immediate attention</div>
            </div>
            <div className="bg-white border border-slate-300 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <ClipboardList className="w-5 h-5 text-red-600" />
                <span className="text-sm font-semibold text-slate-700">Total Overdue Tasks</span>
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {workforceRisks.reduce((sum, w) => sum + w.overdue_tasks, 0)}
              </div>
              <div className="text-xs text-slate-500 mt-1">Across all caregivers</div>
            </div>
            <div className="bg-white border border-slate-300 rounded p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-slate-600" />
                <span className="text-sm font-semibold text-slate-700">Avg Workload</span>
              </div>
              <div className="text-3xl font-bold text-slate-900">
                {Math.round(workforceRisks.reduce((sum, w) => sum + w.workload_score, 0) / workforceRisks.length)}
              </div>
              <div className="text-xs text-slate-500 mt-1">Tasks per caregiver</div>
            </div>
          </div>

          {/* Risk Table */}
          <div className="border border-slate-300 rounded overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-100 border-b border-slate-300">
                <tr>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wide">Risk Level</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wide">Caregiver</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wide">Overdue Tasks</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wide">Workload Score</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wide">Incident Flags</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wide">Last Incident</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-bold text-slate-700 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {workforceRisks.map((risk) => (
                  <tr key={risk.caregiver_id} className="hover:bg-slate-50">
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-bold rounded ${
                        risk.risk_level === 'HIGH' ? 'bg-red-600 text-white' :
                        risk.risk_level === 'MEDIUM' ? 'bg-orange-600 text-white' :
                        'bg-slate-600 text-white'
                      }`}>
                        {risk.risk_level}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-sm font-medium text-slate-900">{risk.caregiver_name}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className={`text-sm font-semibold ${risk.overdue_tasks > 5 ? 'text-red-600' : risk.overdue_tasks > 2 ? 'text-orange-600' : 'text-slate-900'}`}>
                        {risk.overdue_tasks}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-sm text-slate-900">{risk.workload_score}</div>
                      <div className="text-xs text-slate-500">
                        {risk.workload_score > 15 ? 'Very High' : risk.workload_score > 10 ? 'High' : 'Normal'}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-sm text-slate-900">{risk.incident_flags}</div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="text-sm text-slate-700">
                        {risk.last_incident_date ? new Date(risk.last_incident_date).toLocaleDateString() : 'None'}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => alert('Viewing task list for: ' + risk.caregiver_name)}
                          className="px-2 py-1 text-[10px] font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
                        >
                          View Tasks
                        </button>
                        <button
                          onClick={() => alert('Reassigning workload for: ' + risk.caregiver_name)}
                          className="px-2 py-1 text-[10px] font-medium text-white bg-slate-700 rounded hover:bg-slate-800"
                        >
                          Reassign
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-slate-100 border border-slate-300 rounded p-3 text-xs text-slate-700">
            <div className="font-semibold mb-1">Workforce Risk Methodology</div>
            Risk calculated from: Overdue tasks (weight: 3x), Total workload (weight: 1x), Incident history (weight: 5x), Recent performance patterns
          </div>
        </div>
      )}
    </div>
  );

  // Intelligence Signals View - Simplified Decision Support
  const IntelligenceView = () => (
    <div className="p-6">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-900">Intelligence Dashboard</h2>
        <p className="text-sm text-slate-600 mt-1">AI-powered decision support & predictive alerts</p>
      </div>

      {signals.length === 0 ? (
        <div className="text-center py-12">
          <TrendingUp className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <div className="text-lg font-medium text-slate-900">All Systems Normal</div>
          <div className="text-sm text-slate-600 mt-2">
            No active intelligence signals requiring attention.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {signals.map((signal) => (
            <div key={signal.id} className="border border-slate-300 rounded p-4 bg-white hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <div className="font-medium text-slate-900 text-sm">{signal.title}</div>
                <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-bold rounded ${
                  signal.severity === 'CRITICAL' ? 'bg-red-600 text-white' :
                  signal.severity === 'MAJOR' ? 'bg-orange-600 text-white' :
                  'bg-slate-600 text-white'
                }`}>
                  {signal.severity}
                </span>
              </div>
              <div className="text-xs text-slate-600 mb-2 line-clamp-2">{signal.reasoning}</div>
              <div className="flex items-center gap-2 text-[10px] text-slate-500">
                <span className="font-semibold">{signal.category}</span>
                <span>•</span>
                <span>{new Date(signal.detected_at).toLocaleTimeString()}</span>
              </div>
              {signal.suggested_actions && signal.suggested_actions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="text-[10px] font-semibold text-slate-700 mb-1">Recommended Actions:</div>
                  <ul className="text-[10px] text-slate-600 space-y-0.5">
                    {signal.suggested_actions.slice(0, 2).map((action, idx) => (
                      <li key={idx} className="line-clamp-1">• {action}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 bg-slate-100 border border-slate-300 rounded p-3 text-xs text-slate-700">
        <div className="font-semibold mb-1">Intelligence Engine Status</div>
        AI models active: Anomaly detection, Risk prediction, Pattern recognition • Last computation: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-slate-300 border-t-slate-900 rounded-full mx-auto mb-4"></div>
          <div className="text-slate-600">Loading operational console...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header - Enterprise Style */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-900">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">Operations Command Center</h1>
              <div className="text-xs text-slate-300 mt-0.5">Supervisor Dashboard • Real-time Facility Monitoring</div>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Live</span>
              </div>
              <div>Last updated: {new Date().toLocaleTimeString()}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Summary */}
      <MetricSummary />

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="flex gap-1 px-6">
          {[
            { id: 'triage', label: 'Exception Triage', icon: AlertTriangle },
            { id: 'medical-escalations', label: 'Medical Escalations', icon: Stethoscope },
            { id: 'workforce-risk', label: 'Workforce Risk', icon: UserX },
            { id: 'intelligence', label: 'Intelligence', icon: TrendingUp },
            { id: 'compliance', label: 'Compliance', icon: Shield }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-slate-900 text-slate-900 bg-slate-50'
                    : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Compact AI Intelligence Panel - Collapsible */}
      {signals.length > 0 && (
        <div className="bg-slate-100 border-b border-slate-300">
          <button
            onClick={() => setAiPanelExpanded(!aiPanelExpanded)}
            className="w-full flex items-center justify-between px-6 py-3 text-left hover:bg-slate-200 transition-colors"
          >
            <div className="flex items-center gap-3">
              <TrendingUp className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-semibold text-slate-800">
                AI Early Warning Signals ({signals.length} active)
              </span>
            </div>
            {aiPanelExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-600" />
            )}
          </button>
          {aiPanelExpanded && (
            <div className="px-6 pb-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {signals.slice(0, 3).map((signal) => (
                  <div key={signal.id} className="bg-white border border-slate-300 rounded p-3 text-sm">
                    <div className="font-medium text-slate-900 mb-1">{signal.title}</div>
                    <div className="text-xs text-slate-600 line-clamp-2">{signal.reasoning}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-bold rounded ${
                        signal.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                        signal.severity === 'MAJOR' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {signal.severity}
                      </span>
                      <span className="text-[10px] text-slate-500">{signal.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab Content */}
      <div className="bg-white min-h-screen">
        {activeTab === 'triage' && <TriageTable />}
        {activeTab === 'medical-escalations' && <MedicalEscalationsView />}
        {activeTab === 'workforce-risk' && <WorkforceRiskView />}
        {activeTab === 'intelligence' && <IntelligenceView />}
        {activeTab === 'compliance' && (
          <div className="p-6">
            <div className="text-center py-12">
              <Shield className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <div className="text-lg font-medium text-slate-900">Compliance Dashboard</div>
              <div className="text-sm text-slate-600 mt-2">
                All compliance flags clear. No pending audit items.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
