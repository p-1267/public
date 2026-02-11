import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useShowcase } from '../contexts/ShowcaseContext';

interface HealthMetric {
  id: string;
  metric_category: string;
  metric_type: string;
  value_numeric: number;
  value_json: any;
  unit: string;
  confidence_level: string;
  measurement_source: string;
  recorded_at: string;
  device_name: string;
  device_battery_level: number;
}

interface HealthTrend {
  metric_type: string;
  period: string;
  avg_value: number;
  min_value: number;
  max_value: number;
  trend_direction: string;
  sample_count: number;
}

export function SeniorHealthDashboard() {
  const { isShowcaseMode, selectedResidentId: showcaseResidentId } = useShowcase();
  const [residentId, setResidentId] = useState<string | null>(null);
  const [recentMetrics, setRecentMetrics] = useState<HealthMetric[]>([]);
  const [trends, setTrends] = useState<HealthTrend[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[SeniorHealthDashboard] Loading health data');
    console.log('[SeniorHealthDashboard] isShowcaseMode:', isShowcaseMode);
    console.log('[SeniorHealthDashboard] showcaseResidentId:', showcaseResidentId);

    loadHealthData();

    const channel = supabase
      .channel('health-metrics-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'health_metrics'
        },
        () => {
          console.log('[SeniorHealthDashboard] Real-time update received');
          loadHealthData();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [showcaseResidentId, isShowcaseMode]);

  const loadHealthData = async () => {
    console.log('[SeniorHealthDashboard] loadHealthData called');
    setLoading(true);

    let targetResidentId: string | null = null;

    if (isShowcaseMode && showcaseResidentId) {
      console.log('[SeniorHealthDashboard] Using showcase resident ID:', showcaseResidentId);
      targetResidentId = showcaseResidentId;
    } else {
      console.log('[SeniorHealthDashboard] Not in showcase mode, checking auth...');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('[SeniorHealthDashboard] No authenticated user');
        setLoading(false);
        return;
      }

      const { data: link } = await supabase
        .from('senior_resident_links')
        .select('resident_id')
        .eq('senior_user_id', user.id)
        .maybeSingle();

      if (link) {
        targetResidentId = link.resident_id;
        console.log('[SeniorHealthDashboard] Found resident ID from link:', targetResidentId);
      }
    }

    if (targetResidentId) {
      console.log('[SeniorHealthDashboard] Loading data for resident:', targetResidentId);
      setResidentId(targetResidentId);
      await Promise.all([
        loadRecentMetrics(targetResidentId),
        loadTrends(targetResidentId)
      ]);
    } else {
      console.log('[SeniorHealthDashboard] No target resident ID found');
    }
    setLoading(false);
  };

  const loadRecentMetrics = async (resId: string) => {
    const { data, error } = await supabase.rpc('get_recent_health_metrics', {
      p_resident_id: resId,
      p_hours: 72
    });

    if (error) {
      console.error('Error loading health metrics:', error);
    }

    if (data) {
      console.log('Loaded health metrics:', data.length);
      setRecentMetrics(data);
    } else {
      setRecentMetrics([]);
    }
  };

  const loadTrends = async (resId: string) => {
    const { data, error } = await supabase.rpc('get_resident_health_trends', {
      p_resident_id: resId
    });

    if (error) {
      console.error('Error loading health trends:', error);
    }

    if (data) {
      setTrends(data);
    } else {
      setTrends([]);
    }
  };

  const getMetricIcon = (category: string) => {
    const icons: Record<string, string> = {
      CARDIOVASCULAR: '❤️',
      BLOOD_PRESSURE: '🩺',
      BLOOD_CIRCULATION: '🫁',
      RESPIRATORY: '🫀',
      TEMPERATURE: '🌡️',
      ACTIVITY: '🏃',
      SLEEP: '😴',
      SAFETY: '🚨',
      STRESS: '😌',
      OTHER: '📊'
    };
    return icons[category] || '📊';
  };

  const getTrendIndicator = (direction: string) => {
    const indicators: Record<string, { icon: string; color: string }> = {
      INCREASING: { icon: '↗️', color: 'text-red-600' },
      DECREASING: { icon: '↘️', color: 'text-blue-600' },
      STABLE: { icon: '→', color: 'text-green-600' },
      INSUFFICIENT_DATA: { icon: '?', color: 'text-gray-400' }
    };
    return indicators[direction] || indicators.INSUFFICIENT_DATA;
  };

  const filteredMetrics = selectedCategory === 'ALL'
    ? recentMetrics
    : recentMetrics.filter(m => m.metric_category === selectedCategory);

  const categories = ['ALL', ...Array.from(new Set(recentMetrics.map(m => m.metric_category)))];

  const groupedMetrics = filteredMetrics.reduce((acc, metric) => {
    const key = metric.metric_type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(metric);
    return acc;
  }, {} as Record<string, HealthMetric[]>);

  const handleCategoryClick = (category: string) => {
    console.log('Category clicked:', category);
    console.log('Total metrics:', recentMetrics.length);
    console.log('Current selected:', selectedCategory);
    setSelectedCategory(category);
    console.log('New selected:', category);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-9 w-80 bg-gray-200 rounded-lg mb-2 animate-pulse"></div>
            <div className="h-6 w-96 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>

          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-10 w-32 bg-white rounded-lg animate-pulse"></div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl p-6 animate-pulse">
                <div className="h-6 w-40 bg-gray-200 rounded mb-4"></div>
                <div className="h-16 w-full bg-gray-200 rounded mb-3"></div>
                <div className="h-4 w-32 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Health Dashboard</h1>
          <p className="text-gray-600">Track your health metrics from your connected devices</p>
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {categories.map(category => (
            <button
              key={category}
              onClick={() => handleCategoryClick(category)}
              className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {category === 'ALL' ? 'All Metrics' : category.replace(/_/g, ' ')}
            </button>
          ))}
        </div>

        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredMetrics.length} of {recentMetrics.length} metrics
          {selectedCategory !== 'ALL' && ` (filtered by ${selectedCategory})`}
        </div>

        {filteredMetrics.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No health data yet</h3>
            <p className="text-gray-600">Connect your devices and start tracking your health</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {Object.entries(groupedMetrics).map(([metricType, metrics]) => {
              const latest = metrics[0];
              const trend = trends.find(t => t.metric_type === metricType && t.period === 'DAY_7');
              const trendIndicator = trend ? getTrendIndicator(trend.trend_direction) : null;

              return (
                <div key={metricType} data-testid="metric-card" className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{getMetricIcon(latest.metric_category)}</span>
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {metricType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h3>
                        <p className="text-sm text-gray-500">{latest.metric_category.replace(/_/g, ' ')}</p>
                      </div>
                    </div>
                    {latest.measurement_source === 'AUTOMATIC_DEVICE' && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        AUTO
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold text-gray-900">
                        {latest.value_numeric !== null ? latest.value_numeric.toFixed(1) : 'N/A'}
                      </span>
                      {latest.unit && (
                        <span className="text-lg text-gray-600">{latest.unit}</span>
                      )}
                      {trendIndicator && (
                        <span className={`text-2xl ${trendIndicator.color}`}>
                          {trendIndicator.icon}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(latest.recorded_at).toLocaleString()}
                    </p>
                  </div>

                  {trend && (
                    <div data-testid="trends-panel" className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-medium text-gray-700 mb-2">7-Day Trend</p>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-gray-600">Avg:</span>
                          <span className="font-medium text-gray-900 ml-1">
                            {trend.avg_value?.toFixed(1) || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Min:</span>
                          <span className="font-medium text-gray-900 ml-1">
                            {trend.min_value?.toFixed(1) || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">Max:</span>
                          <span className="font-medium text-gray-900 ml-1">
                            {trend.max_value?.toFixed(1) || 'N/A'}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        {trend.sample_count} readings
                      </p>
                    </div>
                  )}

                  {latest.device_name && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">Source: {latest.device_name}</span>
                        {latest.device_battery_level && (
                          <span className="text-gray-600">
                            🔋 {latest.device_battery_level}%
                          </span>
                        )}
                      </div>
                      <span className={`text-xs ${
                        latest.confidence_level === 'HIGH' ? 'text-green-600' :
                        latest.confidence_level === 'MEDIUM' ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {latest.confidence_level} Confidence
                      </span>
                    </div>
                  )}

                  {metrics.length > 1 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <details className="group">
                        <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700">
                          View {metrics.length - 1} earlier reading{metrics.length > 2 ? 's' : ''}
                        </summary>
                        <div className="mt-3 space-y-2">
                          {metrics.slice(1, 6).map(metric => (
                            <div key={metric.id} className="flex justify-between text-sm">
                              <span className="text-gray-600">
                                {new Date(metric.recorded_at).toLocaleString()}
                              </span>
                              <span className="font-medium text-gray-900">
                                {metric.value_numeric?.toFixed(1)} {metric.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}