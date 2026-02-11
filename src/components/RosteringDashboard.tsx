import { useState, useEffect } from 'react';
import { useRostering } from '../hooks/useRostering';
import { useWorkloadSignals } from '../hooks/useWorkloadSignals';

export function RosteringDashboard() {
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [coverageGaps, setCoverageGaps] = useState<any>(null);
  const [overlappingShifts, setOverlappingShifts] = useState<any>(null);
  const [workloadSignals, setWorkloadSignals] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'gaps' | 'overlaps' | 'signals'>('overview');

  const { getRosteringDashboard, getCoverageGaps, getOverlappingShifts } = useRostering();
  const { getActiveWorkloadSignals, acknowledgeWorkloadSignal } = useWorkloadSignals();

  useEffect(() => {
    loadDashboard();
  }, [dateRange]);

  const loadDashboard = async () => {
    try {
      setLoading(true);

      const [dashboard, gaps, overlaps, signals] = await Promise.all([
        getRosteringDashboard(dateRange.start, dateRange.end),
        getCoverageGaps(dateRange.start, dateRange.end),
        getOverlappingShifts(dateRange.start, dateRange.end),
        getActiveWorkloadSignals()
      ]);

      setDashboardData(dashboard);
      setCoverageGaps(gaps);
      setOverlappingShifts(overlaps);
      setWorkloadSignals(signals);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeSignal = async (signalId: string) => {
    try {
      await acknowledgeWorkloadSignal(signalId);
      loadDashboard();
    } catch (err) {
      console.error('Failed to acknowledge signal:', err);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 border-red-300 text-red-800';
      case 'HIGH': return 'bg-orange-100 border-orange-300 text-orange-800';
      case 'MEDIUM': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'LOW': return 'bg-blue-100 border-blue-300 text-blue-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-gray-600">Loading rostering dashboard...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="p-6 border-b">
        <h2 className="text-2xl font-bold mb-4">Workforce Rostering Dashboard</h2>

        <div className="flex items-center gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              className="px-3 py-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              className="px-3 py-2 border rounded"
            />
          </div>
          <button
            onClick={loadDashboard}
            className="mt-6 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <div className="text-sm text-blue-600 font-medium">Total Shifts</div>
            <div className="text-2xl font-bold text-blue-800">
              {dashboardData?.summary?.total_shifts || 0}
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <div className="text-sm text-yellow-600 font-medium">Tentative</div>
            <div className="text-2xl font-bold text-yellow-800">
              {dashboardData?.summary?.tentative_shifts || 0}
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded p-4">
            <div className="text-sm text-green-600 font-medium">Confirmed</div>
            <div className="text-2xl font-bold text-green-800">
              {dashboardData?.summary?.confirmed_shifts || 0}
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded p-4">
            <div className="text-sm text-red-600 font-medium">Workload Signals</div>
            <div className="text-2xl font-bold text-red-800">
              {workloadSignals?.signal_count || 0}
            </div>
          </div>
        </div>
      </div>

      <div className="border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-semibold ${
              activeTab === 'overview'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Current Assignments
          </button>
          <button
            onClick={() => setActiveTab('gaps')}
            className={`px-6 py-3 font-semibold ${
              activeTab === 'gaps'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Coverage Gaps ({coverageGaps?.gap_count || 0})
          </button>
          <button
            onClick={() => setActiveTab('overlaps')}
            className={`px-6 py-3 font-semibold ${
              activeTab === 'overlaps'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Overlapping Shifts ({overlappingShifts?.overlap_count || 0})
          </button>
          <button
            onClick={() => setActiveTab('signals')}
            className={`px-6 py-3 font-semibold ${
              activeTab === 'signals'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Workload Signals ({workloadSignals?.signal_count || 0})
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'overview' && (
          <div>
            <h3 className="text-lg font-bold mb-4">Current Assignments</h3>

            {dashboardData?.current_assignments?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No shifts scheduled for this period
              </div>
            ) : (
              <div className="space-y-3">
                {dashboardData?.current_assignments?.map((shift: any) => (
                  <div key={shift.shift_id} className="border rounded p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold">{shift.caregiver_name}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(shift.start_time).toLocaleString()} - {new Date(shift.end_time).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          shift.status === 'CONFIRMED' ? 'bg-green-100 text-green-800' :
                          shift.status === 'SCHEDULED' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {shift.status}
                        </span>
                        {shift.is_tentative && (
                          <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-100 text-orange-800">
                            TENTATIVE
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-gray-600">Residents:</span> {shift.resident_count}
                      </div>
                      <div>
                        <span className="text-gray-600">Intensity:</span> {shift.expected_care_intensity}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {dashboardData?.caregiver_workloads?.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-bold mb-4">Caregiver Workload</h3>
                <div className="space-y-3">
                  {dashboardData.caregiver_workloads.map((workload: any) => (
                    <div key={workload.caregiver_id} className="border rounded p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="font-semibold">{workload.caregiver_name}</div>
                          <div className="text-sm text-gray-600">
                            {workload.shift_count} shifts • {workload.total_hours?.toFixed(1)} hours
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">
                            {workload.resident_count} residents
                          </div>
                          <div className="text-sm text-gray-600">
                            Avg intensity: {workload.avg_care_intensity?.toFixed(1)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'gaps' && (
          <div>
            <h3 className="text-lg font-bold mb-4">Coverage Gaps</h3>

            {coverageGaps?.coverage_gaps?.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded p-4 text-center text-green-800">
                No coverage gaps detected - all residents have scheduled coverage
              </div>
            ) : (
              <div className="space-y-3">
                {coverageGaps?.coverage_gaps?.map((gap: any) => (
                  <div key={gap.resident_id} className="border-l-4 border-red-500 bg-red-50 p-4 rounded">
                    <div className="font-semibold text-red-900">{gap.resident_name}</div>
                    <div className="text-sm text-red-700 mt-1">
                      No scheduled shifts in selected period
                    </div>
                    {gap.required_care_frequency && (
                      <div className="text-sm text-red-600 mt-1">
                        Required frequency: {gap.required_care_frequency} visits/week
                      </div>
                    )}
                    {gap.last_scheduled_shift && (
                      <div className="text-xs text-red-600 mt-1">
                        Last shift: {new Date(gap.last_scheduled_shift).toLocaleString()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'overlaps' && (
          <div>
            <h3 className="text-lg font-bold mb-4">Overlapping Shifts</h3>

            {overlappingShifts?.overlapping_shifts?.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded p-4 text-center text-green-800">
                No overlapping shifts detected
              </div>
            ) : (
              <div className="space-y-3">
                {overlappingShifts?.overlapping_shifts?.map((overlap: any, idx: number) => (
                  <div key={idx} className="border-l-4 border-orange-500 bg-orange-50 p-4 rounded">
                    <div className="font-semibold text-orange-900">{overlap.caregiver_name}</div>
                    <div className="text-sm text-orange-700 mt-2">
                      <div className="mb-1">
                        Shift 1: {new Date(overlap.shift1_time.start).toLocaleString()} - {new Date(overlap.shift1_time.end).toLocaleString()}
                      </div>
                      <div>
                        Shift 2: {new Date(overlap.shift2_time.start).toLocaleString()} - {new Date(overlap.shift2_time.end).toLocaleString()}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-orange-800 mt-2">
                      Overlap: {overlap.overlap_minutes?.toFixed(0)} minutes
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'signals' && (
          <div>
            <h3 className="text-lg font-bold mb-4">Workload & Fatigue Signals</h3>

            <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
              <p className="text-sm text-blue-800">
                These signals are advisory only and do not block scheduling. They highlight potential workload concerns for supervisor review.
              </p>
            </div>

            {workloadSignals?.signals?.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded p-4 text-center text-green-800">
                No active workload signals
              </div>
            ) : (
              <div className="space-y-3">
                {workloadSignals?.signals?.map((signal: any) => (
                  <div key={signal.id} className={`border rounded p-4 ${getSeverityColor(signal.severity)}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-semibold">{signal.caregiver_name}</div>
                        <div className="text-sm mt-1">{signal.description}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded text-xs font-bold bg-white bg-opacity-50">
                          {signal.severity}
                        </span>
                        <button
                          onClick={() => handleAcknowledgeSignal(signal.id)}
                          className="px-3 py-1 bg-white rounded text-sm font-semibold hover:bg-opacity-90"
                        >
                          Acknowledge
                        </button>
                      </div>
                    </div>
                    <div className="text-xs mt-2 opacity-75">
                      {signal.signal_type.replace(/_/g, ' ')} • {new Date(signal.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
