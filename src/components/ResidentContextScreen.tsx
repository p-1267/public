import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useTaskEngine } from '../hooks/useTaskEngine';
import { EvidenceCapture } from './EvidenceCapture';
import { ConflictBanner } from './ConflictBanner';
import { AllClearConfirmationCard } from './AllClearConfirmationCard';
import { TaskAlert } from './TaskAlert';
import { BrainOutputPanel } from './BrainOutputPanel';
import { BaselineComparison } from './BaselineComparison';
import { AllergyCheckLog } from './AllergyCheckLog';
import { MedicationAdherenceMetrics } from './MedicationAdherenceMetrics';

interface Resident {
  id: string;
  full_name: string;
  room_number: string | null;
  profile_photo_url: string | null;
}

interface Task {
  id: string;
  task_name: string;
  priority: string;
  state: string;
  scheduled_start: string;
  scheduled_end: string;
  requires_evidence: boolean;
  owner_user_id: string;
  owner_name?: string;
  category?: { name: string; color_code: string | null };
}

interface RecentAction {
  id: string;
  action_type: string;
  description: string;
  performed_at: string;
  performed_by_name: string;
}

interface IntelligenceSignal {
  id: string;
  signal_type: string;
  severity: string;
  message: string;
  created_at: string;
}

interface Props {
  residentId: string;
  onBack: () => void;
}

export function ResidentContextScreen({ residentId, onBack }: Props) {
  const [resident, setResident] = useState<Resident | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [recentActions, setRecentActions] = useState<RecentAction[]>([]);
  const [signals, setSignals] = useState<IntelligenceSignal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [evidenceMode, setEvidenceMode] = useState<'complete' | 'problem' | null>(null);
  const [actionMode, setActionMode] = useState<'vitals' | 'prn' | 'concern' | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const { startTask, completeTask, skipTask } = useTaskEngine();

  useEffect(() => {
    fetchResidentContext();

    const channel = supabase
      .channel(`resident_context_${residentId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `resident_id=eq.${residentId}` }, () => {
        fetchResidentContext();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'intelligence_signals', filter: `resident_id=eq.${residentId}` }, () => {
        fetchSignals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [residentId]);

  const fetchResidentContext = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchResident(),
        fetchTasks(),
        fetchRecentActions(),
        fetchSignals()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchResident = async () => {
    const { data, error } = await supabase
      .from('residents')
      .select('*')
      .eq('id', residentId)
      .maybeSingle();

    if (!error && data) {
      setResident(data);
    }
  };

  const fetchTasks = async () => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        category:task_categories(name, color_code),
        owner:user_profiles!owner_user_id(full_name)
      `)
      .eq('resident_id', residentId)
      .in('state', ['due', 'overdue', 'escalated', 'in_progress'])
      .order('priority', { ascending: false })
      .order('scheduled_start', { ascending: true });

    if (!error && data) {
      setTasks(data.map(t => ({
        ...t,
        owner_name: t.owner?.full_name
      })));
    }
  };

  const fetchRecentActions = async () => {
    const cutoffTime = new Date();
    cutoffTime.setMinutes(cutoffTime.getMinutes() - 90);

    const { data, error } = await supabase
      .from('task_evidence')
      .select(`
        id,
        evidence_type,
        notes,
        created_at,
        captured_by,
        user:user_profiles!captured_by(full_name)
      `)
      .eq('resident_id', residentId)
      .gte('created_at', cutoffTime.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setRecentActions(data.map(a => ({
        id: a.id,
        action_type: a.evidence_type || 'action',
        description: a.notes || 'Action performed',
        performed_at: a.created_at,
        performed_by_name: a.user?.full_name || 'Unknown'
      })));
    }
  };

  const fetchSignals = async () => {
    const { data, error } = await supabase
      .from('intelligence_signals')
      .select('*')
      .eq('resident_id', residentId)
      .eq('status', 'active')
      .order('severity', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(5);

    if (!error && data) {
      setSignals(data);
    }
  };

  const handleStartTask = async (task: Task) => {
    try {
      await startTask(task.id);
      setAlertMessage(`Started: ${task.task_name}`);
      fetchTasks();
    } catch (err) {
      setAlertMessage(err instanceof Error ? err.message : 'Failed to start task');
    }
  };

  const handleCompleteTask = (task: Task) => {
    setSelectedTask(task);
    setEvidenceMode('complete');
  };

  const handleReportProblem = (task: Task) => {
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
      fetchResidentContext();
    } catch (err) {
      setAlertMessage(err instanceof Error ? err.message : 'Action failed');
    }
  };

  const getLiveCareState = () => {
    const overdue = tasks.filter(t => t.state === 'overdue').length;
    const inProgress = tasks.filter(t => t.state === 'in_progress').length;
    const pending = tasks.filter(t => t.state === 'due').length;

    if (overdue > 0) return { status: 'overdue', label: 'Overdue Tasks', color: 'bg-red-500' };
    if (inProgress > 0) return { status: 'in_progress', label: 'In Progress', color: 'bg-blue-500' };
    if (pending > 0) return { status: 'pending', label: 'Pending Tasks', color: 'bg-amber-500' };
    return { status: 'done', label: 'All Current Tasks Complete', color: 'bg-green-500' };
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-amber-500 bg-amber-50';
      default: return 'border-gray-300 bg-white';
    }
  };

  const getStateIndicator = (state: string) => {
    switch (state) {
      case 'overdue': return '🔴';
      case 'escalated': return '🚨';
      case 'in_progress': return '🔵';
      case 'due': return '🟡';
      default: return '⚪';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 60000);

    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-xl text-gray-600">Loading resident context...</p>
        </div>
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-xl text-gray-600 mb-4">Resident not found</p>
          <button onClick={onBack} className="px-6 py-3 bg-blue-600 text-white rounded-xl">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const careState = getLiveCareState();
  const hasNoConcerns = tasks.length === 0 && signals.length === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <button
          onClick={onBack}
          className="mb-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
        >
          ← Back to Lookup
        </button>

        <div className="bg-white rounded-3xl shadow-lg p-8 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center text-white text-4xl font-bold">
                {resident.full_name.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h1 className="text-4xl font-light text-gray-900">{resident.full_name}</h1>
                {resident.room_number && (
                  <p className="text-xl text-gray-600 mt-1">Room {resident.room_number}</p>
                )}
              </div>
            </div>

            <div className={`px-6 py-3 rounded-2xl ${careState.color} text-white`}>
              <div className="text-sm font-medium opacity-90">LIVE STATUS</div>
              <div className="text-xl font-semibold">{careState.label}</div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <BrainOutputPanel
            context={{
              residentId: residentId,
              windowHours: 4
            }}
            title="System Observation"
          />
        </div>

        {hasNoConcerns && <AllClearConfirmationCard residentId={residentId} />}

        {signals.length > 0 && (
          <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-light text-gray-900 mb-4">🧠 Intelligence Signals</h2>
            <div className="space-y-3">
              {signals.map(signal => (
                <div
                  key={signal.id}
                  className={`p-4 rounded-2xl border-2 ${
                    signal.severity === 'HIGH' ? 'border-red-500 bg-red-50' :
                    signal.severity === 'MEDIUM' ? 'border-amber-500 bg-amber-50' :
                    'border-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{signal.signal_type}</div>
                      <div className="text-gray-700 mt-1">{signal.message}</div>
                    </div>
                    <div className="text-sm text-gray-500">{formatTime(signal.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tasks.length > 0 && (
          <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-light text-gray-900 mb-4">📋 Current Tasks</h2>
            <div className="space-y-4">
              {tasks.map(task => {
                const isInProgressByOther = task.state === 'in_progress' && task.owner_user_id !== supabase.auth.getUser();

                return (
                  <div key={task.id} className={`border-2 rounded-2xl p-6 ${getPriorityColor(task.priority)}`}>
                    {isInProgressByOther && <ConflictBanner taskId={task.id} ownerName={task.owner_name || 'Another caregiver'} />}

                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-2xl">{getStateIndicator(task.state)}</span>
                          <h3 className="text-xl font-medium text-gray-900">{task.task_name}</h3>
                        </div>
                        {task.category && (
                          <div className="inline-block px-3 py-1 rounded-lg bg-white text-sm text-gray-700">
                            {task.category.name}
                          </div>
                        )}
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        <div>Due: {new Date(task.scheduled_start).toLocaleTimeString()}</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      {task.state !== 'in_progress' && (
                        <button
                          onClick={() => handleStartTask(task)}
                          className="p-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all"
                        >
                          Start
                        </button>
                      )}
                      <button
                        onClick={() => handleCompleteTask(task)}
                        className="p-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium transition-all"
                      >
                        Done
                      </button>
                      <button
                        onClick={() => handleReportProblem(task)}
                        className="p-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-medium transition-all"
                      >
                        Problem
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {recentActions.length > 0 && (
          <div className="bg-white rounded-3xl shadow-lg p-6 mb-6">
            <h2 className="text-2xl font-light text-gray-900 mb-4">⏱ Recent Actions (90 min)</h2>
            <div className="space-y-3">
              {recentActions.map(action => (
                <div key={action.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl">
                  <div className="text-2xl">📝</div>
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{action.description}</div>
                    <div className="text-sm text-gray-600 mt-1">
                      by {action.performed_by_name} · {formatTime(action.performed_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 mb-6">
          <BaselineComparison residentId={residentId} />
          <MedicationAdherenceMetrics residentId={residentId} timeframe="7d" />
          <AllergyCheckLog residentId={residentId} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4">
          <button
            onClick={() => setActionMode('vitals')}
            className="p-6 rounded-2xl bg-white border-2 border-gray-200 hover:border-blue-500 transition-all"
          >
            <div className="text-3xl mb-2">❤️</div>
            <div className="text-lg font-medium text-gray-900">Record Vitals</div>
          </button>
          <button
            onClick={() => setActionMode('concern')}
            className="p-6 rounded-2xl bg-white border-2 border-gray-200 hover:border-blue-500 transition-all"
          >
            <div className="text-3xl mb-2">🎤</div>
            <div className="text-lg font-medium text-gray-900">Add Concern</div>
          </button>
        </div>
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
          severity="info"
          onDismiss={() => setAlertMessage(null)}
        />
      )}
    </div>
  );
}
