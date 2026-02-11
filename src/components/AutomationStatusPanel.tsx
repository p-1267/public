import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AutomationJob {
  name: string;
  description: string;
  schedule: string;
  lastRun: Date | null;
  nextRun: Date | null;
  resultCount: number;
  status: 'active' | 'idle' | 'error';
}

export function AutomationStatusPanel() {
  const [jobs, setJobs] = useState<AutomationJob[]>([]);

  useEffect(() => {
    loadAutomationStatus();
    const interval = setInterval(loadAutomationStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadAutomationStatus() {
    const now = new Date();

    const medicationJob: AutomationJob = {
      name: 'Missed Medication Detection',
      description: 'Detects medications missed within 30-minute windows',
      schedule: 'Every 5 minutes',
      lastRun: await getLastJobRun('missed_medication'),
      nextRun: new Date(now.getTime() + 5 * 60000),
      resultCount: await getJobResultCount('MISSED_MEDICATION'),
      status: 'active'
    };

    const escalationJob: AutomationJob = {
      name: 'Task Auto-Escalation',
      description: 'Escalates overdue tasks through 3 severity levels',
      schedule: 'Every 5 minutes',
      lastRun: await getLastJobRun('task_escalation'),
      nextRun: new Date(now.getTime() + 5 * 60000),
      resultCount: await getJobResultCount('escalated'),
      status: 'active'
    };

    const workloadJob: AutomationJob = {
      name: 'Workload Signal Detection',
      description: 'Analyzes caregiver workload patterns',
      schedule: 'Every hour',
      lastRun: await getLastJobRun('workload_signals'),
      nextRun: new Date(Math.ceil(now.getTime() / 3600000) * 3600000),
      resultCount: await getWorkloadSignalCount(),
      status: 'active'
    };

    setJobs([medicationJob, escalationJob, workloadJob]);
  }

  async function getLastJobRun(jobType: string): Promise<Date | null> {
    if (jobType === 'missed_medication' || jobType === 'task_escalation') {
      const { data } = await supabase
        .from('intelligence_signals')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);
      return data?.[0]?.created_at ? new Date(data[0].created_at) : null;
    } else if (jobType === 'workload_signals') {
      const { data } = await supabase
        .from('workload_signals')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);
      return data?.[0]?.created_at ? new Date(data[0].created_at) : null;
    }
    return null;
  }

  async function getJobResultCount(type: string): Promise<number> {
    if (type === 'MISSED_MEDICATION') {
      const { count } = await supabase
        .from('intelligence_signals')
        .select('*', { count: 'exact', head: true })
        .eq('signal_type', 'MISSED_MEDICATION')
        .gte('created_at', new Date(Date.now() - 24 * 3600000).toISOString());
      return count || 0;
    } else if (type === 'escalated') {
      const { count } = await supabase
        .from('task_escalations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');
      return count || 0;
    }
    return 0;
  }

  async function getWorkloadSignalCount(): Promise<number> {
    const { count } = await supabase
      .from('workload_signals')
      .select('*', { count: 'exact', head: true })
      .eq('is_acknowledged', false);
    return count || 0;
  }

  function getTimeSince(date: Date | null): string {
    if (!date) return 'Never';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  function getTimeUntil(date: Date | null): string {
    if (!date) return 'Unknown';
    const seconds = Math.floor((date.getTime() - Date.now()) / 1000);
    if (seconds < 0) return 'Overdue';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Background Automation Status</h2>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-sm text-gray-600">Active</span>
        </div>
      </div>

      <div className="space-y-4">
        {jobs.map((job) => (
          <div key={job.name} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-medium text-gray-900">{job.name}</h3>
                <p className="text-sm text-gray-600 mt-1">{job.description}</p>
              </div>
              <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                {job.status}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-4 mt-3 text-sm">
              <div>
                <span className="text-gray-500">Schedule</span>
                <p className="font-medium text-gray-900 mt-1">{job.schedule}</p>
              </div>
              <div>
                <span className="text-gray-500">Last Run</span>
                <p className="font-medium text-gray-900 mt-1">{getTimeSince(job.lastRun)}</p>
              </div>
              <div>
                <span className="text-gray-500">Next Run</span>
                <p className="font-medium text-gray-900 mt-1">{getTimeUntil(job.nextRun)}</p>
              </div>
              <div>
                <span className="text-gray-500">Results (24h)</span>
                <p className="font-medium text-gray-900 mt-1">{job.resultCount}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        Automation jobs run continuously in the background. Status updates every 30 seconds.
      </div>
    </div>
  );
}
