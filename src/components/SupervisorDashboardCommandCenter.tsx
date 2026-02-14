import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useShowcase } from '../contexts/ShowcaseContext';
import { AlertCircle, Clock, TrendingUp, Users, FileText, Activity, Shield, AlertTriangle } from 'lucide-react';

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
  sla_hours: number;
  is_sla_breach: boolean;
  assigned_to: string | null;
}

interface KPI {
  label: string;
  value: number;
  sublabel: string;
  icon: any;
  clickTab?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low';
}

export function SupervisorDashboardCommandCenter() {
  const { mockAgencyId } = useShowcase();
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    if (!mockAgencyId) return;
    loadDashboard();
    const interval = setInterval(loadDashboard, 30000);
    return () => clearInterval(interval);
  }, [mockAgencyId]);

  const loadDashboard = async () => {
    if (!mockAgencyId) return;

    const { data, error } = await supabase.rpc('get_supervisor_escalation_dashboard', {
      p_agency_id: mockAgencyId
    });

    if (error) {
      console.error('[SupervisorDashboard] Error loading dashboard:', error);
      setLoading(false);
      return;
    }

    const escalationData = (data || []) as Escalation[];
    setEscalations(escalationData);

    // Calculate KPIs
    const activeCount = escalationData.filter(e => ['PENDING', 'IN_PROGRESS'].includes(e.status)).length;
    const criticalCount = escalationData.filter(e => e.priority === 'CRITICAL' && e.status !== 'RESOLVED').length;
    const slaBreachCount = escalationData.filter(e => e.is_sla_breach).length;
    const mdNotifCount = escalationData.filter(e => e.escalation_type === 'PHYSICIAN_NOTIFICATION' && e.status !== 'NOTIFIED').length;
    const unassignedCount = escalationData.filter(e => !e.assigned_to && e.status === 'PENDING').length;

    setKpis([
      { label: 'Active Escalations', value: activeCount, sublabel: 'need action', icon: AlertCircle, severity: activeCount > 0 ? 'medium' : undefined },
      { label: 'Critical', value: criticalCount, sublabel: 'immediate', icon: AlertTriangle, severity: criticalCount > 0 ? 'critical' : undefined },
      { label: 'SLA Breaches', value: slaBreachCount, sublabel: 'overdue', icon: Clock, severity: slaBreachCount > 0 ? 'high' : undefined },
      { label: 'MD Notifications', value: mdNotifCount, sublabel: 'pending', icon: FileText, severity: mdNotifCount > 0 ? 'medium' : undefined },
      { label: 'Unassigned', value: unassignedCount, sublabel: 'needs owner', icon: Users, severity: unassignedCount > 0 ? 'medium' : undefined },
      { label: 'High Priority', value: escalationData.filter(e => e.priority === 'HIGH').length, sublabel: 'urgent', icon: TrendingUp },
      { label: 'In Progress', value: escalationData.filter(e => e.status === 'IN_PROGRESS').length, sublabel: 'working', icon: Activity },
      { label: 'Resolved Today', value: escalationData.filter(e => e.status === 'RESOLVED').length, sublabel: 'completed', icon: Shield },
    ]);

    setLastRefresh(new Date());
    setLoading(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return 'text-red-900 bg-red-100 border-red-300';
      case 'HIGH': return 'text-orange-900 bg-orange-100 border-orange-300';
      case 'MEDIUM': return 'text-slate-700 bg-slate-100 border-slate-300';
      default: return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getKPIColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'border-red-300 bg-red-50';
      case 'high': return 'border-orange-300 bg-orange-50';
      case 'medium': return 'border-slate-300 bg-slate-50';
      default: return 'border-slate-200 bg-white';
    }
  };

  const getSLACountdown = (requiredBy: string, slaHours: number, isBreach: boolean) => {
    const now = new Date();
    const required = new Date(requiredBy);
    const diff = required.getTime() - now.getTime();
    const minutesLeft = Math.floor(diff / 60000);

    if (isBreach) {
      const overdue = Math.abs(minutesLeft);
      return <span className="text-red-700 font-bold">BREACHED {Math.floor(overdue / 60)}h {overdue % 60}m ago</span>;
    }

    if (minutesLeft < 60) {
      return <span className="text-orange-700 font-semibold">{minutesLeft}m left</span>;
    }

    const hoursLeft = Math.floor(minutesLeft / 60);
    return <span className="text-slate-600">{hoursLeft}h {minutesLeft % 60}m left</span>;
  };

  const handleAcknowledge = async (escalationId: string) => {
    const { error } = await supabase.rpc('acknowledge_escalation', {
      p_escalation_id: escalationId,
      p_user_id: null
    });
    if (!error) loadDashboard();
  };

  const handleAssign = async (escalationId: string) => {
    // Simplified - in real app would show modal to select user
    alert('Assign functionality - would show user picker modal');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-slate-600 text-lg">Loading command center...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Operations Command Center</h1>
            <p className="text-sm text-slate-300 mt-1">Real-time escalation monitoring and triage</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400 uppercase tracking-wide">Last Refreshed</div>
            <div className="text-sm text-white font-mono">{lastRefresh.toLocaleTimeString()}</div>
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="bg-slate-100 border-b border-slate-300 px-6 py-4">
        <div className="grid grid-cols-4 gap-4">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div key={idx} className={`border rounded p-3 ${getKPIColor(kpi.severity)}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-slate-600" />
                  <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{kpi.label}</div>
                </div>
                <div className="text-2xl font-bold text-slate-900">{kpi.value}</div>
                <div className="text-xs text-slate-500">{kpi.sublabel}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary Work Queue */}
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Priority Triage Queue</h2>
          <div className="text-sm text-slate-600">
            {escalations.length === 0 ? 'All clear' : `${escalations.filter(e => e.status === 'PENDING').length} pending`}
          </div>
        </div>

        {escalations.length === 0 ? (
          <div className="text-center py-16 bg-white rounded border border-slate-200">
            <Shield className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <div className="text-lg font-semibold text-slate-700 mb-1">All Clear</div>
            <div className="text-sm text-slate-500">No active escalations requiring attention</div>
            <div className="text-xs text-slate-400 mt-2">System monitoring all residents continuously</div>
          </div>
        ) : (
          <div className="space-y-3">
            {escalations
              .filter(e => e.status !== 'RESOLVED')
              .sort((a, b) => {
                const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
                return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder];
              })
              .map((esc) => (
                <div key={esc.escalation_id} className="bg-white border border-slate-200 rounded shadow-sm">
                  <div className="p-4">
                    {/* Header Row */}
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 text-xs font-bold uppercase tracking-wide rounded border ${getPriorityColor(esc.priority)}`}>
                          {esc.priority}
                        </span>
                        <span className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700 bg-slate-100 rounded">
                          {esc.escalation_type.replace(/_/g, ' ')}
                        </span>
                        {esc.is_sla_breach && (
                          <span className="px-2 py-1 text-xs font-bold uppercase tracking-wide text-red-700 bg-red-100 rounded border border-red-300">
                            SLA BREACH
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getSLACountdown(esc.required_response_by, esc.sla_hours, esc.is_sla_breach)}
                      </div>
                    </div>

                    {/* Title & Resident */}
                    <h3 className="text-base font-bold text-slate-900 mb-1">{esc.title}</h3>
                    <div className="text-sm text-slate-600 mb-2">Resident: <span className="font-semibold">{esc.resident_name}</span></div>

                    {/* Description */}
                    <p className="text-sm text-slate-700 mb-3">{esc.description}</p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {esc.status === 'PENDING' && (
                        <>
                          <button
                            onClick={() => handleAcknowledge(esc.escalation_id)}
                            className="px-3 py-1 text-sm font-semibold text-white bg-slate-700 hover:bg-slate-800 rounded"
                          >
                            Acknowledge
                          </button>
                          <button
                            onClick={() => handleAssign(esc.escalation_id)}
                            className="px-3 py-1 text-sm font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded"
                          >
                            Assign
                          </button>
                        </>
                      )}
                      {esc.status === 'ACKNOWLEDGED' && (
                        <span className="px-3 py-1 text-sm font-semibold text-green-700 bg-green-50 border border-green-200 rounded">
                          Acknowledged
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Data Source Debug (Showcase only) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="px-6 pb-6">
          <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600">Data Source Info</summary>
          <div className="mt-2 p-3 bg-slate-100 border border-slate-200 rounded text-xs font-mono text-slate-600">
            <div>RPC: get_supervisor_escalation_dashboard</div>
            <div>Agency ID: {mockAgencyId}</div>
            <div>Filters: status IN ('PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS')</div>
            <div>Rows returned: {escalations.length}</div>
          </div>
        </details>
      )}
    </div>
  );
}
