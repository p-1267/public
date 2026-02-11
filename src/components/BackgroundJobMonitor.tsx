import { useState, useEffect } from 'react';
import { JobRunner, JobExecution, JobLog, DeadLetterItem } from '../services/jobRunner';

interface BackgroundJobMonitorProps {
  agencyId: string;
  jobRunner: JobRunner;
}

export function BackgroundJobMonitor({ agencyId, jobRunner }: BackgroundJobMonitorProps) {
  const [executions, setExecutions] = useState<JobExecution[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);
  const [logs, setLogs] = useState<JobLog[]>([]);
  const [deadLetterQueue, setDeadLetterQueue] = useState<DeadLetterItem[]>([]);
  const [activeTab, setActiveTab] = useState<'executions' | 'logs' | 'dead-letter'>('executions');
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const loadExecutions = async () => {
    try {
      const data = await jobRunner.getExecutionHistory();
      setExecutions(data);
    } catch (error) {
      console.error('Error loading executions:', error);
    }
  };

  const loadLogs = async (executionId: string) => {
    try {
      const data = await jobRunner.getJobLogs(executionId);
      setLogs(data);
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const loadDeadLetterQueue = async () => {
    try {
      const data = await jobRunner.getDeadLetterQueue(false);
      setDeadLetterQueue(data);
    } catch (error) {
      console.error('Error loading dead letter queue:', error);
    }
  };

  useEffect(() => {
    loadExecutions();
    loadDeadLetterQueue();

    if (autoRefresh) {
      const interval = setInterval(() => {
        loadExecutions();
        loadDeadLetterQueue();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  useEffect(() => {
    if (selectedExecution) {
      loadLogs(selectedExecution);
    }
  }, [selectedExecution]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'retrying': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-50 border-red-200 text-red-900';
      case 'warn': return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-900';
      case 'debug': return 'bg-gray-50 border-gray-200 text-gray-700';
      default: return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Background Job Monitor</h1>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            Auto-refresh (5s)
          </label>
          <button
            onClick={() => {
              loadExecutions();
              loadDeadLetterQueue();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Refresh Now
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <div className="flex gap-2 p-2">
            <button
              onClick={() => setActiveTab('executions')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'executions'
                  ? 'bg-blue-100 text-blue-900'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Executions ({executions.length})
            </button>
            <button
              onClick={() => setActiveTab('logs')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'logs'
                  ? 'bg-blue-100 text-blue-900'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              disabled={!selectedExecution}
            >
              Logs ({logs.length})
            </button>
            <button
              onClick={() => setActiveTab('dead-letter')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'dead-letter'
                  ? 'bg-blue-100 text-blue-900'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              Dead Letter Queue ({deadLetterQueue.length})
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'executions' && (
            <div className="space-y-2">
              {executions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No job executions yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Job Name</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Started</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Duration</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Retries</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {executions.map((execution: any) => (
                        <tr
                          key={execution.execution_id}
                          className={selectedExecution === execution.execution_id ? 'bg-blue-50' : 'hover:bg-gray-50'}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            {execution.job_name}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {execution.job_type}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(execution.status)}`}>
                              {execution.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {new Date(execution.started_at).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {formatDuration(execution.duration_ms)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {execution.retry_count > 0 && (
                              <span className="text-yellow-700 font-medium">
                                {execution.retry_count} / {execution.max_retries}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => {
                                setSelectedExecution(execution.execution_id);
                                setActiveTab('logs');
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              View Logs
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="space-y-2">
              {!selectedExecution ? (
                <div className="text-center py-12 text-gray-500">
                  Select an execution to view logs
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No logs for this execution
                </div>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className={`p-4 rounded-lg border ${getLogLevelColor(log.log_level)}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold uppercase">{log.log_level}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(log.logged_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-sm font-medium">{log.message}</div>
                          {log.metadata && Object.keys(log.metadata).length > 0 && (
                            <details className="mt-2">
                              <summary className="text-xs text-gray-600 cursor-pointer">Metadata</summary>
                              <pre className="mt-2 text-xs bg-white bg-opacity-50 p-2 rounded overflow-auto">
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'dead-letter' && (
            <div className="space-y-4">
              {deadLetterQueue.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No failed jobs in dead letter queue
                </div>
              ) : (
                <div className="space-y-3">
                  {deadLetterQueue.map((item) => (
                    <div key={item.id} className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-red-900 mb-1">
                            {item.job_type}
                          </div>
                          <div className="text-sm text-red-800 mb-2">
                            {item.failure_reason}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-red-700">
                            <span>Retry Attempts: {item.retry_attempts}</span>
                            <span>First Failed: {new Date(item.first_failed_at).toLocaleString()}</span>
                            <span>Last Failed: {new Date(item.last_failed_at).toLocaleString()}</span>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            const notes = prompt('Enter resolution notes:');
                            if (notes) {
                              await jobRunner.resolveDeadLetterItem(item.id, notes);
                              loadDeadLetterQueue();
                            }
                          }}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Resolve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
