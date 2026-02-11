import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface TaskStateTransition {
  id: string;
  from_state: string;
  to_state: string;
  transitioned_by: string;
  transition_reason?: string;
  created_at: string;
}

interface TaskDetailModalProps {
  taskId: string;
  onClose: () => void;
}

export function TaskDetailModal({ taskId, onClose }: TaskDetailModalProps) {
  const [task, setTask] = useState<any>(null);
  const [history, setHistory] = useState<TaskStateTransition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTaskDetails();
  }, [taskId]);

  const loadTaskDetails = async () => {
    setLoading(true);
    try {
      const [taskResult, historyResult] = await Promise.all([
        supabase
          .from('core_tasks')
          .select(`
            *,
            resident:residents(full_name),
            category:task_categories(category_name)
          `)
          .eq('id', taskId)
          .single(),
        supabase
          .from('task_state_history')
          .select('*')
          .eq('task_id', taskId)
          .order('created_at', { ascending: false })
      ]);

      if (taskResult.error) throw taskResult.error;
      if (historyResult.error) throw historyResult.error;

      setTask(taskResult.data);
      setHistory(historyResult.data || []);
    } catch (err) {
      console.error('Failed to load task details:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'PENDING': return 'bg-gray-100 text-gray-800';
      case 'READY': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800';
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'BLOCKED': return 'bg-red-100 text-red-800';
      case 'SKIPPED': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="text-center">Loading task details...</div>
        </div>
      </div>
    );
  }

  if (!task) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold">{task.task_name}</h2>
            <p className="text-gray-600 mt-1">{task.resident?.full_name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border border-gray-200 rounded p-4">
            <div className="text-sm text-gray-600 mb-1">Current State</div>
            <span className={`px-3 py-1 rounded text-sm font-bold ${getStateColor(task.state)}`}>
              {task.state}
            </span>
          </div>
          <div className="border border-gray-200 rounded p-4">
            <div className="text-sm text-gray-600 mb-1">Category</div>
            <div className="font-semibold">{task.category?.category_name}</div>
          </div>
          {task.scheduled_for && (
            <div className="border border-gray-200 rounded p-4">
              <div className="text-sm text-gray-600 mb-1">Scheduled For</div>
              <div className="font-semibold">{new Date(task.scheduled_for).toLocaleString()}</div>
            </div>
          )}
          {task.completed_at && (
            <div className="border border-gray-200 rounded p-4">
              <div className="text-sm text-gray-600 mb-1">Completed At</div>
              <div className="font-semibold">{new Date(task.completed_at).toLocaleString()}</div>
            </div>
          )}
        </div>

        <div className="mb-6">
          <TaskDependencyVisualizer taskId={taskId} />
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-bold mb-3">State History</h3>
          <div className="space-y-3">
            {history.map((transition, idx) => (
              <div
                key={transition.id}
                className="border border-gray-200 rounded p-4 relative"
              >
                {idx < history.length - 1 && (
                  <div className="absolute left-8 top-full h-3 w-0.5 bg-gray-300" />
                )}
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {history.length - idx}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStateColor(transition.from_state)}`}>
                        {transition.from_state}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${getStateColor(transition.to_state)}`}>
                        {transition.to_state}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      By: <span className="font-semibold">{transition.transitioned_by}</span>
                    </div>
                    {transition.transition_reason && (
                      <div className="text-sm text-gray-700 mt-1">
                        Reason: {transition.transition_reason}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(transition.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {task.requires_evidence && (
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <div className="text-sm font-bold text-blue-900 mb-1">Evidence Required</div>
            <div className="text-sm text-blue-800">
              This task requires evidence capture for compliance and audit purposes.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
