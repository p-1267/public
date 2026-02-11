import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface WP7BackgroundJobsAcceptanceProps {
  agencyId: string;
}

export function WP7BackgroundJobsAcceptance({ agencyId }: WP7BackgroundJobsAcceptanceProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [setupComplete, setSetupComplete] = useState(false);
  const [executions, setExecutions] = useState<any[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const setupJobs = async () => {
    setLoading(true);
    addLog('Setting up WP7 jobs for acceptance test...');

    try {
      const jobTypes = [
        { name: 'daily_recurring_tasks', type: 'recurring_tasks', cron: '0 6 * * *' },
        { name: 'reminder_escalation', type: 'reminders', cron: '*/15 * * * *' },
        { name: 'daily_aggregation', type: 'aggregation', cron: '0 0 * * *' },
        { name: 'report_scheduling', type: 'reports', cron: '0 7 * * *' },
      ];

      for (const job of jobTypes) {
        const { error } = await supabase.rpc('register_job', {
          p_agency_id: agencyId,
          p_job_name: job.name,
          p_job_type: job.type,
          p_schedule_cron: job.cron,
          p_config: {},
          p_enabled: true
        });

        if (error) {
          addLog(`❌ Error registering ${job.name}: ${error.message}`);
        } else {
          addLog(`✓ Registered: ${job.name}`);
        }
      }

      setSetupComplete(true);
      addLog('✅ Job setup complete');
    } catch (error: any) {
      addLog(`❌ Setup error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const triggerServerSideRunner = async () => {
    setLoading(true);
    addLog('');
    addLog('Triggering server-side job runner...');

    try {
      const { data, error } = await supabase.rpc('trigger_job_runner');

      if (error) {
        addLog(`❌ Error: ${error.message}`);
      } else {
        addLog(`✅ Runner executed: ${data.jobs_run} jobs run, ${data.jobs_skipped} skipped, ${data.jobs_failed} failed`);
        if (data.results && data.results.length > 0) {
          data.results.forEach((r: any) => {
            addLog(`  - ${r.job_name}: ${r.status}`);
          });
        }
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkExecutions = async () => {
    addLog('Checking job executions...');

    try {
      const { data, error } = await supabase
        .from('job_executions')
        .select('*')
        .eq('agency_id', agencyId)
        .order('started_at', { ascending: false })
        .limit(20);

      if (error) {
        addLog(`❌ Error querying executions: ${error.message}`);
      } else {
        setExecutions(data || []);
        const pgCronExecs = (data || []).filter((e: any) => e.runner_identity === 'pg_cron');
        const systemExecs = (data || []).filter((e: any) => e.runner_identity === 'system' || e.runner_identity === 'pg_cron');

        addLog(`✓ Found ${data?.length || 0} total executions`);
        addLog(`  - pg_cron executions: ${pgCronExecs.length}`);
        addLog(`  - system executions: ${systemExecs.length}`);
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    }
  };

  const runVerifier = async () => {
    setLoading(true);
    setResult(null);
    addLog('');
    addLog('='.repeat(60));
    addLog('🔬 RUNNING WP7 TRUTH-ENFORCED VERIFIER');
    addLog('='.repeat(60));

    try {
      const { data, error } = await supabase.rpc('verify_wp7_background_jobs', {
        p_agency_id: agencyId
      });

      if (error) {
        addLog(`❌ Verifier error: ${error.message}`);
        setResult({ status: 'ERROR', error: error.message });
      } else {
        setResult(data);

        addLog('');
        addLog(`Status: ${data.status}`);
        addLog(`Tests: ${data.passed}/${data.total_tests} passed (${data.pass_rate}%)`);
        addLog('');

        data.tests.forEach((test: any) => {
          const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⏭️';
          addLog(`${icon} ${test.test}: ${test.status}`);

          if (test.evidence) {
            const evidenceStr = JSON.stringify(test.evidence, null, 2)
              .split('\n')
              .map(line => '     ' + line)
              .join('\n');
            addLog(evidenceStr);
          }

          if (test.reason) {
            addLog(`     Reason: ${test.reason}`);
          }
          addLog('');
        });

        addLog('='.repeat(60));
        addLog(data.status === 'PASS' ? '✅ WP7 ACCEPTANCE: PASS' : '⚠️ WP7 ACCEPTANCE: PARTIAL');
        addLog('='.repeat(60));
      }
    } catch (error: any) {
      addLog(`❌ Exception: ${error.message}`);
      setResult({ status: 'ERROR', error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 text-white p-8 rounded-xl shadow-lg">
        <h1 className="text-4xl font-bold mb-2">WP7: BACKGROUND JOBS & AUTOMATION</h1>
        <p className="text-purple-100 text-lg mb-4">
          Truth-Enforced Acceptance Test
        </p>
        <div className="bg-purple-900 bg-opacity-50 p-4 rounded-lg text-sm">
          <p className="font-semibold mb-2">Acceptance Criteria:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Jobs execute server-side (runner_identity = 'pg_cron')</li>
            <li>Recurring generation is idempotent</li>
            <li>Reminder/escalation updates priorities</li>
            <li>Aggregation matches raw truth</li>
            <li>Scheduling creates report logs</li>
            <li>Retry & DLQ functionality proven</li>
            <li>Job locks prevent concurrent runs</li>
            <li>Complete observability</li>
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Control Panel</h2>

        <div className="flex gap-3 flex-wrap">
          <button
            onClick={setupJobs}
            disabled={setupComplete || loading}
            className={`px-6 py-3 rounded-lg font-medium ${
              setupComplete
                ? 'bg-green-100 text-green-800 cursor-not-allowed'
                : loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {setupComplete ? '✓ Jobs Registered' : '1. Setup Jobs'}
          </button>

          <button
            onClick={triggerServerSideRunner}
            disabled={!setupComplete || loading}
            className={`px-6 py-3 rounded-lg font-medium ${
              !setupComplete || loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            2. Trigger Server-Side Runner
          </button>

          <button
            onClick={checkExecutions}
            disabled={!setupComplete || loading}
            className={`px-6 py-3 rounded-lg font-medium ${
              !setupComplete || loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            3. Check Executions
          </button>

          <button
            onClick={runVerifier}
            disabled={!setupComplete || loading}
            className={`px-6 py-3 rounded-lg font-medium ${
              !setupComplete || loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}
          >
            {loading ? '⏳ Running...' : '4. Run Verifier'}
          </button>
        </div>
      </div>

      {result && (
        <div className={`rounded-xl shadow-lg border-2 p-6 ${
          result.status === 'PASS'
            ? 'bg-green-50 border-green-500'
            : result.status === 'ERROR'
            ? 'bg-red-50 border-red-500'
            : 'bg-yellow-50 border-yellow-500'
        }`}>
          <h2 className={`text-2xl font-bold mb-4 ${
            result.status === 'PASS'
              ? 'text-green-900'
              : result.status === 'ERROR'
              ? 'text-red-900'
              : 'text-yellow-900'
          }`}>
            {result.status === 'PASS' ? '✅ ACCEPTANCE: PASS' : result.status === 'ERROR' ? '❌ ERROR' : '⚠️ ACCEPTANCE: PARTIAL'}
          </h2>

          {result.tests && (
            <div className="space-y-3">
              {result.tests.map((test: any, i: number) => (
                <div key={i} className={`p-4 rounded-lg border ${
                  test.status === 'PASS'
                    ? 'bg-green-100 border-green-300'
                    : test.status === 'FAIL'
                    ? 'bg-red-100 border-red-300'
                    : 'bg-gray-100 border-gray-300'
                }`}>
                  <div className="flex items-start gap-2">
                    <span className="text-xl">
                      {test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⏭️'}
                    </span>
                    <div className="flex-1">
                      <div className="font-semibold">{test.test}</div>
                      <div className="text-sm mt-1">Status: {test.status}</div>
                      {test.reason && (
                        <div className="text-sm text-gray-700 mt-1">Reason: {test.reason}</div>
                      )}
                      {test.evidence && (
                        <details className="mt-2">
                          <summary className="text-sm text-gray-600 cursor-pointer">Evidence</summary>
                          <pre className="mt-2 text-xs bg-white bg-opacity-50 p-2 rounded overflow-auto">
                            {JSON.stringify(test.evidence, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded">
              <div className="font-semibold text-red-900">Error:</div>
              <div className="text-sm text-red-800">{result.error}</div>
            </div>
          )}
        </div>
      )}

      {executions.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Executions</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Runner</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Started</th>
                  <th className="px-3 py-2 text-left">Duration</th>
                  <th className="px-3 py-2 text-left">Retries</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {executions.map((exec) => (
                  <tr key={exec.id}>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        exec.runner_identity === 'pg_cron'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {exec.runner_identity}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        exec.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : exec.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {exec.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">{new Date(exec.started_at).toLocaleString()}</td>
                    <td className="px-3 py-2 text-xs">{exec.duration_ms ? `${exec.duration_ms}ms` : '-'}</td>
                    <td className="px-3 py-2 text-xs">{exec.retry_count > 0 ? exec.retry_count : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-gray-900 rounded-xl shadow-lg p-6 text-green-400 font-mono text-sm max-h-96 overflow-y-auto">
        {logs.map((log, i) => (
          <div key={i}>{log}</div>
        ))}
        {logs.length === 0 && (
          <div className="text-gray-500 text-center py-8">
            Logs will appear here...
          </div>
        )}
      </div>
    </div>
  );
}
