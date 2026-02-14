import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { SHOWCASE_MODE } from '../config/showcase';
import { useShowcase } from '../contexts/ShowcaseContext';

interface PendingTask {
  task_id: string;
  task_name: string;
  resident_id: string;
  resident_name: string;
  department: string;
  completed_by: string;
  completed_by_name: string;
  actual_end: string;
  outcome: string;
  outcome_reason: string | null;
  evidence_count: number;
}

interface DepartmentalWorkboardProps {
  department?: string;
}

const DEPARTMENT_ICONS: Record<string, string> = {
  NURSING: '💊',
  HOUSEKEEPING: '🧹',
  KITCHEN: '🍽️',
  HYGIENE: '🚿',
  MOBILITY: '🚶',
  NUTRITION: '🥗',
  MONITORING: '📊',
  EMERGENCY: '🚨'
};

export const DepartmentalWorkboard: React.FC<DepartmentalWorkboardProps> = ({ department }) => {
  const [pendingTasks, setPendingTasks] = useState<PendingTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [responseText, setResponseText] = useState<Record<string, string>>({});
  const { mockUserId } = useShowcase();

  useEffect(() => {
    loadPendingTasks();

    const subscription = supabase
      .channel('workboard_tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        loadPendingTasks();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [department]);

  const loadPendingTasks = async () => {
    try {
      const params: any = {
        p_department: department || null,
        p_limit: 100
      };

      if (SHOWCASE_MODE && mockUserId) {
        params.p_user_id = mockUserId;
      }

      const { data, error } = await supabase.rpc('get_tasks_pending_acknowledgement', params);

      if (error) throw error;

      setPendingTasks(data || []);
    } catch (error) {
      console.error('Failed to load pending tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (taskId: string, response?: string) => {
    setAcknowledging(taskId);
    try {
      const params: any = {
        p_task_id: taskId,
        p_response: response || null
      };

      if (SHOWCASE_MODE && mockUserId) {
        params.p_user_id = mockUserId;
      }

      const { error } = await supabase.rpc('acknowledge_task', params);

      if (error) throw error;

      setPendingTasks(prev => prev.filter(t => t.task_id !== taskId));
      setResponseText(prev => {
        const next = { ...prev };
        delete next[taskId];
        return next;
      });
    } catch (error) {
      console.error('Failed to acknowledge task:', error);
      alert('Failed to acknowledge task. Please try again.');
    } finally {
      setAcknowledging(null);
    }
  };

  const groupByDepartment = () => {
    const groups: Record<string, PendingTask[]> = {};
    pendingTasks.forEach(task => {
      if (!groups[task.department]) {
        groups[task.department] = [];
      }
      groups[task.department].push(task);
    });
    return groups;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-xl text-slate-600">Loading workboard...</div>
      </div>
    );
  }

  const groups = department ? { [department]: pendingTasks } : groupByDepartment();
  const hasAnyTasks = Object.values(groups).some(tasks => tasks.length > 0);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            {department ? `${department} Workboard` : 'All Departments Workboard'}
          </h1>
          <p className="text-lg text-slate-600">
            Tasks requiring supervisor acknowledgement
          </p>
        </header>

        {!hasAnyTasks ? (
          <div className="bg-white rounded-xl p-12 text-center border-2 border-slate-200">
            <div className="text-6xl mb-4">✅</div>
            <div className="text-2xl font-bold text-slate-900 mb-2">All Caught Up!</div>
            <div className="text-lg text-slate-600">No tasks pending acknowledgement</div>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groups).map(([dept, tasks]) => {
              if (tasks.length === 0) return null;

              const icon = DEPARTMENT_ICONS[dept] || '📋';

              return (
                <div key={dept} className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-100 to-slate-50 px-6 py-4 border-b-2 border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{icon}</div>
                      <div>
                        <h2 className="text-2xl font-bold text-slate-900">{dept}</h2>
                        <p className="text-sm text-slate-600">{tasks.length} task{tasks.length !== 1 ? 's' : ''} pending</p>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y-2 divide-slate-100">
                    {tasks.map((task) => (
                      <div key={task.task_id} className="p-6 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-grow">
                            <h3 className="text-xl font-bold text-slate-900 mb-2">{task.task_name}</h3>
                            <div className="space-y-1 text-sm text-slate-600">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">Resident:</span>
                                <span>{task.resident_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">Completed by:</span>
                                <span>{task.completed_by_name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">Completed at:</span>
                                <span>{new Date(task.actual_end).toLocaleString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: 'numeric',
                                  minute: '2-digit'
                                })}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">Outcome:</span>
                                <span className={`px-2 py-1 rounded font-semibold ${
                                  task.outcome === 'success' ? 'bg-green-100 text-green-800' :
                                  task.outcome === 'skipped' ? 'bg-orange-100 text-orange-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {task.outcome.toUpperCase()}
                                </span>
                              </div>
                              {task.outcome_reason && (
                                <div className="flex items-start gap-2 mt-2">
                                  <span className="font-semibold">Reason:</span>
                                  <span className="italic">{task.outcome_reason}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">Evidence:</span>
                                <span>{task.evidence_count} item{task.evidence_count !== 1 ? 's' : ''}</span>
                                {task.evidence_count > 0 && (
                                  <button
                                    className="text-blue-600 hover:text-blue-800 font-semibold text-xs underline"
                                    onClick={() => alert('Evidence viewer - to be implemented')}
                                  >
                                    View Evidence
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <textarea
                            value={responseText[task.task_id] || ''}
                            onChange={(e) => setResponseText(prev => ({ ...prev, [task.task_id]: e.target.value }))}
                            placeholder="Optional: Add feedback or comments for the caregiver..."
                            className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none text-sm"
                            rows={2}
                          />

                          <div className="flex gap-3">
                            <button
                              onClick={() => handleAcknowledge(task.task_id, responseText[task.task_id])}
                              disabled={acknowledging === task.task_id}
                              className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-400 text-white font-bold rounded-lg transition-colors text-lg"
                            >
                              {acknowledging === task.task_id ? 'ACKNOWLEDGING...' : '✓ ACKNOWLEDGE'}
                            </button>
                            <button
                              onClick={() => {
                                const response = prompt('What needs to be addressed?');
                                if (response) {
                                  setResponseText(prev => ({ ...prev, [task.task_id]: `NEEDS ATTENTION: ${response}` }));
                                }
                              }}
                              className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-colors text-lg"
                            >
                              ⚠ FLAG ISSUE
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
