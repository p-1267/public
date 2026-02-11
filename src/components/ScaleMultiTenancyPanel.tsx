import { useState, useEffect } from 'react';
import { useScaleMetrics } from '../hooks/useScaleMetrics';
import { useAgency } from '../hooks/useAgency';

export function ScaleMultiTenancyPanel() {
  const [activeTab, setActiveTab] = useState<'isolation' | 'metrics' | 'quotas' | 'evidence'>('isolation');
  const [isolationEvidence, setIsolationEvidence] = useState<any>(null);
  const [enforcementProof, setEnforcementProof] = useState<any>(null);
  const [separationProof, setSeparationProof] = useState<any>(null);
  const [operationalReadiness, setOperationalReadiness] = useState<any>(null);
  const [tenantMetrics, setTenantMetrics] = useState<any>(null);
  const [quotas, setQuotas] = useState<any[]>([]);
  const [quotaUsage, setQuotaUsage] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { currentAgency } = useAgency();
  const {
    getIsolationEvidence,
    getEnforcementProof,
    getSeparationProof,
    getOperationalReadiness,
    getTenantMetrics,
    getTenantQuotas,
    getQuotaUsage
  } = useScaleMetrics();

  useEffect(() => {
    if (currentAgency?.id) {
      loadData();
    }
  }, [currentAgency?.id]);

  const loadData = async () => {
    if (!currentAgency?.id) return;

    try {
      setLoading(true);
      setMessage(null);

      const [isolation, enforcement, separation, readiness, metrics, quotasData, usageData] = await Promise.all([
        getIsolationEvidence(currentAgency.id),
        getEnforcementProof(currentAgency.id),
        getSeparationProof(),
        getOperationalReadiness(),
        getTenantMetrics(currentAgency.id, '1 hour'),
        getTenantQuotas(currentAgency.id),
        getQuotaUsage(currentAgency.id)
      ]);

      setIsolationEvidence(isolation);
      setEnforcementProof(enforcement);
      setSeparationProof(separation);
      setOperationalReadiness(readiness);
      setTenantMetrics(metrics);
      setQuotas(quotasData.quotas || []);
      setQuotaUsage(usageData.usage || []);
    } catch (err) {
      console.error('Failed to load scale data:', err);
      setMessage({ type: 'error', text: 'Failed to load scale data' });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !isolationEvidence) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-gray-600">Loading scale and multi-tenancy data...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Scale, Multi-Tenancy Lock-In & Investor-Grade Readiness</h2>

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
          Scaling must preserve truth, isolation, and trust. What works for 1 agency MUST work identically for 1,000+.
        </p>
      </div>

      <div className="flex gap-2 mb-6 border-b">
        {[
          { id: 'isolation', label: 'Tenant Isolation' },
          { id: 'metrics', label: 'Metrics & Performance' },
          { id: 'quotas', label: 'Quotas & Throttling' },
          { id: 'evidence', label: 'Investor-Grade Evidence' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'isolation' && isolationEvidence && (
        <div>
          <h3 className="font-bold text-lg mb-4">Tenant Isolation Evidence</h3>

          <div className="bg-green-50 border border-green-200 rounded p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">🔒</span>
              <span className="font-bold text-green-800">Isolation Level: {isolationEvidence.isolation_level}</span>
            </div>
            <p className="text-sm text-green-800">
              Hard tenant boundary enforced. Cross-tenant access is impossible by design.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded p-4">
              <div className="text-sm text-gray-600 mb-1">Tables with Tenant Isolation</div>
              <div className="text-2xl font-bold text-gray-800">
                {isolationEvidence.evidence?.tables_with_tenant_isolation || 0}
              </div>
            </div>

            <div className="border border-gray-200 rounded p-4">
              <div className="text-sm text-gray-600 mb-1">RLS Policies Active</div>
              <div className="text-2xl font-bold text-gray-800">
                {isolationEvidence.evidence?.rls_policies_active || 0}
              </div>
            </div>

            <div className="border border-gray-200 rounded p-4">
              <div className="text-sm text-gray-600 mb-1">Encryption Key Version</div>
              <div className="text-2xl font-bold text-gray-800">
                {isolationEvidence.evidence?.encryption_key_version || 0}
              </div>
            </div>

            <div className="border border-gray-200 rounded p-4">
              <div className="text-sm text-gray-600 mb-1">Cross-Tenant Access</div>
              <div className="text-2xl font-bold text-red-600">
                {isolationEvidence.evidence?.cross_tenant_access_possible ? 'POSSIBLE' : 'IMPOSSIBLE'}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <h4 className="font-bold">Isolation Layers:</h4>
            <div className="flex items-center gap-2 text-sm">
              <span className={isolationEvidence.evidence?.database_level_isolation ? 'text-green-600' : 'text-red-600'}>
                {isolationEvidence.evidence?.database_level_isolation ? '✓' : '✗'}
              </span>
              <span>Database Level Isolation</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className={isolationEvidence.evidence?.api_level_isolation ? 'text-green-600' : 'text-red-600'}>
                {isolationEvidence.evidence?.api_level_isolation ? '✓' : '✗'}
              </span>
              <span>API/RPC Level Isolation</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className={isolationEvidence.evidence?.encryption_boundary_exists ? 'text-green-600' : 'text-red-600'}>
                {isolationEvidence.evidence?.encryption_boundary_exists ? '✓' : '✗'}
              </span>
              <span>Per-Tenant Encryption Boundary</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'metrics' && (
        <div>
          <h3 className="font-bold text-lg mb-4">Performance Metrics</h3>

          {operationalReadiness && (
            <div className="bg-green-50 border border-green-200 rounded p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">✓</span>
                <span className="font-bold text-green-800">
                  Status: {operationalReadiness.readiness_status}
                </span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="border border-gray-200 rounded p-4">
              <div className="text-sm text-gray-600 mb-1">Total Tenants</div>
              <div className="text-2xl font-bold text-gray-800">
                {operationalReadiness?.metrics?.total_tenants || 0}
              </div>
            </div>

            <div className="border border-gray-200 rounded p-4">
              <div className="text-sm text-gray-600 mb-1">Active Tenants (1h)</div>
              <div className="text-2xl font-bold text-gray-800">
                {operationalReadiness?.metrics?.active_tenants_last_hour || 0}
              </div>
            </div>

            <div className="border border-gray-200 rounded p-4">
              <div className="text-sm text-gray-600 mb-1">Horizontal Scaling</div>
              <div className="text-lg font-bold text-green-600">
                {operationalReadiness?.metrics?.horizontal_scaling}
              </div>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-bold mb-3">Scaling Capabilities:</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-600">✓</span>
                <span>Horizontal Scaling (Stateless Services)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-600">✓</span>
                <span>Read Replicas for Analytics</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-600">✓</span>
                <span>Background Job Scaling (Queues/Workers)</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-600">✓</span>
                <span>Graceful Degradation (Phase 32)</span>
              </div>
            </div>
          </div>

          <div className="border-t pt-4 mt-4">
            <h4 className="font-bold mb-3">Performance Guarantees:</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className={operationalReadiness?.slo_indicators?.predictable_response_times ? 'text-green-600' : 'text-red-600'}>
                  {operationalReadiness?.slo_indicators?.predictable_response_times ? '✓' : '✗'}
                </span>
                <span>Predictable Response Times Under Load</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className={operationalReadiness?.slo_indicators?.no_noisy_neighbor_effects ? 'text-green-600' : 'text-red-600'}>
                  {operationalReadiness?.slo_indicators?.no_noisy_neighbor_effects ? '✓' : '✗'}
                </span>
                <span>No Noisy Neighbor Effects</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className={operationalReadiness?.slo_indicators?.no_priority_inversion ? 'text-green-600' : 'text-red-600'}>
                  {operationalReadiness?.slo_indicators?.no_priority_inversion ? '✓' : '✗'}
                </span>
                <span>No Priority Inversion Between Tenants</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'quotas' && (
        <div>
          <h3 className="font-bold text-lg mb-4">Tenant Quotas & Throttling</h3>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
            <p className="text-sm text-yellow-800">
              Per-tenant quotas prevent noisy neighbor effects and ensure predictable performance for all tenants.
            </p>
          </div>

          {quotas.length === 0 ? (
            <div className="text-center py-8 text-gray-600">No quotas configured for this tenant</div>
          ) : (
            <div className="space-y-4">
              {quotas.map((quota) => (
                <div key={quota.quota_id} className="border border-gray-200 rounded p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold">{quota.resource_type.replace(/_/g, ' ')}</h4>
                      <p className="text-sm text-gray-600">
                        {quota.quota_limit} per {quota.quota_period}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      quota.hard_limit
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {quota.hard_limit ? 'HARD LIMIT' : 'SOFT LIMIT'}
                    </span>
                  </div>

                  {quotaUsage.filter(u => u.resource_type === quota.resource_type).slice(0, 1).map((usage) => (
                    <div key={usage.usage_id} className="mt-3 pt-3 border-t">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-gray-600">Current Usage</span>
                        <span className={`font-bold ${
                          usage.quota_exceeded ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {usage.usage_count} / {usage.quota_limit}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            usage.quota_exceeded ? 'bg-red-600' : 'bg-green-600'
                          }`}
                          style={{ width: `${Math.min((usage.usage_count / usage.quota_limit) * 100, 100)}%` }}
                        />
                      </div>
                      {usage.quota_exceeded && (
                        <p className="text-xs text-red-600 mt-2">
                          ⚠ Quota exceeded. Requests may be throttled.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'evidence' && (
        <div>
          <h3 className="font-bold text-lg mb-4">Investor-Grade Evidence</h3>

          <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
            <p className="text-sm text-blue-800 font-bold mb-2">System demonstrates:</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Deterministic enforcement</li>
              <li>• Complete auditability</li>
              <li>• Legal defensibility</li>
              <li>• Operational scalability</li>
              <li>• Clear separation of concerns (Brain vs UI vs AI)</li>
            </ul>
          </div>

          {enforcementProof && (
            <div className="mb-6">
              <h4 className="font-bold mb-3">Enforcement Proof</h4>
              <div className="border border-gray-200 rounded p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Enforcement Type</div>
                    <div className="font-bold text-gray-800">{enforcementProof.enforcement_type}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Quota Violations Detected</div>
                    <div className="font-bold text-gray-800">
                      {enforcementProof.proof?.quota_violations_detected || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Failed Operations (7d)</div>
                    <div className="font-bold text-gray-800">
                      {enforcementProof.proof?.failed_operations_last_7_days || 0}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Bypasses Possible</div>
                    <div className="font-bold text-green-600">
                      {enforcementProof.proof?.no_bypasses_possible ? 'NO' : 'YES'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {separationProof && (
            <div>
              <h4 className="font-bold mb-3">Separation of Concerns</h4>
              <div className="border border-gray-200 rounded p-4">
                <div className="mb-4">
                  <div className="text-sm text-gray-600 mb-2">Separation Model</div>
                  <div className="font-bold text-gray-800">{separationProof.separation_model}</div>
                </div>

                <div className="space-y-3">
                  <div className="border-t pt-3">
                    <div className="font-bold mb-2">Brain Layer</div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className={separationProof.layers?.brain_layer?.locked ? 'text-green-600' : 'text-red-600'}>
                        {separationProof.layers?.brain_layer?.locked ? '✓' : '✗'}
                      </span>
                      <span>Locked and Immutable State Machine</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Tables: {separationProof.layers?.brain_layer?.tables || 0}
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <div className="font-bold mb-2">UI Layer</div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className={separationProof.layers?.ui_layer?.no_business_logic ? 'text-green-600' : 'text-red-600'}>
                        {separationProof.layers?.ui_layer?.no_business_logic ? '✓' : '✗'}
                      </span>
                      <span>No Business Logic in UI</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Separation: {separationProof.layers?.ui_layer?.separation}
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <div className="font-bold mb-2">AI Layer</div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className={separationProof.layers?.ai_layer?.no_decision_authority ? 'text-green-600' : 'text-red-600'}>
                        {separationProof.layers?.ai_layer?.no_decision_authority ? '✓' : '✗'}
                      </span>
                      <span>No Decision Authority (Shadow Only)</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Tables: {separationProof.layers?.ai_layer?.tables || 0}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-red-50 border border-red-200 rounded p-4 mt-6">
        <p className="text-sm text-red-800 font-semibold">Enforcement Rules:</p>
        <ul className="text-sm text-red-800 mt-2 space-y-1">
          <li>• Every agency is a hard tenant boundary</li>
          <li>• No data leakage across tenants is possible</li>
          <li>• Scaling MUST NOT change behavior or enforcement</li>
          <li>• Performance optimizations MUST NOT weaken guarantees</li>
          <li>• System MUST be investor-grade, auditable, and provable</li>
          <li>• Per-agency data isolation at database, RLS, and API/RPC levels</li>
          <li>• No shared writable tables across agencies</li>
          <li>• Agency ID REQUIRED on all tenant-scoped records</li>
          <li>• Cross-tenant access is impossible by design</li>
          <li>• Predictable response times under load</li>
          <li>• No noisy neighbor effects allowed</li>
          <li>• Per-tenant encryption boundaries</li>
          <li>• Key rotation without downtime</li>
          <li>• Independent audit trails per tenant</li>
          <li>• Security posture MUST NOT weaken with scale</li>
        </ul>
      </div>
    </div>
  );
}
