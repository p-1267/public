import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface RetentionPolicy {
  data_category: string;
  description: string;
  retention_period: string;
  retention_days: number;
  can_request_deletion: boolean;
  legal_hold: boolean;
  next_auto_archive: string | null;
  records_count: number;
}

interface DataRetentionTransparencyProps {
  residentId?: string;
  userId?: string;
}

export function DataRetentionTransparency({ residentId, userId }: DataRetentionTransparencyProps) {
  const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRetentionPolicies();
  }, [residentId, userId]);

  async function loadRetentionPolicies() {
    setLoading(true);

    const mockPolicies: RetentionPolicy[] = [
      {
        data_category: 'Care Documentation',
        description: 'Task completion records, evidence photos, voice notes, vital signs',
        retention_period: '7 years',
        retention_days: 2555,
        can_request_deletion: false,
        legal_hold: true,
        next_auto_archive: new Date(Date.now() + 365 * 6 * 24 * 3600000).toISOString(),
        records_count: 3247
      },
      {
        data_category: 'Medication Administration Records',
        description: 'All medication administration logs, refusals, and related evidence',
        retention_period: '7 years',
        retention_days: 2555,
        can_request_deletion: false,
        legal_hold: true,
        next_auto_archive: new Date(Date.now() + 365 * 6 * 24 * 3600000).toISOString(),
        records_count: 1832
      },
      {
        data_category: 'Incident Reports',
        description: 'Falls, injuries, behavioral events, and investigation records',
        retention_period: '10 years',
        retention_days: 3650,
        can_request_deletion: false,
        legal_hold: true,
        next_auto_archive: new Date(Date.now() + 365 * 9 * 24 * 3600000).toISOString(),
        records_count: 47
      },
      {
        data_category: 'Family Communication',
        description: 'Messages, announcements, read receipts',
        retention_period: '3 years',
        retention_days: 1095,
        can_request_deletion: true,
        legal_hold: false,
        next_auto_archive: new Date(Date.now() + 365 * 2 * 24 * 3600000).toISOString(),
        records_count: 892
      },
      {
        data_category: 'Analytics & Insights',
        description: 'Aggregated patterns, trends, system-generated insights',
        retention_period: '5 years',
        retention_days: 1825,
        can_request_deletion: false,
        legal_hold: false,
        next_auto_archive: new Date(Date.now() + 365 * 4 * 24 * 3600000).toISOString(),
        records_count: 567
      },
      {
        data_category: 'Device Sensor Data',
        description: 'Raw sensor readings, device telemetry, health data',
        retention_period: '2 years',
        retention_days: 730,
        can_request_deletion: true,
        legal_hold: false,
        next_auto_archive: new Date(Date.now() + 365 * 1 * 24 * 3600000).toISOString(),
        records_count: 12453
      },
      {
        data_category: 'Login & Access Logs',
        description: 'Authentication history, session records, access audit trail',
        retention_period: '1 year',
        retention_days: 365,
        can_request_deletion: false,
        legal_hold: false,
        next_auto_archive: new Date(Date.now() + 180 * 24 * 3600000).toISOString(),
        records_count: 2341
      }
    ];

    setPolicies(mockPolicies);
    setLoading(false);
  }

  function getDaysUntilArchive(dateStr: string | null): string {
    if (!dateStr) return 'Not scheduled';
    const days = Math.floor((new Date(dateStr).getTime() - Date.now()) / (24 * 3600000));
    if (days < 30) return `${days} days`;
    if (days < 365) return `${Math.floor(days / 30)} months`;
    return `${Math.floor(days / 365)} years`;
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading retention policies...</div>;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Data Retention Transparency</h3>
        <p className="text-xs text-gray-500 mt-1">
          How long we keep your data and why
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {policies.map((policy, index) => (
          <div key={index} className="px-4 py-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">{policy.data_category}</div>
                <div className="text-xs text-gray-600 mt-1">{policy.description}</div>
              </div>
              {policy.legal_hold && (
                <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800 whitespace-nowrap">
                  Legal Hold
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 mt-3 text-sm">
              <div className="px-3 py-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Retention Period</div>
                <div className="font-medium text-gray-900 mt-1">{policy.retention_period}</div>
              </div>
              <div className="px-3 py-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Records Held</div>
                <div className="font-medium text-gray-900 mt-1">{policy.records_count.toLocaleString()}</div>
              </div>
              <div className="px-3 py-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Next Archive</div>
                <div className="font-medium text-gray-900 mt-1">{getDaysUntilArchive(policy.next_auto_archive)}</div>
              </div>
            </div>

            <div className="mt-3 flex items-start gap-2 text-xs">
              {policy.legal_hold ? (
                <div className="flex-1 px-2 py-1 bg-blue-50 rounded text-blue-800">
                  🔒 Required by law to retain for compliance and legal protection
                </div>
              ) : (
                <div className="flex-1 px-2 py-1 bg-gray-50 rounded text-gray-700">
                  Retained for operational and quality purposes
                </div>
              )}
            </div>

            {policy.can_request_deletion && !policy.legal_hold && (
              <div className="mt-2 px-2 py-1 bg-green-50 rounded text-xs text-green-800">
                ✓ You can request early deletion of this data (subject to review)
              </div>
            )}

            {!policy.can_request_deletion && (
              <div className="mt-2 text-xs text-gray-500 italic">
                Cannot be deleted early due to {policy.legal_hold ? 'legal requirements' : 'operational needs'}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
        <div className="text-xs text-gray-700 space-y-1">
          <p className="font-medium">What happens after retention period:</p>
          <ul className="ml-4 space-y-1 text-gray-600">
            <li>• Data is automatically moved to secure archive storage</li>
            <li>• Access restricted to compliance and legal requests only</li>
            <li>• After archive period, data is permanently and securely erased</li>
            <li>• You will receive notice 30 days before any data is archived or erased</li>
          </ul>
        </div>
      </div>

      <div className="px-4 py-3 bg-blue-50 border-t border-blue-200 text-xs text-blue-800">
        💡 Full data retention policy available in Settings → Privacy → Data Retention
      </div>
    </div>
  );
}
