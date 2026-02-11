import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Escalation {
  id: string;
  task_id: string;
  escalation_level: number;
  escalation_reason: string;
  status: string;
  created_at: string;
  task: {
    task_name: string;
    resident: {
      full_name: string;
    };
  };
}

export function EscalationNotifications() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchEscalations();

    const channel = supabase
      .channel('escalations_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'task_escalations' },
        () => {
          fetchEscalations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchEscalations = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data, error } = await supabase
      .from('task_escalations')
      .select(`
        *,
        task:tasks(
          task_name,
          resident:residents(full_name)
        )
      `)
      .eq('escalated_to_user_id', user.user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error && data) {
      setEscalations(data as any);
    }
  };

  const handleAcknowledge = async (escalationId: string) => {
    await supabase
      .from('task_escalations')
      .update({
        status: 'acknowledged',
        acknowledged_at: new Date().toISOString(),
        acknowledged_by: (await supabase.auth.getUser()).data.user?.id
      })
      .eq('id', escalationId);

    setDismissedIds(prev => new Set(prev).add(escalationId));
    fetchEscalations();
  };

  const handleGoToTask = (taskId: string) => {
    console.log('Navigate to task:', taskId);
  };

  const visibleEscalations = escalations.filter(e => !dismissedIds.has(e.id));

  if (visibleEscalations.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-md">
      {visibleEscalations.map((escalation) => {
        const getSeverityColor = () => {
          if (escalation.escalation_level >= 3) return 'bg-red-600 border-red-800';
          if (escalation.escalation_level >= 2) return 'bg-orange-500 border-orange-700';
          return 'bg-amber-500 border-amber-700';
        };

        const getSeverityIcon = () => {
          if (escalation.escalation_level >= 3) return '🚨';
          if (escalation.escalation_level >= 2) return '🔴';
          return '🟡';
        };

        return (
          <div
            key={escalation.id}
            className={`${getSeverityColor()} text-white rounded-2xl p-6 shadow-2xl border-2 animate-slide-in-right`}
          >
            <div className="flex items-start space-x-4 mb-4">
              <span className="text-4xl">{getSeverityIcon()}</span>
              <div className="flex-1">
                <div className="text-lg font-bold mb-1">
                  {escalation.escalation_level >= 3 ? 'CRITICAL' : escalation.escalation_level >= 2 ? 'URGENT' : 'Warning'}
                </div>
                <div className="text-xl font-medium mb-2">
                  {escalation.task.task_name}
                </div>
                <div className="text-sm opacity-90">
                  {escalation.task.resident.full_name}
                </div>
                <div className="text-sm opacity-75 mt-2">
                  {escalation.escalation_reason}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleAcknowledge(escalation.id)}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white rounded-xl py-2 text-sm font-medium transition-all"
              >
                Acknowledge
              </button>
              <button
                onClick={() => handleGoToTask(escalation.task_id)}
                className="bg-white text-gray-900 hover:bg-gray-100 rounded-xl py-2 text-sm font-medium transition-all"
              >
                Go to Task
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
