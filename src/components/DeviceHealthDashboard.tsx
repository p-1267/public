import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface DeviceHealth {
  device_id: string;
  device_name: string;
  device_type: string;
  health_status: 'healthy' | 'degraded' | 'critical' | 'offline';
  trust_score: number;
  battery_level: number | null;
  signal_strength: number | null;
  last_seen: string;
  error_count: number;
  data_quality_score: number;
  suspicious_activity: boolean;
}

interface DeviceHealthDashboardProps {
  agencyId?: string;
  residentId?: string;
}

export function DeviceHealthDashboard({ agencyId, residentId }: DeviceHealthDashboardProps) {
  const [devices, setDevices] = useState<DeviceHealth[]>([]);
  const [stats, setStats] = useState({ healthy: 0, degraded: 0, critical: 0, offline: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeviceHealth();
    const interval = setInterval(loadDeviceHealth, 60000);
    return () => clearInterval(interval);
  }, [agencyId, residentId]);

  async function loadDeviceHealth() {
    setLoading(true);

    let deviceQuery = supabase
      .from('device_registry')
      .select(`
        *,
        device_trust(trust_score, suspicious_activity_count, blocked_flag),
        device_health_log(health_status, battery_level, signal_strength, error_count, logged_at)
      `)
      .eq('is_active', true);

    if (agencyId) deviceQuery = deviceQuery.eq('agency_id', agencyId);
    if (residentId) deviceQuery = deviceQuery.eq('resident_id', residentId);

    const { data: deviceData } = await deviceQuery;

    if (deviceData) {
      const healthData: DeviceHealth[] = deviceData.map((device: any) => {
        const latestHealth = device.device_health_log?.[0] || {};
        const trust = device.device_trust?.[0] || {};

        const timeSinceLastSeen = Date.now() - new Date(latestHealth.logged_at || device.created_at).getTime();
        const isOffline = timeSinceLastSeen > 3600000;

        let healthStatus: DeviceHealth['health_status'] = 'healthy';
        if (isOffline) {
          healthStatus = 'offline';
        } else if (latestHealth.error_count > 5 || trust.trust_score < 50) {
          healthStatus = 'critical';
        } else if (latestHealth.error_count > 2 || trust.trust_score < 75) {
          healthStatus = 'degraded';
        }

        const dataQualityScore = calculateDataQuality(latestHealth, trust);

        return {
          device_id: device.id,
          device_name: device.device_name || 'Unknown Device',
          device_type: device.device_type,
          health_status: healthStatus,
          trust_score: trust.trust_score || 100,
          battery_level: latestHealth.battery_level,
          signal_strength: latestHealth.signal_strength,
          last_seen: latestHealth.logged_at || device.created_at,
          error_count: latestHealth.error_count || 0,
          data_quality_score: dataQualityScore,
          suspicious_activity: trust.suspicious_activity_count > 0 || trust.blocked_flag
        };
      });

      setDevices(healthData);

      const stats = {
        healthy: healthData.filter(d => d.health_status === 'healthy').length,
        degraded: healthData.filter(d => d.health_status === 'degraded').length,
        critical: healthData.filter(d => d.health_status === 'critical').length,
        offline: healthData.filter(d => d.health_status === 'offline').length
      };
      setStats(stats);
    }

    setLoading(false);
  }

  function calculateDataQuality(health: any, trust: any): number {
    let score = 100;

    if (health.error_count > 5) score -= 30;
    else if (health.error_count > 2) score -= 15;

    if (trust.trust_score < 50) score -= 30;
    else if (trust.trust_score < 75) score -= 15;

    if (health.signal_strength && health.signal_strength < 30) score -= 20;
    else if (health.signal_strength && health.signal_strength < 50) score -= 10;

    return Math.max(0, score);
  }

  function getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      healthy: 'bg-green-100 text-green-800 border-green-300',
      degraded: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      critical: 'bg-red-100 text-red-800 border-red-300',
      offline: 'bg-gray-100 text-gray-800 border-gray-300'
    };
    return colors[status] || colors.offline;
  }

  function getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      healthy: '✓',
      degraded: '⚠',
      critical: '🔴',
      offline: '⊗'
    };
    return icons[status] || '?';
  }

  function getTrustColor(score: number): string {
    if (score >= 90) return 'text-green-700';
    if (score >= 75) return 'text-yellow-700';
    return 'text-red-700';
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading device health...</div>;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Device Health Dashboard</h3>
        <p className="text-xs text-gray-500 mt-1">
          Real-time health and trust scoring for all paired devices
        </p>
      </div>

      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-700">{stats.healthy}</div>
            <div className="text-xs text-gray-600 mt-1">Healthy</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-700">{stats.degraded}</div>
            <div className="text-xs text-gray-600 mt-1">Degraded</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-700">{stats.critical}</div>
            <div className="text-xs text-gray-600 mt-1">Critical</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-700">{stats.offline}</div>
            <div className="text-xs text-gray-600 mt-1">Offline</div>
          </div>
        </div>
      </div>

      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {devices.map((device) => (
          <div key={device.device_id} className="px-4 py-3">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {device.device_name}
                  </span>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getStatusColor(device.health_status)}`}>
                    {getStatusIcon(device.health_status)} {device.health_status}
                  </span>
                  {device.suspicious_activity && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-red-100 text-red-800">
                      ⚠ Suspicious
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {device.device_type} • Last seen: {new Date(device.last_seen).toLocaleString()}
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${getTrustColor(device.trust_score)}`}>
                  {device.trust_score}
                </div>
                <div className="text-xs text-gray-500">Trust</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 text-sm">
              {device.battery_level !== null && (
                <div>
                  <div className="text-xs text-gray-500">Battery</div>
                  <div className={`font-medium mt-1 ${device.battery_level < 20 ? 'text-red-700' : 'text-gray-900'}`}>
                    {device.battery_level}%
                  </div>
                </div>
              )}
              {device.signal_strength !== null && (
                <div>
                  <div className="text-xs text-gray-500">Signal</div>
                  <div className={`font-medium mt-1 ${device.signal_strength < 30 ? 'text-red-700' : 'text-gray-900'}`}>
                    {device.signal_strength}%
                  </div>
                </div>
              )}
              <div>
                <div className="text-xs text-gray-500">Errors</div>
                <div className={`font-medium mt-1 ${device.error_count > 2 ? 'text-red-700' : 'text-gray-900'}`}>
                  {device.error_count}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Data Quality</div>
                <div className={`font-medium mt-1 ${getTrustColor(device.data_quality_score)}`}>
                  {device.data_quality_score}%
                </div>
              </div>
            </div>

            {(device.health_status === 'critical' || device.health_status === 'degraded') && (
              <div className="mt-2 px-2 py-1 bg-amber-50 rounded text-xs text-amber-800">
                Device requires attention - data reliability may be compromised
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        Health status updates every minute. Trust scores based on behavior patterns and data quality.
      </div>
    </div>
  );
}
