import { useState, useEffect } from 'react';
import { useCredentials } from '../hooks/useCredentials';

export function CredentialManagementPanel() {
  const [credentialTypes, setCredentialTypes] = useState<any[]>([]);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [selectedCredential, setSelectedCredential] = useState<any | null>(null);
  const [showLiveActivationModal, setShowLiveActivationModal] = useState(false);
  const [confirmationPhrase, setConfirmationPhrase] = useState('');
  const [gateCheckResults, setGateCheckResults] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    getCredentialTypes,
    getAgencyCredentials,
    activateSandboxCredential,
    verifyLiveActivationGates,
    activateLiveCredential,
    revokeCredential
  } = useCredentials();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [typesData, credsData] = await Promise.all([
        getCredentialTypes(),
        getAgencyCredentials()
      ]);
      setCredentialTypes(typesData.types || []);
      setCredentials(credsData.credentials || []);
    } catch (err) {
      console.error('Failed to load credential data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleActivateSandbox = async (credentialId: string) => {
    try {
      setMessage(null);
      await activateSandboxCredential(credentialId);
      setMessage({ type: 'success', text: 'Sandbox activated. No live transactions permitted.' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to activate sandbox' });
    }
  };

  const handleVerifyLiveGates = async (credential: any) => {
    try {
      setMessage(null);
      const gates = await verifyLiveActivationGates(credential.id);
      setGateCheckResults(gates);
      setSelectedCredential(credential);

      if (gates.allowed) {
        setShowLiveActivationModal(true);
      } else {
        setMessage({
          type: 'error',
          text: `Live activation blocked: ${gates.blocked_reasons.join(', ')}`
        });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to verify gates' });
    }
  };

  const handleActivateLive = async () => {
    if (!selectedCredential) return;

    try {
      setMessage(null);
      await activateLiveCredential({
        credentialId: selectedCredential.id,
        confirmationPhrase,
        deviceFingerprint: navigator.userAgent
      });
      setMessage({
        type: 'success',
        text: 'Live credential activated. Activation is irreversible without re-keying.'
      });
      setShowLiveActivationModal(false);
      setConfirmationPhrase('');
      setSelectedCredential(null);
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to activate live' });
    }
  };

  const handleRevoke = async (credentialId: string) => {
    try {
      setMessage(null);
      await revokeCredential({
        credentialId,
        revokedReason: 'Revoked by admin'
      });
      setMessage({ type: 'success', text: 'Credential revoked immediately. Failure fallback to safe mode.' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to revoke credential' });
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      INACTIVE: { color: 'bg-gray-100 text-gray-800', label: 'Inactive (Inert)' },
      SANDBOX_ACTIVE: { color: 'bg-blue-100 text-blue-800', label: 'Sandbox Active' },
      LIVE_PENDING: { color: 'bg-orange-100 text-orange-800', label: 'Live Pending' },
      LIVE_ACTIVE: { color: 'bg-green-100 text-green-800', label: 'Live Active' },
      REVOKED: { color: 'bg-red-100 text-red-800', label: 'Revoked' }
    };
    const badge = badges[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    return <span className={`px-2 py-1 rounded text-xs font-bold ${badge.color}`}>{badge.label}</span>;
  };

  const getCategoryBadge = (category: string) => {
    const badges: Record<string, { color: string }> = {
      PAYMENT_PROCESSOR: { color: 'bg-purple-100 text-purple-800' },
      AI_PROVIDER: { color: 'bg-blue-100 text-blue-800' },
      EXTERNAL_API: { color: 'bg-green-100 text-green-800' }
    };
    const badge = badges[category] || { color: 'bg-gray-100 text-gray-800' };
    return <span className={`px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>{category}</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-gray-600">Loading credential management...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Credential Management</h2>

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
          External power (money, AI, integrations) is enabled only after internal truth is proven. Credentials are inert until explicitly unlocked. Sandbox first, live last.
        </p>
      </div>

      <div className="mb-6">
        <h3 className="font-bold mb-4">Agency Credentials ({credentials.length})</h3>
        {credentials.length === 0 ? (
          <div className="text-gray-600 text-center py-8">No credentials configured</div>
        ) : (
          <div className="space-y-4">
            {credentials.map((cred) => (
              <div key={cred.id} className="border border-gray-200 rounded p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold">{cred.credential_name}</h4>
                      {getStatusBadge(cred.status)}
                      {getCategoryBadge(cred.category)}
                    </div>
                    <div className="text-sm text-gray-700">{cred.credential_type}</div>
                  </div>
                  <div className="text-xs text-gray-600">
                    <div>Environment: {cred.environment}</div>
                    <div>Created: {new Date(cred.created_at).toLocaleDateString()}</div>
                  </div>
                </div>

                {cred.sandbox_activated_at && (
                  <div className="text-xs text-blue-600 mb-2">
                    Sandbox activated: {new Date(cred.sandbox_activated_at).toLocaleString()}
                  </div>
                )}

                {cred.live_activated_at && (
                  <div className="text-xs text-green-600 mb-2">
                    Live activated: {new Date(cred.live_activated_at).toLocaleString()}
                  </div>
                )}

                {cred.revoked_at && (
                  <div className="text-xs text-red-600 mb-2">
                    Revoked: {new Date(cred.revoked_at).toLocaleString()}
                  </div>
                )}

                <div className="flex gap-2 mt-3">
                  {cred.status === 'INACTIVE' && (
                    <button
                      onClick={() => handleActivateSandbox(cred.id)}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-semibold hover:bg-blue-700"
                    >
                      Activate Sandbox
                    </button>
                  )}

                  {cred.status === 'SANDBOX_ACTIVE' && (
                    <button
                      onClick={() => handleVerifyLiveGates(cred)}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm font-semibold hover:bg-green-700"
                    >
                      Request Live Activation
                    </button>
                  )}

                  {cred.status !== 'REVOKED' && (
                    <button
                      onClick={() => handleRevoke(cred.id)}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm font-semibold hover:bg-red-700"
                    >
                      Revoke Immediately
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showLiveActivationModal && selectedCredential && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full">
            <h3 className="text-xl font-bold mb-4 text-red-600">⚠️ Live Credential Activation</h3>

            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <p className="text-sm text-red-800 font-bold mb-2">CRITICAL WARNING:</p>
              <p className="text-sm text-red-800">
                Live credential activation is irreversible without re-keying. This will enable real transactions and external system access.
              </p>
            </div>

            {gateCheckResults && gateCheckResults.checks && (
              <div className="mb-4">
                <h4 className="font-bold mb-2">Gate Checks:</h4>
                <div className="space-y-1 text-sm">
                  <div className={gateCheckResults.checks.phases_18_28_complete ? 'text-green-600' : 'text-red-600'}>
                    {gateCheckResults.checks.phases_18_28_complete ? '✓' : '✗'} Phases 18-28 Complete
                  </div>
                  <div className={gateCheckResults.checks.consent_active ? 'text-green-600' : 'text-red-600'}>
                    {gateCheckResults.checks.consent_active ? '✓' : '✗'} Consent Active
                  </div>
                  <div className={gateCheckResults.checks.shadow_ai_verified ? 'text-green-600' : 'text-red-600'}>
                    {gateCheckResults.checks.shadow_ai_verified ? '✓' : '✗'} Shadow AI Verified
                  </div>
                  <div className={gateCheckResults.checks.audit_operational ? 'text-green-600' : 'text-red-600'}>
                    {gateCheckResults.checks.audit_operational ? '✓' : '✗'} Audit Operational
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-bold mb-2">
                Type the following phrase to confirm: <span className="text-red-600">ACTIVATE LIVE CREDENTIAL</span>
              </label>
              <input
                type="text"
                value={confirmationPhrase}
                onChange={(e) => setConfirmationPhrase(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="ACTIVATE LIVE CREDENTIAL"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowLiveActivationModal(false);
                  setConfirmationPhrase('');
                  setSelectedCredential(null);
                }}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded font-semibold hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleActivateLive}
                disabled={confirmationPhrase !== 'ACTIVATE LIVE CREDENTIAL'}
                className="px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Activate Live (Irreversible)
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded p-4">
        <p className="text-sm text-blue-800 font-semibold">Enforcement Rules:</p>
        <ul className="text-sm text-blue-800 mt-2 space-y-1">
          <li>• Credentials start INACTIVE in SANDBOX mode (inert)</li>
          <li>• Sandbox credentials: validate integration, test flows, verify enforcement ONLY</li>
          <li>• No live transactions permitted in sandbox</li>
          <li>• Live activation requires: Phases complete, Consent active, Shadow AI verified, Audit operational, Admin confirmation</li>
          <li>• Payment failures MUST NOT affect care execution</li>
          <li>• AI credentials MUST NOT execute actions/trigger alerts/write records/override Brain logic</li>
          <li>• No external system may influence Brain decisions</li>
        </ul>
      </div>
    </div>
  );
}
