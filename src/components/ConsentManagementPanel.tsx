import { useState, useEffect } from 'react';
import { useConsent } from '../hooks/useConsent';

export function ConsentManagementPanel() {
  const [domains, setDomains] = useState<any[]>([]);
  const [activeConsent, setActiveConsent] = useState<any>(null);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const {
    getConsentDomains,
    grantConsent,
    revokeConsent,
    getActiveConsent
  } = useConsent();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [domainsData, consentData] = await Promise.all([
        getConsentDomains(),
        getActiveConsent({ userId: 'current' })
      ]);
      setDomains(domainsData.domains || []);
      setActiveConsent(consentData.has_active_consent ? consentData.consent : null);

      if (consentData.has_active_consent && consentData.consent) {
        setSelectedDomains(consentData.consent.granted_domains || []);
      }
    } catch (err) {
      console.error('Failed to load consent data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantConsent = async () => {
    try {
      setMessage(null);
      await grantConsent({
        grantedDomains: selectedDomains,
        userId: 'current'
      });
      setMessage({ type: 'success', text: 'Consent granted successfully' });
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to grant consent' });
    }
  };

  const handleRevokeConsent = async () => {
    try {
      setMessage(null);
      await revokeConsent({
        revokedReason: 'User requested revocation',
        userId: 'current'
      });
      setMessage({ type: 'success', text: 'Consent revoked immediately. Processing halted.' });
      setSelectedDomains([]);
      loadData();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to revoke consent' });
    }
  };

  const toggleDomain = (domainKey: string) => {
    if (selectedDomains.includes(domainKey)) {
      setSelectedDomains(selectedDomains.filter(d => d !== domainKey));
    } else {
      setSelectedDomains([...selectedDomains, domainKey]);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-gray-600">Loading consent management...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Consent Management</h2>

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
          If consent cannot be proven, data cannot be processed. Consent is explicit, versioned, and revocable. Revocation has immediate effect.
        </p>
      </div>

      {activeConsent && (
        <div className="bg-green-50 border border-green-200 rounded p-4 mb-6">
          <h3 className="font-bold text-green-900 mb-2">Active Consent (Version {activeConsent.consent_version})</h3>
          <div className="text-sm text-green-800">
            <div>Granted: {new Date(activeConsent.granted_at).toLocaleString()}</div>
            <div>Status: {activeConsent.status}</div>
            <div>Domains: {activeConsent.granted_domains.length}</div>
          </div>
        </div>
      )}

      <div className="space-y-4 mb-6">
        <h3 className="font-bold">Consent Domains</h3>
        <p className="text-sm text-gray-600">No bundled consent allowed. Each domain requires explicit consent.</p>

        {domains.map((domain) => (
          <div
            key={domain.domain_key}
            className={`border rounded p-4 ${
              domain.is_required
                ? 'bg-red-50 border-red-300'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={selectedDomains.includes(domain.domain_key)}
                onChange={() => !domain.is_required && toggleDomain(domain.domain_key)}
                disabled={domain.is_required}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-bold">{domain.domain_name}</h4>
                  {domain.is_required && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-bold">
                      Required for Service
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 mb-2">{domain.description}</p>
                <div className="text-xs text-gray-600 space-y-1">
                  <div><span className="font-semibold">Legal Basis:</span> {domain.legal_basis}</div>
                  <div><span className="font-semibold">Purpose:</span> {domain.processing_purpose}</div>
                  <div><span className="font-semibold">Retention:</span> {domain.retention_period}</div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleGrantConsent}
          disabled={selectedDomains.length === 0}
          className="px-4 py-2 bg-green-600 text-white rounded font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Grant Consent
        </button>
        {activeConsent && (
          <button
            onClick={handleRevokeConsent}
            className="px-4 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700"
          >
            Revoke All Consent (Immediate Effect)
          </button>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-4 mt-6">
        <p className="text-sm text-blue-800 font-semibold">Consent Requirements:</p>
        <ul className="text-sm text-blue-800 mt-2 space-y-1">
          <li>• Consent is explicit, versioned, and revocable</li>
          <li>• Only ONE active consent version allowed per user</li>
          <li>• Revocation has immediate effect</li>
          <li>• No data processing occurs without valid consent</li>
          <li>• All consent events are audited immutably</li>
        </ul>
      </div>
    </div>
  );
}
