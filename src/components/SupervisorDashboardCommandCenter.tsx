import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useShowcase } from '../contexts/ShowcaseContext';
import {
  AlertCircle, Clock, Users, Activity, AlertTriangle, FileText, TrendingUp, Shield,
  ChevronDown, ChevronUp, Info, ExternalLink, CheckCircle, XCircle, ArrowUp, ArrowDown
} from 'lucide-react';

interface Escalation {
  escalation_id: string;
  resident_id: string;
  resident_name: string;
  priority: string;
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

interface KPIMetric {
  current: number;
  delta_24h?: number;
  delta_7d?: number;
}

interface KPIData {
  critical_residents: KPIMetric;
  active_escalations: KPIMetric;
  sla_breaches: KPIMetric;
  md_notifications_pending: KPIMetric;
  staff_utilization: KPIMetric;
  high_risk_staff: KPIMetric;
  compliance_flags: KPIMetric;
  avg_response_time: KPIMetric;
  total_residents: number;
  caregivers_on_shift: number;
  last_updated: string;
}

interface WorkforceRisk {
  caregiver_id: string;
  caregiver_name: string;
  role_name: string;
  overdue_tasks: number;
  total_active_tasks: number;
  incident_flags: number;
  last_incident_date: string | null;
  risk_level: string;
  risk_reasons: { reason: string; count: number }[];
}

interface DepartmentStats {
  department_id: string;
  department_name: string;
  department_code: string;
  staff_on_duty: number;
  open_tasks: number;
  overdue_tasks: number;
  escalations_today: number;
  needs_review: number;
  coverage_gap: boolean;
}

interface IntelligenceSignal {
  signal_id: string;
  resident_id: string;
  resident_name: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  reasoning: string;
  confidence: number;
  suggested_actions: string[];
  detected_at: string;
  linked_escalation_id: string | null;
  escalation_status: string | null;
  is_actionable: boolean;
}

interface ComplianceData {
  open_audit_issues: number;
  missed_medication_logs: number;
  unacknowledged_incidents: number;
  documentation_gaps: number;
  oldest_open_issue: string | null;
  most_common_gap_type: string | null;
}

export function SupervisorDashboardCommandCenter() {
  const { mockAgencyId } = useShowcase();
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [workforceRisk, setWorkforceRisk] = useState<WorkforceRisk[]>([]);
  const [departments, setDepartments] = useState<DepartmentStats[]>([]);
  const [intelligenceSignals, setIntelligenceSignals] = useState<IntelligenceSignal[]>([]);
  const [compliance, setCompliance] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [aiPanelExpanded, setAiPanelExpanded] = useState(false);

  // Modal states
  const [selectedEscalation, setSelectedEscalation] = useState<Escalation | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [evidenceDrawerOpen, setEvidenceDrawerOpen] = useState(false);
  const [actionReason, setActionReason] = useState('');

  useEffect(() => {
    if (!mockAgencyId) return;
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, [mockAgencyId]);

  const loadDashboard = async () => {
    if (!mockAgencyId) return;

    try {
      // Load KPIs with trends
      const { data: kpiData, error: kpiError } = await supabase.rpc('get_supervisor_kpi_metrics', {
        p_agency_id: mockAgencyId
      });
      if (!kpiError && kpiData) setKpis(kpiData as KPIData);

      // Load escalations
      const { data: escData, error: escError } = await supabase.rpc('get_supervisor_escalation_dashboard', {
        p_agency_id: mockAgencyId
      });
      if (!escError && escData) setEscalations(escData || []);

      // Load workforce risk
      const { data: workforceData, error: workforceError } = await supabase.rpc('get_workforce_risk_assessment', {
        p_agency_id: mockAgencyId
      });
      if (!workforceError && workforceData) setWorkforceRisk(workforceData || []);

      // Load department snapshot
      const { data: deptData, error: deptError } = await supabase.rpc('get_department_snapshot', {
        p_agency_id: mockAgencyId
      });
      if (!deptError && deptData) setDepartments(deptData || []);

      // Load intelligence signals with linkage
      const { data: signalData, error: signalError } = await supabase.rpc('get_intelligence_signals_with_linkage', {
        p_agency_id: mockAgencyId,
        p_limit: 10
      });
      if (!signalError && signalData) setIntelligenceSignals(signalData || []);

      // Load compliance snapshot
      const { data: complianceData, error: complianceError } = await supabase.rpc('get_compliance_snapshot', {
        p_agency_id: mockAgencyId
      });
      if (!complianceError && complianceData) setCompliance(complianceData as ComplianceData);

      setLastRefresh(new Date());
      setLoading(false);
    } catch (error) {
      console.error('[SupervisorDashboard] Error loading data:', error);
      setLoading(false);
    }
  };

  const handleAcknowledge = async (escalationId: string) => {
    if (!actionReason.trim()) {
      alert('Please provide a reason for this action');
      return;
    }

    const { error } = await supabase.rpc('acknowledge_escalation', {
      p_escalation_id: escalationId,
      p_acknowledger_id: null
    });

    if (!error) {
      setActionReason('');
      setSelectedEscalation(null);
      loadDashboard();
    }
  };

  const handleAssign = async (escalationId: string, assigneeId: string) => {
    if (!actionReason.trim()) {
      alert('Please provide a reason for assignment');
      return;
    }

    const { error } = await supabase.rpc('assign_escalation', {
      p_escalation_id: escalationId,
      p_assignee_id: assigneeId,
      p_assigner_id: null,
      p_reason: actionReason
    });

    if (!error) {
      setActionReason('');
      setAssignModalOpen(false);
      setSelectedEscalation(null);
      loadDashboard();
    }
  };

  const handleEscalateToMD = async (escalationId: string) => {
    const { error } = await supabase.rpc('request_physician_notification', {
      p_escalation_id: escalationId,
      p_urgency: 'URGENT',
      p_required_hours: 2
    });

    if (!error) {
      loadDashboard();
    }
  };

  const handleCreateEscalationFromSignal = async (signalId: string) => {
    const { error } = await supabase.rpc('create_escalation_from_signal', {
      p_signal_id: signalId,
      p_escalation_type: 'CLINICAL_REVIEW',
      p_sla_hours: 24
    });

    if (!error) {
      loadDashboard();
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toUpperCase()) {
      case 'CRITICAL': return 'bg-red-100 text-red-900 border-red-300';
      case 'HIGH': return 'bg-orange-100 text-orange-900 border-orange-300';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-900 border-yellow-300';
      default: return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  const formatTimeSince = (date: string) => {
    const minutes = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (loading || !kpis) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-slate-600">Loading operations dashboard...</div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      {/* 1. COMMAND HEADER */}
      <div className="bg-white border-b border-slate-300 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Operations Command Center</h1>
            <p className="text-sm text-slate-600 mt-1">Sunrise Care Agency</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-xs text-slate-500">Last Updated</div>
              <div className="text-sm font-semibold text-slate-900">
                {lastRefresh.toLocaleTimeString()}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Total Residents</div>
              <div className="text-xl font-bold text-slate-900">{kpis.total_residents}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Caregivers On Shift</div>
              <div className="text-xl font-bold text-slate-900">{kpis.caregivers_on_shift}</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-slate-500">Active Escalations</div>
              <div className={`text-xl font-bold ${kpis.active_escalations.current > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {kpis.active_escalations.current}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* 2. KPI STRIP WITH CLICK-THROUGH */}
        <div className="grid grid-cols-4 gap-4">
          <KPICard
            icon={<AlertCircle className="w-5 h-5" />}
            label="Critical Residents"
            value={kpis.critical_residents.current}
            delta={kpis.critical_residents.delta_24h || 0}
            severity="critical"
            tooltip="Residents with HIGH risk level"
            onClick={() => console.log('Navigate to critical residents')}
          />
          <KPICard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Active Escalations"
            value={kpis.active_escalations.current}
            delta={kpis.active_escalations.delta_24h || 0}
            severity="high"
            tooltip="Escalations in PENDING/IN_PROGRESS/ACKNOWLEDGED status"
            onClick={() => console.log('Navigate to escalations')}
          />
          <KPICard
            icon={<Clock className="w-5 h-5" />}
            label="SLA Breaches"
            value={kpis.sla_breaches.current}
            delta={kpis.sla_breaches.delta_24h || 0}
            severity="critical"
            tooltip="Escalations past required response time"
            onClick={() => console.log('Navigate to SLA breaches')}
          />
          <KPICard
            icon={<FileText className="w-5 h-5" />}
            label="MD Notifications Pending"
            value={kpis.md_notifications_pending.current}
            delta={kpis.md_notifications_pending.delta_24h || 0}
            severity="high"
            tooltip="Physician notifications awaiting acknowledgment"
            onClick={() => console.log('Navigate to MD notifications')}
          />
          <KPICard
            icon={<Users className="w-5 h-5" />}
            label="Staff Utilization"
            value={`${kpis.staff_utilization.current}%`}
            delta={0}
            severity="medium"
            tooltip="Average task completion rate across all staff"
          />
          <KPICard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="High-Risk Staff"
            value={kpis.high_risk_staff.current}
            delta={kpis.high_risk_staff.delta_24h || 0}
            severity="high"
            tooltip="Staff with >3 overdue tasks"
            onClick={() => console.log('Navigate to high-risk staff')}
          />
          <KPICard
            icon={<Shield className="w-5 h-5" />}
            label="Compliance Flags"
            value={kpis.compliance_flags.current}
            delta={kpis.compliance_flags.delta_24h || 0}
            severity="medium"
            tooltip="Overdue or blocked compliance tasks"
            onClick={() => console.log('Navigate to compliance')}
          />
          <KPICard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Avg Response Time"
            value={`${kpis.avg_response_time.current}m`}
            delta={0}
            severity="low"
            tooltip="Average time to resolve escalations (7d window)"
          />
        </div>

        {/* 3. EXCEPTION TRIAGE QUEUE WITH ACTIONS */}
        <div className="bg-white border border-slate-300 rounded-lg">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Exception Triage Queue</h2>
            <div className="text-sm text-slate-600">
              {escalations.length} active • {escalations.filter(e => e.sla_breached).length} breached
            </div>
          </div>
          <div className="overflow-x-auto">
            {escalations.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
                <div className="text-green-600 text-lg font-semibold mb-2">✓ All Clear</div>
                <div className="text-slate-600 mb-4">No Active Exceptions</div>
                <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                  View last 24h resolved
                </button>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Resident</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Time Open</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">SLA</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Assigned</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {escalations.map((esc) => (
                    <React.Fragment key={esc.escalation_id}>
                      <tr className={esc.sla_breached ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-semibold border ${getPriorityColor(esc.priority)}`}>
                            {esc.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-slate-900">{esc.resident_name}</div>
                          <div className="text-xs text-slate-500">{esc.title}</div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {esc.escalation_type.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {formatTimeSince(esc.escalated_at)}
                        </td>
                        <td className="px-4 py-3">
                          {esc.sla_breached ? (
                            <span className="text-sm font-semibold text-red-600">BREACHED</span>
                          ) : (
                            <span className={`text-sm font-semibold ${
                              esc.sla_hours_remaining < 1 ? 'text-orange-600' : 'text-slate-700'
                            }`}>
                              {esc.sla_hours_remaining.toFixed(1)}h left
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {esc.assigned_to || 'Unassigned'}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">{esc.status}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                setSelectedEscalation(esc);
                                setEvidenceDrawerOpen(true);
                              }}
                              className="text-xs text-slate-600 hover:text-slate-800 font-medium"
                            >
                              Evidence
                            </button>
                            {esc.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => {
                                    setSelectedEscalation(esc);
                                    setActionReason('');
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  Acknowledge
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedEscalation(esc);
                                    setAssignModalOpen(true);
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  Assign
                                </button>
                                <button
                                  onClick={() => handleEscalateToMD(esc.escalation_id)}
                                  className="text-xs text-red-600 hover:text-red-800 font-medium"
                                >
                                  Escalate to MD
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {selectedEscalation?.escalation_id === esc.escalation_id && !evidenceDrawerOpen && (
                        <tr>
                          <td colSpan={8} className="px-4 py-4 bg-slate-50">
                            <div className="mb-3">
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                Action Reason (Required)
                              </label>
                              <textarea
                                value={actionReason}
                                onChange={(e) => setActionReason(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                                rows={2}
                                placeholder="Explain why this action is being taken..."
                              />
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleAcknowledge(esc.escalation_id)}
                                className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
                              >
                                Confirm Acknowledge
                              </button>
                              <button
                                onClick={() => setSelectedEscalation(null)}
                                className="px-3 py-1 bg-slate-300 text-slate-700 text-sm font-medium rounded hover:bg-slate-400"
                              >
                                Cancel
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 4. MEDICAL ESCALATION BOARD */}
        <div className="bg-white border border-slate-300 rounded-lg">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Medical Escalation Board</h2>
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              Show last 7 days
            </button>
          </div>
          <div className="p-6">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Resident</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Clinical Issue</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Urgency</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Physician</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {escalations.filter(e => e.has_physician_notification).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-600">
                      No pending physician notifications
                    </td>
                  </tr>
                ) : (
                  escalations
                    .filter(e => e.has_physician_notification)
                    .map(esc => (
                      <tr key={esc.escalation_id}>
                        <td className="px-4 py-3 text-sm font-medium">{esc.resident_name}</td>
                        <td className="px-4 py-3 text-sm">{esc.description}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            esc.priority === 'CRITICAL' ? 'bg-red-100 text-red-900' : 'bg-orange-100 text-orange-900'
                          }`}>
                            {esc.priority === 'CRITICAL' ? 'IMMEDIATE' : 'ROUTINE'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">Unassigned</td>
                        <td className="px-4 py-3 text-sm">{esc.notification_status || 'NOT_SENT'}</td>
                        <td className="px-4 py-3 text-sm">{formatTimeSince(esc.escalated_at)}</td>
                        <td className="px-4 py-3">
                          <button className="text-xs text-blue-600 hover:text-blue-800 font-medium mr-2">
                            Assign Physician
                          </button>
                          {esc.priority === 'CRITICAL' && (
                            <button className="text-xs text-red-600 hover:text-red-800 font-medium">
                              Call Now
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. WORKFORCE RISK OVERVIEW WITH EXPLAINABILITY */}
        <div className="bg-white border border-slate-300 rounded-lg">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Workforce Risk Overview</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 border border-slate-200 rounded p-4">
                <div className="text-sm text-slate-600">High Risk Staff</div>
                <div className="text-2xl font-bold text-red-600">
                  {workforceRisk.filter(w => w.risk_level === 'HIGH' || w.risk_level === 'CRITICAL').length}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-4">
                <div className="text-sm text-slate-600">Overdue Tasks Total</div>
                <div className="text-2xl font-bold text-orange-600">
                  {workforceRisk.reduce((sum, w) => sum + w.overdue_tasks, 0)}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-4">
                <div className="text-sm text-slate-600">Avg Tasks Per Caregiver</div>
                <div className="text-2xl font-bold text-slate-900">
                  {workforceRisk.length > 0
                    ? Math.round(workforceRisk.reduce((sum, w) => sum + w.total_active_tasks, 0) / workforceRisk.length)
                    : 0}
                </div>
              </div>
            </div>

            {workforceRisk.length > 0 ? (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Caregiver</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Overdue</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Total Load</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Risk Level</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Risk Reasons</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workforceRisk.map(caregiver => (
                    <tr key={caregiver.caregiver_id}>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-slate-900">{caregiver.caregiver_name}</div>
                        <div className="text-xs text-slate-500">{caregiver.role_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold ${
                          caregiver.overdue_tasks > 5 ? 'text-red-600' :
                          caregiver.overdue_tasks > 3 ? 'text-orange-600' :
                          caregiver.overdue_tasks > 0 ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {caregiver.overdue_tasks}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{caregiver.total_active_tasks}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          caregiver.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-900' :
                          caregiver.risk_level === 'HIGH' ? 'bg-orange-100 text-orange-900' :
                          caregiver.risk_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-900' :
                          'bg-green-100 text-green-900'
                        }`}>
                          {caregiver.risk_level}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {caregiver.risk_reasons?.filter(r => r).map((reason, idx) => (
                          <div key={idx} className="text-xs text-slate-600">
                            • {reason.reason} ({reason.count})
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-xs text-blue-600 hover:text-blue-800 font-medium mr-2">
                          View Tasks
                        </button>
                        <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                          Reassign Load
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 text-slate-600">
                No staff with active task load
              </div>
            )}
          </div>
        </div>

        {/* 6. DEPARTMENT OVERVIEW - REAL OPERATIONAL MAP */}
        <div className="bg-white border border-slate-300 rounded-lg">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Department Overview</h2>
          </div>
          <div className="p-6">
            {departments.length > 0 ? (
              <div className="grid grid-cols-3 gap-4">
                {departments.map(dept => (
                  <div key={dept.department_id} className="border border-slate-200 rounded-lg p-4 hover:border-slate-400 cursor-pointer">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-bold text-slate-900">{dept.department_name}</h3>
                      {dept.needs_review > 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-900 text-xs font-semibold rounded">
                          {dept.needs_review} need review
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Staff on Duty</span>
                        <span className="font-semibold text-slate-900">{dept.staff_on_duty}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Open Tasks</span>
                        <span className="font-semibold text-slate-900">{dept.open_tasks}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Overdue</span>
                        <span className={`font-semibold ${dept.overdue_tasks > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {dept.overdue_tasks}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600">Escalations Today</span>
                        <span className="font-semibold text-slate-900">{dept.escalations_today}</span>
                      </div>
                    </div>
                    <button className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-medium rounded flex items-center justify-center gap-1">
                      Open Workboard <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-600">
                No departments configured
              </div>
            )}
          </div>
        </div>

        {/* 7. AI INTELLIGENCE WITH OPERATIONAL LINKAGE */}
        <div className="bg-white border border-slate-300 rounded-lg">
          <button
            onClick={() => setAiPanelExpanded(!aiPanelExpanded)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50"
          >
            <h2 className="text-lg font-bold text-slate-900">AI Intelligence (Decision Support)</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">{intelligenceSignals.length} signals</span>
              {aiPanelExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </button>
          {aiPanelExpanded && (
            <div className="px-6 py-4 border-t border-slate-200">
              {intelligenceSignals.length > 0 ? (
                <div className="space-y-4">
                  {intelligenceSignals.map(signal => (
                    <div key={signal.signal_id} className="bg-slate-50 border border-slate-200 rounded p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                              signal.severity === 'CRITICAL' ? 'bg-red-100 text-red-900' :
                              signal.severity === 'MAJOR' ? 'bg-orange-100 text-orange-900' :
                              'bg-yellow-100 text-yellow-900'
                            }`}>
                              {signal.severity}
                            </span>
                            <span className="px-2 py-1 rounded text-xs font-semibold bg-slate-200 text-slate-700">
                              {signal.category}
                            </span>
                            {signal.linked_escalation_id && (
                              <span className="px-2 py-1 rounded text-xs font-semibold bg-green-100 text-green-900">
                                Tracked: {signal.escalation_status}
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-semibold text-slate-900">{signal.title}</div>
                          <div className="text-sm text-slate-600">{signal.resident_name}</div>
                        </div>
                        <div className="text-xs text-slate-500">
                          Confidence: {(signal.confidence * 100).toFixed(0)}%
                        </div>
                      </div>
                      <div className="text-sm text-slate-700 mb-2">{signal.description}</div>
                      <div className="text-xs text-slate-600 mb-3">
                        <strong>Reasoning:</strong> {signal.reasoning}
                      </div>
                      {signal.suggested_actions && signal.suggested_actions.length > 0 && (
                        <div className="text-xs font-medium text-blue-600 mb-3">
                          Suggested: {signal.suggested_actions[0]}
                        </div>
                      )}
                      <div className="flex gap-2">
                        {!signal.linked_escalation_id && signal.is_actionable && (
                          <button
                            onClick={() => handleCreateEscalationFromSignal(signal.signal_id)}
                            className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
                          >
                            Create Escalation
                          </button>
                        )}
                        <button className="px-3 py-1 bg-slate-200 text-slate-700 text-xs font-medium rounded hover:bg-slate-300">
                          View Evidence
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-slate-600">
                  No intelligence signals in last 24 hours
                </div>
              )}
            </div>
          )}
        </div>

        {/* 8. COMPLIANCE SNAPSHOT WITH CLICK-THROUGH */}
        <div className="bg-white border border-slate-300 rounded-lg">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Compliance Snapshot</h2>
          </div>
          <div className="p-6">
            {compliance && (
              <>
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="bg-slate-50 border border-slate-200 rounded p-4 cursor-pointer hover:bg-slate-100">
                    <div className="text-sm text-slate-600 mb-1">Open Audit Issues</div>
                    <div className="text-2xl font-bold text-slate-900">{compliance.open_audit_issues}</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded p-4 cursor-pointer hover:bg-slate-100">
                    <div className="text-sm text-slate-600 mb-1">Missed Medication Logs</div>
                    <div className="text-2xl font-bold text-orange-600">{compliance.missed_medication_logs}</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded p-4 cursor-pointer hover:bg-slate-100">
                    <div className="text-sm text-slate-600 mb-1">Unacknowledged Incidents</div>
                    <div className="text-2xl font-bold text-red-600">{compliance.unacknowledged_incidents}</div>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded p-4 cursor-pointer hover:bg-slate-100">
                    <div className="text-sm text-slate-600 mb-1">Documentation Gaps</div>
                    <div className="text-2xl font-bold text-slate-900">{compliance.documentation_gaps}</div>
                  </div>
                </div>
                {compliance.oldest_open_issue && (
                  <div className="text-sm text-slate-600">
                    <strong>Oldest open issue:</strong> {formatTimeSince(compliance.oldest_open_issue)}
                  </div>
                )}
                {compliance.most_common_gap_type && (
                  <div className="text-sm text-slate-600 mt-1">
                    <strong>Most common gap type:</strong> {compliance.most_common_gap_type}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Evidence Drawer Modal */}
      {evidenceDrawerOpen && selectedEscalation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Evidence for {selectedEscalation.resident_name}</h3>
            <div className="space-y-4">
              <div className="bg-slate-50 p-4 rounded">
                <div className="text-sm font-semibold text-slate-900 mb-2">Escalation Details</div>
                <div className="text-sm text-slate-700">{selectedEscalation.description}</div>
              </div>
              <div className="bg-slate-50 p-4 rounded">
                <div className="text-sm font-semibold text-slate-900 mb-2">Related Intelligence Signals</div>
                <div className="text-sm text-slate-600">No linked signals</div>
              </div>
              <div className="bg-slate-50 p-4 rounded">
                <div className="text-sm font-semibold text-slate-900 mb-2">Related Tasks</div>
                <div className="text-sm text-slate-600">Loading...</div>
              </div>
            </div>
            <button
              onClick={() => {
                setEvidenceDrawerOpen(false);
                setSelectedEscalation(null);
              }}
              className="mt-4 px-4 py-2 bg-slate-300 text-slate-700 rounded hover:bg-slate-400"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  delta: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  tooltip?: string;
  onClick?: () => void;
}

function KPICard({ icon, label, value, delta, severity, tooltip, onClick }: KPICardProps) {
  const getBgColor = () => {
    switch (severity) {
      case 'critical': return 'bg-red-50 border-red-300';
      case 'high': return 'bg-orange-50 border-orange-300';
      case 'medium': return 'bg-yellow-50 border-yellow-300';
      default: return 'bg-slate-50 border-slate-300';
    }
  };

  const getTextColor = () => {
    switch (severity) {
      case 'critical': return 'text-red-900';
      case 'high': return 'text-orange-900';
      case 'medium': return 'text-yellow-900';
      default: return 'text-slate-900';
    }
  };

  return (
    <div
      className={`border rounded-lg p-4 ${getBgColor()} ${onClick ? 'cursor-pointer hover:opacity-80' : ''} relative group`}
      onClick={onClick}
    >
      {tooltip && (
        <div className="absolute top-2 right-2">
          <Info className="w-3 h-3 text-slate-400" />
          <div className="hidden group-hover:block absolute top-5 right-0 bg-slate-800 text-white text-xs p-2 rounded w-48 z-10">
            {tooltip}
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-2">
        <div className={getTextColor()}>{icon}</div>
        <div className={`text-2xl font-bold ${getTextColor()}`}>{value}</div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-slate-700">{label}</div>
        {delta !== 0 && (
          <div className={`flex items-center gap-1 text-xs ${delta > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {delta > 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(delta)} today
          </div>
        )}
      </div>
      {onClick && (
        <div className="text-xs text-slate-500 mt-1">View list →</div>
      )}
    </div>
  );
}
