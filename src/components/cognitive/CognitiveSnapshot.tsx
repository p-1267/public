import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertTriangle, TrendingUp, Clock, CheckCircle } from 'lucide-react';

interface CognitiveSnapshotProps {
  residentId: string;
  role: string;
}

export const CognitiveSnapshot: React.FC<CognitiveSnapshotProps> = ({ residentId, role }) => {
  const [signals, setSignals] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [residentId]);

  const loadData = async () => {
    const [signalsRes, tasksRes] = await Promise.all([
      supabase
        .from('intelligence_signals')
        .select('*')
        .eq('resident_id', residentId)
        .eq('dismissed', false)
        .order('detected_at', { ascending: false })
        .limit(3),
      supabase
        .from('tasks')
        .select('*')
        .eq('resident_id', residentId)
        .in('state', ['in_progress', 'scheduled', 'due'])
        .order('scheduled_start')
        .limit(5)
    ]);

    setSignals(signalsRes.data || []);
    setTasks(tasksRes.data || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 border border-slate-200">
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-slate-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-slate-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  const highPrioritySignals = signals.filter(s => s.severity === 'high' || s.severity === 'critical');
  const upcomingTasks = tasks.filter(t => t.state === 'scheduled' || t.state === 'due');

  return (
    <div className="bg-white rounded-lg shadow border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Cognitive Intelligence
        </h3>
        <p className="text-sm text-slate-600 mt-1">
          AI-powered insights and care coordination
        </p>
      </div>

      <div className="p-6 space-y-4">
        {signals.length === 0 && tasks.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-semibold text-slate-700">All Clear</p>
            <p className="text-sm text-slate-500 mt-1">No active alerts or urgent tasks</p>
          </div>
        ) : (
          <>
            {highPrioritySignals.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <h4 className="font-semibold text-slate-900">Active Alerts</h4>
                </div>
                <div className="space-y-2">
                  {highPrioritySignals.map((signal) => (
                    <div
                      key={signal.id}
                      className="p-3 bg-red-50 border border-red-200 rounded-md"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-red-900">{signal.signal_type}</p>
                          <p className="text-sm text-red-700 mt-1">{signal.reasoning}</p>
                        </div>
                        <span className="text-xs font-bold text-red-600 uppercase">
                          {signal.severity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {upcomingTasks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <h4 className="font-semibold text-slate-900">Upcoming Tasks</h4>
                </div>
                <div className="space-y-2">
                  {upcomingTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className="p-3 bg-blue-50 border border-blue-200 rounded-md"
                    >
                      <p className="font-medium text-blue-900">{task.name}</p>
                      <p className="text-sm text-blue-700 mt-1">
                        {new Date(task.scheduled_start).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
