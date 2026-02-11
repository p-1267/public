import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface WP8ExternalIntegrationsAcceptanceProps {
  agencyId: string;
}

export function WP8ExternalIntegrationsAcceptance({ agencyId }: WP8ExternalIntegrationsAcceptanceProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [setupComplete, setSetupComplete] = useState(false);
  const [providers, setProviders] = useState<any[]>([]);
  const [integrationRequests, setIntegrationRequests] = useState<any[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const setupProviders = async () => {
    setLoading(true);
    addLog('Setting up integration providers...');

    try {
      const providerConfigs = [
        { type: 'voice_transcription', name: 'openai-whisper', config: { model: 'whisper-1' } },
        { type: 'sms', name: 'twilio', config: { from: '+1234567890' } },
        { type: 'email', name: 'sendgrid', config: { from: 'noreply@ageempower.example' } },
        { type: 'translation', name: 'google-translate', config: { api_version: 'v3' } },
        { type: 'device', name: 'device-webhook', config: { endpoint: '/api/device-data' } },
      ];

      for (const config of providerConfigs) {
        const { data, error } = await supabase.rpc('register_integration_provider', {
          p_agency_id: agencyId,
          p_provider_type: config.type,
          p_provider_name: config.name,
          p_config: config.config,
          p_enabled: true
        });

        if (error) {
          addLog(`❌ Error registering ${config.name}: ${error.message}`);
        } else {
          addLog(`✓ Registered: ${config.name} (${config.type})`);
        }
      }

      await loadProviders();
      setSetupComplete(true);
      addLog('✅ Provider setup complete');
    } catch (error: any) {
      addLog(`❌ Setup error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    const { data, error } = await supabase
      .from('integration_providers')
      .select('*')
      .eq('agency_id', agencyId)
      .order('created_at', { ascending: false });

    if (error) {
      addLog(`❌ Error loading providers: ${error.message}`);
    } else {
      setProviders(data || []);
      addLog(`✓ Loaded ${data?.length || 0} providers`);
    }
  };

  const testVoiceTranscription = async () => {
    setLoading(true);
    addLog('');
    addLog('Testing voice transcription (REAL async job)...');

    try {
      const { data, error } = await supabase.rpc('submit_voice_transcription', {
        p_agency_id: agencyId,
        p_audio_storage_path: 'test-audio/sample.mp3',
        p_audio_filename: 'sample.mp3',
        p_audio_duration: 15.5,
        p_audio_size_bytes: 245760
      });

      if (error) {
        addLog(`❌ Error: ${error.message}`);
      } else {
        addLog(`✅ Voice job submitted: ${data.job_id}`);
        addLog(`   Status: ${data.status}`);
        addLog(`   Note: In production, edge function would call OpenAI Whisper API`);
        addLog(`   Note: Job would poll for completion and store provider transcript`);
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testNotificationQueue = async () => {
    setLoading(true);
    addLog('');
    addLog('Testing notification queue (REAL delivery tracking)...');

    try {
      const { data, error } = await supabase.rpc('queue_notification', {
        p_agency_id: agencyId,
        p_notification_type: 'sms',
        p_recipient_id: null,
        p_recipient_contact: '+15551234567',
        p_body: 'Test notification from AgeEmpower',
        p_template_id: 'test_template'
      });

      if (error) {
        addLog(`❌ Error: ${error.message}`);
      } else {
        addLog(`✅ Notification queued: ${data.delivery_id}`);
        addLog(`   Status: ${data.status}`);
        addLog(`   Note: In production, edge function would call Twilio API`);
        addLog(`   Note: Provider message ID would be stored for tracking`);
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testDeviceDataIngestion = async () => {
    setLoading(true);
    addLog('');
    addLog('Testing device data ingestion (REAL vitals creation)...');

    try {
      const { data: residents } = await supabase
        .from('residents')
        .select('id')
        .eq('agency_id', agencyId)
        .limit(1);

      if (!residents || residents.length === 0) {
        addLog('❌ No residents found. Create a resident first.');
        setLoading(false);
        return;
      }

      const devicePayload = {
        device_type: 'fitness_tracker',
        timestamp: new Date().toISOString(),
        heart_rate: 72,
        blood_pressure: { systolic: 120, diastolic: 80 },
        temperature: 98.6,
        steps: 5432
      };

      const { data, error } = await supabase.rpc('ingest_device_data', {
        p_agency_id: agencyId,
        p_device_id: null,
        p_resident_id: residents[0].id,
        p_raw_payload: devicePayload,
        p_payload_format: 'json'
      });

      if (error) {
        addLog(`❌ Error: ${error.message}`);
      } else {
        if (data.success) {
          addLog(`✅ Device data staged: ${data.staging_id}`);
          addLog(`   Payload: heart_rate=72, bp=120/80, temp=98.6F`);

          const { data: processData } = await supabase.rpc('process_device_data_to_vitals', {
            p_staging_id: data.staging_id
          });

          if (processData) {
            addLog(`✅ Processed: ${processData.vitals_created} vitals created`);
            addLog(`   Note: Real payload → staging → normalized vitals`);
          }
        } else {
          addLog(`⚠️ ${data.reason}: ${data.existing_staging_id || 'N/A'}`);
        }
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testProviderFailure = async () => {
    setLoading(true);
    addLog('');
    addLog('Testing provider failure visibility...');

    try {
      if (providers.length === 0) {
        addLog('❌ No providers configured');
        setLoading(false);
        return;
      }

      const provider = providers[0];
      addLog(`Simulating failure for: ${provider.provider_name}`);

      const { data, error } = await supabase.rpc('simulate_provider_failure', {
        p_provider_id: provider.id,
        p_fail: true
      });

      if (error) {
        addLog(`❌ Error: ${error.message}`);
      } else {
        addLog(`✅ Provider marked as failed: ${provider.provider_name}`);
        addLog(`   Health status: ${data.health_status}`);
        addLog(`   Note: UI should show red/degraded state`);

        await loadProviders();
      }
    } catch (error: any) {
      addLog(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const checkIntegrationRequests = async () => {
    addLog('Checking integration request ledger...');

    try {
      const { data, error } = await supabase
        .from('integration_requests')
        .select('*')
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        addLog(`❌ Error: ${error.message}`);
      } else {
        setIntegrationRequests(data || []);
        addLog(`✓ Found ${data?.length || 0} integration requests`);

        if (data && data.length > 0) {
          const withLatency = data.filter(r => r.latency_ms != null).length;
          const failed = data.filter(r => r.response_status >= 400 || r.error_message).length;
          addLog(`   - With latency tracking: ${withLatency}/${data.length}`);
          addLog(`   - Failed requests: ${failed}`);
        }
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
    addLog('🔬 RUNNING WP8 TRUTH-ENFORCED VERIFIER');
    addLog('='.repeat(60));

    try {
      const { data, error } = await supabase.rpc('verify_wp8_external_integrations', {
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

        addLog('Summary:');
        addLog(`  - Voice jobs: ${data.summary.voice_jobs}`);
        addLog(`  - Notifications: ${data.summary.notifications}`);
        addLog(`  - Device payloads: ${data.summary.device_payloads}`);
        addLog(`  - Integration requests: ${data.summary.integration_requests}`);
        addLog(`  - Providers configured: ${data.summary.providers_configured}`);
        addLog('');

        data.tests.forEach((test: any) => {
          const icon = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⏭️';
          addLog(`${icon} ${test.test}: ${test.status}`);

          if (test.evidence) {
            const evidenceStr = JSON.stringify(test.evidence, null, 2)
              .split('\n')
              .slice(0, 5)
              .map(line => '     ' + line)
              .join('\n');
            addLog(evidenceStr);
          }

          if (test.reason) {
            addLog(`     Reason: ${test.reason}`);
          }
          if (test.note) {
            addLog(`     Note: ${test.note}`);
          }
          addLog('');
        });

        addLog('='.repeat(60));
        if (data.status === 'PASS') {
          addLog('✅ WP8 ACCEPTANCE: PASS');
        } else if (data.status === 'PARTIAL') {
          addLog('⚠️ WP8 ACCEPTANCE: PARTIAL (some tests skipped)');
        } else {
          addLog('❌ WP8 ACCEPTANCE: FAIL');
        }
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
      <div className="bg-red-600 border-4 border-red-800 text-white p-6 rounded-xl shadow-lg mb-4">
        <div className="flex items-start gap-4">
          <div className="text-4xl">⚠️</div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">WP8 STATUS: FRAMEWORK IMPLEMENTED - NOT ACCEPTED</h2>
            <p className="text-red-100 mb-2">
              This page tests the integration <strong>FRAMEWORK</strong>, not real external calls.
            </p>
            <p className="text-red-100 font-semibold">
              WP8 is BLOCKED from acceptance until:
            </p>
            <ul className="list-disc list-inside text-red-100 text-sm mt-2 space-y-1">
              <li>Edge Functions deployed (voice-transcription, send-sms, send-email)</li>
              <li>API keys configured (OpenAI, Twilio, SendGrid)</li>
              <li>Real provider calls executed and proven</li>
              <li>Provider IDs + latency recorded from real responses</li>
              <li>Verifier returns PASS (not SKIP) with real evidence</li>
            </ul>
            <p className="text-yellow-300 font-bold mt-3 text-lg">
              Until then: Framework exists, but NO REAL CALLS = NOT ACCEPTED
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 rounded-xl shadow-lg">
        <h1 className="text-4xl font-bold mb-2">WP8: EXTERNAL INTEGRATIONS (Framework Test)</h1>
        <p className="text-blue-100 text-lg mb-4">
          Integration Framework Verification (Edge Functions Required for Acceptance)
        </p>
        <div className="bg-blue-900 bg-opacity-50 p-4 rounded-lg text-sm">
          <p className="font-semibold mb-2">Full Acceptance Requires:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Voice transcription produces non-empty transcript from provider (OpenAI)</li>
            <li>SMS/email delivery status recorded from provider (Twilio/SendGrid)</li>
            <li>Device payload creates vitals entries (real webhook)</li>
            <li>Provider failure produces visible error (no silent fallback)</li>
            <li>No stubbed code paths detected (all latency measured)</li>
            <li>Integration health states reflect reality (not simulated)</li>
          </ul>
          <p className="mt-3 font-semibold text-yellow-300">
            ⚠️ ANY stubbed or mocked integration INVALIDATES acceptance
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 space-y-4">
        <h2 className="text-2xl font-bold text-gray-900">Control Panel</h2>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={setupProviders}
            disabled={setupComplete || loading}
            className={`px-6 py-3 rounded-lg font-medium ${
              setupComplete
                ? 'bg-green-100 text-green-800 cursor-not-allowed'
                : loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {setupComplete ? '✓ Providers Registered' : '1. Setup Providers'}
          </button>

          <button
            onClick={testVoiceTranscription}
            disabled={!setupComplete || loading}
            className={`px-6 py-3 rounded-lg font-medium ${
              !setupComplete || loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700'
            }`}
          >
            2. Test Voice Transcription
          </button>

          <button
            onClick={testNotificationQueue}
            disabled={!setupComplete || loading}
            className={`px-6 py-3 rounded-lg font-medium ${
              !setupComplete || loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            3. Test Notifications
          </button>

          <button
            onClick={testDeviceDataIngestion}
            disabled={!setupComplete || loading}
            className={`px-6 py-3 rounded-lg font-medium ${
              !setupComplete || loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-teal-600 text-white hover:bg-teal-700'
            }`}
          >
            4. Test Device Ingestion
          </button>

          <button
            onClick={testProviderFailure}
            disabled={!setupComplete || loading}
            className={`px-6 py-3 rounded-lg font-medium ${
              !setupComplete || loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            5. Test Provider Failure
          </button>

          <button
            onClick={checkIntegrationRequests}
            disabled={!setupComplete || loading}
            className={`px-6 py-3 rounded-lg font-medium ${
              !setupComplete || loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            6. Check Request Ledger
          </button>

          <button
            onClick={runVerifier}
            disabled={!setupComplete || loading}
            className={`col-span-2 px-6 py-3 rounded-lg font-medium ${
              !setupComplete || loading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-orange-600 text-white hover:bg-orange-700'
            }`}
          >
            {loading ? '⏳ Running...' : '7. Run Verifier'}
          </button>
        </div>
      </div>

      {providers.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Configured Providers</h2>
          <div className="space-y-2">
            {providers.map((provider) => (
              <div key={provider.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{provider.provider_name}</div>
                  <div className="text-sm text-gray-600">{provider.provider_type}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-xs rounded-full ${
                    provider.health_status === 'healthy'
                      ? 'bg-green-100 text-green-800'
                      : provider.health_status === 'failed'
                      ? 'bg-red-100 text-red-800'
                      : provider.health_status === 'degraded'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {provider.health_status}
                  </span>
                  <span className={`px-3 py-1 text-xs rounded-full ${
                    provider.enabled
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {provider.enabled ? 'enabled' : 'disabled'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                      {test.note && (
                        <div className="text-sm text-gray-600 mt-1 italic">{test.note}</div>
                      )}
                      {test.evidence && (
                        <details className="mt-2">
                          <summary className="text-sm text-gray-600 cursor-pointer">Evidence</summary>
                          <pre className="mt-2 text-xs bg-white bg-opacity-50 p-2 rounded overflow-auto max-h-40">
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

      {integrationRequests.length > 0 && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Integration Request Ledger</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Provider</th>
                  <th className="px-3 py-2 text-left">Type</th>
                  <th className="px-3 py-2 text-left">Status</th>
                  <th className="px-3 py-2 text-left">Latency</th>
                  <th className="px-3 py-2 text-left">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {integrationRequests.map((req) => (
                  <tr key={req.id}>
                    <td className="px-3 py-2 text-xs">{req.provider_name}</td>
                    <td className="px-3 py-2 text-xs">{req.request_type}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-1 text-xs rounded ${
                        req.response_status >= 200 && req.response_status < 300
                          ? 'bg-green-100 text-green-800'
                          : req.response_status >= 400
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {req.response_status || 'pending'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">{req.latency_ms ? `${req.latency_ms}ms` : '-'}</td>
                    <td className="px-3 py-2 text-xs">{new Date(req.created_at).toLocaleString()}</td>
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
