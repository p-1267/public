import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface BaselineData {
  metric: string;
  current_value: number;
  baseline_low: number;
  baseline_high: number;
  unit: string;
  deviation_percent: number;
  status: 'normal' | 'low' | 'high';
  recorded_at: string;
}

interface BaselineComparisonProps {
  residentId: string;
  metricType?: string;
  compact?: boolean;
}

export function BaselineComparison({ residentId, metricType, compact = false }: BaselineComparisonProps) {
  const [comparisons, setComparisons] = useState<BaselineData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBaselineComparisons();
  }, [residentId, metricType]);

  async function loadBaselineComparisons() {
    setLoading(true);

    const { data: baselines } = await supabase
      .from('resident_baselines')
      .select('vital_baselines')
      .eq('resident_id', residentId)
      .single();

    const { data: vitals } = await supabase
      .from('vital_signs')
      .select('*')
      .eq('resident_id', residentId)
      .order('recorded_at', { ascending: false })
      .limit(10);

    if (baselines?.vital_baselines && vitals) {
      const baselineMap = baselines.vital_baselines as Record<string, any>;
      const comparisonsData: BaselineData[] = [];

      vitals.forEach(vital => {
        const baseline = baselineMap[vital.metric_type];
        if (baseline) {
          const deviation = ((vital.value - baseline.normal) / baseline.normal) * 100;
          let status: 'normal' | 'low' | 'high' = 'normal';

          if (vital.value < baseline.low) status = 'low';
          else if (vital.value > baseline.high) status = 'high';

          comparisonsData.push({
            metric: vital.metric_type,
            current_value: vital.value,
            baseline_low: baseline.low,
            baseline_high: baseline.high,
            unit: vital.unit,
            deviation_percent: Math.abs(deviation),
            status,
            recorded_at: vital.recorded_at
          });
        }
      });

      setComparisons(comparisonsData);
    }

    setLoading(false);
  }

  function getStatusColor(status: string): string {
    if (status === 'normal') return 'text-green-700 bg-green-50';
    if (status === 'low') return 'text-blue-700 bg-blue-50';
    return 'text-red-700 bg-red-50';
  }

  function getStatusIcon(status: string): string {
    if (status === 'normal') return '✓';
    if (status === 'low') return '↓';
    return '↑';
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading baseline comparisons...</div>;
  }

  if (comparisons.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        No baseline data available for comparison
      </div>
    );
  }

  if (compact) {
    const latest = comparisons[0];
    return (
      <div className={`inline-flex items-center gap-2 px-2 py-1 rounded text-xs font-medium ${getStatusColor(latest.status)}`}>
        <span>{getStatusIcon(latest.status)}</span>
        <span>vs Baseline: {latest.baseline_low}-{latest.baseline_high} {latest.unit}</span>
        {latest.status !== 'normal' && (
          <span>({latest.deviation_percent.toFixed(0)}% {latest.status})</span>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Baseline Comparison</h3>
        <p className="text-xs text-gray-500 mt-1">
          Current values compared to resident-specific baselines
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {comparisons.map((comp, index) => (
          <div key={`${comp.metric}-${index}`} className="px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-sm font-medium text-gray-900 capitalize">
                  {comp.metric.replace('_', ' ')}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(comp.recorded_at).toLocaleString()}
                </div>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(comp.status)}`}>
                {getStatusIcon(comp.status)} {comp.status}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-500">Current</div>
                <div className="font-medium text-gray-900">
                  {comp.current_value} {comp.unit}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Baseline Range</div>
                <div className="font-medium text-gray-900">
                  {comp.baseline_low}-{comp.baseline_high} {comp.unit}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Deviation</div>
                <div className="font-medium text-gray-900">
                  {comp.deviation_percent.toFixed(1)}%
                </div>
              </div>
            </div>

            {comp.status !== 'normal' && (
              <div className="mt-2 px-2 py-1 bg-amber-50 rounded text-xs text-amber-800">
                Outside normal range - clinical assessment recommended
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        Baselines configured from medical records and physician guidance
      </div>
    </div>
  );
}
