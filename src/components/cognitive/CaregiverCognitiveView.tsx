import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { NowNextLater, TaskItem } from './NowNextLater';
import { IntelligenceSignalCard, IntelligenceSignal } from './IntelligenceSignalCard';
import { SituationCard, ResidentSituation } from './SituationCard';
import { AllClearDisplay } from './AllClearDisplay';
import { Level4ActivePanel } from '../Level4ActivePanel';

export const CaregiverCognitiveView: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [signals, setSignals] = useState<IntelligenceSignal[]>([]);
  const [situations, setSituations] = useState<ResidentSituation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    const subscription = supabase
      .channel('cognitive_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, loadData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'intelligence_signals' }, loadData)
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadData = async () => {
    try {
      // Query tasks - get in_progress and upcoming tasks
      const tasksPromise = supabase
        .from('tasks')
        .select('*, residents(full_name, metadata)')
        .in('state', ['in_progress', 'scheduled', 'due'])
        .order('scheduled_start')
        .limit(20);

      const signalsPromise = supabase
        .from('intelligence_signals')
        .select('*, residents(full_name)')
        .eq('dismissed', false)
        .order('detected_at', { ascending: false })
        .limit(5);

      const [tasksRes, signalsRes] = await Promise.all([tasksPromise, signalsPromise]);

      if (tasksRes.data) {
        const now = new Date();
        const mappedTasks: TaskItem[] = tasksRes.data.map((t: any) => {
          const scheduledStart = new Date(t.scheduled_start);
          const hoursUntil = (scheduledStart.getTime() - now.getTime()) / (1000 * 60 * 60);

          let status: 'now' | 'next' | 'later' = 'later';
          if (hoursUntil <= 0.5) status = 'now';
          else if (hoursUntil <= 2) status = 'next';

          return {
            id: t.id,
            title: t.task_name,
            category: t.department || 'Other',
            residentName: t.residents?.full_name || 'Unknown',
            room: t.residents?.metadata?.room || 'N/A',
            dueTime: new Date(t.scheduled_start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
            status,
            priority: t.priority === 'high' || t.priority === 'critical' ? 'urgent' : t.priority
          };
        });
        setTasks(mappedTasks);
      }

      if (signalsRes.data) {
        const mappedSignals: IntelligenceSignal[] = signalsRes.data.map((s: any) => ({
          id: s.id,
          type: s.severity === 'HIGH' || s.severity === 'CRITICAL' ? 'warning' : 'info',
          title: s.title,
          summary: s.description,
          timestamp: new Date(s.detected_at).toLocaleString(),
          residentName: s.residents?.full_name || 'System',
          category: s.category,
          why: {
            summary: s.reasoning,
            observed: [],
            rulesFired: s.data_source || [],
            dataUsed: s.data_source || [],
            cannotConclude: [],
            humanAction: s.suggested_actions?.[0] || 'Review and assess'
          },
          actionable: s.requires_human_action,
          suggestedAction: s.suggested_actions?.[0] || 'Review'
        }));
        setSignals(mappedSignals);
      }

      setSituations([]);
    } catch (error) {
      console.error('Failed to load cognitive view data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (taskId: string) => {
    try {
      const { data, error } = await supabase.rpc('start_task', {
        p_task_id: taskId
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        console.error('Failed to start task:', result.error);
      }

      loadData();
    } catch (error) {
      console.error('Error starting task:', error);
    }
  };

  const handleTaskClick = (task: TaskItem) => {
    console.log('Task clicked:', task.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading cognitive view...</div>
      </div>
    );
  }

  const allClear = tasks.length === 0 && signals.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-slate-900">Your Work</h1>
          <Level4ActivePanel />
        </div>

        {allClear ? (
          <AllClearDisplay
            completedToday={0}
            nextTaskTime="No upcoming tasks"
          />
        ) : (
          <>
            {signals.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-800">Intelligence Signals</h2>
                <div className="grid gap-4">
                  {signals.map(signal => (
                    <IntelligenceSignalCard
                      key={signal.id}
                      signal={signal}
                      onAction={() => console.log('Signal action:', signal.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {situations.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-800">Resident Status</h2>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {situations.map(situation => (
                    <SituationCard
                      key={situation.id}
                      situation={situation}
                      onClick={() => console.log('Situation clicked:', situation.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {tasks.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-800">Today's Tasks</h2>
                <NowNextLater
                  tasks={tasks}
                  onTaskClick={handleTaskClick}
                  onStartTask={handleStartTask}
                />
              </div>
            )}
          </>
        )}

      </div>
    </div>
  );
};
