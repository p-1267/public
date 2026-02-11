import { useState, useEffect } from 'react';
import { useDataRetention } from '../hooks/useDataRetention';

export function DataRetentionPanel() {
  const [activeTab, setActiveTab] = useState<'policies' | 'archival' | 'erasure' | 'holds'>('policies');
  const [legalHolds, setLegalHolds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { getActiveLegalHolds } = useDataRetention();

  useEffect(() => {
    if (activeTab === 'holds') {
      loadLegalHolds();
    }
  }, [activeTab]);

  const loadLegalHolds = async () => {
    try {
      setLoading(true);
      setMessage(null);
      const data = await getActiveLegalHolds();
      setLegalHolds(data.holds || []);
    } catch (err) {
      console.error('Failed to load legal holds:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDataCategoryBadge = (category: string) => {
    const badges: Record<string, { color: string; label: string }> = {
      MEDICAL_RECORD: { color: 'bg-red-100 text-red-800', label: 'Medical' },
      CARE_LOG: { color: 'bg-blue-100 text-blue-800', label: 'Care Log' },
      ATTENDANCE_RECORD: { color: 'bg-green-100 text-green-800', label: 'Attendance' },
      FINANCIAL_RECORD: { color: 'bg-yellow-100 text-yellow-800', label: 'Financial' },
      COMMUNICATION_RECORD: { color: 'bg-gray-100 text-gray-800', label: 'Communication' },
      AUDIT_RECORD: { color: 'bg-gray-100 text-gray-800', label: 'Audit' },
      SYSTEM_LOG: { color: 'bg-gray-100 text-gray-800', label: 'System Log' }
    };
    const badge = badges[category] || { color: 'bg-gray-100 text-gray-800', label: category };
    return <span className={`px-2 py-1 rounded text-xs font-bold ${badge.color}`}>{badge.label}</span>;
  };

  if (loading && activeTab === 'holds') {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-gray-600">Loading data retention management...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Data Retention, Archival & Right-to-Erasure</h2>

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
          If the law requires retention, data stays. If the law requires erasure, erasure is provable. Data retention is jurisdiction-driven. Deletion is conditional, not automatic. Audit and legal records are never erased.
        </p>
      </div>

      <div className="flex border-b mb-6">
        <button
          onClick={() => setActiveTab('policies')}
          className={`px-4 py-2 font-semibold ${
            activeTab === 'policies'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Retention Policies
        </button>
        <button
          onClick={() => setActiveTab('archival')}
          className={`px-4 py-2 font-semibold ${
            activeTab === 'archival'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Archival
        </button>
        <button
          onClick={() => setActiveTab('erasure')}
          className={`px-4 py-2 font-semibold ${
            activeTab === 'erasure'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Erasure Requests
        </button>
        <button
          onClick={() => setActiveTab('holds')}
          className={`px-4 py-2 font-semibold ${
            activeTab === 'holds'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Legal Holds
        </button>
      </div>

      {activeTab === 'policies' && (
        <div>
          <h3 className="font-bold mb-4">Jurisdictional Retention Policies</h3>
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-sm text-blue-800">
            Retention rules MUST be configurable but locked per jurisdiction. Each record MUST be classified as one of: MEDICAL_RECORD, CARE_LOG, ATTENDANCE_RECORD, FINANCIAL_RECORD, COMMUNICATION_RECORD, AUDIT_RECORD, SYSTEM_LOG. Retention behavior is category-specific.
          </div>

          <div className="space-y-4">
            <div className="border border-gray-200 rounded p-4">
              <h4 className="font-semibold mb-2">Data Categories</h4>
              <div className="grid grid-cols-2 gap-2">
                {['MEDICAL_RECORD', 'CARE_LOG', 'ATTENDANCE_RECORD', 'FINANCIAL_RECORD', 'COMMUNICATION_RECORD', 'AUDIT_RECORD', 'SYSTEM_LOG'].map(cat => (
                  <div key={cat} className="text-sm">
                    {getDataCategoryBadge(cat)}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
              <p className="font-semibold">Retention Configuration Rules:</p>
              <ul className="mt-2 space-y-1">
                <li>• Policies based on: Country, State/Province, Care context, Data category</li>
                <li>• Retention rules configurable but locked per jurisdiction</li>
                <li>• If law requires retention, data stays</li>
                <li>• Retention behavior is category-specific</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'archival' && (
        <div>
          <h3 className="font-bold mb-4">Archival Process (Non-Destructive)</h3>
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-sm text-blue-800">
            When retention period expires: Data moved to ARCHIVED state, Data becomes read-only, Data remains queryable for audits, Data excluded from active workflows. No deletion occurs at archival stage.
          </div>

          <div className="space-y-4">
            <div className="border border-gray-200 rounded p-4">
              <h4 className="font-semibold mb-3">Archival Process Steps</h4>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                  <div className="text-sm">
                    <div className="font-semibold">Data moved to ARCHIVED state</div>
                    <div className="text-gray-600">Retention state changes from ACTIVE to ARCHIVED</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                  <div className="text-sm">
                    <div className="font-semibold">Data becomes read-only</div>
                    <div className="text-gray-600">No modifications allowed, ensuring data integrity</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                  <div className="text-sm">
                    <div className="font-semibold">Data remains queryable</div>
                    <div className="text-gray-600">Available for audits and compliance queries</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">4</div>
                  <div className="text-sm">
                    <div className="font-semibold">Excluded from active workflows</div>
                    <div className="text-gray-600">Not shown in regular operations</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0">✓</div>
                  <div className="text-sm">
                    <div className="font-semibold text-green-600">No deletion occurs</div>
                    <div className="text-gray-600">Data preserved for legal/audit requirements</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'erasure' && (
        <div>
          <h3 className="font-bold mb-4">Right-to-Erasure (Conditional)</h3>
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-sm text-blue-800">
            Erasure MAY occur ONLY if: Jurisdiction allows, Data category permits, No legal hold exists, No audit dependency exists. If ANY condition fails → BLOCK erasure.
          </div>

          <div className="space-y-4">
            <div className="border border-red-200 bg-red-50 rounded p-4">
              <h4 className="font-semibold text-red-800 mb-3">Erasure Conditions (ALL must be satisfied)</h4>
              <div className="space-y-2 text-sm text-red-800">
                <div className="flex items-center gap-2">
                  <span className="font-bold">✓</span>
                  <span>Jurisdiction allows erasure</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">✓</span>
                  <span>Data category permits erasure</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">✓</span>
                  <span>No legal hold exists</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold">✓</span>
                  <span>No audit dependency exists</span>
                </div>
                <div className="mt-3 p-2 bg-red-100 rounded">
                  <span className="font-bold">If ANY condition fails → BLOCK erasure</span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded p-4">
              <h4 className="font-semibold mb-3">User Request Handling</h4>
              <div className="text-sm text-gray-700 space-y-2">
                <div>• Identity verification REQUIRED</div>
                <div>• Scope clearly defined</div>
                <div>• Jurisdiction evaluated</div>
                <div>• Outcome communicated clearly</div>
                <div>• No silent rejection</div>
              </div>
            </div>

            <div className="border border-gray-200 rounded p-4">
              <h4 className="font-semibold mb-3">Erasure Execution (Provable)</h4>
              <div className="text-sm text-gray-700 space-y-2">
                <div>• Record is cryptographically destroyed</div>
                <div>• Tombstone record created</div>
                <div>• Erasure reason logged</div>
                <div>• Actor logged</div>
                <div>• Timestamp logged</div>
                <div className="font-bold text-red-600">• Original content MUST NOT be recoverable</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'holds' && (
        <div>
          <h3 className="font-bold mb-4">Legal Holds (Override)</h3>
          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-sm text-blue-800">
            If legal hold is active: Erasure is blocked, Archival may proceed, Hold reason and authority logged.
          </div>

          {legalHolds.length === 0 ? (
            <div className="text-gray-600 text-center py-8">No active legal holds</div>
          ) : (
            <div className="space-y-4">
              {legalHolds.map((hold) => (
                <div key={hold.hold_id} className="border border-gray-200 rounded p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-bold">{hold.hold_id}</h4>
                      <div className="text-sm text-gray-600 mt-1">{hold.hold_reason}</div>
                    </div>
                    <span className="px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-800">ACTIVE</span>
                  </div>
                  <div className="text-xs text-gray-700 space-y-1">
                    <div><span className="font-semibold">Authority:</span> {hold.hold_authority}</div>
                    <div><span className="font-semibold">Reference:</span> {hold.hold_reference}</div>
                    <div><span className="font-semibold">Scope:</span> {hold.hold_scope}</div>
                    {hold.data_category && (
                      <div><span className="font-semibold">Data Category:</span> {getDataCategoryBadge(hold.data_category)}</div>
                    )}
                    <div className="flex gap-4 mt-2">
                      <span className={hold.blocks_erasure ? 'text-red-600 font-semibold' : 'text-gray-500'}>
                        {hold.blocks_erasure ? '🔒 Blocks Erasure' : 'Erasure Allowed'}
                      </span>
                      <span className={hold.blocks_archival ? 'text-red-600 font-semibold' : 'text-green-600'}>
                        {hold.blocks_archival ? '🔒 Blocks Archival' : '✓ Archival May Proceed'}
                      </span>
                    </div>
                    <div><span className="font-semibold">Applied:</span> {new Date(hold.applied_at).toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="bg-red-50 border border-red-200 rounded p-4 mt-6">
        <p className="text-sm text-red-800 font-semibold">Enforcement Rules:</p>
        <ul className="text-sm text-red-800 mt-2 space-y-1">
          <li>• Data retention is jurisdiction-driven (country, state/province, care context, data category)</li>
          <li>• Deletion is conditional, not automatic</li>
          <li>• Audit and legal records are NEVER erased (protected records)</li>
          <li>• Erasure requests must be verifiable and logged</li>
          <li>• No silent data loss is allowed</li>
          <li>• Retention rules MUST be configurable but locked per jurisdiction</li>
          <li>• When retention expires: Data archived (read-only, queryable, excluded from workflows)</li>
          <li>• No deletion at archival stage</li>
          <li>• Erasure ONLY if: Jurisdiction allows, Category permits, No legal hold, No audit dependency</li>
          <li>• If ANY erasure condition fails → BLOCK</li>
          <li>• Erasure execution: Cryptographic destruction, Tombstone created, NOT recoverable</li>
          <li>• Legal hold blocks erasure, archival may proceed</li>
          <li>• Identity verification REQUIRED for erasure requests</li>
          <li>• Outcome communicated clearly, no silent rejection</li>
          <li>• All retention, archival, and erasure events logged immutably</li>
        </ul>
      </div>
    </div>
  );
}
