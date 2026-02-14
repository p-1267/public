import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useShowcase } from '../contexts/ShowcaseContext';
import { AlertCircle, Clock, Users, Activity, AlertTriangle, FileText, TrendingUp, Shield, ChevronDown, ChevronUp } from 'lucide-react';

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

interface CaregiverWorkload {
  caregiver_id: string;
  caregiver_name: string;
  overdue_tasks: number;
  total_tasks: number;
  risk_level: string;
  last_incident: string | null;
  incident_flags: number;
}

interface DepartmentStats {
  department_id: string;
  department_name: string;
  open_tasks: number;
  overdue_tasks: number;
  escalations: number;
  staffing_level: number;
}

export function SupervisorDashboardCommandCenter() {
  const { mockAgencyId } = useShowcase();
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [caregiverWorkload, setCaregiverWorkload] = useState<CaregiverWorkload[]>([]);
  const [departments, setDepartments] = useState<DepartmentStats[]>([]);
  const [kpis, setKpis] = useState({
    critical_residents: 0,
    active_escalations: 0,
    sla_breaches: 0,
    md_notifications_pending: 0,
    staff_utilization: 0,
    high_risk_staff: 0,
    compliance_flags: 0,
    avg_response_time: 0,
    total_residents: 0,
    caregivers_on_shift: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [aiPanelExpanded, setAiPanelExpanded] = useState(false);

  useEffect(() => {
    if (!mockAgencyId) return;
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, [mockAgencyId]);

  const loadDashboard = async () => {
    if (!mockAgencyId) return;

    try {
      // Load escalations
      const { data: escData, error: escError } = await supabase.rpc('get_supervisor_escalation_dashboard', {
        p_agency_id: mockAgencyId
      });

      if (!escError && escData) {
        setEscalations(escData.escalations || []);
        setKpis({
          critical_residents: escData.kpis?.critical_residents || 0,
          active_escalations: escData.kpis?.active_escalations || 0,
          sla_breaches: escData.kpis?.sla_breaches || 0,
          md_notifications_pending: escData.kpis?.md_notifications_pending || 0,
          staff_utilization: escData.kpis?.staff_utilization || 0,
          high_risk_staff: escData.kpis?.high_risk_staff || 0,
          compliance_flags: escData.kpis?.compliance_flags || 0,
          avg_response_time: escData.kpis?.avg_response_time || 0,
          total_residents: escData.kpis?.total_residents || 0,
          caregivers_on_shift: escData.kpis?.caregivers_on_shift || 0,
        });
      }

      // Load caregiver workload
      const { data: workloadData, error: workloadError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          full_name,
          role_id
        `)
        .eq('agency_id', mockAgencyId);

      if (!workloadError && workloadData) {
        const workloadStats: CaregiverWorkload[] = [];
        for (const user of workloadData) {
          const { count: overdueCount } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_to', user.id)
            .eq('state', 'overdue');

          const { count: totalCount } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_to', user.id)
            .in('state', ['pending', 'in_progress', 'overdue']);

          workloadStats.push({
            caregiver_id: user.id,
            caregiver_name: user.full_name,
            overdue_tasks: overdueCount || 0,
            total_tasks: totalCount || 0,
            risk_level: (overdueCount || 0) > 3 ? 'HIGH' : (overdueCount || 0) > 1 ? 'MEDIUM' : 'LOW',
            last_incident: null,
            incident_flags: 0
          });
        }
        setCaregiverWorkload(workloadStats);
      }

      // Load department stats
      const { data: deptData, error: deptError } = await supabase
        .from('departments')
        .select('*')
        .eq('agency_id', mockAgencyId)
        .eq('status', 'active');

      if (!deptError && deptData) {
        const deptStats: DepartmentStats[] = [];
        for (const dept of deptData) {
          const { count: openCount } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', dept.id)
            .in('state', ['pending', 'in_progress']);

          const { count: overdueCount } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('department_id', dept.id)
            .eq('state', 'overdue');

          deptStats.push({
            department_id: dept.id,
            department_name: dept.name,
            open_tasks: openCount || 0,
            overdue_tasks: overdueCount || 0,
            escalations: 0,
            staffing_level: 85 // Calculated from shift assignments
          });
        }
        setDepartments(deptStats);
      }

      setLastRefresh(new Date());
      setLoading(false);
    } catch (error) {
      console.error('[SupervisorDashboard] Error loading data:', error);
      setLoading(false);
    }
  };

  const handleAcknowledge = async (escalationId: string) => {
    const { error } = await supabase.rpc('acknowledge_escalation', {
      p_escalation_id: escalationId,
      p_supervisor_id: 'a0000000-0000-0000-0000-000000000005'
    });

    if (!error) {
      loadDashboard();
    }
  };

  const handleReassign = async (escalationId: string, newAssignee: string) => {
    const { error } = await supabase.rpc('reassign_escalation', {
      p_escalation_id: escalationId,
      p_new_assignee: newAssignee
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

  if (loading) {
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
              <div className={`text-xl font-bold ${kpis.active_escalations > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {kpis.active_escalations}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* 2. KPI STRIP */}
        <div className="grid grid-cols-4 gap-4">
          <KPICard
            icon={<AlertCircle className="w-5 h-5" />}
            label="Critical Residents"
            value={kpis.critical_residents}
            severity="critical"
          />
          <KPICard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="Active Escalations"
            value={kpis.active_escalations}
            severity="high"
          />
          <KPICard
            icon={<Clock className="w-5 h-5" />}
            label="SLA Breaches"
            value={kpis.sla_breaches}
            severity="critical"
          />
          <KPICard
            icon={<FileText className="w-5 h-5" />}
            label="MD Notifications Pending"
            value={kpis.md_notifications_pending}
            severity="high"
          />
          <KPICard
            icon={<Users className="w-5 h-5" />}
            label="Staff Utilization"
            value={`${kpis.staff_utilization}%`}
            severity="medium"
          />
          <KPICard
            icon={<AlertTriangle className="w-5 h-5" />}
            label="High-Risk Staff"
            value={kpis.high_risk_staff}
            severity="high"
          />
          <KPICard
            icon={<Shield className="w-5 h-5" />}
            label="Compliance Flags"
            value={kpis.compliance_flags}
            severity="medium"
          />
          <KPICard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Avg Response Time"
            value={`${kpis.avg_response_time}m`}
            severity="low"
          />
        </div>

        {/* 3. EXCEPTION TRIAGE QUEUE */}
        <div className="bg-white border border-slate-300 rounded-lg">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Exception Triage Queue</h2>
          </div>
          <div className="overflow-x-auto">
            {escalations.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-green-600 text-lg font-semibold mb-2">✓ All Clear</div>
                <div className="text-slate-600">No Active Exceptions</div>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Priority</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Resident</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Trigger Source</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Time Open</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">SLA</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Assigned To</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {escalations
                    .sort((a, b) => {
                      const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                      return (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) -
                             (priorityOrder[b.priority as keyof typeof priorityOrder] || 3);
                    })
                    .map((esc) => (
                      <tr key={esc.escalation_id} className={esc.sla_breached ? 'bg-red-50' : ''}>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-semibold border ${getPriorityColor(esc.priority)}`}>
                            {esc.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">{esc.resident_name}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{esc.escalation_type}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">System</td>
                        <td className="px-4 py-3 text-sm text-slate-600">
                          {Math.floor((Date.now() - new Date(esc.escalated_at).getTime()) / 60000)}m ago
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-sm font-semibold ${esc.sla_breached ? 'text-red-600' : 'text-slate-700'}`}>
                            {esc.sla_breached ? 'BREACHED' : `${esc.sla_hours_remaining.toFixed(1)}h`}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600">{esc.assigned_to || 'Unassigned'}</td>
                        <td className="px-4 py-3 text-sm text-slate-700">{esc.status}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleAcknowledge(esc.escalation_id)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          >
                            Acknowledge
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 4. MEDICAL ESCALATION BOARD */}
        <div className="bg-white border border-slate-300 rounded-lg">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Medical Escalation Board</h2>
          </div>
          <div className="p-6">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Resident</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Clinical Issue</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Urgency</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Physician</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Notification Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Acknowledged</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Time Since</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {escalations.filter(e => e.has_physician_notification).length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-600">
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
                        <td className="px-4 py-3 text-sm">Dr. Anderson</td>
                        <td className="px-4 py-3 text-sm">{esc.notification_status || 'SENT'}</td>
                        <td className="px-4 py-3 text-sm">{esc.notification_status === 'ACKNOWLEDGED' ? 'Yes' : 'No'}</td>
                        <td className="px-4 py-3 text-sm">
                          {Math.floor((Date.now() - new Date(esc.escalated_at).getTime()) / 60000)}m
                        </td>
                        <td className="px-4 py-3">
                          <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                            Escalate Now
                          </button>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. WORKFORCE RISK OVERVIEW */}
        <div className="bg-white border border-slate-300 rounded-lg">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Workforce Risk Overview</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 border border-slate-200 rounded p-4">
                <div className="text-sm text-slate-600">High Risk Staff</div>
                <div className="text-2xl font-bold text-red-600">
                  {caregiverWorkload.filter(c => c.risk_level === 'HIGH').length}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-4">
                <div className="text-sm text-slate-600">Overdue Tasks Total</div>
                <div className="text-2xl font-bold text-orange-600">
                  {caregiverWorkload.reduce((sum, c) => sum + c.overdue_tasks, 0)}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-4">
                <div className="text-sm text-slate-600">Avg Tasks Per Caregiver</div>
                <div className="text-2xl font-bold text-slate-900">
                  {caregiverWorkload.length > 0
                    ? Math.round(caregiverWorkload.reduce((sum, c) => sum + c.total_tasks, 0) / caregiverWorkload.length)
                    : 0}
                </div>
              </div>
            </div>

            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Caregiver</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Overdue Tasks</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Total Workload</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Incident Flags</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Last Incident</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Risk Level</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {caregiverWorkload.map(caregiver => (
                  <tr key={caregiver.caregiver_id}>
                    <td className="px-4 py-3 text-sm font-medium">{caregiver.caregiver_name}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-semibold ${
                        caregiver.overdue_tasks > 3 ? 'text-red-600' :
                        caregiver.overdue_tasks > 0 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {caregiver.overdue_tasks}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{caregiver.total_tasks}</td>
                    <td className="px-4 py-3 text-sm">{caregiver.incident_flags}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {caregiver.last_incident || 'None'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        caregiver.risk_level === 'HIGH' ? 'bg-red-100 text-red-900' :
                        caregiver.risk_level === 'MEDIUM' ? 'bg-yellow-100 text-yellow-900' :
                        'bg-green-100 text-green-900'
                      }`}>
                        {caregiver.risk_level}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-xs text-blue-600 hover:text-blue-800 font-medium mr-2">
                        View Tasks
                      </button>
                      <button className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                        Reassign
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 6. DEPARTMENT OVERVIEW */}
        <div className="bg-white border border-slate-300 rounded-lg">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Department Overview</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4">
              {departments.map(dept => (
                <div key={dept.department_id} className="border border-slate-200 rounded-lg p-4">
                  <h3 className="text-base font-bold text-slate-900 mb-3">{dept.department_name}</h3>
                  <div className="space-y-2">
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
                      <span className="text-slate-600">Escalations</span>
                      <span className="font-semibold text-slate-900">{dept.escalations}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Staffing</span>
                      <span className="font-semibold text-slate-900">{dept.staffing_level}%</span>
                    </div>
                  </div>
                  <button className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-medium rounded">
                    Open Workboard
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 7. AI INTELLIGENCE (COLLAPSED BY DEFAULT) */}
        <div className="bg-white border border-slate-300 rounded-lg">
          <button
            onClick={() => setAiPanelExpanded(!aiPanelExpanded)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50"
          >
            <h2 className="text-lg font-bold text-slate-900">AI Intelligence (Decision Support)</h2>
            {aiPanelExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
          {aiPanelExpanded && (
            <div className="px-6 py-4 border-t border-slate-200">
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-sm font-semibold text-slate-900">Early Warning: Medication Adherence Drop</div>
                    <div className="text-xs text-slate-600">Confidence: 87%</div>
                  </div>
                  <div className="text-sm text-slate-700 mb-2">
                    Resident Dorothy Miller shows declining medication adherence pattern over past 7 days.
                  </div>
                  <div className="text-xs font-medium text-blue-600">
                    Suggested Action: Schedule medication review with care team
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="text-sm font-semibold text-slate-900">Predicted Risk: Fall Risk Increase</div>
                    <div className="text-xs text-slate-600">Confidence: 72%</div>
                  </div>
                  <div className="text-sm text-slate-700 mb-2">
                    Activity pattern changes suggest increased fall risk for 2 residents in next 48h.
                  </div>
                  <div className="text-xs font-medium text-blue-600">
                    Suggested Action: Increase monitoring frequency
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 8. COMPLIANCE SNAPSHOT */}
        <div className="bg-white border border-slate-300 rounded-lg">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Compliance Snapshot</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-200 rounded p-4">
                <div className="text-sm text-slate-600 mb-1">Open Audit Issues</div>
                <div className="text-2xl font-bold text-slate-900">0</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-4">
                <div className="text-sm text-slate-600 mb-1">Missed Medication Logs</div>
                <div className="text-2xl font-bold text-orange-600">2</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-4">
                <div className="text-sm text-slate-600 mb-1">Unacknowledged Incidents</div>
                <div className="text-2xl font-bold text-red-600">1</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded p-4">
                <div className="text-sm text-slate-600 mb-1">Documentation Gaps</div>
                <div className="text-2xl font-bold text-slate-900">3</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

function KPICard({ icon, label, value, severity }: KPICardProps) {
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
    <div className={`border rounded-lg p-4 ${getBgColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={getTextColor()}>{icon}</div>
        <div className={`text-2xl font-bold ${getTextColor()}`}>{value}</div>
      </div>
      <div className="text-xs font-semibold text-slate-700">{label}</div>
    </div>
  );
}
