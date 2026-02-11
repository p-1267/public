import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AdherenceMetrics {
  resident_id: string;
  resident_name: string;
  total_scheduled: number;
  on_time: number;
  late: number;
  refused: number;
  missed: number;
  on_time_percentage: number;
  avg_delay_minutes: number;
  refusal_rate: number;
}

interface MedicationAdherenceMetricsProps {
  residentId?: string;
  agencyId?: string;
  timeframe?: '24h' | '7d' | '30d';
}

export function MedicationAdherenceMetrics({
  residentId,
  agencyId,
  timeframe = '7d'
}: MedicationAdherenceMetricsProps) {
  const [metrics, setMetrics] = useState<AdherenceMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdherenceMetrics();
  }, [residentId, agencyId, timeframe]);

  async function loadAdherenceMetrics() {
    setLoading(true);

    const hoursBack = timeframe === '24h' ? 24 : timeframe === '7d' ? 168 : 720;
    const cutoff = new Date(Date.now() - hoursBack * 3600000).toISOString();

    let query = supabase
      .from('medication_administration')
      .select(`
        *,
        residents(id, first_name, last_name),
        medication_schedules(scheduled_time)
      `)
      .gte('administered_at', cutoff);

    if (residentId) query = query.eq('resident_id', residentId);
    if (agencyId) query = query.eq('agency_id', agencyId);

    const { data } = await query;

    if (data) {
      const residentMap = new Map<string, AdherenceMetrics>();

      data.forEach((admin: any) => {
        const rid = admin.resident_id;
        if (!residentMap.has(rid)) {
          residentMap.set(rid, {
            resident_id: rid,
            resident_name: admin.residents ? `${admin.residents.first_name} ${admin.residents.last_name}` : 'Unknown',
            total_scheduled: 0,
            on_time: 0,
            late: 0,
            refused: 0,
            missed: 0,
            on_time_percentage: 0,
            avg_delay_minutes: 0,
            refusal_rate: 0
          });
        }

        const m = residentMap.get(rid)!;
        m.total_scheduled++;

        if (admin.status === 'TAKEN') {
          const scheduledTime = new Date(admin.medication_schedules?.scheduled_time || admin.administered_at);
          const actualTime = new Date(admin.administered_at);
          const delayMinutes = (actualTime.getTime() - scheduledTime.getTime()) / 60000;

          if (delayMinutes <= 15) {
            m.on_time++;
          } else {
            m.late++;
            m.avg_delay_minutes += delayMinutes;
          }
        } else if (admin.status === 'REFUSED') {
          m.refused++;
        } else if (admin.status === 'MISSED') {
          m.missed++;
        }
      });

      residentMap.forEach(m => {
        if (m.total_scheduled > 0) {
          m.on_time_percentage = (m.on_time / m.total_scheduled) * 100;
          m.refusal_rate = (m.refused / m.total_scheduled) * 100;
          if (m.late > 0) {
            m.avg_delay_minutes = m.avg_delay_minutes / m.late;
          }
        }
      });

      setMetrics(Array.from(residentMap.values()));
    }

    setLoading(false);
  }

  function getAdherenceColor(percentage: number): string {
    if (percentage >= 95) return 'text-green-700';
    if (percentage >= 85) return 'text-yellow-700';
    return 'text-red-700';
  }

  function getAdherenceBg(percentage: number): string {
    if (percentage >= 95) return 'bg-green-50 border-green-200';
    if (percentage >= 85) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  }

  if (loading) {
    return <div className="text-sm text-gray-500">Loading adherence data...</div>;
  }

  if (metrics.length === 0) {
    return (
      <div className="text-sm text-gray-500 text-center py-4">
        No medication administration data for selected timeframe
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Medication Adherence Metrics</h3>
        <p className="text-xs text-gray-500 mt-1">
          On-time administration, delays, and refusal patterns ({timeframe})
        </p>
      </div>

      <div className="divide-y divide-gray-200">
        {metrics.map((metric) => (
          <div key={metric.resident_id} className="px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {metric.resident_name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {metric.total_scheduled} scheduled doses
                </div>
              </div>
              <div className={`px-3 py-2 rounded border ${getAdherenceBg(metric.on_time_percentage)}`}>
                <div className={`text-xl font-bold ${getAdherenceColor(metric.on_time_percentage)}`}>
                  {metric.on_time_percentage.toFixed(0)}%
                </div>
                <div className="text-xs text-gray-600">On-Time</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3 text-sm">
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="font-bold text-green-700">{metric.on_time}</div>
                <div className="text-xs text-gray-600 mt-1">On Time</div>
              </div>
              <div className="text-center p-2 bg-yellow-50 rounded">
                <div className="font-bold text-yellow-700">{metric.late}</div>
                <div className="text-xs text-gray-600 mt-1">Late</div>
              </div>
              <div className="text-center p-2 bg-orange-50 rounded">
                <div className="font-bold text-orange-700">{metric.refused}</div>
                <div className="text-xs text-gray-600 mt-1">Refused</div>
              </div>
              <div className="text-center p-2 bg-red-50 rounded">
                <div className="font-bold text-red-700">{metric.missed}</div>
                <div className="text-xs text-gray-600 mt-1">Missed</div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div className="px-3 py-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Avg Delay</div>
                <div className="font-medium text-gray-900 mt-1">
                  {metric.avg_delay_minutes.toFixed(0)} minutes
                </div>
              </div>
              <div className="px-3 py-2 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Refusal Rate</div>
                <div className="font-medium text-gray-900 mt-1">
                  {metric.refusal_rate.toFixed(1)}%
                </div>
              </div>
            </div>

            {metric.refusal_rate > 20 && (
              <div className="mt-3 px-2 py-1 bg-amber-50 rounded text-xs text-amber-800">
                ⚠ High refusal rate - review with care team
              </div>
            )}

            {metric.on_time_percentage < 85 && (
              <div className="mt-2 px-2 py-1 bg-red-50 rounded text-xs text-red-800">
                Below target adherence - workflow review recommended
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-xs text-gray-500">
        On-time defined as within 15 minutes of scheduled time
      </div>
    </div>
  );
}
