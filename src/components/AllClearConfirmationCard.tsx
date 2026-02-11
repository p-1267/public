import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  residentId: string;
}

export function AllClearConfirmationCard({ residentId }: Props) {
  const [nextTask, setNextTask] = useState<{ task_name: string; scheduled_start: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNextScheduledTask();
  }, [residentId]);

  const fetchNextScheduledTask = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('task_name, scheduled_start')
        .eq('resident_id', residentId)
        .eq('state', 'scheduled')
        .gte('scheduled_start', new Date().toISOString())
        .order('scheduled_start', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setNextTask(data);
      } else {
        setNextTask(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatNextTaskTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) {
      return `in ${diffMins} minutes`;
    }

    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) {
      return `in ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    }

    return `on ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  if (loading) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-3xl shadow-lg p-8 mb-6 border-2 border-green-200">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-500 text-white mb-6">
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h2 className="text-3xl font-light text-gray-900 mb-3">All Clear</h2>

        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-center space-x-3 text-lg text-gray-700">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>All tasks completed</span>
          </div>

          <div className="flex items-center justify-center space-x-3 text-lg text-gray-700">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>No active concerns</span>
          </div>

          <div className="flex items-center justify-center space-x-3 text-lg text-gray-700">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>No overdue items</span>
          </div>
        </div>

        {nextTask ? (
          <div className="p-6 bg-white rounded-2xl border-2 border-green-200">
            <div className="text-sm text-gray-600 mb-1">Next scheduled action</div>
            <div className="text-xl font-medium text-gray-900 mb-2">{nextTask.task_name}</div>
            <div className="inline-flex items-center space-x-2 text-gray-700">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formatNextTaskTime(nextTask.scheduled_start)}</span>
            </div>
          </div>
        ) : (
          <div className="p-6 bg-white rounded-2xl border-2 border-green-200">
            <div className="text-gray-700">No scheduled tasks at this time</div>
          </div>
        )}

        <div className="mt-6 text-sm text-gray-600">
          Resident status confirmed at {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
