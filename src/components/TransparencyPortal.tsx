import { useState, useEffect } from 'react';
import { useTransparency } from '../hooks/useTransparency';
import { useConsent } from '../hooks/useConsent';
import { DataRetentionTransparency } from './DataRetentionTransparency';

export function TransparencyPortal() {
  const [summary, setSummary] = useState<any>(null);
  const [processingHistory, setProcessingHistory] = useState<any[]>([]);
  const [consentHistory, setConsentHistory] = useState<any[]>([]);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'summary' | 'processing' | 'consent' | 'integrations' | 'retention'>('summary');
  const [loading, setLoading] = useState(true);

  const {
    getTransparencySummary,
    getDataProcessingHistory,
    getThirdPartyIntegrations
  } = useTransparency();

  const { getConsentHistory } = useConsent();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [summaryData, processingData, consentHistoryData, integrationsData] = await Promise.all([
        getTransparencySummary({ userId: 'current' }),
        getDataProcessingHistory({ userId: 'current', limit: 50 }),
        getConsentHistory({ userId: 'current' }),
        getThirdPartyIntegrations()
      ]);
      setSummary(summaryData);
      setProcessingHistory(processingData.processing_history || []);
      setConsentHistory(consentHistoryData.history || []);
      setIntegrations(integrationsData.integrations || []);
    } catch (err) {
      console.error('Failed to load transparency data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getProcessingTypeBadge = (type: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      COLLECT: { color: 'bg-blue-100 text-blue-800', label: 'Collect' },
      PROCESS: { color: 'bg-green-100 text-green-800', label: 'Process' },
      SHARE: { color: 'bg-orange-100 text-orange-800', label: 'Share' },
      ACCESS: { color: 'bg-gray-100 text-gray-800', label: 'Access' },
      DELETE: { color: 'bg-red-100 text-red-800', label: 'Delete' }
    };
    const badge = badges[type] || { color: 'bg-gray-100 text-gray-800', label: type };
    return <span className={`px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>{badge.label}</span>;
  };

  const getActionBadge = (action: string) => {
    const badges: Record<string, { color: string }> = {
      GRANT: { color: 'bg-green-100 text-green-800' },
      REVOKE: { color: 'bg-red-100 text-red-800' },
      SUPERSEDE: { color: 'bg-orange-100 text-orange-800' }
    };
    const badge = badges[action] || { color: 'bg-gray-100 text-gray-800' };
    return <span className={`px-2 py-1 rounded text-xs font-semibold ${badge.color}`}>{action}</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-gray-600">Loading transparency portal...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Transparency Portal</h2>

      <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
        <p className="text-sm text-blue-800 font-bold">Transparency is a Legal Requirement:</p>
        <p className="text-sm text-blue-800 mt-1">
          You have the right to view: current active consent, consent history, what data is collected, what data is processed, what data is shared, and which systems access your data.
        </p>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-4 py-2 rounded font-semibold whitespace-nowrap ${
            activeTab === 'summary'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          Summary
        </button>
        <button
          onClick={() => setActiveTab('processing')}
          className={`px-4 py-2 rounded font-semibold whitespace-nowrap ${
            activeTab === 'processing'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          Data Processing ({processingHistory.length})
        </button>
        <button
          onClick={() => setActiveTab('consent')}
          className={`px-4 py-2 rounded font-semibold whitespace-nowrap ${
            activeTab === 'consent'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          Consent History ({consentHistory.length})
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`px-4 py-2 rounded font-semibold whitespace-nowrap ${
            activeTab === 'integrations'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          Third-Party Integrations ({integrations.length})
        </button>
        <button
          onClick={() => setActiveTab('retention')}
          className={`px-4 py-2 rounded font-semibold whitespace-nowrap ${
            activeTab === 'retention'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
          }`}
        >
          Data Retention
        </button>
      </div>

      {activeTab === 'summary' && summary && (
        <div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <div className="text-sm text-green-600 font-semibold">Active Consent</div>
              <div className="text-2xl font-bold text-green-800 mt-1">
                {summary.active_consent ? 'Active' : 'None'}
              </div>
              {summary.active_consent && (
                <div className="text-xs text-green-600 mt-1">
                  Version {summary.active_consent.consent_version}
                </div>
              )}
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <div className="text-sm text-blue-600 font-semibold">Consent Changes</div>
              <div className="text-2xl font-bold text-blue-800 mt-1">
                {summary.consent_history_count}
              </div>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded p-4">
              <div className="text-sm text-gray-600 font-semibold">Processing Events</div>
              <div className="text-2xl font-bold text-gray-800 mt-1">
                {summary.processing_event_count}
              </div>
            </div>
            <div className="bg-orange-50 border border-orange-200 rounded p-4">
              <div className="text-sm text-orange-600 font-semibold">Sharing Events</div>
              <div className="text-2xl font-bold text-orange-800 mt-1">
                {summary.sharing_event_count}
              </div>
            </div>
          </div>

          {summary.active_consent && (
            <div className="bg-green-50 border border-green-200 rounded p-4">
              <h3 className="font-bold text-green-900 mb-2">Current Active Consent</h3>
              <div className="text-sm text-green-800 space-y-1">
                <div>Version: {summary.active_consent.consent_version}</div>
                <div>Granted: {new Date(summary.active_consent.granted_at).toLocaleString()}</div>
                <div>Domains: {summary.active_consent.granted_domains.join(', ')}</div>
                <div>Status: {summary.active_consent.status}</div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'processing' && (
        <div className="space-y-3">
          <h3 className="font-bold">Data Processing History</h3>
          {processingHistory.length === 0 ? (
            <div className="text-gray-600 text-center py-8">No processing events</div>
          ) : (
            processingHistory.map((event) => (
              <div key={event.id} className="border border-gray-200 rounded p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {getProcessingTypeBadge(event.processing_type)}
                    <span className="text-sm font-semibold">{event.data_category}</span>
                    {event.consent_verified ? (
                      <span className="text-xs text-green-600 font-semibold">Consent Verified</span>
                    ) : (
                      <span className="text-xs text-red-600 font-bold">No Consent</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600">{new Date(event.timestamp).toLocaleString()}</div>
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  <div><span className="font-semibold">Purpose:</span> {event.purpose}</div>
                  <div><span className="font-semibold">System:</span> {event.processor_system}</div>
                  <div><span className="font-semibold">Domain:</span> {event.consent_domain}</div>
                  {event.third_party_recipient && (
                    <div><span className="font-semibold">Shared With:</span> {event.third_party_recipient}</div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'consent' && (
        <div className="space-y-3">
          <h3 className="font-bold">Consent History</h3>
          {consentHistory.length === 0 ? (
            <div className="text-gray-600 text-center py-8">No consent history</div>
          ) : (
            consentHistory.map((event) => (
              <div key={event.id} className="border border-gray-200 rounded p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    {getActionBadge(event.action)}
                    <span className="text-sm font-semibold">{event.consent_domain}</span>
                    <span className="text-xs text-gray-600">Version {event.consent_version}</span>
                  </div>
                  <div className="text-xs text-gray-600">{new Date(event.timestamp).toLocaleString()}</div>
                </div>
                <div className="text-sm text-gray-700">
                  <div><span className="font-semibold">Role:</span> {event.actor_role}</div>
                  <div><span className="font-semibold">Language:</span> {event.language_context}</div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'integrations' && (
        <div className="space-y-3">
          <h3 className="font-bold">Third-Party Integrations</h3>
          <p className="text-sm text-gray-600">No implicit sharing allowed. All third-party sharing requires explicit consent.</p>
          {integrations.length === 0 ? (
            <div className="text-gray-600 text-center py-8">No third-party integrations</div>
          ) : (
            integrations.map((integration) => (
              <div key={integration.id} className="border border-gray-200 rounded p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold">{integration.integration_name}</h4>
                    <div className="text-sm text-gray-600">{integration.third_party_name}</div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    integration.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {integration.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-sm text-gray-700 space-y-1">
                  <div><span className="font-semibold">Type:</span> {integration.integration_type}</div>
                  <div><span className="font-semibold">Purpose:</span> {integration.purpose}</div>
                  <div><span className="font-semibold">Consent Required:</span> {integration.consent_domain_required}</div>
                  <div><span className="font-semibold">Legal Basis:</span> {integration.legal_basis}</div>
                  <div><span className="font-semibold">Retention:</span> {integration.data_retention_period}</div>
                  {integration.privacy_policy_url && (
                    <div>
                      <a
                        href={integration.privacy_policy_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        Privacy Policy
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'retention' && (
        <DataRetentionTransparency />
      )}
    </div>
  );
}
