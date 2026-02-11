import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface StateTransition {
  id: string;
  from_state: string;
  to_state: string;
  reason: string | null;
  transitioned_by: string;
  transitioned_at: string;
  metadata: any;
  duration_in_state?: number;
}

interface TaskStateHistoryProps {
  taskId: string;
}

export function TaskStateHistory({ taskId }: TaskStateHistoryProps) {
  const [transitions, setTransitions] = useState<StateTransition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStateHistory();
  }, [taskId]);

  async function loadStateHistory() {
    setLoading(true);
    const { data, error } = await supabase
      .from('task_state_transitions')
      .select('*')
      .eq('task_id', taskId)
      .order('transitioned_at', { ascending: false });

    if (data) {
      const transitionsWithDuration = data.map((transition, index) => {
        if (index < data.length - 1) {
          const current = new Date(transition.transitioned_at).getTime();
          const previous = new Date(data[index + 1].transitioned_at).getTime();
          transition.duration_in_state = Math.floor((current - previous) / 1000);
        }
        return transition;
      });
      setTransitions(transitionsWithDuration);
    }
    setLoading(false);
  }

  function formatDuration(seconds: number | undefined): string {
    if (!seconds) return 'Current';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
  }

  function getStateColor(state: string): string {
    const colors: Record<string, string> = {
      scheduled: 'bg-gray-100 text-gray-800',
      due: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-green-100 text-green-800',
      skipped: 'bg-gray-100 text-gray-600',
      failed: 'bg-red-100 text-red-800',
      overdue: 'bg-orange-100 text-orange-800',
      escalated: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-600'
    };
    return colors[state] || 'bg-gray-100 text-gray-800';
  }

  if (loading) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        Loading state history...
      </div>
    );
  }

  if (transitions.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        No state transitions recorded
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Task State History</h3>
        <p className="text-xs text-gray-500 mt-1">
          Complete audit trail of all state changes
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {transitions.map((transition, index) => (
          <div key={transition.id} className="px-4 py-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-medium rounded ${getStateColor(transition.from_state)}`}>
                  {transition.from_state}
                </span>
                <span className="text-gray-400">→</span>
                <span className={`px-2 py-1 text-xs font-medium rounded ${getStateColor(transition.to_state)}`}>
                  {transition.to_state}
                </span>
              </div>
              <div className="text-right">
                <div className="text-xs font-medium text-gray-900">
                  {formatDuration(transition.duration_in_state)}
                </div>
                <div className="text-xs text-gray-500">
                  in {transition.from_state}
                </div>
              </div>
            </div>

            <div className="mt-2 text-xs text-gray-600">
              <div className="flex items-center gap-4">
                <span>
                  {new Date(transition.transitioned_at).toLocaleString()}
                </span>
                {transition.reason && (
                  <span className="text-gray-500">
                    Reason: {transition.reason}
                  </span>
                )}
              </div>
            </div>

            {index === 0 && (
              <div className="mt-2 px-2 py-1 bg-blue-50 rounded text-xs text-blue-800">
                Current State
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        All transitions logged for compliance audit
      </div>
    </div>
  );
}
