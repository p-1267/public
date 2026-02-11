import { useState, useEffect } from 'react';
import { useAnalytics } from '../hooks/useAnalytics';

export function AnalyticsInsightsPanel() {
  const [domains, setDomains] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [insights, setInsights] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { getAnalyticsDomains, getInsightsByDomain } = useAnalytics();

  useEffect(() => {
    loadDomains();
  }, []);

  useEffect(() => {
    if (selectedDomain) {
      loadInsights(selectedDomain);
    }
  }, [selectedDomain]);

  const loadDomains = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const data = await getAnalyticsDomains();
      setDomains(data.domains || []);
      if (data.domains && data.domains.length > 0) {
        setSelectedDomain(data.domains[0].domain_id);
      }
    } catch (err) {
      console.error('Failed to load analytics domains:', err);
      setMessage({ type: 'error', text: 'Failed to load analytics domains' });
    } finally {
      setLoading(false);
    }
  };

  const loadInsights = async (domainId: string) => {
    try {
      setLoading(true);
      setMessage(null);
      const data = await getInsightsByDomain(domainId);
      setInsights(data.insights || []);
    } catch (err) {
      console.error('Failed to load insights:', err);
      setMessage({ type: 'error', text: 'Failed to load insights' });
    } finally {
      setLoading(false);
    }
  };

  const getInsightTypeBadge = (type: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      DESCRIPTIVE: { color: 'bg-blue-100 text-blue-800', label: 'Descriptive (What Happened)' },
      DIAGNOSTIC: { color: 'bg-green-100 text-green-800', label: 'Diagnostic (Why It Happened)' },
      PREDICTIVE: { color: 'bg-orange-100 text-orange-800', label: 'Predictive (Risk Trends)' }
    };
    const badge = badges[type] || { color: 'bg-gray-100 text-gray-800', label: type };
    return <span className={`px-2 py-1 rounded text-xs font-bold ${badge.color}`}>{badge.label}</span>;
  };

  const getConfidenceBadge = (level: number) => {
    const percentage = Math.round(level * 100);
    let color = 'bg-gray-100 text-gray-800';
    if (percentage >= 90) color = 'bg-green-100 text-green-800';
    else if (percentage >= 70) color = 'bg-blue-100 text-blue-800';
    else if (percentage >= 50) color = 'bg-yellow-100 text-yellow-800';
    else color = 'bg-red-100 text-red-800';

    return <span className={`px-2 py-1 rounded text-xs font-bold ${color}`}>Confidence: {percentage}%</span>;
  };

  const getDomainDisplayName = (name: string) => {
    const names: Record<string, string> = {
      CARE_DELIVERY_TRENDS: 'Care Delivery Trends',
      WORKFORCE_UTILIZATION: 'Workforce Utilization',
      ATTENDANCE_PATTERNS: 'Attendance Patterns',
      DEVICE_RELIABILITY: 'Device Reliability',
      INCIDENT_FREQUENCY: 'Incident Frequency',
      COMPLIANCE_INDICATORS: 'Compliance Indicators'
    };
    return names[name] || name;
  };

  if (loading && domains.length === 0) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-gray-600">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Analytics, Insights & Non-Executing Intelligence</h2>

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
          Analytics explain what happened and what might happen — they never decide what must happen.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 border-r pr-4">
          <h3 className="font-bold mb-4">Analytics Domains</h3>
          <div className="space-y-2">
            {domains.map((domain) => (
              <button
                key={domain.domain_id}
                onClick={() => setSelectedDomain(domain.domain_id)}
                className={`w-full text-left p-3 rounded border transition-colors ${
                  selectedDomain === domain.domain_id
                    ? 'bg-blue-50 border-blue-300 text-blue-800'
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
              >
                <div className="font-semibold text-sm">{getDomainDisplayName(domain.domain_name)}</div>
                <div className="text-xs text-gray-600 mt-1">{domain.domain_description}</div>
                <div className="mt-2 space-y-1">
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-green-600">✓</span>
                    <span className="text-gray-600">Read-only</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-red-600">✗</span>
                    <span className="text-gray-600">No actions</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="text-red-600">✗</span>
                    <span className="text-gray-600">No blocking</span>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800">
            <p className="font-bold mb-1">Enforcement Rules:</p>
            <ul className="space-y-1">
              <li>• Analytics are read-only observers</li>
              <li>• Insights NEVER execute actions</li>
              <li>• Analytics do NOT block workflows</li>
              <li>• No analytics may override policy</li>
              <li>• Separation: Insight ≠ Enforcement</li>
            </ul>
          </div>
        </div>

        <div className="col-span-2">
          {selectedDomain && (
            <>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold">Insights</h3>
                <span className="text-xs text-gray-600 bg-blue-50 px-2 py-1 rounded">
                  Read-Only Observations
                </span>
              </div>

              {loading ? (
                <div className="text-gray-600 text-center py-8">Loading insights...</div>
              ) : insights.length === 0 ? (
                <div className="text-gray-600 text-center py-8">No insights available</div>
              ) : (
                <div className="space-y-4">
                  {insights.map((insight) => (
                    <div key={insight.insight_id} className="border border-gray-200 rounded p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-blue-600">Insight</span>
                            {getInsightTypeBadge(insight.insight_type)}
                            {getConfidenceBadge(insight.confidence_level)}
                          </div>
                          <h4 className="font-bold text-lg">{insight.insight_title}</h4>
                        </div>
                      </div>

                      <p className="text-gray-700 mb-3">{insight.insight_summary}</p>

                      <div className="border-t pt-3 mt-3 space-y-2">
                        {insight.is_stale && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 font-bold">
                              ⚠ STALE DATA
                            </span>
                            <span className="text-gray-600">Data freshness threshold exceeded</span>
                          </div>
                        )}
                        {insight.is_incomplete && (
                          <div className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-1 rounded bg-orange-100 text-orange-800 font-bold">
                              ⚠ INCOMPLETE DATASET
                            </span>
                            <span className="text-gray-600">Some data sources unavailable</span>
                          </div>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span>Generated: {new Date(insight.generated_at).toLocaleString()}</span>
                          {insight.data_freshness_timestamp && (
                            <span>Fresh as of: {new Date(insight.data_freshness_timestamp).toLocaleString()}</span>
                          )}
                        </div>
                      </div>

                      <div className="border-t pt-3 mt-3">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className={insight.is_read_only ? 'text-green-600' : 'text-red-600'}>
                              {insight.is_read_only ? '✓' : '✗'}
                            </span>
                            <span className="text-gray-600">Read-only</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={!insight.can_trigger_action ? 'text-green-600' : 'text-red-600'}>
                              {!insight.can_trigger_action ? '✓' : '✗'}
                            </span>
                            <span className="text-gray-600">Cannot trigger actions</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="bg-red-50 border border-red-200 rounded p-4 mt-6">
        <p className="text-sm text-red-800 font-semibold">Enforcement Rules:</p>
        <ul className="text-sm text-red-800 mt-2 space-y-1">
          <li>• Analytics are read-only observers</li>
          <li>• Insights MUST NEVER execute actions</li>
          <li>• Analytics MUST NOT block workflows</li>
          <li>• No analytics output may override policy</li>
          <li>• Separation between Insight and Enforcement is mandatory</li>
          <li>• Analytics consume ONLY: Sealed care records, Sealed attendance records, Archived operational data, External observations (read-only)</li>
          <li>• No live or mutable data allowed</li>
          <li>• Insight types: DESCRIPTIVE (what happened), DIAGNOSTIC (why it happened), PREDICTIVE (risk trends)</li>
          <li>• No prescriptive or executing insights allowed</li>
          <li>• Insights visible to: AGENCY_ADMIN, SUPERVISOR</li>
          <li>• Family and caregivers: View-only summaries if explicitly permitted</li>
          <li>• No operational intelligence exposed by default</li>
          <li>• Insights MUST be clearly labeled as "Insights"</li>
          <li>• No language implying obligation or requirement</li>
          <li>• Confidence levels must be displayed</li>
          <li>• Stale data MUST be labeled</li>
          <li>• Incomplete datasets MUST be disclosed</li>
          <li>• If analytics generation fails: Core system remains unaffected, Failure logged, Clear error surfaced to admins, No cascading impact allowed</li>
        </ul>
      </div>
    </div>
  );
}
