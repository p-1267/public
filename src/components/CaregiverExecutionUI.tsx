import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Task {
  task_id: string;
  task_name: string;
  description: string;
  resident_id: string;
  resident_name: string;
  priority: string;
  risk_level: string;
  state: string;
  scheduled_start: string;
  scheduled_end: string;
  requires_evidence: boolean;
  evidence_types: any;
  category_name: string;
  department_name: string;
}

interface IntelligenceSignal {
  id: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  resident_id: string;
  resident_name: string;
  requires_human_action: boolean;
  suggested_actions: string[];
  detected_at: string;
}

interface EvidenceItem {
  type: 'photo' | 'voice' | 'note' | 'metric';
  data?: any;
  file_url?: string;
  transcription?: string;
}

interface CaregiverExecutionUIProps {
  caregiverId: string;
  date?: Date;
  onTaskComplete?: () => void;
}

export function CaregiverExecutionUI({
  caregiverId,
  date = new Date(),
  onTaskComplete,
}: CaregiverExecutionUIProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [signals, setSignals] = useState<IntelligenceSignal[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [outcome, setOutcome] = useState<string>('success');
  const [outcomeReason, setOutcomeReason] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'execution'>('tasks');
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    loadTasks();
    loadIntelligenceSignals();
    const taskSubscription = subscribeToTaskUpdates();
    const signalSubscription = subscribeToSignalUpdates();
    return () => {
      taskSubscription.unsubscribe();
      signalSubscription.unsubscribe();
    };
  }, [caregiverId, date]);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const dateStr = date.toISOString().split('T')[0];

      const { data, error } = await supabase.rpc('get_caregiver_task_list', {
        p_caregiver_id: caregiverId,
        p_date: dateStr,
      });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setMessage({
        type: 'error',
        text: 'Failed to load tasks',
      });
    }
    setLoading(false);
  };

  const loadIntelligenceSignals = async () => {
    try {
      const { data, error } = await supabase
        .from('intelligence_signals')
        .select('*, residents(full_name)')
        .eq('dismissed', false)
        .in('severity', ['HIGH', 'CRITICAL', 'URGENT'])
        .order('detected_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const mappedSignals: IntelligenceSignal[] = (data || []).map((s: any) => ({
        id: s.id,
        title: s.title,
        description: s.description,
        severity: s.severity,
        category: s.category,
        resident_id: s.resident_id,
        resident_name: s.residents?.full_name || 'Unknown',
        requires_human_action: s.requires_human_action,
        suggested_actions: s.suggested_actions || [],
        detected_at: s.detected_at,
      }));

      setSignals(mappedSignals);
    } catch (error) {
      console.error('Error loading intelligence signals:', error);
    }
  };

  const subscribeToTaskUpdates = () => {
    return supabase
      .channel('task_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `owner_user_id=eq.${caregiverId}`,
        },
        () => {
          loadTasks();
        }
      )
      .subscribe();
  };

  const subscribeToSignalUpdates = () => {
    return supabase
      .channel('signal_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'intelligence_signals',
        },
        () => {
          loadIntelligenceSignals();
        }
      )
      .subscribe();
  };

  const handleStartTask = async (task: Task) => {
    try {
      const { data, error } = await supabase.rpc('start_task', {
        p_task_id: task.task_id,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || 'Failed to start task');
      }

      setSelectedTask(task);
      setActiveTab('execution');
      setEvidence([]);
      setOutcome('success');
      setOutcomeReason('');
      setMessage(null);
      loadTasks();
    } catch (error) {
      console.error('Error starting task:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to start task',
      });
    }
  };

  const handleAddEvidence = (type: 'photo' | 'voice' | 'note' | 'metric') => {
    if (type === 'photo') {
      const url = `https://via.placeholder.com/400x300?text=Photo+Evidence+${
        evidence.length + 1
      }`;
      setEvidence([...evidence, { type: 'photo', file_url: url }]);
    } else if (type === 'voice') {
      setEvidence([
        ...evidence,
        {
          type: 'voice',
          file_url: 'simulated_audio.mp3',
          transcription: `Voice note ${evidence.length + 1}: Resident was cooperative and in good spirits.`,
        },
      ]);
    } else if (type === 'note') {
      const noteText = prompt('Enter note:');
      if (noteText) {
        setEvidence([...evidence, { type: 'note', data: { text: noteText } }]);
      }
    } else if (type === 'metric') {
      const metricName = prompt('Metric name (e.g., blood_pressure):');
      const metricValue = prompt('Metric value (e.g., 120/80):');
      if (metricName && metricValue) {
        setEvidence([
          ...evidence,
          {
            type: 'metric',
            data: { metric_name: metricName, metric_value: metricValue },
          },
        ]);
      }
    }
  };

  const handleRemoveEvidence = (index: number) => {
    setEvidence(evidence.filter((_, i) => i !== index));
  };

  const handleCompleteTask = async () => {
    if (!selectedTask) return;

    if (
      selectedTask.requires_evidence &&
      evidence.length === 0
    ) {
      setMessage({
        type: 'error',
        text: 'Evidence is required for this task',
      });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.rpc('complete_task_with_evidence', {
        p_task_id: selectedTask.task_id,
        p_outcome: outcome,
        p_outcome_reason: outcomeReason || null,
        p_evidence_items: evidence,
      });

      if (error) throw error;

      const result = data as {
        success: boolean;
        error?: string;
        evidence_count: number;
      };
      if (!result.success) {
        throw new Error(result.error || 'Failed to complete task');
      }

      setMessage({
        type: 'success',
        text: `Task completed successfully with ${result.evidence_count} evidence item(s)`,
      });

      setTimeout(() => {
        setActiveTab('tasks');
        setSelectedTask(null);
        setEvidence([]);
        loadTasks();
        if (onTaskComplete) onTaskComplete();
      }, 2000);
    } catch (error) {
      console.error('Error completing task:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Failed to complete task',
      });
    }

    setSubmitting(false);
  };

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: string } = {
      critical: 'border-l-red-500 bg-red-50',
      high: 'border-l-orange-500 bg-orange-50',
      medium: 'border-l-blue-500 bg-blue-50',
      low: 'border-l-gray-500 bg-gray-50',
    };
    return colors[priority] || colors.medium;
  };

  const getStateColor = (state: string) => {
    const colors: { [key: string]: string } = {
      scheduled: 'bg-blue-100 text-blue-800',
      due: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-green-100 text-green-800',
    };
    return colors[state] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">Loading tasks...</div>
      </div>
    );
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-100 border-red-400 text-red-900';
      case 'URGENT':
      case 'HIGH':
        return 'bg-orange-100 border-orange-400 text-orange-900';
      default:
        return 'bg-blue-100 border-blue-400 text-blue-900';
    }
  };

  const dismissSignal = async (signalId: string) => {
    try {
      await supabase
        .from('intelligence_signals')
        .update({ dismissed: true })
        .eq('id', signalId);
      loadIntelligenceSignals();
    } catch (error) {
      console.error('Error dismissing signal:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {activeTab === 'tasks' ? (
        <>
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              My Tasks - {date.toLocaleDateString()}
            </h2>
            <p className="text-sm text-gray-600">
              {tasks.length} task(s) assigned for today
            </p>
          </div>

          {signals.length > 0 && (
            <div className="p-6 border-b border-gray-200 bg-yellow-50">
              <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-2xl">⚠️</span>
                Intelligence Alerts ({signals.length})
              </h3>
              <div className="space-y-3">
                {signals.map((signal) => (
                  <div
                    key={signal.id}
                    className={`border-2 rounded-lg p-4 ${getSeverityColor(signal.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-white rounded text-xs font-bold">
                            {signal.severity}
                          </span>
                          <span className="text-sm font-medium">
                            {signal.resident_name}
                          </span>
                        </div>
                        <h4 className="font-bold text-base mb-1">{signal.title}</h4>
                        <p className="text-sm mb-2">{signal.description}</p>
                        {signal.suggested_actions.length > 0 && (
                          <div className="text-sm">
                            <strong>Suggested:</strong> {signal.suggested_actions[0]}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => dismissSignal(signal.id)}
                        className="ml-4 px-3 py-1 text-sm bg-white rounded hover:bg-gray-100"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {message && (
            <div
              className={`mx-6 mt-6 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="p-6 space-y-4">
            {tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                No tasks assigned for today
              </div>
            ) : (
              tasks.map((task) => (
                <div
                  key={task.task_id}
                  className={`border-l-4 ${getPriorityColor(
                    task.priority
                  )} border border-gray-200 rounded-lg p-4`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {task.task_name}
                        </h3>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${getStateColor(
                            task.state
                          )}`}
                        >
                          {task.state.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>

                      <div className="space-y-1 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Resident:</span>
                          <span>{task.resident_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Category:</span>
                          <span>{task.category_name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Scheduled:</span>
                          <span>
                            {new Date(task.scheduled_start).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}{' '}
                            -{' '}
                            {new Date(task.scheduled_end).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {task.description && (
                          <div className="mt-2 text-gray-700">
                            {task.description}
                          </div>
                        )}
                      </div>

                      {task.requires_evidence && (
                        <div className="flex items-center gap-2 text-xs text-yellow-800 bg-yellow-100 px-3 py-1 rounded-full w-fit">
                          <span>⚠️</span>
                          <span>Evidence Required</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => handleStartTask(task)}
                      disabled={task.state === 'in_progress'}
                      className="ml-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                    >
                      {task.state === 'in_progress' ? 'Complete' : 'Start Task'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <div className="p-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('tasks')}
              className="text-blue-600 hover:text-blue-800 mb-2 flex items-center gap-2"
            >
              ← Back to Task List
            </button>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {selectedTask?.task_name}
            </h2>
            <p className="text-sm text-gray-600">
              Resident: {selectedTask?.resident_name}
            </p>
          </div>

          {message && (
            <div
              className={`mx-6 mt-6 p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Outcome
              </label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="success">Success</option>
                <option value="partial">Partial</option>
                <option value="failed">Failed</option>
                <option value="skipped">Skipped</option>
              </select>
            </div>

            {(outcome === 'partial' || outcome === 'failed' || outcome === 'skipped') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason / Notes
                </label>
                <textarea
                  value={outcomeReason}
                  onChange={(e) => setOutcomeReason(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Explain the outcome..."
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">
                  Evidence ({evidence.length} item{evidence.length !== 1 ? 's' : ''})
                  {selectedTask?.requires_evidence && (
                    <span className="ml-2 text-xs text-red-600">* Required</span>
                  )}
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleAddEvidence('photo')}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                  >
                    + Photo
                  </button>
                  <button
                    onClick={() => handleAddEvidence('voice')}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                  >
                    + Voice
                  </button>
                  <button
                    onClick={() => handleAddEvidence('note')}
                    className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm hover:bg-yellow-200"
                  >
                    + Note
                  </button>
                  <button
                    onClick={() => handleAddEvidence('metric')}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200"
                  >
                    + Metric
                  </button>
                </div>
              </div>

              {evidence.length === 0 ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center text-gray-500">
                  No evidence captured yet. Use the buttons above to add evidence.
                </div>
              ) : (
                <div className="space-y-3">
                  {evidence.map((item, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 rounded-lg p-4 flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                            {item.type.toUpperCase()}
                          </span>
                        </div>
                        {item.type === 'photo' && item.file_url && (
                          <img
                            src={item.file_url}
                            alt="Evidence"
                            className="w-32 h-32 object-cover rounded"
                          />
                        )}
                        {item.type === 'voice' && item.transcription && (
                          <div className="text-sm text-gray-700">
                            <strong>Transcription:</strong> {item.transcription}
                          </div>
                        )}
                        {item.type === 'note' && item.data?.text && (
                          <div className="text-sm text-gray-700">{item.data.text}</div>
                        )}
                        {item.type === 'metric' && item.data && (
                          <div className="text-sm text-gray-700">
                            <strong>{item.data.metric_name}:</strong>{' '}
                            {item.data.metric_value}
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveEvidence(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('tasks')}
                className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCompleteTask}
                disabled={
                  submitting ||
                  (selectedTask?.requires_evidence && evidence.length === 0)
                }
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Completing...' : 'Complete Task'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
