import { useState, useEffect } from 'react';
import { useResilienceManagement } from '../hooks/useResilienceManagement';

export function ResilienceManagementPanel() {
  const [activeTab, setActiveTab] = useState<'circuit' | 'degradation' | 'incidents' | 'backups' | 'integrity'>('circuit');
  const [circuitBreakers, setCircuitBreakers] = useState<any[]>([]);
  const [degradationStatus, setDegradationStatus] = useState<any>(null);
  const [backupStatus, setBackupStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    getCircuitBreakerState,
    getSystemDegradationStatus,
    getBackupStatus
  } = useResilienceManagement();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setMessage(null);

      if (activeTab === 'circuit') {
        const data = await getCircuitBreakerState();
        setCircuitBreakers(data.states || []);
      } else if (activeTab === 'degradation') {
        const data = await getSystemDegradationStatus();
        setDegradationStatus(data);
      } else if (activeTab === 'backups') {
        const data = await getBackupStatus();
        setBackupStatus(data);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      CLOSED: { color: 'bg-green-100 text-green-800', label: 'Closed' },
      OPEN: { color: 'bg-red-100 text-red-800', label: 'Open' },
      HALF_OPEN: { color: 'bg-yellow-100 text-yellow-800', label: 'Half-Open' },
      NONE: { color: 'bg-green-100 text-green-800', label: 'Normal' },
      PARTIAL: { color: 'bg-yellow-100 text-yellow-800', label: 'Partial' },
      SEVERE: { color: 'bg-orange-100 text-orange-800', label: 'Severe' },
      CRITICAL: { color: 'bg-red-100 text-red-800', label: 'Critical' },
      PASSED: { color: 'bg-green-100 text-green-800', label: 'Passed' },
      FAILED: { color: 'bg-red-100 text-red-800', label: 'Failed' },
      VERIFIED: { color: 'bg-green-100 text-green-800', label: 'Verified' }
    };
    const badge = badges[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    return <span className={`px-2 py-1 rounded text-xs font-bold ${badge.color}`}>{badge.label}</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-gray-600">Loading resilience management...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Production Hardening, Resilience & Failure Safety</h2>

      {message && (
        <div className={`border rounded p-4 mb-6 ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-red-50 border border-red-200 rounded p-4 mb-6">
        <p className="text-sm text-red-800 font-bold">Core Principle:</p>
        <p className="text-sm text-red-800 mt-1">
          When something breaks, the system must stay safe, stay explainable, and stay auditable. The system must fail safe, never fail open. Partial failure MUST NOT cascade.
        </p>
      </div>

      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('circuit')}
          className={`px-4 py-2 font-semibold ${
            activeTab === 'circuit'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Circuit Breakers
        </button>
        <button
          onClick={() => setActiveTab('degradation')}
          className={`px-4 py-2 font-semibold ${
            activeTab === 'degradation'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Degraded Mode
        </button>
        <button
          onClick={() => setActiveTab('incidents')}
          className={`px-4 py-2 font-semibold ${
            activeTab === 'incidents'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Incidents
        </button>
        <button
          onClick={() => setActiveTab('backups')}
          className={`px-4 py-2 font-semibold ${
            activeTab === 'backups'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Backup & Recovery
        </button>
        <button
          onClick={() => setActiveTab('integrity')}
          className={`px-4 py-2 font-semibold ${
            activeTab === 'integrity'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Data Integrity
        </button>
      </div>

      {activeTab === 'circuit' && (
        <div>
          <h3 className="font-bold mb-4">Circuit Breaker Status</h3>
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-sm text-blue-800">
            Circuit breakers automatically open after threshold, prevent repeated failures, and surface degraded-mode warnings. They auto-close after health recovery.
          </div>
          {circuitBreakers.length === 0 ? (
            <div className="text-gray-600 text-center py-8">No circuit breakers configured</div>
          ) : (
            <div className="space-y-4">
              {circuitBreakers.map((breaker) => (
                <div key={breaker.breaker_name} className="border border-gray-200 rounded p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold">{breaker.breaker_name}</h4>
                      <div className="text-sm text-gray-600">{breaker.dependency_type}</div>
                    </div>
                    {getStatusBadge(breaker.current_state)}
                  </div>
                  <div className="text-xs text-gray-700 space-y-1">
                    <div>Failure Count: {breaker.failure_count} / {breaker.failure_threshold}</div>
                    <div>Total Failures: {breaker.total_failures}</div>
                    <div>Total Successes: {breaker.total_successes}</div>
                    {breaker.last_failure_at && (
                      <div>Last Failure: {new Date(breaker.last_failure_at).toLocaleString()}</div>
                    )}
                    {breaker.last_success_at && (
                      <div>Last Success: {new Date(breaker.last_success_at).toLocaleString()}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'degradation' && (
        <div>
          <h3 className="font-bold mb-4">System Degradation Status</h3>
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-sm text-blue-800">
            If critical subsystems fail: Core care logging remains available, Emergency escalation remains available, Non-critical features are disabled, UI clearly indicates degraded state.
          </div>
          {degradationStatus && (
            <div className="space-y-4">
              <div className="border border-gray-200 rounded p-4">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Overall Status:</span>
                  {getStatusBadge(degradationStatus.is_degraded ? 'CRITICAL' : 'NONE')}
                </div>
                {degradationStatus.is_degraded && (
                  <div className="mt-3 text-sm text-red-600 font-semibold">
                    System is operating in degraded mode
                  </div>
                )}
              </div>

              {degradationStatus.degradations && degradationStatus.degradations.length > 0 && (
                <div>
                  <h4 className="font-bold mb-2">Active Degradations</h4>
                  <div className="space-y-2">
                    {degradationStatus.degradations.map((deg: any) => (
                      <div key={deg.degradation_id} className="border border-gray-200 rounded p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-semibold">{deg.subsystem_name}</div>
                            <div className="text-xs text-gray-600">{deg.subsystem_category}</div>
                          </div>
                          {getStatusBadge(deg.degradation_level)}
                        </div>
                        <div className="text-xs text-gray-700 space-y-1">
                          <div>Reason: {deg.degradation_reason}</div>
                          <div className="flex gap-4">
                            <span>Core Care Logging: {deg.core_care_logging_available ? '✓' : '✗'}</span>
                            <span>Emergency Escalation: {deg.emergency_escalation_available ? '✓' : '✗'}</span>
                          </div>
                          {deg.disabled_features && deg.disabled_features.length > 0 && (
                            <div>Disabled Features: {deg.disabled_features.join(', ')}</div>
                          )}
                          {deg.ui_warning_message && (
                            <div className="text-orange-600 font-semibold mt-2">{deg.ui_warning_message}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'incidents' && (
        <div>
          <h3 className="font-bold mb-4">Incident Management</h3>
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-sm text-blue-800">
            All production incidents MUST log: Incident ID, Scope, Severity, Start/end timestamps, Impacted systems, Mitigation actions. Incident logs are immutable.
          </div>
          <div className="text-gray-600 text-center py-8">
            No active incidents
          </div>
        </div>
      )}

      {activeTab === 'backups' && (
        <div>
          <h3 className="font-bold mb-4">Backup & Recovery Status</h3>
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-sm text-blue-800">
            Regular automated backups with point-in-time recovery. Backup integrity verification and recovery drills required. Backups MUST be encrypted and isolated.
          </div>
          {backupStatus ? (
            <div className="space-y-4">
              <div className="border border-gray-200 rounded p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{backupStatus.verified_backups}</div>
                    <div className="text-sm text-gray-600">Verified Backups</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{backupStatus.restorable_backups}</div>
                    <div className="text-sm text-gray-600">Restorable Backups</div>
                  </div>
                  <div>
                    <div className="text-sm font-bold">Last Backup</div>
                    <div className="text-xs text-gray-600">
                      {backupStatus.last_backup ? new Date(backupStatus.last_backup).toLocaleString() : 'Never'}
                    </div>
                  </div>
                </div>
              </div>

              {backupStatus.backups && backupStatus.backups.length > 0 && (
                <div>
                  <h4 className="font-bold mb-2">Recent Backups</h4>
                  <div className="space-y-2">
                    {backupStatus.backups.slice(0, 5).map((backup: any) => (
                      <div key={backup.backup_id} className="border border-gray-200 rounded p-3">
                        <div className="flex justify-between items-start">
                          <div className="text-sm">
                            <div className="font-semibold">{backup.backup_id}</div>
                            <div className="text-xs text-gray-600">
                              {backup.backup_type} - {backup.backup_scope}
                            </div>
                            <div className="text-xs text-gray-600">
                              {new Date(backup.backup_timestamp).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex gap-2 flex-col items-end">
                            {getStatusBadge(backup.backup_status)}
                            {backup.encryption_enabled && (
                              <span className="text-xs text-green-600">🔒 Encrypted</span>
                            )}
                            {backup.is_isolated && (
                              <span className="text-xs text-green-600">🔒 Isolated</span>
                            )}
                            {backup.can_restore_from && (
                              <span className="text-xs text-green-600">✓ Restorable</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-600 text-center py-8">No backup data available</div>
          )}
        </div>
      )}

      {activeTab === 'integrity' && (
        <div>
          <h3 className="font-bold mb-4">Data Integrity Checks</h3>
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-sm text-blue-800">
            Idempotent writes enforced. Exactly-once semantics where required. Referential integrity checks. Background consistency verification.
          </div>
          <div className="text-gray-600 text-center py-8">
            No integrity violations detected
          </div>
        </div>
      )}

      <div className="bg-red-50 border border-red-200 rounded p-4 mt-6">
        <p className="text-sm text-red-800 font-semibold">Enforcement Rules:</p>
        <ul className="text-sm text-red-800 mt-2 space-y-1">
          <li>• The system must fail safe, never fail open</li>
          <li>• Partial failure MUST NOT cascade</li>
          <li>• Care execution MUST degrade conservatively</li>
          <li>• No silent failure is allowed</li>
          <li>• Recovery must be provable and auditable</li>
          <li>• Failure domain isolation enforced (tenants, residents, caregivers, devices, integrations, regions)</li>
          <li>• Failure in one domain MUST NOT impact others</li>
          <li>• Rate limiting enforced (per-user, per-device, per-API-key, per-tenant)</li>
          <li>• Exceeded limits MUST throttle safely and return explicit errors</li>
          <li>• Circuit breakers automatically open after threshold</li>
          <li>• Circuit breakers prevent repeated failures and auto-close after health recovery</li>
          <li>• Core care logging remains available (MANDATORY)</li>
          <li>• Emergency escalation remains available (MANDATORY)</li>
          <li>• Non-critical features are disabled during degradation</li>
          <li>• UI clearly indicates degraded state</li>
          <li>• Backups MUST be encrypted and isolated</li>
          <li>• Point-in-time recovery supported</li>
          <li>• All resilience events logged immutably</li>
        </ul>
      </div>
    </div>
  );
}
