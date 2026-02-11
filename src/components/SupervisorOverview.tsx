import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BrainOutputPanel } from './BrainOutputPanel';

interface ResidentStatus {
  id: string;
  full_name: string;
  status_color: 'green' | 'amber' | 'red';
  overdue_count: number;
  escalated_count: number;
  pattern_alerts: number;
}

interface Escalation {
  id: string;
  task_name: string;
  resident_name: string;
  escalation_level: number;
  escalation_reason: string;
  created_at: string;
}

interface PatternAlert {
  id: string;
  resident_name: string;
  pattern_type: string;
  occurrences_count: number;
  severity: string;
  detected_at: string;
}

export function SupervisorOverview() {
  const [residents, setResidents] = useState<ResidentStatus[]>([]);
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [patterns, setPatterns] = useState<PatternAlert[]>([]);
  const [handoffFailures, setHandoffFailures] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverviewData();

    const channel = supabase
      .channel('supervisor_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchOverviewData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_escalations' }, fetchOverviewData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pattern_alerts' }, fetchOverviewData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOverviewData = async () => {
    setLoading(true);

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('agency_id')
      .eq('id', user.user.id)
      .single();

    if (!profile) return;

    const { data: residentsData } = await supabase
      .from('residents')
      .select('id, full_name')
      .eq('agency_id', profile.agency_id)
      .eq('status', 'active');

    if (residentsData) {
      const statusPromises = residentsData.map(async (resident) => {
        const { data: tasks } = await supabase
          .from('tasks')
          .select('state, escalation_level')
          .eq('resident_id', resident.id)
          .in('state', ['overdue', 'escalated']);

        const { data: alerts } = await supabase
          .from('pattern_alerts')
          .select('id')
          .eq('resident_id', resident.id)
          .eq('status', 'active');

        const overdue_count = tasks?.filter(t => t.state === 'overdue').length || 0;
        const escalated_count = tasks?.filter(t => t.state === 'escalated').length || 0;
        const pattern_alerts = alerts?.length || 0;

        let status_color: 'green' | 'amber' | 'red' = 'green';
        if (escalated_count > 0 || pattern_alerts > 0) status_color = 'red';
        else if (overdue_count > 0) status_color = 'amber';

        return {
          id: resident.id,
          full_name: resident.full_name,
          status_color,
          overdue_count,
          escalated_count,
          pattern_alerts
        };
      });

      const residentStatuses = await Promise.all(statusPromises);
      setResidents(residentStatuses.sort((a, b) => {
        const order = { red: 0, amber: 1, green: 2 };
        return order[a.status_color] - order[b.status_color];
      }));
    }

    const { data: escalationsData } = await supabase
      .from('task_escalations')
      .select(`
        id,
        escalation_level,
        escalation_reason,
        created_at,
        task:tasks(
          task_name,
          resident:residents(full_name)
        )
      `)
      .eq('status', 'active')
      .order('escalation_level', { ascending: false })
      .limit(10);

    if (escalationsData) {
      setEscalations(escalationsData.map((e: any) => ({
        id: e.id,
        task_name: e.task.task_name,
        resident_name: e.task.resident.full_name,
        escalation_level: e.escalation_level,
        escalation_reason: e.escalation_reason,
        created_at: e.created_at
      })));
    }

    const { data: patternsData } = await supabase
      .from('pattern_alerts')
      .select(`
        id,
        pattern_type,
        occurrences_count,
        severity,
        detected_at,
        resident:residents(full_name)
      `)
      .eq('status', 'active')
      .order('severity', { ascending: false })
      .limit(10);

    if (patternsData) {
      setPatterns(patternsData.map((p: any) => ({
        id: p.id,
        resident_name: p.resident.full_name,
        pattern_type: p.pattern_type,
        occurrences_count: p.occurrences_count,
        severity: p.severity,
        detected_at: p.detected_at
      })));
    }

    const { data: handoffs } = await supabase
      .from('handoff_summaries')
      .select('reviewed')
      .eq('reviewed', false)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    setHandoffFailures(handoffs?.length || 0);

    setLoading(false);
  };

  const getStatusIcon = (color: string) => {
    switch (color) {
      case 'red': return '🔴';
      case 'amber': return '🟡';
      default: return '🟢';
    }
  };

  const getStatusColor = (color: string) => {
    switch (color) {
      case 'red': return 'bg-red-100 border-red-500';
      case 'amber': return 'bg-amber-100 border-amber-500';
      default: return 'bg-green-100 border-green-500';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading overview...</p>
        </div>
      </div>
    );
  }

  const needsAttention = residents.filter(r => r.status_color !== 'green');

  if (needsAttention.length === 0 && escalations.length === 0 && patterns.length === 0 && handoffFailures === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <span className="text-8xl mb-6 block">✓</span>
          <p className="text-3xl text-gray-700 font-light mb-2">All Systems Normal</p>
          <p className="text-lg text-gray-500">No exceptions to review</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-light text-gray-900 mb-2">Supervisor Overview</h1>
          <p className="text-lg text-gray-600">Exception-only view</p>
        </div>

        <div className="mb-6">
          <BrainOutputPanel
            context={{
              agencyId: undefined,
              windowHours: 24
            }}
            title="Agency-Wide Intelligence Summary"
            compact={false}
          />
        </div>

        {handoffFailures > 0 && (
          <div className="mb-6 bg-red-500 text-white rounded-3xl p-6 shadow-lg">
            <div className="flex items-center space-x-4">
              <span className="text-5xl">⚠️</span>
              <div>
                <div className="text-2xl font-medium">{handoffFailures} Unacknowledged Handoffs</div>
                <div className="text-sm opacity-90">Caregivers have not reviewed shift transitions</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-3xl p-6 shadow-md">
            <div className="text-4xl font-bold text-gray-900">{needsAttention.length}</div>
            <div className="text-gray-600 mt-1">Residents Need Attention</div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-md">
            <div className="text-4xl font-bold text-red-600">{escalations.length}</div>
            <div className="text-gray-600 mt-1">Active Escalations</div>
          </div>

          <div className="bg-white rounded-3xl p-6 shadow-md">
            <div className="text-4xl font-bold text-amber-600">{patterns.length}</div>
            <div className="text-gray-600 mt-1">Pattern Alerts</div>
          </div>
        </div>

        {needsAttention.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-light text-gray-900 mb-4">Residents Requiring Attention</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {needsAttention.map((resident) => (
                <div
                  key={resident.id}
                  className={`${getStatusColor(resident.status_color)} border-2 rounded-3xl p-6 shadow-md`}
                >
                  <div className="flex items-center space-x-3 mb-4">
                    <span className="text-4xl">{getStatusIcon(resident.status_color)}</span>
                    <div className="text-xl font-medium text-gray-900">{resident.full_name}</div>
                  </div>
                  <div className="space-y-2 text-sm">
                    {resident.escalated_count > 0 && (
                      <div className="text-red-600 font-medium">
                        🔴 {resident.escalated_count} escalated tasks
                      </div>
                    )}
                    {resident.overdue_count > 0 && (
                      <div className="text-amber-600 font-medium">
                        ⏰ {resident.overdue_count} overdue tasks
                      </div>
                    )}
                    {resident.pattern_alerts > 0 && (
                      <div className="text-orange-600 font-medium">
                        📊 {resident.pattern_alerts} pattern alerts
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {escalations.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-light text-gray-900 mb-4">Active Escalations</h2>
            <div className="bg-white rounded-3xl p-6 shadow-md space-y-4">
              {escalations.map((esc) => (
                <div
                  key={esc.id}
                  className="border-l-4 border-red-500 pl-4 py-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{esc.task_name}</div>
                      <div className="text-sm text-gray-600">{esc.resident_name}</div>
                      <div className="text-sm text-gray-500 mt-1">{esc.escalation_reason}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-red-600 font-bold">Level {esc.escalation_level}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(esc.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {patterns.length > 0 && (
          <div>
            <h2 className="text-2xl font-light text-gray-900 mb-4">Pattern Alerts</h2>
            <div className="bg-white rounded-3xl p-6 shadow-md space-y-4">
              {patterns.map((pattern) => (
                <div
                  key={pattern.id}
                  className="border-l-4 border-amber-500 pl-4 py-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {pattern.pattern_type.replace(/_/g, ' ').toUpperCase()}
                      </div>
                      <div className="text-sm text-gray-600">{pattern.resident_name}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {pattern.occurrences_count} occurrences detected
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${
                        pattern.severity === 'critical' ? 'text-red-600' :
                        pattern.severity === 'high' ? 'text-orange-600' :
                        'text-amber-600'
                      }`}>
                        {pattern.severity.toUpperCase()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(pattern.detected_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
