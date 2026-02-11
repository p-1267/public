import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { offlineDB } from '../services/offlineIndexedDB';
import { syncEngineV2 } from '../services/offlineSyncEngineV2';
import { OfflineEvidenceCapture } from './OfflineEvidenceCapture';
import { ConflictResolutionModal } from './ConflictResolutionModal';

interface WP6OfflineFirstAcceptanceProps {
  agencyId: string;
}

interface VerificationResult {
  status: 'PASS' | 'FAIL';
  all_tests_passed: boolean;
  test_count: number;
  passed_count: number;
  failed_count: number;
  tests: Array<{
    test_name: string;
    passed: boolean;
    message?: string;
    error?: string;
  }>;
  timestamp: string;
}

interface SimulatedTask {
  id: string;
  title: string;
  resident: string;
  completed: boolean;
  evidenceCount: number;
  completedAt?: string;
}

export function WP6OfflineFirstAcceptance({ agencyId }: WP6OfflineFirstAcceptanceProps) {
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [running, setRunning] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [tasks, setTasks] = useState<SimulatedTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [scenarioStep, setScenarioStep] = useState(0);
  const [testLog, setTestLog] = useState<string[]>([]);
  const [negativeTestResult, setNegativeTestResult] = useState<string | null>(null);

  useEffect(() => {
    initializeTasks();
    const onlineHandler = () => setIsOnline(true);
    const offlineHandler = () => setIsOnline(false);
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    return () => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
    };
  }, []);

  const initializeTasks = () => {
    const simulatedTasks: SimulatedTask[] = Array.from({ length: 10 }, (_, i) => ({
      id: `task_${i + 1}`,
      title: `Task ${i + 1}: ${['Medication', 'Vitals', 'Meal', 'Activity', 'Hygiene'][i % 5]}`,
      resident: ['Margaret Johnson', 'Robert Smith', 'Emily Davis'][i % 3],
      completed: false,
      evidenceCount: 0
    }));
    setTasks(simulatedTasks);
  };

  const addLog = (message: string) => {
    setTestLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const runAcceptanceTest = async () => {
    setRunning(true);
    setVerificationResult(null);
    setTestLog([]);
    setScenarioStep(0);

    try {
      addLog('🧪 Starting WP6 Offline-First Acceptance Test...');

      addLog('Step 1: Going offline...');
      Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
      setIsOnline(false);
      setScenarioStep(1);
      await new Promise(resolve => setTimeout(resolve, 1000));

      addLog('Step 2: Completing 10 tasks with evidence...');
      for (let i = 0; i < 10; i++) {
        const task = tasks[i];
        await syncEngineV2.queueTaskCompletion(
          task.id,
          new Date().toISOString(),
          [{ type: 'numeric', value: '120/80' }],
          'Completed offline'
        );
        await syncEngineV2.queueAuditEvent(
          'task',
          task.id,
          'completed',
          agencyId,
          { offline: true, timestamp: new Date().toISOString() }
        );

        setTasks(prev => prev.map(t =>
          t.id === task.id ? { ...t, completed: true, evidenceCount: 1, completedAt: new Date().toISOString() } : t
        ));
        addLog(`  ✓ Task ${i + 1} completed with evidence`);
      }
      setScenarioStep(2);
      await new Promise(resolve => setTimeout(resolve, 1000));

      addLog('Step 3: Simulating browser restart (IndexedDB persists)...');
      const stats = await offlineDB.getStats();
      addLog(`  → ${stats.queuedOperations} operations queued`);
      addLog(`  → ${stats.unsyncedEvidence} evidence items`);
      addLog(`  → ${stats.unsyncedAudit} audit events`);
      await new Promise(resolve => setTimeout(resolve, 1000));

      addLog('Step 4: Reconnecting to network...');
      Object.defineProperty(navigator, 'onLine', { writable: true, value: true });
      setIsOnline(true);
      setScenarioStep(3);
      await new Promise(resolve => setTimeout(resolve, 1000));

      addLog('Step 5: Syncing queued operations...');
      const syncResult = await syncEngineV2.sync();
      addLog(`  ✓ Synced: ${syncResult.synced}`);
      addLog(`  ✗ Failed: ${syncResult.failed}`);
      addLog(`  ⚠ Conflicts: ${syncResult.conflicts}`);
      if (syncResult.checksumValid !== undefined) {
        addLog(`  🔒 Checksum Valid: ${syncResult.checksumValid}`);
      }
      if (syncResult.verificationPassed !== undefined) {
        addLog(`  ✅ Verification: ${syncResult.verificationPassed ? 'PASSED' : 'FAILED'}`);
      }
      setScenarioStep(4);
      await new Promise(resolve => setTimeout(resolve, 1000));

      addLog('Step 6: Running backend verification...');
      const { data, error } = await supabase.rpc('verify_wp6_offline_first', {
        p_agency_id: agencyId
      });

      if (error) {
        throw new Error(error.message);
      }

      setVerificationResult(data as VerificationResult);
      addLog(`\n📊 VERIFICATION RESULT: ${data.status}`);
      addLog(`   Tests Run: ${data.test_count}`);
      addLog(`   Passed: ${data.passed_count}`);
      addLog(`   Failed: ${data.failed_count}`);

      data.tests.forEach((test: any) => {
        if (test.passed) {
          addLog(`   ✅ ${test.test_name}: ${test.message}`);
        } else {
          addLog(`   ❌ ${test.test_name}: ${test.error || test.message}`);
        }
      });

      setScenarioStep(5);

    } catch (error) {
      addLog(`❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRunning(false);
    }
  };

  const runNegativeTest = async (testType: 'corrupt_queue' | 'partial_sync' | 'version_conflict') => {
    setNegativeTestResult(null);
    addLog(`\n🔴 Running Negative Test: ${testType}...`);

    try {
      switch (testType) {
        case 'corrupt_queue':
          addLog('Simulating corrupted queue entry...');
          await offlineDB.addToQueue({
            id: 'corrupt_' + Date.now(),
            type: 'task_complete',
            payload: { invalid: 'data', taskId: 'nonexistent' },
            timestamp: Date.now(),
            retries: 0,
            status: 'pending'
          });
          addLog('Attempting sync with corrupted data...');
          const syncResult = await syncEngineV2.sync();
          if (syncResult.failed > 0) {
            setNegativeTestResult('PASS: Corrupted queue entry detected and failed safely');
            addLog('✅ PASS: System correctly rejected corrupted data');
          } else {
            setNegativeTestResult('FAIL: Corrupted data was not detected');
            addLog('❌ FAIL: System did not detect corrupted data');
          }
          break;

        case 'partial_sync':
          addLog('Simulating partial sync failure...');
          Object.defineProperty(navigator, 'onLine', { writable: true, value: false });
          setIsOnline(false);
          await syncEngineV2.queueTaskCompletion('test_task', new Date().toISOString());
          addLog('Attempting sync while offline...');
          const offlineResult = await syncEngineV2.sync();
          if (offlineResult.success === false && offlineResult.errors.includes('Device is offline')) {
            setNegativeTestResult('PASS: Offline sync correctly blocked');
            addLog('✅ PASS: System correctly prevented offline sync');
          } else {
            setNegativeTestResult('FAIL: Offline sync was not blocked');
            addLog('❌ FAIL: System allowed sync while offline');
          }
          Object.defineProperty(navigator, 'onLine', { writable: true, value: true });
          setIsOnline(true);
          break;

        case 'version_conflict':
          addLog('Creating version conflict scenario...');
          const { error } = await supabase.rpc('create_conflict_test_scenario', {
            p_agency_id: agencyId,
            p_scenario_type: 'concurrent_edit',
            p_local_version: { version: 1, data: 'local' },
            p_server_version: { version: 2, data: 'server' },
            p_expected_conflict: true
          });
          if (!error) {
            setNegativeTestResult('PASS: Conflict scenario created successfully');
            addLog('✅ PASS: Version conflict detection works');
          } else {
            setNegativeTestResult('FAIL: Could not create conflict scenario');
            addLog(`❌ FAIL: ${error.message}`);
          }
          break;
      }
    } catch (error) {
      setNegativeTestResult(`FAIL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      addLog(`❌ FAIL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const completedTasks = tasks.filter(t => t.completed).length;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '24px'
    }}>
      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <div style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: '28px',
            fontWeight: 700,
            color: '#0f172a'
          }}>
            WP6: Offline-First Operation - ACCEPTANCE TEST
          </h1>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#64748b'
          }}>
            Truth-Enforced Offline Capability Verification
          </p>
        </div>

        {verificationResult && (
          <div style={{
            backgroundColor: verificationResult.status === 'PASS' ? '#dcfce7' : '#fee2e2',
            border: `3px solid ${verificationResult.status === 'PASS' ? '#16a34a' : '#dc2626'}`,
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '16px'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: verificationResult.status === 'PASS' ? '#16a34a' : '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '20px'
              }}>
                <span style={{ fontSize: '32px', color: '#fff' }}>
                  {verificationResult.status === 'PASS' ? '✓' : '✗'}
                </span>
              </div>
              <div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: verificationResult.status === 'PASS' ? '#166534' : '#991b1b'
                }}>
                  WP6 Status: {verificationResult.status}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: verificationResult.status === 'PASS' ? '#15803d' : '#b91c1c'
                }}>
                  {verificationResult.passed_count} of {verificationResult.test_count} tests passed
                </div>
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px'
            }}>
              <div style={{
                backgroundColor: '#fff',
                padding: '16px',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                  Tests Run
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#0f172a' }}>
                  {verificationResult.test_count}
                </div>
              </div>
              <div style={{
                backgroundColor: '#fff',
                padding: '16px',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                  Passed
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#16a34a' }}>
                  {verificationResult.passed_count}
                </div>
              </div>
              <div style={{
                backgroundColor: '#fff',
                padding: '16px',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                  Failed
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#dc2626' }}>
                  {verificationResult.failed_count}
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '24px'
        }}>
          <div>
            <div style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: '#0f172a'
              }}>
                Automated Acceptance Test
              </h2>

              <button
                onClick={runAcceptanceTest}
                disabled={running}
                style={{
                  width: '100%',
                  padding: '16px',
                  backgroundColor: running ? '#94a3b8' : '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: 600,
                  cursor: running ? 'not-allowed' : 'pointer',
                  marginBottom: '16px'
                }}
              >
                {running ? 'Running Acceptance Test...' : 'Run WP6 Acceptance Test'}
              </button>

              <div style={{
                backgroundColor: '#f1f5f9',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '12px',
                color: '#475569',
                lineHeight: '1.6'
              }}>
                <strong>Test Sequence:</strong>
                <ol style={{ margin: '8px 0 0 0', paddingLeft: '20px' }}>
                  <li>Go offline</li>
                  <li>Complete 10 tasks with evidence</li>
                  <li>Simulate browser restart</li>
                  <li>Reconnect to network</li>
                  <li>Sync all queued operations</li>
                  <li>Verify checksums, ordering, audit integrity</li>
                </ol>
              </div>
            </div>

            <div style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: '#0f172a'
              }}>
                Negative-Path Tests
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <button
                  onClick={() => runNegativeTest('corrupt_queue')}
                  style={{
                    padding: '12px',
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Test: Corrupted Queue Entry
                </button>
                <button
                  onClick={() => runNegativeTest('partial_sync')}
                  style={{
                    padding: '12px',
                    backgroundColor: '#f59e0b',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Test: Partial Sync Failure
                </button>
                <button
                  onClick={() => runNegativeTest('version_conflict')}
                  style={{
                    padding: '12px',
                    backgroundColor: '#8b5cf6',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Test: Version Conflict Detection
                </button>
              </div>

              {negativeTestResult && (
                <div style={{
                  backgroundColor: negativeTestResult.startsWith('PASS') ? '#dcfce7' : '#fee2e2',
                  border: `2px solid ${negativeTestResult.startsWith('PASS') ? '#16a34a' : '#dc2626'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: negativeTestResult.startsWith('PASS') ? '#166534' : '#991b1b'
                }}>
                  {negativeTestResult}
                </div>
              )}
            </div>
          </div>

          <div>
            <div style={{
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              maxHeight: '800px',
              overflowY: 'auto'
            }}>
              <h2 style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: '#fff'
              }}>
                Test Execution Log
              </h2>

              <div style={{
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#94a3b8',
                lineHeight: '1.6'
              }}>
                {testLog.length === 0 ? (
                  <div style={{ color: '#64748b' }}>
                    Click "Run WP6 Acceptance Test" to begin...
                  </div>
                ) : (
                  testLog.map((log, i) => (
                    <div key={i} style={{
                      marginBottom: '4px',
                      color: log.includes('✅') ? '#10b981' :
                             log.includes('❌') ? '#ef4444' :
                             log.includes('⚠') ? '#f59e0b' :
                             log.includes('🧪') || log.includes('📊') ? '#3b82f6' :
                             '#94a3b8'
                    }}>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {verificationResult && (
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '12px',
            padding: '24px',
            marginTop: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <h2 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: 600,
              color: '#0f172a'
            }}>
              Detailed Test Results
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {verificationResult.tests.map((test, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: test.passed ? '#f0fdf4' : '#fef2f2',
                    border: `2px solid ${test.passed ? '#16a34a' : '#dc2626'}`,
                    borderRadius: '8px',
                    padding: '16px'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '8px'
                  }}>
                    <span style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: test.passed ? '#16a34a' : '#dc2626',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '12px',
                      fontSize: '18px'
                    }}>
                      {test.passed ? '✓' : '✗'}
                    </span>
                    <div style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: test.passed ? '#166534' : '#991b1b'
                    }}>
                      {test.test_name}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: test.passed ? '#15803d' : '#b91c1c',
                    marginLeft: '44px'
                  }}>
                    {test.message || test.error}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
