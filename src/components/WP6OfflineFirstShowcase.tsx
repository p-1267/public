import { useState, useEffect } from 'react';
import { offlineDB, ConflictRecord } from '../services/offlineIndexedDB';
import { syncEngine, SyncResult } from '../services/offlineSyncEngine';
import { OfflineEvidenceCapture } from './OfflineEvidenceCapture';
import { ConflictResolutionModal } from './ConflictResolutionModal';

interface WP6OfflineFirstShowcaseProps {
  agencyId: string;
}

interface SimulatedTask {
  id: string;
  title: string;
  resident: string;
  completed: boolean;
  evidenceCount: number;
  completedAt?: string;
}

export function WP6OfflineFirstShowcase({ agencyId }: WP6OfflineFirstShowcaseProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [tasks, setTasks] = useState<SimulatedTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<string | null>(null);
  const [stats, setStats] = useState({
    queuedOperations: 0,
    unsyncedEvidence: 0,
    unsyncedAudit: 0,
    unresolvedConflicts: 0
  });
  const [conflicts, setConflicts] = useState<ConflictRecord[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<ConflictRecord | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [scenarioStep, setScenarioStep] = useState(0);

  useEffect(() => {
    initializeTasks();
    loadStats();

    const onlineHandler = () => setIsOnline(true);
    const offlineHandler = () => setIsOnline(false);

    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);

    syncEngine.startAutoSync(10000);

    const unsubscribe = syncEngine.onSyncComplete((result) => {
      setLastSyncResult(result);
      loadStats();
    });

    const statsInterval = setInterval(loadStats, 5000);

    return () => {
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
      syncEngine.stopAutoSync();
      unsubscribe();
      clearInterval(statsInterval);
    };
  }, []);

  const initializeTasks = () => {
    const simulatedTasks: SimulatedTask[] = [
      { id: '1', title: 'Morning Medication', resident: 'Margaret Johnson', completed: false, evidenceCount: 0 },
      { id: '2', title: 'Breakfast Service', resident: 'Margaret Johnson', completed: false, evidenceCount: 0 },
      { id: '3', title: 'Vital Signs Check', resident: 'Robert Smith', completed: false, evidenceCount: 0 },
      { id: '4', title: 'Blood Pressure', resident: 'Robert Smith', completed: false, evidenceCount: 0 },
      { id: '5', title: 'Shower Assistance', resident: 'Emily Davis', completed: false, evidenceCount: 0 },
      { id: '6', title: 'Room Cleaning', resident: 'Emily Davis', completed: false, evidenceCount: 0 },
      { id: '7', title: 'Lunch Service', resident: 'Margaret Johnson', completed: false, evidenceCount: 0 },
      { id: '8', title: 'Activity Participation', resident: 'Robert Smith', completed: false, evidenceCount: 0 },
      { id: '9', title: 'Evening Medication', resident: 'Margaret Johnson', completed: false, evidenceCount: 0 },
      { id: '10', title: 'Bedtime Routine', resident: 'Emily Davis', completed: false, evidenceCount: 0 }
    ];
    setTasks(simulatedTasks);
  };

  const loadStats = async () => {
    const newStats = await offlineDB.getStats();
    setStats(newStats);

    const unresolvedConflicts = await offlineDB.getUnresolvedConflicts();
    setConflicts(unresolvedConflicts);
  };

  const completeTask = async (taskId: string) => {
    const now = new Date().toISOString();

    await syncEngine.queueTaskCompletion(taskId, now);
    await syncEngine.queueAuditEvent(
      'task',
      taskId,
      'completed',
      agencyId,
      { offline: !isOnline, timestamp: now }
    );

    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, completed: true, completedAt: now } : t
    ));

    await loadStats();
  };

  const handleEvidenceCapture = async (taskId: string) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, evidenceCount: t.evidenceCount + 1 } : t
    ));
    await loadStats();
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await syncEngine.sync();
      setLastSyncResult(result);
      await loadStats();
    } finally {
      setSyncing(false);
    }
  };

  const handleResolveConflict = async (conflictId: string, resolution: 'local' | 'server' | 'merged') => {
    await offlineDB.resolveConflict(conflictId, resolution);
    await loadStats();
    setSelectedConflict(null);
  };

  const simulateConflict = async () => {
    const task = tasks.find(t => t.completed);
    if (!task) return;

    const conflict: ConflictRecord = {
      id: `conflict_${Date.now()}`,
      operationId: `task_${task.id}`,
      localVersion: {
        status: 'completed',
        completedAt: task.completedAt,
        evidence: task.evidenceCount,
        notes: 'Completed offline'
      },
      serverVersion: {
        status: 'completed',
        completedAt: new Date(Date.now() - 60000).toISOString(),
        evidence: 0,
        notes: 'Completed by another user'
      },
      timestamp: Date.now(),
      resolved: false
    };

    await offlineDB.addConflict(conflict);
    await loadStats();
  };

  const goOffline = () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: false
    });
    setIsOnline(false);
    setScenarioStep(1);
  };

  const goOnline = () => {
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true
    });
    setIsOnline(true);
    setScenarioStep(3);
  };

  const completedTasks = tasks.filter(t => t.completed).length;
  const totalEvidence = tasks.reduce((sum, t) => sum + t.evidenceCount, 0);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
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
            WP6: Offline-First Operation
          </h1>
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#64748b'
          }}>
            Field-Reality Safe • Survives Browser Restart • Zero Data Loss
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: isOnline ? '#dcfce7' : '#fee2e2',
          border: `2px solid ${isOnline ? '#16a34a' : '#dc2626'}`,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: isOnline ? '#16a34a' : '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '16px'
            }}>
              <span style={{ fontSize: '24px' }}>{isOnline ? '✓' : '✗'}</span>
            </div>
            <div>
              <div style={{
                fontSize: '18px',
                fontWeight: 600,
                color: isOnline ? '#166534' : '#991b1b'
              }}>
                {isOnline ? 'Online' : 'Offline Mode'}
              </div>
              <div style={{
                fontSize: '13px',
                color: isOnline ? '#15803d' : '#b91c1c'
              }}>
                {isOnline ? 'Connected to server' : 'Working offline - all data saved locally'}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={goOffline}
              disabled={!isOnline}
              style={{
                padding: '10px 20px',
                backgroundColor: !isOnline ? '#94a3b8' : '#dc2626',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: !isOnline ? 'not-allowed' : 'pointer'
              }}
            >
              Go Offline
            </button>
            <button
              onClick={goOnline}
              disabled={isOnline}
              style={{
                padding: '10px 20px',
                backgroundColor: isOnline ? '#94a3b8' : '#16a34a',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isOnline ? 'not-allowed' : 'pointer'
              }}
            >
              Go Online
            </button>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            backgroundColor: '#fff',
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#3b82f6',
              marginBottom: '4px'
            }}>
              {completedTasks}/10
            </div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>
              Tasks Completed
            </div>
          </div>

          <div style={{
            backgroundColor: '#fff',
            border: '2px solid #10b981',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#10b981',
              marginBottom: '4px'
            }}>
              {totalEvidence}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>
              Evidence Captured
            </div>
          </div>

          <div style={{
            backgroundColor: '#fff',
            border: '2px solid #f59e0b',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#f59e0b',
              marginBottom: '4px'
            }}>
              {stats.queuedOperations}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>
              Pending Sync
            </div>
          </div>

          <div style={{
            backgroundColor: '#fff',
            border: '2px solid #ef4444',
            borderRadius: '8px',
            padding: '20px'
          }}>
            <div style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#ef4444',
              marginBottom: '4px'
            }}>
              {stats.unresolvedConflicts}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b' }}>
              Conflicts
            </div>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
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
                Daily Tasks
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    style={{
                      backgroundColor: task.completed ? '#f0fdf4' : '#f8fafc',
                      border: `2px solid ${task.completed ? '#10b981' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      padding: '16px'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      marginBottom: '8px'
                    }}>
                      <div>
                        <div style={{
                          fontSize: '15px',
                          fontWeight: 600,
                          color: '#0f172a',
                          marginBottom: '4px'
                        }}>
                          {task.title}
                        </div>
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          {task.resident}
                        </div>
                      </div>
                      {task.completed && (
                        <div style={{
                          padding: '4px 12px',
                          backgroundColor: '#10b981',
                          color: '#fff',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600
                        }}>
                          ✓ Done
                        </div>
                      )}
                    </div>

                    {task.evidenceCount > 0 && (
                      <div style={{
                        fontSize: '12px',
                        color: '#059669',
                        marginBottom: '8px'
                      }}>
                        {task.evidenceCount} evidence item{task.evidenceCount !== 1 ? 's' : ''} captured
                      </div>
                    )}

                    {!task.completed ? (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => setSelectedTask(task.id)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#3b82f6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Add Evidence
                        </button>
                        <button
                          onClick={() => completeTask(task.id)}
                          style={{
                            padding: '8px 16px',
                            backgroundColor: '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Complete Task
                        </button>
                      </div>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Completed at {task.completedAt ? new Date(task.completedAt).toLocaleTimeString() : 'N/A'}
                      </div>
                    )}

                    {selectedTask === task.id && (
                      <div style={{ marginTop: '12px' }}>
                        <OfflineEvidenceCapture
                          taskId={task.id}
                          onCapture={() => handleEvidenceCapture(task.id)}
                        />
                        <button
                          onClick={() => setSelectedTask(null)}
                          style={{
                            marginTop: '8px',
                            padding: '6px 12px',
                            backgroundColor: '#e2e8f0',
                            color: '#475569',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Close
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

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
                Sync Status
              </h2>

              <button
                onClick={handleSync}
                disabled={!isOnline || syncing}
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: !isOnline || syncing ? '#94a3b8' : '#3b82f6',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: !isOnline || syncing ? 'not-allowed' : 'pointer',
                  marginBottom: '16px'
                }}
              >
                {syncing ? 'Syncing...' : 'Sync Now'}
              </button>

              {lastSyncResult && (
                <div style={{
                  backgroundColor: lastSyncResult.success ? '#dcfce7' : '#fee2e2',
                  border: `1px solid ${lastSyncResult.success ? '#16a34a' : '#dc2626'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  marginBottom: '16px'
                }}>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    color: lastSyncResult.success ? '#166534' : '#991b1b',
                    marginBottom: '6px'
                  }}>
                    Last Sync: {lastSyncResult.success ? 'Success' : 'Failed'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    Synced: {lastSyncResult.synced} | Failed: {lastSyncResult.failed} | Conflicts: {lastSyncResult.conflicts}
                  </div>
                </div>
              )}

              <div style={{
                backgroundColor: '#f1f5f9',
                borderRadius: '8px',
                padding: '12px'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#64748b',
                  marginBottom: '8px'
                }}>
                  Offline Queue
                </div>
                <div style={{ fontSize: '13px', color: '#334155', marginBottom: '4px' }}>
                  Operations: {stats.queuedOperations}
                </div>
                <div style={{ fontSize: '13px', color: '#334155', marginBottom: '4px' }}>
                  Evidence: {stats.unsyncedEvidence}
                </div>
                <div style={{ fontSize: '13px', color: '#334155' }}>
                  Audit Events: {stats.unsyncedAudit}
                </div>
              </div>
            </div>

            {conflicts.length > 0 && (
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
                  Conflicts ({conflicts.length})
                </h2>

                {conflicts.map((conflict) => (
                  <div
                    key={conflict.id}
                    style={{
                      backgroundColor: '#fef3c7',
                      border: '2px solid #fbbf24',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '12px'
                    }}
                  >
                    <div style={{
                      fontSize: '13px',
                      fontWeight: 600,
                      color: '#92400e',
                      marginBottom: '6px'
                    }}>
                      Operation: {conflict.operationId}
                    </div>
                    <button
                      onClick={() => setSelectedConflict(conflict)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#f59e0b',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Resolve Conflict
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{
              backgroundColor: '#fff',
              borderRadius: '12px',
              padding: '24px',
              marginTop: '16px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }}>
              <h2 style={{
                margin: '0 0 16px 0',
                fontSize: '18px',
                fontWeight: 600,
                color: '#0f172a'
              }}>
                Testing Tools
              </h2>

              <button
                onClick={simulateConflict}
                disabled={completedTasks === 0}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: completedTasks === 0 ? '#94a3b8' : '#ef4444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: completedTasks === 0 ? 'not-allowed' : 'pointer',
                  marginBottom: '8px'
                }}
              >
                Simulate Conflict
              </button>

              <div style={{
                fontSize: '11px',
                color: '#64748b',
                lineHeight: '1.4'
              }}>
                Complete a task first, then simulate a conflict to test resolution UI
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedConflict && (
        <ConflictResolutionModal
          conflict={selectedConflict}
          onResolve={handleResolveConflict}
          onClose={() => setSelectedConflict(null)}
        />
      )}
    </div>
  );
}
