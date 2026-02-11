import { useState, useEffect } from 'react';
import { useOTAManagement } from '../hooks/useOTAManagement';

export function OTAManagementPanel() {
  const [activeTab, setActiveTab] = useState<'versions' | 'deployments' | 'health'>('versions');
  const [versions, setVersions] = useState<any>(null);
  const [deployments, setDeployments] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [versionDrift, setVersionDrift] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    getCurrentVersions,
    getDeploymentStatus,
    getSystemHealth,
    checkVersionDrift,
    triggerRollback
  } = useOTAManagement();

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setMessage(null);

      if (activeTab === 'versions') {
        const [versionsData, driftData] = await Promise.all([
          getCurrentVersions(),
          checkVersionDrift()
        ]);
        setVersions(versionsData.versions);
        setVersionDrift(driftData);
      } else if (activeTab === 'deployments') {
        const deploymentsData = await getDeploymentStatus();
        setDeployments(deploymentsData.deployments || []);
      } else if (activeTab === 'health') {
        const healthData = await getSystemHealth();
        setSystemHealth(healthData);
      }
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (deploymentId: string) => {
    try {
      setMessage(null);
      await triggerRollback({
        deploymentId,
        rollbackTrigger: 'MANUAL',
        rollbackReason: 'Manual rollback triggered by admin'
      });
      setMessage({ type: 'success', text: 'Rollback completed. Audit continuity preserved.' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to trigger rollback' });
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      IN_PROGRESS: { color: 'bg-blue-100 text-blue-800', label: 'In Progress' },
      COMPLETED: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      FAILED: { color: 'bg-red-100 text-red-800', label: 'Failed' },
      ROLLED_BACK: { color: 'bg-orange-100 text-orange-800', label: 'Rolled Back' },
      HEALTHY: { color: 'bg-green-100 text-green-800', label: 'Healthy' },
      WARNING: { color: 'bg-yellow-100 text-yellow-800', label: 'Warning' },
      CRITICAL: { color: 'bg-red-100 text-red-800', label: 'Critical' }
    };
    const badge = badges[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    return <span className={`px-2 py-1 rounded text-xs font-bold ${badge.color}`}>{badge.label}</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-gray-600">Loading OTA management...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">OTA Updates, DevOps & Runtime Integrity</h2>

      {message && (
        <div className={`border rounded p-4 mb-6 ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
        <p className="text-sm text-blue-800 font-bold">Core Principle:</p>
        <p className="text-sm text-blue-800 mt-1">
          If you cannot prove what code was running, you cannot defend what happened. Runtime behavior MUST be deterministic per version. Updates are explicit, signed, and auditable.
        </p>
      </div>

      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('versions')}
          className={`px-4 py-2 font-semibold ${
            activeTab === 'versions'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Versions
        </button>
        <button
          onClick={() => setActiveTab('deployments')}
          className={`px-4 py-2 font-semibold ${
            activeTab === 'deployments'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Deployments
        </button>
        <button
          onClick={() => setActiveTab('health')}
          className={`px-4 py-2 font-semibold ${
            activeTab === 'health'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          System Health
        </button>
      </div>

      {activeTab === 'versions' && (
        <div>
          <h3 className="font-bold mb-4">Current System Versions</h3>
          {versions ? (
            <div className="space-y-4">
              {Object.entries(versions).map(([type, version]: [string, any]) => (
                <div key={type} className="border border-gray-200 rounded p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold">{type.replace(/_/g, ' ')}</h4>
                      <div className="text-2xl font-mono mt-1">{version.version_number}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        Major: {version.major} | Minor: {version.minor} | Patch: {version.patch}
                      </div>
                    </div>
                    {version.is_deprecated && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-bold">DEPRECATED</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-600 text-center py-8">No version data available</div>
          )}

          {versionDrift && (
            <div className="mt-6">
              <h3 className="font-bold mb-4">Version Drift Monitoring</h3>
              <div className="border border-gray-200 rounded p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold">Drift Status:</span>
                  {getStatusBadge(versionDrift.drift_detected ? 'WARNING' : 'HEALTHY')}
                </div>
                <div className="text-sm text-gray-700">
                  <div>Incompatible Clients: {versionDrift.incompatible_clients}</div>
                  <div>Current Brain Version: {versionDrift.current_brain_version}</div>
                  <div>Current API Version: {versionDrift.current_api_version}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'deployments' && (
        <div>
          <h3 className="font-bold mb-4">Recent Deployments</h3>
          {deployments.length === 0 ? (
            <div className="text-gray-600 text-center py-8">No deployments found</div>
          ) : (
            <div className="space-y-4">
              {deployments.map((deployment) => (
                <div key={deployment.deployment_id} className="border border-gray-200 rounded p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold">{deployment.package_version}</h4>
                      <div className="text-sm text-gray-600">{deployment.component_type}</div>
                    </div>
                    <div className="flex gap-2">
                      {getStatusBadge(deployment.deployment_status)}
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                        {deployment.deployment_stage}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-gray-700 space-y-1">
                    <div>Deployment ID: {deployment.deployment_id}</div>
                    <div>Started: {new Date(deployment.deployment_started_at).toLocaleString()}</div>
                    {deployment.deployment_completed_at && (
                      <div>Completed: {new Date(deployment.deployment_completed_at).toLocaleString()}</div>
                    )}
                    <div>Health Check: {deployment.health_check_passed ? '✓ Passed' : deployment.health_check_passed === false ? '✗ Failed' : 'Pending'}</div>
                    {deployment.rollback_triggered && (
                      <div className="text-red-600 font-semibold">Rollback Triggered</div>
                    )}
                  </div>

                  {deployment.deployment_status === 'COMPLETED' && !deployment.rollback_triggered && (
                    <button
                      onClick={() => handleRollback(deployment.deployment_id)}
                      className="mt-3 px-3 py-1 bg-red-600 text-white rounded text-sm font-semibold hover:bg-red-700"
                    >
                      Trigger Rollback
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'health' && (
        <div>
          <h3 className="font-bold mb-4">System Health Status</h3>
          {systemHealth ? (
            <div className="space-y-4">
              <div className="border border-gray-200 rounded p-4">
                <div className="flex justify-between items-center mb-4">
                  <span className="font-bold text-lg">Overall Status:</span>
                  {getStatusBadge(systemHealth.overall_status)}
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  <div>Failed Checks (Last Hour): {systemHealth.failed_checks_last_hour}</div>
                  <div>Warning Checks (Last Hour): {systemHealth.warning_checks_last_hour}</div>
                  <div>Environment: {systemHealth.environment}</div>
                </div>
              </div>

              {systemHealth.recent_checks && systemHealth.recent_checks.length > 0 && (
                <div>
                  <h4 className="font-bold mb-2">Recent Health Checks</h4>
                  <div className="space-y-2">
                    {systemHealth.recent_checks.slice(0, 10).map((check: any) => (
                      <div key={check.check_id} className="border border-gray-200 rounded p-3">
                        <div className="flex justify-between items-start">
                          <div className="text-sm">
                            <div className="font-semibold">{check.check_type.replace(/_/g, ' ')}</div>
                            <div className="text-xs text-gray-600">
                              {new Date(check.check_timestamp).toLocaleString()}
                            </div>
                          </div>
                          <div className="flex gap-2 items-center">
                            {getStatusBadge(check.check_status)}
                            {check.alert_severity && (
                              <span className="text-xs text-gray-600">{check.alert_severity}</span>
                            )}
                          </div>
                        </div>
                        {check.deviation_detected && (
                          <div className="text-xs text-orange-600 mt-1">Deviation Detected</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-600 text-center py-8">No health data available</div>
          )}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded p-4 mt-6">
        <p className="text-sm text-blue-800 font-semibold">Enforcement Rules:</p>
        <ul className="text-sm text-blue-800 mt-2 space-y-1">
          <li>• Runtime behavior MUST be deterministic per version</li>
          <li>• Updates are explicit, signed, and auditable</li>
          <li>• No update may silently change enforcement logic</li>
          <li>• Unsigned updates MUST be rejected</li>
          <li>• Updates MUST be staged (canary → partial → full)</li>
          <li>• Emergency patches allowed ONLY for security fixes</li>
          <li>• Enforcement logic changes require admin acknowledgment</li>
          <li>• Rollback capability is mandatory</li>
          <li>• The system MUST support immediate rollback to last known-good version</li>
          <li>• Automatic rollback on failed health checks</li>
          <li>• Rollback MUST NOT erase audit data</li>
          <li>• Devices may never drift from Brain logic compatibility</li>
          <li>• Clients MUST verify version compatibility on startup</li>
          <li>• Incompatible clients MUST enter RESTRICTED MODE</li>
          <li>• Environment isolation enforced (DEVELOPMENT, SANDBOX, PRODUCTION)</li>
          <li>• No cross-environment data leakage allowed</li>
          <li>• Failures MUST generate alerts without disrupting care execution</li>
        </ul>
      </div>
    </div>
  );
}
