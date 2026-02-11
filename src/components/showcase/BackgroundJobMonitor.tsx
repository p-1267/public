import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface BackgroundJob {
  id: string;
  job_name: string;
  job_type: string;
  scheduled_time: string;
  start_time: string;
  end_time: string | null;
  status: string;
  input_parameters: any;
  execution_log: any[];
  output_results: any;
  error_message: string | null;
  execution_time_ms: number | null;
}

interface BackgroundJobMonitorProps {
  agencyId: string;
}

export function BackgroundJobMonitor({ agencyId }: BackgroundJobMonitorProps) {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const [selectedJob, setSelectedJob] = useState<BackgroundJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadJobs();
    const subscription = subscribeToJobs();
    return () => {
      subscription.unsubscribe();
    };
  }, [agencyId, filterStatus, filterType]);

  const loadJobs = async () => {
    setLoading(true);
    let query = supabase
      .from('background_job_log')
      .select('*')
      .eq('agency_id', agencyId)
      .order('start_time', { ascending: false })
      .limit(100);

    if (filterStatus !== 'all') {
      query = query.eq('status', filterStatus);
    }

    if (filterType !== 'all') {
      query = query.eq('job_type', filterType);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error loading jobs:', error);
    } else {
      setJobs(data || []);
    }
    setLoading(false);
  };

  const subscribeToJobs = () => {
    return supabase
      .channel('background_jobs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'background_job_log',
          filter: `agency_id=eq.${agencyId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setJobs((prev) => [payload.new as BackgroundJob, ...prev].slice(0, 100));
          } else if (payload.eventType === 'UPDATE') {
            setJobs((prev) =>
              prev.map((job) =>
                job.id === payload.new.id ? (payload.new as BackgroundJob) : job
              )
            );
          }
        }
      )
      .subscribe();
  };

  const getStatusColor = (status: string) => {
    const colors = {
      running: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      skipped: 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getJobTypeColor = (type: string) => {
    const colors = {
      task_generation: 'bg-gray-100 text-gray-800',
      reminder: 'bg-yellow-100 text-yellow-800',
      alert: 'bg-orange-100 text-orange-800',
      analytics: 'bg-blue-100 text-blue-800',
      cleanup: 'bg-gray-100 text-gray-800',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatDuration = (job: BackgroundJob) => {
    if (job.execution_time_ms) {
      return `${job.execution_time_ms}ms`;
    }
    if (job.end_time && job.start_time) {
      const duration =
        new Date(job.end_time).getTime() - new Date(job.start_time).getTime();
      return `${duration}ms`;
    }
    if (job.status === 'running') {
      const duration = Date.now() - new Date(job.start_time).getTime();
      return `${Math.floor(duration / 1000)}s (running)`;
    }
    return 'N/A';
  };

  const runningCount = jobs.filter((j) => j.status === 'running').length;
  const completedCount = jobs.filter((j) => j.status === 'completed').length;
  const failedCount = jobs.filter((j) => j.status === 'failed').length;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <h3 className="font-bold text-red-900 mb-1">WP7: NOT IMPLEMENTED</h3>
            <p className="text-sm text-red-800">
              <strong>Background Jobs are NOT implemented.</strong> No task generation,
              reminders, alerts, or analytics jobs are running. The job logging table is
              empty because no actual automation exists. This monitor shows the infrastructure,
              but no scheduled jobs are executing.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Background Job Monitor (NO JOBS RUNNING)
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Infrastructure for job logging is ready. Actual jobs are not implemented.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-600">Live</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-sm text-gray-600">Total Jobs</div>
          <div className="text-2xl font-bold text-gray-900">{jobs.length}</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="text-sm text-blue-600">Running</div>
          <div className="text-2xl font-bold text-blue-900">{runningCount}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="text-sm text-green-600">Completed</div>
          <div className="text-2xl font-bold text-green-900">{completedCount}</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4">
          <div className="text-sm text-red-600">Failed</div>
          <div className="text-2xl font-bold text-red-900">{failedCount}</div>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Types</option>
          <option value="task_generation">Task Generation</option>
          <option value="reminder">Reminders</option>
          <option value="alert">Alerts</option>
          <option value="analytics">Analytics</option>
          <option value="cleanup">Cleanup</option>
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Statuses</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
          <option value="skipped">Skipped</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No jobs logged yet</div>
          ) : (
            jobs.map((job) => (
              <button
                key={job.id}
                onClick={() => setSelectedJob(job)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                  selectedJob?.id === job.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getJobTypeColor(
                        job.job_type
                      )}`}
                    >
                      {job.job_type.replace(/_/g, ' ')}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        job.status
                      )}`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(job.start_time).toLocaleTimeString()}
                  </span>
                </div>
                <div className="font-medium text-sm text-gray-900 mb-1">
                  {job.job_name}
                </div>
                <div className="text-xs text-gray-600">{formatDuration(job)}</div>
              </button>
            ))
          )}
        </div>

        <div className="border-l-2 border-gray-200 pl-6">
          {selectedJob ? (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Job Details</h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 w-32">Name:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {selectedJob.job_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 w-32">Type:</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getJobTypeColor(
                        selectedJob.job_type
                      )}`}
                    >
                      {selectedJob.job_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 w-32">Status:</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                        selectedJob.status
                      )}`}
                    >
                      {selectedJob.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 w-32">Duration:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {formatDuration(selectedJob)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Input Parameters (What Triggered This Job)
                </h3>
                <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 overflow-x-auto">
                  {JSON.stringify(selectedJob.input_parameters, null, 2)}
                </pre>
              </div>

              {selectedJob.execution_log.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Execution Log (What Happened During Execution)
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                    {selectedJob.execution_log.map((log, idx) => (
                      <div key={idx} className="text-xs text-gray-700 font-mono">
                        {typeof log === 'string' ? log : JSON.stringify(log)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="font-semibold text-gray-900 mb-2">
                  Output Results (What This Job Produced)
                </h3>
                <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 overflow-x-auto">
                  {JSON.stringify(selectedJob.output_results, null, 2)}
                </pre>
              </div>

              {selectedJob.error_message && (
                <div>
                  <h3 className="font-semibold text-red-900 mb-2">Error Message</h3>
                  <div className="bg-red-50 rounded-lg p-3 text-sm text-red-700">
                    {selectedJob.error_message}
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-600 space-y-1">
                  <div>
                    Scheduled:{' '}
                    <span className="font-medium text-gray-900">
                      {new Date(selectedJob.scheduled_time).toLocaleString()}
                    </span>
                  </div>
                  <div>
                    Started:{' '}
                    <span className="font-medium text-gray-900">
                      {new Date(selectedJob.start_time).toLocaleString()}
                    </span>
                  </div>
                  {selectedJob.end_time && (
                    <div>
                      Ended:{' '}
                      <span className="font-medium text-gray-900">
                        {new Date(selectedJob.end_time).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              Select a job to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
