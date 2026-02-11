import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { EvidenceCapture } from './EvidenceCapture';
import { useTaskEngine } from '../hooks/useTaskEngine';
import { useShowcase } from '../contexts/ShowcaseContext';
import { SHOWCASE_MODE } from '../config/showcase';

interface Task {
  id: string;
  task_name: string;
  resident_name: string;
  room: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  state: string;
  scheduled_start: string;
  scheduled_end: string;
  requires_evidence: boolean;
  is_emergency: boolean;
}

interface DepartmentGroup {
  department: string;
  task_count: number;
  completed_count: number;
  overdue_count: number;
  tasks: Task[];
}

const DEPARTMENT_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
  NURSING: { icon: '💊', color: 'blue', label: 'Nursing' },
  HOUSEKEEPING: { icon: '🧹', color: 'teal', label: 'Housekeeping' },
  KITCHEN: { icon: '🍽️', color: 'orange', label: 'Kitchen' },
  HYGIENE: { icon: '🚿', color: 'cyan', label: 'Hygiene' },
  MOBILITY: { icon: '🚶', color: 'green', label: 'Mobility' },
  NUTRITION: { icon: '🥗', color: 'lime', label: 'Nutrition' },
  MONITORING: { icon: '📊', color: 'purple', label: 'Monitoring' },
  EMERGENCY: { icon: '🚨', color: 'red', label: 'Emergency' }
};

export const TodaysWorkView: React.FC = () => {
  const [departments, setDepartments] = useState<DepartmentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showEvidence, setShowEvidence] = useState(false);
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set(['NURSING', 'HOUSEKEEPING', 'KITCHEN']));

  const { startTask, completeTask, skipTask } = useTaskEngine();
  const { mockUserId } = useShowcaseData();

  useEffect(() => {
    loadTodaysWork();

    const subscription = supabase
      .channel('tasks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        loadTodaysWork();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadTodaysWork = async () => {
    try {
      const params = SHOWCASE_MODE && mockUserId
        ? { p_user_id: mockUserId }
        : {};

      const { data, error } = await supabase.rpc('get_todays_tasks_by_department', params);

      if (error) throw error;

      setDepartments(data || []);
    } catch (error) {
      console.error('Failed to load today\'s work:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (task: Task) => {
    try {
      await startTask(task.id);
      setSelectedTask(task);
    } catch (error) {
      console.error('Failed to start task:', error);
    }
  };

  const handleCompleteTask = async (task: Task) => {
    if (task.requires_evidence) {
      setSelectedTask(task);
      setShowEvidence(true);
    } else {
      try {
        await completeTask(task.id, 'success', null);
        setSelectedTask(null);
      } catch (error) {
        console.error('Failed to complete task:', error);
      }
    }
  };

  const handleEvidenceSubmit = async () => {
    if (!selectedTask) return;

    try {
      await completeTask(selectedTask.id, 'success', null);
      setShowEvidence(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const toggleDepartment = (dept: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(dept)) {
        next.delete(dept);
      } else {
        next.add(dept);
      }
      return next;
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-900 border-red-400';
      case 'high': return 'bg-orange-100 text-orange-900 border-orange-400';
      case 'medium': return 'bg-yellow-100 text-yellow-900 border-yellow-400';
      default: return 'bg-slate-100 text-slate-900 border-slate-400';
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-400';
      case 'in_progress': return 'bg-blue-100 text-blue-800 border-blue-400';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-400';
      case 'escalated': return 'bg-gray-100 text-gray-800 border-gray-400';
      default: return 'bg-slate-100 text-slate-800 border-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-slate-600">Loading today's work...</div>
      </div>
    );
  }

  const totalTasks = departments.reduce((sum, d) => sum + d.task_count, 0);
  const totalCompleted = departments.reduce((sum, d) => sum + d.completed_count, 0);
  const totalOverdue = departments.reduce((sum, d) => sum + d.overdue_count, 0);
  const completionPercent = totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-2">Today's Work</h1>
              <p className="text-lg text-slate-600">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="text-right">
              <div className="text-5xl font-bold text-blue-600 mb-1">{completionPercent}%</div>
              <div className="text-sm text-slate-600">{totalCompleted} of {totalTasks} tasks complete</div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border-2 border-slate-200 shadow-sm">
              <div className="text-sm font-semibold text-slate-600 mb-1">TOTAL TASKS</div>
              <div className="text-3xl font-bold text-slate-900">{totalTasks}</div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border-2 border-green-300 shadow-sm">
              <div className="text-sm font-semibold text-green-700 mb-1">COMPLETED</div>
              <div className="text-3xl font-bold text-green-900">{totalCompleted}</div>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-300 shadow-sm">
              <div className="text-sm font-semibold text-blue-700 mb-1">IN PROGRESS</div>
              <div className="text-3xl font-bold text-blue-900">
                {departments.reduce((sum, d) => sum + d.tasks.filter(t => t.state === 'in_progress').length, 0)}
              </div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 border-2 border-red-300 shadow-sm">
              <div className="text-sm font-semibold text-red-700 mb-1">OVERDUE</div>
              <div className="text-3xl font-bold text-red-900">{totalOverdue}</div>
            </div>
          </div>
        </header>

        {departments.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border-2 border-slate-200">
            <div className="text-6xl mb-4">✅</div>
            <div className="text-2xl font-bold text-slate-900 mb-2">All Clear</div>
            <div className="text-lg text-slate-600">No tasks scheduled for today</div>
          </div>
        ) : (
          <div className="space-y-4">
            {departments.map((dept) => {
              const config = DEPARTMENT_CONFIG[dept.department] || { icon: '📋', color: 'gray', label: dept.department };
              const isExpanded = expandedDepts.has(dept.department);
              const progress = dept.task_count > 0 ? (dept.completed_count / dept.task_count) * 100 : 0;

              return (
                <div key={dept.department} className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-hidden">
                  <button
                    onClick={() => toggleDepartment(dept.department)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-4xl">{config.icon}</div>
                      <div className="text-left">
                        <div className="text-2xl font-bold text-slate-900">{config.label}</div>
                        <div className="text-sm text-slate-600 mt-1">
                          {dept.completed_count} of {dept.task_count} complete
                          {dept.overdue_count > 0 && (
                            <span className="ml-2 text-red-600 font-semibold">• {dept.overdue_count} overdue</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-48 bg-slate-200 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-green-500 h-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="text-2xl font-bold text-slate-600">{Math.round(progress)}%</div>
                      <div className="text-2xl text-slate-400">{isExpanded ? '▼' : '▶'}</div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2 space-y-3 bg-slate-50">
                      {dept.tasks.map((task) => (
                        <div
                          key={task.id}
                          className={`bg-white rounded-lg p-4 border-2 ${
                            task.is_emergency ? 'border-red-500 shadow-lg' : 'border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-grow">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-lg font-bold text-slate-900">{task.task_name}</h3>
                                {task.is_emergency && (
                                  <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded border border-red-400">
                                    EMERGENCY
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-slate-600">
                                {task.resident_name} • Room {task.room}
                              </div>
                              <div className="text-sm text-slate-500 mt-1">
                                {new Date(task.scheduled_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                {' - '}
                                {new Date(task.scheduled_end).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <span className={`px-3 py-1 rounded-lg text-xs font-bold border-2 ${getPriorityColor(task.priority)}`}>
                                {task.priority.toUpperCase()}
                              </span>
                              <span className={`px-3 py-1 rounded-lg text-xs font-bold border-2 ${getStateColor(task.state)}`}>
                                {task.state.replace('_', ' ').toUpperCase()}
                              </span>
                            </div>
                          </div>

                          {task.state === 'due' || task.state === 'overdue' ? (
                            <button
                              onClick={() => handleStartTask(task)}
                              className="w-full mt-3 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors text-lg"
                            >
                              START TASK
                            </button>
                          ) : task.state === 'in_progress' ? (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleCompleteTask(task)}
                                className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors text-lg"
                              >
                                ✓ COMPLETE
                              </button>
                              <button
                                onClick={() => skipTask(task.id, 'Issue encountered')}
                                className="flex-1 py-3 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg transition-colors text-lg"
                              >
                                ⚠ REPORT ISSUE
                              </button>
                            </div>
                          ) : task.state === 'completed' ? (
                            <div className="mt-3 py-2 bg-green-100 text-green-800 font-semibold rounded-lg text-center border-2 border-green-300">
                              ✓ Completed
                            </div>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showEvidence && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-slate-900 mb-4">Submit Evidence</h2>
              <EvidenceCapture
                taskId={selectedTask.id}
                taskName={selectedTask.task_name}
                onClose={() => {
                  setShowEvidence(false);
                  setSelectedTask(null);
                }}
                onSubmit={handleEvidenceSubmit}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
