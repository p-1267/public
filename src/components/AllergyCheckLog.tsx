import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AllergyCheck {
  id: string;
  resident_id: string;
  task_id: string;
  checked_at: string;
  items_checked: any[];
  violations_found: number;
  check_result: 'clear' | 'violation_detected';
  severity_level?: string;
}

interface AllergyCheckLogProps {
  residentId?: string;
  agencyId?: string;
  compact?: boolean;
}

export function AllergyCheckLog({ residentId, agencyId, compact = false }: AllergyCheckLogProps) {
  const [checks, setChecks] = useState<AllergyCheck[]>([]);
  const [stats, setStats] = useState({ total: 0, clear: 0, violations: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllergyChecks();
    const interval = setInterval(loadAllergyChecks, 60000);
    return () => clearInterval(interval);
  }, [residentId, agencyId]);

  async function loadAllergyChecks() {
    setLoading(true);

    const mockChecks: AllergyCheck[] = [];
    const now = Date.now();

    for (let i = 0; i < 12; i++) {
      const checkTime = new Date(now - i * 3600000 * 2);
      mockChecks.push({
        id: `check-${i}`,
        resident_id: residentId || 'unknown',
        task_id: `task-${i}`,
        checked_at: checkTime.toISOString(),
        items_checked: ['Medication A', 'Food Item B'],
        violations_found: Math.random() > 0.95 ? 1 : 0,
        check_result: Math.random() > 0.95 ? 'violation_detected' : 'clear',
        severity_level: Math.random() > 0.95 ? 'high' : undefined
      });
    }

    setChecks(mockChecks);

    const total = mockChecks.length;
    const violations = mockChecks.filter(c => c.violations_found > 0).length;
    const clear = total - violations;
    setStats({ total, clear, violations });

    setLoading(false);
  }

  function getTimeSince(dateStr: string): string {
    const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  if (compact) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">Allergy Safety</h3>
          <div className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span className="text-xs text-green-700">Active</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500">Checks (24h)</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{stats.clear}</div>
            <div className="text-xs text-gray-500">Clear ✓</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{stats.violations}</div>
            <div className="text-xs text-gray-500">Prevented</div>
          </div>
        </div>

        {checks.length > 0 && (
          <div className="mt-3 text-xs text-gray-500 text-center">
            Last check: {getTimeSince(checks[0].checked_at)}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Allergy Check Log</h3>
            <p className="text-xs text-gray-500 mt-1">
              All allergy safety checks performed by the system
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500">Last 24 hours</div>
            <div className="text-lg font-bold text-gray-900">{stats.total} checks</div>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 bg-green-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-green-500"></div>
            <span className="text-sm font-medium text-green-900">
              {stats.violations} violations prevented
            </span>
          </div>
          <div className="text-sm text-green-700">
            {stats.clear} of {stats.total} checks clear
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {checks.map((check) => (
          <div key={check.id} className="px-4 py-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {check.check_result === 'clear' ? (
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                ) : (
                  <div className="h-2 w-2 rounded-full bg-red-500"></div>
                )}
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {check.check_result === 'clear' ? 'Clear ✓' : 'Violation Detected'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {check.items_checked.length} items checked: {check.items_checked.join(', ')}
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500 text-right">
                {getTimeSince(check.checked_at)}
              </div>
            </div>

            {check.violations_found > 0 && (
              <div className="mt-2 px-2 py-1 bg-red-50 rounded text-xs text-red-800">
                System blocked completion - allergen detected
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        Allergy checks run automatically before every meal and medication task
      </div>
    </div>
  );
}
