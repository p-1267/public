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
  AlertCircle
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

type TabType = 'triage' | 'escalations' | 'md-review' | 'intelligence' | 'workforce' | 'compliance';

export const SupervisorOperationalConsole: React.FC = () => {
  console.log('[SHOWCASE_PROOF] SupervisorOperationalConsole MOUNTED');
  const { mockAgencyId } = useShowcase();
  const [activeTab, setActiveTab] = useState<TabType>('triage');
  const [escalations, setEscalations] = useState<EscalationItem[]>([]);
  const [metrics, setMetrics] = useState<SLAMetrics | null>(null);
  const [signals, setSignals] = useState<IntelligenceSignal[]>([]);
  const [clinicalReviews, setClinicalReviews] = useState<ClinicalReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedEscalation, setExpandedEscalation] = useState<string | null>(null);

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
      const [escalationsRes, metricsRes, signalsRes, reviewsRes] = await Promise.all([
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
          .order('required_by', { ascending: true })
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

  // Metric Summary Strip
  const MetricSummary = () => (
    <div className="bg-white border-b border-slate-200">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-px bg-slate-200">
        <div className="bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <div className="text-xs font-medium text-slate-600">Critical Events</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {metrics?.critical_pending || 0}
          </div>
        </div>

        <div className="bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-4 h-4 text-orange-600" />
            <div className="text-xs font-medium text-slate-600">Escalations</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {metrics?.pending_escalations || 0}
          </div>
        </div>

        <div className="bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-red-600" />
            <div className="text-xs font-medium text-slate-600">SLA Breaches</div>
          </div>
          <div className="text-2xl font-bold text-red-600">
            {metrics?.breached_sla || 0}
          </div>
        </div>

        <div className="bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <div className="text-xs font-medium text-slate-600">Resolved (7d)</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {metrics?.resolved_escalations || 0}
          </div>
        </div>

        <div className="bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-blue-600" />
            <div className="text-xs font-medium text-slate-600">Avg Response</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {metrics?.avg_response_time_hours ? `${Math.round(metrics.avg_response_time_hours)}h` : 'N/A'}
          </div>
        </div>

        <div className="bg-white p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-slate-600" />
            <div className="text-xs font-medium text-slate-600">Staff Util.</div>
          </div>
          <div className="text-2xl font-bold text-slate-900">87%</div>
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
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                  >
                    Refresh Data
                  </button>
                  <button
                    onClick={() => setActiveTab('intelligence')}
                    className="px-4 py-2 bg-slate-600 text-white text-sm font-medium rounded hover:bg-slate-700"
                  >
                    View Intelligence Signals
                  </button>
                </div>
              </>
            ) : (
              <div className="text-red-600 font-semibold">Error: Showcase context not initialized (mockAgencyId missing)</div>
            )}
          </div>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Priority</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Resident</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Event Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Required Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">SLA</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {escalations.map((escalation) => (
                <React.Fragment key={escalation.escalation_id}>
                  <tr className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-bold rounded ${getPriorityBadge(escalation.priority)}`}>
                        {escalation.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{escalation.resident_name}</div>
                      <div className="text-xs text-slate-500">{escalation.escalation_type.replace(/_/g, ' ')}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-slate-900">{escalation.title}</div>
                    </td>
                    <td className="px-4 py-3">
                      {escalation.has_physician_notification ? (
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-blue-600" />
                          <span className="text-sm text-blue-900 font-medium">
                            Physician: {escalation.notification_status || 'Pending'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-600">Review required</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className={`text-sm font-medium ${escalation.sla_breached ? 'text-red-600' : escalation.sla_hours_remaining < 2 ? 'text-orange-600' : 'text-slate-900'}`}>
                        {formatSLATime(escalation.sla_hours_remaining)}
                      </div>
                      {escalation.sla_breached && (
                        <div className="flex items-center gap-1 mt-1">
                          <AlertTriangle className="w-3 h-3 text-red-600" />
                          <span className="text-xs text-red-600 font-semibold">BREACHED</span>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                        escalation.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        escalation.status === 'ACKNOWLEDGED' ? 'bg-blue-100 text-blue-800' :
                        escalation.status === 'IN_PROGRESS' ? 'bg-purple-100 text-purple-800' :
                        escalation.status === 'NOTIFIED' ? 'bg-green-100 text-green-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {escalation.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {escalation.status === 'PENDING' && (
                          <button
                            onClick={() => handleAcknowledge(escalation.escalation_id)}
                            className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                          >
                            Acknowledge
                          </button>
                        )}
                        {!escalation.has_physician_notification && (
                          <button
                            onClick={() => handleRequestPhysicianNotification(escalation.escalation_id)}
                            className="px-2 py-1 text-xs font-medium text-purple-700 bg-purple-50 border border-purple-200 rounded hover:bg-purple-100"
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
                      <td colSpan={7} className="px-4 py-4 bg-slate-50">
                        <div className="space-y-3">
                          <div>
                            <div className="text-xs font-semibold text-slate-700 uppercase mb-1">Description</div>
                            <div className="text-sm text-slate-900">{escalation.description}</div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleResolve(escalation.escalation_id)}
                              className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
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

  // MD Review View - Clinical Escalations Requiring Physician Notification
  const MDReviewView = () => (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-slate-900">Clinical Escalations (MD Review Required)</h2>
        <button
          onClick={loadData}
          className="px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-50"
        >
          Refresh
        </button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Stethoscope className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-blue-900">Physician Notification Pipeline</h3>
        </div>
        <p className="text-sm text-blue-800">
          This lane tracks escalations that have been flagged for physician review. Each item shows the notification status,
          clinical urgency, and time remaining until physician response is required per protocol.
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading clinical reviews...</div>
      ) : clinicalReviews.length === 0 ? (
        <div className="text-center py-12">
          <Stethoscope className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <div className="text-lg font-medium text-slate-900">No Pending Physician Notifications</div>
          <div className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
            All clinical escalations requiring physician review have been notified or are in progress.
            <div className="mt-3 text-xs bg-slate-100 p-3 rounded font-mono text-left">
              Query: SELECT * FROM clinician_reviews<br/>
              WHERE notification_status IN ('NOT_SENT', 'SENT', 'DELIVERED')<br/>
              Result: {clinicalReviews.length} rows
            </div>
          </div>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Urgency</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Resident</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Clinical Summary</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Due In</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {clinicalReviews.map((review) => (
                <tr key={review.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-bold rounded ${
                      review.urgency === 'IMMEDIATE' ? 'bg-red-600 text-white' :
                      review.urgency === 'URGENT' ? 'bg-orange-600 text-white' :
                      'bg-amber-600 text-white'
                    }`}>
                      {review.urgency}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{review.resident_name}</div>
                    <div className="text-xs text-slate-500">ID: {review.resident_id.slice(0, 8)}...</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-900">{review.notification_reason}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-slate-700 max-w-xs">
                      {review.clinical_summary?.slice(0, 100)}
                      {review.clinical_summary?.length > 100 && '...'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${
                      review.notification_status === 'NOT_SENT' ? 'bg-yellow-100 text-yellow-800' :
                      review.notification_status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                      review.notification_status === 'DELIVERED' ? 'bg-purple-100 text-purple-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {review.notification_status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`text-sm font-medium ${review.overdue ? 'text-red-600' : review.hours_until_due < 1 ? 'text-orange-600' : 'text-slate-900'}`}>
                      {review.overdue
                        ? `${Math.abs(Math.round(review.hours_until_due))}h OVERDUE`
                        : review.hours_until_due < 1
                        ? `${Math.round(review.hours_until_due * 60)}m`
                        : `${Math.round(review.hours_until_due)}h`
                      }
                    </div>
                    {review.overdue && (
                      <div className="flex items-center gap-1 mt-1">
                        <AlertTriangle className="w-3 h-3 text-red-600" />
                        <span className="text-xs text-red-600 font-semibold">OVERDUE</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {review.notification_status === 'NOT_SENT' && (
                        <button
                          onClick={() => {
                            // Mark as sent - in production this would trigger actual notification
                            alert('In production, this would send notification via configured method (SMS/Email/Fax/EHR)');
                          }}
                          className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                        >
                          Send Now
                        </button>
                      )}
                      <button
                        onClick={() => {
                          // View full escalation details
                          const escalation = escalations.find(e => e.escalation_id === review.escalation_id);
                          if (escalation) {
                            setExpandedEscalation(review.escalation_id);
                            setActiveTab('triage');
                          }
                        }}
                        className="px-2 py-1 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100"
                      >
                        View Details
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
        <h3 className="font-semibold text-slate-900 mb-2">Notification Workflow</h3>
        <ol className="text-sm text-slate-700 space-y-1 list-decimal list-inside">
          <li>Escalation flagged for physician review (via "Notify MD" button in Triage tab)</li>
          <li>Clinical review request created with urgency level and required response time</li>
          <li>Notification sent via configured method (SMS, Email, Fax, or EHR integration)</li>
          <li>Physician acknowledgment tracked with audit trail</li>
          <li>Orders/recommendations documented and linked to resident care plan</li>
        </ol>
      </div>
    </div>
  );

  // Intelligence Signals View
  const IntelligenceView = () => (
    <div className="p-6">
      <h2 className="text-xl font-bold text-slate-900 mb-4">Predictive Intelligence</h2>
      <div className="space-y-4">
        {signals.map((signal) => (
          <div key={signal.id} className={`border rounded-lg p-4 ${
            signal.severity === 'CRITICAL' ? 'border-red-300 bg-red-50' :
            signal.severity === 'MAJOR' ? 'border-orange-300 bg-orange-50' :
            signal.severity === 'MODERATE' ? 'border-yellow-300 bg-yellow-50' :
            'border-slate-300 bg-white'
          }`}>
            <div className="flex items-start justify-between mb-2">
              <div className="font-semibold text-slate-900">{signal.title}</div>
              <span className={`px-2 py-1 text-xs font-bold rounded ${getPriorityBadge(signal.severity)}`}>
                {signal.severity}
              </span>
            </div>
            <div className="text-sm text-slate-700 mb-2">{signal.description}</div>
            <div className="text-xs text-slate-600 italic">{signal.reasoning}</div>
            {signal.suggested_actions && signal.suggested_actions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="text-xs font-semibold text-slate-700 mb-1">Suggested Actions:</div>
                <ul className="list-disc list-inside text-xs text-slate-600 space-y-1">
                  {signal.suggested_actions.map((action, idx) => (
                    <li key={idx}>{action}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
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
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-slate-900">Supervisor Operational Console</h1>
          <div className="text-sm text-slate-600 mt-1">Real-time operations command center</div>
        </div>
      </div>

      {/* Metrics Summary */}
      <MetricSummary />

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="flex gap-1 px-6">
          {[
            { id: 'triage', label: 'Exception Triage', icon: AlertTriangle },
            { id: 'escalations', label: 'Escalations & Deadlines', icon: Clock },
            { id: 'md-review', label: 'Clinical Escalations (MD)', icon: Stethoscope },
            { id: 'intelligence', label: 'Predictive Intelligence', icon: TrendingUp },
            { id: 'workforce', label: 'Workforce Impact', icon: Users },
            { id: 'compliance', label: 'Compliance / Audit', icon: CheckCircle }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white">
        {activeTab === 'triage' && <TriageTable />}
        {activeTab === 'escalations' && <TriageTable />}
        {activeTab === 'md-review' && <MDReviewView />}
        {activeTab === 'intelligence' && <IntelligenceView />}
        {activeTab === 'workforce' && (
          <div className="p-6">
            <div className="text-center py-12 text-slate-500">
              Workforce impact analysis coming soon
            </div>
          </div>
        )}
        {activeTab === 'compliance' && (
          <div className="p-6">
            <div className="text-center py-12 text-slate-500">
              Compliance and audit view coming soon
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
