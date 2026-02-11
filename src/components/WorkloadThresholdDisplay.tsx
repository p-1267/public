import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface WorkloadMetric {
  signal_type: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  current_value: number;
  threshold_value: number;
  threshold_exceeded_by: number;
  unit: string;
  detected_at: string;
  caregiver_name?: string;
}

interface WorkloadThresholdDisplayProps {
  agencyId?: string;
  caregiverId?: string;
}

export function WorkloadThresholdDisplay({ agencyId, caregiverId }: WorkloadThresholdDisplayProps) {
  const [metrics, setMetrics] = useState<WorkloadMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkloadMetrics();
  }, [agencyId, caregiverId]);

  async function loadWorkloadMetrics() {
    setLoading(true);

    let query = supabase
      .from('workload_signals')
      .select('*')
      .eq('is_acknowledged', false);

    if (agencyId) query = query.eq('agency_id', agencyId);
    if (caregiverId) query = query.eq('caregiver_id', caregiverId);

    const { data: signals } = await query;

    if (signals) {
      const metricsData: WorkloadMetric[] = signals.map(signal => {
        const thresholds: Record<string, any> = {
          EXCESSIVE_CONSECUTIVE_SHIFTS: { threshold: 5, unit: 'shifts' },
          HIGH_RESIDENT_RATIO: { threshold: 6, unit: ':1 ratio' },
          REPEATED_EMERGENCY_CORRELATION: { threshold: 3, unit: 'incidents' },
          OVERTIME_RISK: { threshold: 40, unit: 'hours' }
        };

        const config = thresholds[signal.signal_type] || { threshold: 100, unit: 'units' };
        const currentValue = (signal.data as any)?.value || 0;
        const exceeded = ((currentValue - config.threshold) / config.threshold) * 100;

        return {
          signal_type: signal.signal_type,
          description: signal.description,
          severity: signal.severity,
          current_value: currentValue,
          threshold_value: config.threshold,
          threshold_exceeded_by: exceeded,
          unit: config.unit,
          detected_at: signal.created_at,
          caregiver_name: 'Caregiver'
        };
      });

      setMetrics(metricsData);
    }

    setLoading(false);
  }

  function getSeverityColor(severity: string): string {
    const colors: Record<string, string> = {
      LOW: 'bg-blue-50 text-blue-800 border-blue-200',
      MEDIUM: 'bg-yellow-50 text-yellow-800 border-yellow-200',
      HIGH: 'bg-orange-50 text-orange-800 border-orange-200',
      CRITICAL: 'bg-red-50 text-red-800 border-red-200'
    };
    return colors[severity] || colors.MEDIUM;
  }

  function getProgressBarColor(severity: string): string {
    const colors: Record<string, string> = {
      LOW: 'bg-blue-500',
      MEDIUM: 'bg-yellow-500',
      HIGH: 'bg-orange-500',
      CRITICAL: 'bg-red-500'
    };
    return colors[severity] || colors.MEDIUM;
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading workload analysis...</div>;
  }

  if (metrics.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center">
          <div className="text-lg font-medium text-green-700 mb-2">✓ Workload Normal</div>
          <div className="text-sm text-gray-600">
            All workload metrics within acceptable thresholds
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Workload Threshold Analysis</h3>
        <p className="text-xs text-gray-500 mt-1">
          Current workload vs configured thresholds (advisory only)
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {metrics.map((metric, index) => (
          <div key={`${metric.signal_type}-${index}`} className={`px-4 py-4 border-l-4 ${getSeverityColor(metric.severity)}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {metric.signal_type.replace(/_/g, ' ')}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {metric.description}
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded ${getSeverityColor(metric.severity)}`}>
                {metric.severity}
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Current</span>
                <span className="font-medium text-gray-900">
                  {metric.current_value} {metric.unit}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Threshold</span>
                <span className="font-medium text-gray-900">
                  {metric.threshold_value} {metric.unit}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Exceeded By</span>
                <span className="font-bold text-red-700">
                  +{metric.threshold_exceeded_by.toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Progress to Threshold</span>
                <span>{((metric.current_value / metric.threshold_value) * 100).toFixed(0)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${getProgressBarColor(metric.severity)}`}
                  style={{ width: `${Math.min(((metric.current_value / metric.threshold_value) * 100), 100)}%` }}
                ></div>
              </div>
            </div>

            <div className="mt-3 px-2 py-1 bg-amber-50 rounded text-xs text-amber-800">
              Advisory only - does not block scheduling. Supervisor review recommended.
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        Workload signals generated hourly by background automation
      </div>
    </div>
  );
}
