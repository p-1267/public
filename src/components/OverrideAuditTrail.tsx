import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Override {
  id: string;
  shift_id: string;
  override_type: string;
  performed_by: string;
  performed_by_role: string;
  reason: string;
  before_value: any;
  after_value: any;
  created_at: string;
}

export function OverrideAuditTrail({ shiftId }: { shiftId?: string }) {
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOverride, setSelectedOverride] = useState<Override | null>(null);

  useEffect(() => {
    loadOverrides();
  }, [shiftId]);

  const loadOverrides = async () => {
    setLoading(true);
    try {
      if (shiftId) {
        const { data, error } = await supabase.rpc('get_shift_overrides', {
          p_shift_id: shiftId
        });
        if (error) throw error;
        setOverrides(data || []);
      } else {
        const { data, error } = await supabase
          .from('attendance_overrides')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        setOverrides(data || []);
      }
    } catch (err) {
      console.error('Failed to load overrides:', err);
    } finally {
      setLoading(false);
    }
  };

  const getOverrideTypeColor = (type: string) => {
    switch (type) {
      case 'TIME_CORRECTION': return 'bg-blue-100 text-blue-800';
      case 'MANUAL_ENTRY': return 'bg-yellow-100 text-yellow-800';
      case 'DELETION': return 'bg-red-100 text-red-800';
      case 'LOCATION_OVERRIDE': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-gray-600">Loading override history...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-2xl font-bold mb-4">Override Audit Trail</h2>
      <p className="text-sm text-gray-600 mb-6">
        Complete history of manual overrides and corrections. All changes are logged with before/after values for compliance.
      </p>

      {overrides.length === 0 ? (
        <div className="text-center py-8 text-gray-600">
          No overrides recorded
        </div>
      ) : (
        <div className="space-y-4">
          {overrides.map((override) => (
            <div
              key={override.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 cursor-pointer"
              onClick={() => setSelectedOverride(override)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className={`px-2 py-1 rounded text-xs font-bold ${getOverrideTypeColor(override.override_type)}`}>
                    {override.override_type.replace(/_/g, ' ')}
                  </span>
                  <div className="text-sm text-gray-600 mt-2">
                    By: <span className="font-semibold">{override.performed_by}</span> ({override.performed_by_role})
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(override.created_at).toLocaleString()}
                </div>
              </div>
              <div className="text-sm text-gray-700 mt-2">
                <span className="font-semibold">Reason:</span> {override.reason}
              </div>
              {selectedOverride?.id === override.id && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-bold text-gray-600 mb-1">BEFORE:</div>
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                        {JSON.stringify(override.before_value, null, 2)}
                      </pre>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-600 mb-1">AFTER:</div>
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-auto">
                        {JSON.stringify(override.after_value, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded p-4">
        <div className="text-sm font-bold text-yellow-900 mb-2">Compliance Notice:</div>
        <div className="text-sm text-yellow-800">
          All overrides are immutable once recorded. Before/after values provide audit trail for regulatory compliance.
          Supervisor role required for most override types.
        </div>
      </div>
    </div>
  );
}
