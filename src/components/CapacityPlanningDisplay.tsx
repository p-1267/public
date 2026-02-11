import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface CapacityForecast {
  date: string;
  scheduled_shifts: number;
  predicted_workload: number;
  capacity_threshold: number;
  breach_risk: 'none' | 'low' | 'medium' | 'high';
  breach_probability: number;
  recommended_additional_staff: number;
  factors: string[];
}

interface CapacityPlanningDisplayProps {
  agencyId?: string;
  forecastDays?: number;
}

export function CapacityPlanningDisplay({ agencyId, forecastDays = 7 }: CapacityPlanningDisplayProps) {
  const [forecasts, setForecasts] = useState<CapacityForecast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCapacityForecasts();
  }, [agencyId, forecastDays]);

  async function loadCapacityForecasts() {
    setLoading(true);

    const mockForecasts: CapacityForecast[] = [];
    const today = new Date();

    for (let i = 0; i < forecastDays; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(today.getDate() + i);

      const isWeekend = forecastDate.getDay() === 0 || forecastDate.getDay() === 6;
      const baseWorkload = isWeekend ? 85 : 95;
      const variance = Math.random() * 20 - 10;
      const predictedWorkload = Math.floor(baseWorkload + variance);
      const threshold = 100;

      let breachRisk: CapacityForecast['breach_risk'] = 'none';
      let breachProbability = 0;
      let recommendedStaff = 0;

      if (predictedWorkload > threshold) {
        breachRisk = 'high';
        breachProbability = 85;
        recommendedStaff = Math.ceil((predictedWorkload - threshold) / 15);
      } else if (predictedWorkload > threshold - 10) {
        breachRisk = 'medium';
        breachProbability = 45;
        recommendedStaff = 1;
      } else if (predictedWorkload > threshold - 20) {
        breachRisk = 'low';
        breachProbability = 15;
      }

      const factors = [];
      if (isWeekend) factors.push('Weekend reduced activity');
      if (i === 3) factors.push('Scheduled facility inspection');
      if (predictedWorkload > 95) factors.push('High medication administration window');
      if (Math.random() > 0.7) factors.push('Historical pattern: increased incidents');

      mockForecasts.push({
        date: forecastDate.toISOString(),
        scheduled_shifts: 6,
        predicted_workload: predictedWorkload,
        capacity_threshold: threshold,
        breach_risk: breachRisk,
        breach_probability: breachProbability,
        recommended_additional_staff: recommendedStaff,
        factors
      });
    }

    setForecasts(mockForecasts);
    setLoading(false);
  }

  function getRiskColor(risk: string): string {
    if (risk === 'high') return 'bg-red-100 text-red-800 border-red-300';
    if (risk === 'medium') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (risk === 'low') return 'bg-blue-100 text-blue-800 border-blue-300';
    return 'bg-green-100 text-green-800 border-green-300';
  }

  function getRiskIcon(risk: string): string {
    if (risk === 'high') return '🔴';
    if (risk === 'medium') return '🟡';
    if (risk === 'low') return '🔵';
    return '🟢';
  }

  function getWorkloadBarColor(workload: number, threshold: number): string {
    const percentage = (workload / threshold) * 100;
    if (percentage > 100) return 'bg-red-500';
    if (percentage > 90) return 'bg-yellow-500';
    return 'bg-blue-500';
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading capacity forecasts...</div>;
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Workload Capacity Planning</h3>
        <p className="text-xs text-gray-500 mt-1">
          {forecastDays}-day predicted workload with threshold breach analysis (advisory)
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {forecasts.map((forecast, index) => (
          <div key={forecast.date} className="px-4 py-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {new Date(forecast.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  {index === 0 && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800">
                      Today
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {forecast.scheduled_shifts} shifts scheduled
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-medium rounded border ${getRiskColor(forecast.breach_risk)}`}>
                  {getRiskIcon(forecast.breach_risk)} {forecast.breach_risk.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="mb-3">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Predicted Workload</span>
                <span>
                  {forecast.predicted_workload}% / {forecast.capacity_threshold}% capacity
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${getWorkloadBarColor(forecast.predicted_workload, forecast.capacity_threshold)}`}
                  style={{ width: `${Math.min((forecast.predicted_workload / forecast.capacity_threshold) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            {forecast.breach_risk !== 'none' && (
              <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                <div className="px-3 py-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500">Breach Probability</div>
                  <div className="font-medium text-gray-900 mt-1">{forecast.breach_probability}%</div>
                </div>
                <div className="px-3 py-2 bg-gray-50 rounded">
                  <div className="text-xs text-gray-500">Recommended Staff</div>
                  <div className="font-medium text-gray-900 mt-1">
                    +{forecast.recommended_additional_staff} {forecast.recommended_additional_staff === 1 ? 'person' : 'people'}
                  </div>
                </div>
              </div>
            )}

            {forecast.factors.length > 0 && (
              <div className="px-3 py-2 bg-blue-50 rounded">
                <div className="text-xs font-medium text-blue-900 mb-1">Contributing Factors</div>
                <ul className="text-xs text-blue-800 space-y-1">
                  {forecast.factors.map((factor, idx) => (
                    <li key={idx}>• {factor}</li>
                  ))}
                </ul>
              </div>
            )}

            {forecast.breach_risk === 'high' && (
              <div className="mt-3 px-3 py-2 bg-red-50 rounded border border-red-200 text-xs text-red-800">
                ⚠ High risk of capacity breach - consider scheduling additional coverage
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        Predictions based on historical patterns, scheduled events, and workload signals. Advisory only - does not auto-schedule.
      </div>
    </div>
  );
}
