import { useState, useEffect } from 'react';
import { useIntegrations } from '../hooks/useIntegrations';

export function IntegrationManagementPanel() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<any | null>(null);
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [gateCheckResults, setGateCheckResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    getAgencyIntegrations,
    verifyIntegrationActivationGates,
    activateIntegration,
    suspendIntegration,
    enableIntegrationForAgency
  } = useIntegrations();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await getAgencyIntegrations();
      setIntegrations(data.integrations || []);
    } catch (err) {
      console.error('Failed to load integration data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyGates = async (integration: any) => {
    try {
      setMessage(null);
      const gates = await verifyIntegrationActivationGates(integration.id);
      setGateCheckResults(gates);
      setSelectedIntegration(integration);

      if (gates.allowed) {
        setShowActivationModal(true);
      } else {
        setMessage({
          type: 'error',
          text: `Integration activation blocked: ${gates.blocked_reasons.join(', ')}`
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to verify gates' });
    }
  };

  const handleActivate = async () => {
    if (!selectedIntegration) return;

    try {
      setMessage(null);
      await activateIntegration(selectedIntegration.id);
      setMessage({
        type: 'success',
        text: 'Integration activated. Data ingestion enabled.'
      });
      setShowActivationModal(false);
      setSelectedIntegration(null);
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to activate integration' });
    }
  };

  const handleSuspend = async (integrationId: string) => {
    try {
      setMessage(null);
      await suspendIntegration({
        integrationId,
        suspendedReason: 'Suspended by admin'
      });
      setMessage({ type: 'success', text: 'Integration suspended immediately. Data ingestion blocked.' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to suspend integration' });
    }
  };

  const handleToggleEnabled = async (integrationId: string, currentlyEnabled: boolean) => {
    try {
      setMessage(null);
      await enableIntegrationForAgency({
        integrationId,
        enabled: !currentlyEnabled
      });
      setMessage({
        type: 'success',
        text: !currentlyEnabled ? 'Integration enabled by agency' : 'Integration disabled by agency'
      });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to update integration' });
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      INACTIVE: { color: 'bg-gray-100 text-gray-800', label: 'Inactive' },
      ACTIVE: { color: 'bg-green-100 text-green-800', label: 'Active' },
      SUSPENDED: { color: 'bg-red-100 text-red-800', label: 'Suspended' }
    };
    const badge = badges[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    return <span className={`px-2 py-1 rounded text-xs font-bold ${badge.color}`}>{badge.label}</span>;
  };

  const getTypeBadge = (type: string) => {
    const badges: Record<string, { color: string }> = {
      PHARMACY: { color: 'bg-blue-100 text-blue-800' },
      LABORATORY: { color: 'bg-purple-100 text-purple-800' },
      EHR_HIE: { color: 'bg-green-100 text-green-800' },
      EMERGENCY_SERVICES: { color: 'bg-red-100 text-red-800' },
      WEARABLE_HEALTH: { color: 'bg-orange-100 text-orange-800' }
    };
    const badge = badges[type] || { color: 'bg-gray-100 text-gray-800' };
    return <span className={`px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>{type}</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-gray-600">Loading integration management...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Third-Party Integration Management</h2>

      {message && (
        <div className={`border rounded p-4 mb-6 ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
        <p className="text-sm text-yellow-800 font-bold">Core Principle:</p>
        <p className="text-sm text-yellow-800 mt-1">
          External data may inform care, but may never control care. External systems are data sources only, never authorities. All third-party data enters through the Brain ingestion pipeline.
        </p>
      </div>

      <div className="mb-6">
        <h3 className="font-bold mb-4">Agency Integrations ({integrations.length})</h3>
        {integrations.length === 0 ? (
          <div className="text-gray-600 text-center py-8">No integrations configured</div>
        ) : (
          <div className="space-y-4">
            {integrations.map((integration) => (
              <div key={integration.id} className="border border-gray-200 rounded p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold">{integration.provider_name}</h4>
                      {getStatusBadge(integration.status)}
                      {getTypeBadge(integration.integration_type)}
                    </div>
                    <div className="text-sm text-gray-700">
                      {integration.read_only ? 'Read-Only' : 'Limited Write'}
                    </div>
                  </div>
                  <div className="text-xs text-gray-600">
                    <div>Credential: {integration.credential_status} / {integration.credential_environment}</div>
                    <div>Agency Enabled: {integration.enabled_by_agency ? 'Yes' : 'No'}</div>
                  </div>
                </div>

                {integration.supported_data_domains && integration.supported_data_domains.length > 0 && (
                  <div className="text-xs text-gray-700 mb-2">
                    <span className="font-semibold">Data Domains:</span> {integration.supported_data_domains.join(', ')}
                  </div>
                )}

                {integration.required_consent_domains && integration.required_consent_domains.length > 0 && (
                  <div className="text-xs text-blue-600 mb-2">
                    <span className="font-semibold">Required Consent:</span> {integration.required_consent_domains.join(', ')}
                  </div>
                )}

                {integration.activated_at && (
                  <div className="text-xs text-green-600 mb-2">
                    Activated: {new Date(integration.activated_at).toLocaleString()}
                  </div>
                )}

                {integration.suspended_at && (
                  <div className="text-xs text-red-600 mb-2">
                    Suspended: {new Date(integration.suspended_at).toLocaleString()}
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => handleToggleEnabled(integration.id, integration.enabled_by_agency)}
                    className={`px-3 py-1 rounded text-sm font-semibold ${
                      integration.enabled_by_agency
                        ? 'bg-gray-300 text-gray-800 hover:bg-gray-400'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {integration.enabled_by_agency ? 'Disable for Agency' : 'Enable for Agency'}
                  </button>

                  {integration.status === 'INACTIVE' && integration.enabled_by_agency && (
                    <button
                      onClick={() => handleVerifyGates(integration)}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm font-semibold hover:bg-green-700"
                    >
                      Activate Integration
                    </button>
                  )}

                  {integration.status === 'ACTIVE' && (
                    <button
                      onClick={() => handleSuspend(integration.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm font-semibold hover:bg-red-700"
                    >
                      Suspend Immediately
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showActivationModal && selectedIntegration && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full">
            <h3 className="text-xl font-bold mb-4">Activate Integration</h3>

            <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
              <p className="text-sm text-blue-800 font-bold mb-2">Integration Activation</p>
              <p className="text-sm text-blue-800">
                This will enable real-time data ingestion from {selectedIntegration.provider_name}. All data will pass through the Brain ingestion pipeline with validation, verification, and trust scoring.
              </p>
            </div>

            {gateCheckResults && gateCheckResults.checks && (
              <div className="mb-4">
                <h4 className="font-bold mb-2">Gate Checks:</h4>
                <div className="space-y-1 text-sm">
                  <div className={gateCheckResults.checks.credential_live_active ? 'text-green-600' : 'text-red-600'}>
                    {gateCheckResults.checks.credential_live_active ? '✓' : '✗'} Credential LIVE Active
                  </div>
                  <div className={gateCheckResults.checks.credential_live_environment ? 'text-green-600' : 'text-red-600'}>
                    {gateCheckResults.checks.credential_live_environment ? '✓' : '✗'} Credential LIVE Environment
                  </div>
                  <div className={gateCheckResults.checks.consent_domains_active ? 'text-green-600' : 'text-red-600'}>
                    {gateCheckResults.checks.consent_domains_active ? '✓' : '✗'} Required Consent Domains Active
                  </div>
                  <div className={gateCheckResults.checks.enabled_by_agency ? 'text-green-600' : 'text-red-600'}>
                    {gateCheckResults.checks.enabled_by_agency ? '✓' : '✗'} Enabled by Agency
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowActivationModal(false);
                  setSelectedIntegration(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded font-semibold hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleActivate}
                className="px-4 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700"
              >
                Activate Integration
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <p className="text-sm text-blue-800 font-semibold">Enforcement Rules:</p>
        <ul className="text-sm text-blue-800 mt-2 space-y-1">
          <li>• External systems are data sources only, never authorities</li>
          <li>• All third-party data enters through the Brain ingestion pipeline</li>
          <li>• No third-party system may write directly to care records</li>
          <li>• Data ingestion requires: Active consent domains, LIVE active credentials, Active integration status, Agency explicit enablement</li>
          <li>• All incoming data passes through: Schema validation, Source verification, Timestamp normalization, Trust scoring, Brain interpretation</li>
          <li>• Third-party data stored as external observations ONLY</li>
          <li>• NEVER overwrite internal records</li>
          <li>• NEVER auto-trigger actions</li>
          <li>• NEVER escalate emergencies directly</li>
          <li>• Any action requires Brain validation + human confirmation</li>
          <li>• Conflicts: Flag discrepancy, Surface to supervisor, Preserve both records, Do NOT auto-resolve</li>
        </ul>
      </div>
    </div>
  );
}
