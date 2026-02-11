import React, { useState, useEffect } from 'react';
import { useTaskDashboard } from '../hooks/useTaskDashboard';
import { useTaskEngine, CollisionInfo } from '../hooks/useTaskEngine';
import { supabase } from '../lib/supabase';
import { EvidenceCapture } from './EvidenceCapture';
import { TaskAlert } from './TaskAlert';
import { ConflictBanner } from './ConflictBanner';
import { OverrideReasonModal } from './OverrideReasonModal';
import { TaskDetailModal } from './TaskDetailModal';

interface Task {
  id: string;
  task_name: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  risk_level: 'A' | 'B' | 'C';
  state: string;
  scheduled_start: string;
  scheduled_end: string;
  resident_id: string;
  requires_evidence: boolean;
  escalation_level: number;
  is_emergency: boolean;
  resident?: { full_name: string };
  category?: { name: string; color_code: string | null };
}

export function TaskDashboard() {
  const { dashboardData, systemStatus, loading, refetch } = useTaskDashboard();
  const { startTask, completeTask, skipTask, loading: actionLoading } = useTaskEngine();
  const [doNowTasks, setDoNowTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [evidenceMode, setEvidenceMode] = useState<'complete' | 'problem' | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [collisionInfo, setCollisionInfo] = useState<{ task: Task; info: CollisionInfo } | null>(null);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  useEffect(() => {
    fetchDoNowTasks();

    const channel = supabase
      .channel('task_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        fetchDoNowTasks();
        refetch();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_escalations' }, () => {
        refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const fetchDoNowTasks = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        resident:residents(full_name),
        category:task_categories(name, color_code)
      `)
      .eq('owner_user_id', user.user.id)
      .in('state', ['due', 'overdue', 'escalated', 'in_progress'])
      .order('priority', { ascending: false })
      .order('scheduled_start', { ascending: true })
      .limit(20);

    if (!error && data) {
      setDoNowTasks(data as Task[]);
    }
  };

  const handleStart = async (task: Task, overrideReason?: string) => {
    try {
      await startTask(task.id, overrideReason);
      setAlertMessage(`Started: ${task.task_name}`);
      setCollisionInfo(null);
      fetchDoNowTasks();
      refetch();
    } catch (err: any) {
      if (err.collisionInfo) {
        setCollisionInfo({ task, info: err.collisionInfo });
      } else {
        setAlertMessage(err instanceof Error ? err.message : 'Failed to start task');
      }
    }
  };

  const handleOverrideRequest = () => {
    setShowOverrideModal(true);
  };

  const handleOverrideConfirm = async (reason: string) => {
    if (!collisionInfo) return;
    setShowOverrideModal(false);
    await handleStart(collisionInfo.task, reason);
  };

  const handleOverrideCancel = () => {
    setShowOverrideModal(false);
    setCollisionInfo(null);
  };

  const handleDone = (task: Task) => {
    setSelectedTask(task);
    setEvidenceMode('complete');
  };

  const handleProblem = (task: Task) => {
    setSelectedTask(task);
    setEvidenceMode('problem');
  };

  const handleEvidenceComplete = async (evidenceData: any) => {
    if (!selectedTask) return;

    try {
      if (evidenceMode === 'complete') {
        await completeTask(selectedTask.id, 'success');
        setAlertMessage(`✓ Completed: ${selectedTask.task_name}`);
      } else {
        await skipTask(selectedTask.id, evidenceData.reason || 'Issue reported');
        setAlertMessage(`⚠ Problem reported: ${selectedTask.task_name}`);
      }

      setSelectedTask(null);
      setEvidenceMode(null);
      fetchDoNowTasks();
      refetch();
    } catch (err) {
      setAlertMessage(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const getStatusColor = () => {
    switch (systemStatus) {
      case 'urgent': return 'bg-red-500';
      case 'attention_needed': return 'bg-amber-500';
      default: return 'bg-green-500';
    }
  };

  const getStatusText = () => {
    switch (systemStatus) {
      case 'urgent': return 'URGENT';
      case 'attention_needed': return 'Attention Needed';
      default: return 'All Clear';
    }
  };

  const getStatusIcon = () => {
    switch (systemStatus) {
      case 'urgent': return '🔴';
      case 'attention_needed': return '🟡';
      default: return '🟢';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-300 bg-white';
    }
  };

  const getUrgencyIndicator = (task: Task) => {
    if (task.is_emergency) return '🚨';
    if (task.state === 'escalated') return '🔴';
    if (task.state === 'overdue') return '⏰';
    if (task.priority === 'critical') return '❗';
    return '';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className={`mb-8 rounded-3xl ${getStatusColor()} text-white p-8 shadow-lg`}>
          <div className="flex items-center justify-center space-x-4">
            <span className="text-6xl">{getStatusIcon()}</span>
            <div>
              <div className="text-3xl font-light">{getStatusText()}</div>
              {dashboardData && (
                <div className="text-sm opacity-90 mt-2">
                  {dashboardData.summary.pending_count} tasks · {dashboardData.summary.overdue_count} overdue
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-light text-gray-700 mb-4">DO NOW</h2>
        </div>

        {doNowTasks.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center shadow-md">
            <span className="text-6xl mb-4 block">✓</span>
            <p className="text-xl text-gray-600 font-light">All caught up</p>
          </div>
        ) : (
          <div className="space-y-4">
            {doNowTasks.map((task) => (
              <div
                key={task.id}
                className={`rounded-3xl border-4 ${getPriorityColor(task.priority)} p-6 shadow-md transition-all hover:shadow-lg cursor-pointer`}
                onClick={() => setDetailTaskId(task.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getUrgencyIndicator(task) && (
                        <span className="text-3xl">{getUrgencyIndicator(task)}</span>
                      )}
                      <h3 className="text-2xl font-medium text-gray-900">{task.task_name}</h3>
                      <span className="text-sm text-gray-500">(tap for history)</span>
                    </div>
                    {task.resident && (
                      <p className="text-gray-600 text-lg font-light">{task.resident.full_name}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3" onClick={(e) => e.stopPropagation()}>
                  {task.state !== 'in_progress' && (
                    <button
                      onClick={() => handleStart(task)}
                      disabled={actionLoading}
                      className="bg-blue-500 hover:bg-blue-600 text-white rounded-2xl py-4 text-lg font-medium transition-colors disabled:opacity-50"
                    >
                      Start
                    </button>
                  )}
                  <button
                    onClick={() => handleDone(task)}
                    disabled={actionLoading}
                    className={`bg-green-500 hover:bg-green-600 text-white rounded-2xl py-4 text-lg font-medium transition-colors disabled:opacity-50 ${
                      task.state !== 'in_progress' ? 'col-span-2' : 'col-span-2'
                    }`}
                  >
                    Done
                  </button>
                  <button
                    onClick={() => handleProblem(task)}
                    disabled={actionLoading}
                    className="bg-red-500 hover:bg-red-600 text-white rounded-2xl py-4 text-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Problem
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedTask && evidenceMode && (
        <EvidenceCapture
          task={selectedTask}
          mode={evidenceMode}
          onComplete={handleEvidenceComplete}
          onCancel={() => {
            setSelectedTask(null);
            setEvidenceMode(null);
          }}
        />
      )}

      {alertMessage && (
        <TaskAlert
          message={alertMessage}
          onClose={() => setAlertMessage(null)}
        />
      )}

      {collisionInfo && (
        <ConflictBanner
          currentOwnerName={collisionInfo.info.current_owner_name || 'Another caregiver'}
          onOverride={handleOverrideRequest}
          onCancel={handleOverrideCancel}
        />
      )}

      {showOverrideModal && collisionInfo && (
        <OverrideReasonModal
          currentOwnerName={collisionInfo.info.current_owner_name || 'Another caregiver'}
          onConfirm={handleOverrideConfirm}
          onCancel={() => setShowOverrideModal(false)}
        />
      )}

      {detailTaskId && (
        <TaskDetailModal
          taskId={detailTaskId}
          onClose={() => setDetailTaskId(null)}
        />
      )}
    </div>
  );
}
