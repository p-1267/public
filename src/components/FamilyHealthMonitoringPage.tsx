import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useShowcase } from '../contexts/ShowcaseContext';

interface ResidentHealth {
  resident_id: string;
  resident_name: string;
  recent_metrics: any[];
  trends: any[];
  intelligence_signals: any[];
  devices: any[];
}

export function FamilyHealthMonitoringPage() {
  const { isShowcaseMode, selectedResidentId } = useShowcase();
  const [residents, setResidents] = useState<ResidentHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResident, setSelectedResident] = useState<string | null>(null);

  useEffect(() => {
    console.log('[FamilyHealthMonitoringPage] Loading residents health');
    loadResidentsHealth();

    // Subscribe to real-time updates
    const channels: any[] = [];

    if (selectedResidentId || residents.length > 0) {
      const residentIds = selectedResidentId ? [selectedResidentId] : residents.map(r => r.resident_id);

      residentIds.forEach(residentId => {
        // Subscribe to health metrics
        const metricsChannel = supabase
          .channel(`health-metrics-${residentId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'health_metrics',
              filter: `resident_id=eq.${residentId}`
            },
            () => {
              console.log('[FamilyHealthMonitoring] Health metric updated, reloading...');
              loadResidentsHealth();
            }
          )
          .subscribe();
        channels.push(metricsChannel);

        // Subscribe to intelligence signals
        const signalsChannel = supabase
          .channel(`intelligence-signals-${residentId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'intelligence_signals',
              filter: `resident_id=eq.${residentId}`
            },
            () => {
              console.log('[FamilyHealthMonitoring] Intelligence signal received, reloading...');
              loadResidentsHealth();
            }
          )
          .subscribe();
        channels.push(signalsChannel);

        // Subscribe to health metric trends
        const trendsChannel = supabase
          .channel(`health-trends-${residentId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'health_metric_trends',
              filter: `resident_id=eq.${residentId}`
            },
            () => {
              console.log('[FamilyHealthMonitoring] Health trend updated, reloading...');
              loadResidentsHealth();
            }
          )
          .subscribe();
        channels.push(trendsChannel);
      });
    }

    return () => {
      channels.forEach(channel => channel.unsubscribe());
    };
  }, [selectedResidentId, residents.length]);

  const loadResidentsHealth = async () => {
    setLoading(true);

    try {
      let residentIds: Array<{ resident_id: string; resident_name: string }> = [];

      if (isShowcaseMode && selectedResidentId) {
        const { data: resident } = await supabase
          .from('residents')
          .select('id, full_name')
          .eq('id', selectedResidentId)
          .maybeSingle();

        if (resident) {
          residentIds = [{
            resident_id: resident.id,
            resident_name: resident.full_name
          }];
        }
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data: links } = await supabase
          .from('family_resident_links')
          .select(`
            resident_id,
            residents!inner(full_name)
          `)
          .eq('family_user_id', user.id);

        if (!links || links.length === 0) {
          setLoading(false);
          return;
        }

        residentIds = links.map(link => ({
          resident_id: link.resident_id,
          resident_name: (link.residents as any).full_name
        }));
      }

      const healthData = await Promise.all(
        residentIds.map(async ({ resident_id, resident_name }) => {
          const [metrics, trends, signals, devices] = await Promise.all([
            supabase.rpc('get_recent_health_metrics', {
              p_resident_id: resident_id,
              p_hours: 24
            }),
            supabase.rpc('get_resident_health_trends', {
              p_resident_id: resident_id
            }),
            supabase
              .from('intelligence_signals')
              .select('*')
              .eq('resident_id', resident_id)
              .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
              .order('created_at', { ascending: false }),
            supabase
              .from('device_registry')
              .select('*')
              .eq('resident_id', resident_id)
          ]);

          return {
            resident_id,
            resident_name,
            recent_metrics: metrics.data || [],
            trends: trends.data || [],
            intelligence_signals: signals.data || [],
            devices: devices.data || []
          };
        })
      );

      setResidents(healthData);
      if (healthData.length > 0) {
        setSelectedResident(healthData[0].resident_id);
      }
    } catch (err) {
      console.error('[FamilyHealthMonitoringPage] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectedResidentData = residents.find(r => r.resident_id === selectedResident);

  const getSeverityColor = (severity: string) => {
    const colors: Record<string, string> = {
      CRITICAL: 'bg-red-100 text-red-800 border-red-200',
      HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
      MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      LOW: 'bg-blue-100 text-blue-800 border-blue-200'
    };
    return colors[severity] || colors.LOW;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-9 w-96 bg-gray-200 rounded-lg mb-2 animate-pulse"></div>
            <div className="h-6 w-80 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-7 w-48 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 w-32 bg-gray-200 rounded"></div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-20 bg-gray-200 rounded"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                  <div className="h-20 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Family Health Monitoring</h1>
          <p className="text-gray-600">Monitor the health of your loved ones</p>
        </div>

        {residents.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <p className="text-gray-600">No residents linked to your account</p>
          </div>
        ) : (
          <>
            {residents.length > 1 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {residents.map(resident => (
                  <button
                    key={resident.resident_id}
                    onClick={() => setSelectedResident(resident.resident_id)}
                    className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                      selectedResident === resident.resident_id
                        ? 'bg-green-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {resident.resident_name}
                  </button>
                ))}
              </div>
            )}

            {selectedResidentData && (
              <div className="space-y-6">
                {selectedResidentData.intelligence_signals.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Health Alerts (24h)</h2>
                    <div className="space-y-3">
                      {selectedResidentData.intelligence_signals.map((signal: any) => (
                        <div
                          key={signal.id}
                          className={`border rounded-lg p-4 ${getSeverityColor(signal.severity)}`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h3 className="font-semibold">{signal.signal_type.replace(/_/g, ' ')}</h3>
                              <p className="text-sm mt-1">
                                {new Date(signal.created_at).toLocaleString()}
                              </p>
                            </div>
                            <span className="px-3 py-1 rounded-full text-sm font-medium">
                              {signal.severity}
                            </span>
                          </div>
                          {signal.evidence && (
                            <div className="mt-3 text-sm space-y-1">
                              {signal.evidence.metric_type && (
                                <p>
                                  <span className="font-medium">Metric:</span> {signal.evidence.metric_type}
                                </p>
                              )}
                              {signal.evidence.current_value && (
                                <p>
                                  <span className="font-medium">Value:</span> {signal.evidence.current_value}
                                </p>
                              )}
                              {signal.evidence.baseline_7day && (
                                <p>
                                  <span className="font-medium">7-Day Baseline:</span> {signal.evidence.baseline_7day}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Connected Devices</h2>
                    {selectedResidentData.devices.length === 0 ? (
                      <p className="text-gray-500">No devices connected</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedResidentData.devices.map((device: any) => (
                          <div key={device.id} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="font-medium text-gray-900">{device.device_name}</h3>
                                <p className="text-sm text-gray-600">
                                  {device.manufacturer} {device.model}
                                </p>
                              </div>
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                {device.trust_state}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                              <span>🔋 {device.battery_level}%</span>
                              <span>Last seen: {new Date(device.last_seen_at).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Metrics (24h)</h2>
                    {selectedResidentData.recent_metrics.length === 0 ? (
                      <p className="text-gray-500">No recent metrics</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedResidentData.recent_metrics.slice(0, 8).map((metric: any) => (
                          <div
                            key={metric.id}
                            data-testid="metric-card"
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium text-gray-900">
                                {metric.metric_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                              </p>
                              <p className="text-sm text-gray-600">
                                {new Date(metric.recorded_at).toLocaleString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-semibold text-gray-900">
                                {metric.value_numeric?.toFixed(1)} {metric.unit}
                              </p>
                              <p className={`text-xs ${
                                metric.confidence_level === 'HIGH' ? 'text-green-600' :
                                metric.confidence_level === 'MEDIUM' ? 'text-yellow-600' :
                                'text-red-600'
                              }`}>
                                {metric.confidence_level}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {selectedResidentData.trends.length > 0 && (
                  <div className="bg-white rounded-xl shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Health Trends</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {selectedResidentData.trends
                        .filter((t: any) => t.period === 'DAY_7')
                        .map((trend: any) => (
                          <div key={trend.metric_type} className="border border-gray-200 rounded-lg p-4">
                            <h3 className="font-medium text-gray-900 mb-3">
                              {trend.metric_type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </h3>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Average:</span>
                                <span className="font-medium">{trend.avg_value?.toFixed(1)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Range:</span>
                                <span className="font-medium">
                                  {trend.min_value?.toFixed(1)} - {trend.max_value?.toFixed(1)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Trend:</span>
                                <span className={`font-medium ${
                                  trend.trend_direction === 'STABLE' ? 'text-green-600' :
                                  trend.trend_direction === 'INCREASING' ? 'text-orange-600' :
                                  trend.trend_direction === 'DECREASING' ? 'text-blue-600' :
                                  'text-gray-400'
                                }`}>
                                  {trend.trend_direction}
                                </span>
                              </div>
                              <div className="pt-2 border-t border-gray-100">
                                <span className="text-xs text-gray-500">
                                  {trend.sample_count} readings
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}