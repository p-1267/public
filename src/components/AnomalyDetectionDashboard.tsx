import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Anomaly {
  id: string;
  attendance_id: string;
  anomaly_type: string;
  severity: string;
  reason: string;
  detected_at: string;
  acknowledged: boolean;
  acknowledged_by?: string;
}

export function AnomalyDetectionDashboard() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unacknowledged'>('unacknowledged');

  useEffect(() => {
    loadAnomalies();

    const channel = supabase
      .channel('anomaly-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance_anomalies'
        },
        () => {
          console.log('[AnomalyDetectionDashboard] Real-time update received');
          loadAnomalies();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [filter]);

  const loadAnomalies = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_attendance_anomalies', {
        p_only_unacknowledged: filter === 'unacknowledged'
      });

      if (error) throw error;
      setAnomalies(data || []);
    } catch (err) {
      console.error('Failed to load anomalies:', err);
    } finally {
      setLoading(false);
    }
  };

  const acknowledgeAnomaly = async (anomalyId: string) => {
    try {
      const { error } = await supabase.rpc('acknowledge_attendance_anomaly', {
        p_anomaly_id: anomalyId,
        p_acknowledgment_notes: 'Reviewed and verified'
      });

      if (error) throw error;
      await loadAnomalies();
    } catch (err) {
      console.error('Failed to acknowledge anomaly:', err);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-gray-600">Loading anomalies...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Attendance Anomaly Detection</h2>
          <p className="text-sm text-gray-600 mt-1">
            Geolocation validation, pattern detection, and fraud prevention
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('unacknowledged')}
            className={`px-4 py-2 rounded ${
              filter === 'unacknowledged'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            Unacknowledged ({anomalies.filter(a => !a.acknowledged).length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {anomalies.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">✅</div>
          <div className="text-xl font-semibold text-gray-700">No Anomalies Detected</div>
          <div className="text-sm text-gray-600 mt-2">
            All attendance records pass validation
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {anomalies.map((anomaly) => (
            <div
              key={anomaly.id}
              className={`border-2 rounded-lg p-4 ${getSeverityColor(anomaly.severity)}`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{anomaly.anomaly_type}</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${getSeverityColor(anomaly.severity)}`}>
                      {anomaly.severity}
                    </span>
                  </div>
                  <div className="text-sm mt-1">{anomaly.reason}</div>
                </div>
                {!anomaly.acknowledged && (
                  <button
                    onClick={() => acknowledgeAnomaly(anomaly.id)}
                    className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-semibold"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
              <div className="text-xs text-gray-600 mt-2">
                Detected: {new Date(anomaly.detected_at).toLocaleString()}
                {anomaly.acknowledged && anomaly.acknowledged_by && (
                  <span className="ml-4">✓ Acknowledged by {anomaly.acknowledged_by}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 bg-blue-50 border border-blue-200 rounded p-4">
        <div className="text-sm font-bold text-blue-900 mb-2">Anomaly Detection Logic:</div>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Geolocation validation (flags if &gt;5km from resident address)</li>
          <li>• Clock-in/out pattern analysis (unusual timing)</li>
          <li>• Duplicate event detection (same user, same timestamp)</li>
          <li>• Requires manual supervisor review for resolution</li>
        </ul>
      </div>
    </div>
  );
}
