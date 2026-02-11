import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { SHOWCASE_MODE } from '../config/showcase';
import { useShowcase } from '../contexts/ShowcaseContext';

interface DailyPlanData {
  department_code: string;
  department_name: string;
  shift_type: string;
  staff_on_duty: number;
  total_assignments: number;
  not_started: number;
  in_progress: number;
  blocked: number;
  completed: number;
  pending_acceptance: number;
  high_priority: number;
  urgent_priority: number;
}

interface SupervisorDailyDeliveryPlanProps {
  departmentId?: string;
  departmentName?: string;
}

export const SupervisorDailyDeliveryPlan: React.FC<SupervisorDailyDeliveryPlanProps> = ({
  departmentId,
  departmentName
}) => {
  const showcaseContext = SHOWCASE_MODE ? useShowcase() : null;
  const agencyId = SHOWCASE_MODE ? showcaseContext?.mockAgencyId : null;
  const [planData, setPlanData] = useState<DailyPlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const loadDailyPlan = useCallback(async () => {
    if (!agencyId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_supervisor_daily_plan', {
        p_agency_id: agencyId,
        p_date: selectedDate
      });

      if (error) throw error;

      let filtered = data || [];
      if (departmentId && departmentName) {
        filtered = filtered.filter((item: DailyPlanData) =>
          item.department_name === departmentName
        );
      }

      setPlanData(filtered);
      console.log('[SupervisorDailyDeliveryPlan] Loaded plan:', filtered.length);
    } catch (err) {
      console.error('[SupervisorDailyDeliveryPlan] Error:', err);
    } finally {
      setLoading(false);
    }
  }, [agencyId, selectedDate, departmentId, departmentName]);

  useEffect(() => {
    if (agencyId) {
      loadDailyPlan();
    }
  }, [agencyId, loadDailyPlan]);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 p-8 text-center">
        <div className="text-slate-600">Loading daily delivery plan...</div>
      </div>
    );
  }

  if (planData.length === 0) {
    return (
      <div className="bg-white rounded-xl border-2 border-slate-200 p-8 text-center">
        <div className="text-4xl mb-3">📋</div>
        <div className="text-lg font-bold text-slate-900 mb-1">No Plan Data</div>
        <div className="text-slate-600">No assignments scheduled for {new Date(selectedDate).toLocaleDateString()}</div>
      </div>
    );
  }

  const totalStaff = planData.reduce((sum, item) => sum + (item.staff_on_duty || 0), 0);
  const totalAssignments = planData.reduce((sum, item) => sum + (item.total_assignments || 0), 0);
  const totalBlocked = planData.reduce((sum, item) => sum + (item.blocked || 0), 0);
  const totalPendingAcceptance = planData.reduce((sum, item) => sum + (item.pending_acceptance || 0), 0);
  const totalUrgent = planData.reduce((sum, item) => sum + (item.urgent_priority || 0), 0);

  const byShift = {
    day: planData.filter(p => p.shift_type === 'day'),
    evening: planData.filter(p => p.shift_type === 'evening'),
    night: planData.filter(p => p.shift_type === 'night')
  };

  return (
    <div className="bg-white rounded-xl border-2 border-blue-200 overflow-hidden">
      <div className="bg-blue-50 px-6 py-4 border-b border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-blue-900 mb-1">
              {departmentName ? `${departmentName} Daily Delivery Plan` : 'Supervisor Daily Delivery Plan'}
            </h2>
            <p className="text-blue-700">
              Auto-generated from assignments • Updates in real-time
            </p>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border-2 border-blue-300 rounded-lg bg-white focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="text-3xl font-bold text-slate-900">{totalStaff}</div>
            <div className="text-sm text-slate-600">Staff on Duty</div>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <div className="text-3xl font-bold text-blue-900">{totalAssignments}</div>
            <div className="text-sm text-blue-600">Total Assignments</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 border border-red-200">
            <div className="text-3xl font-bold text-red-900">{totalBlocked}</div>
            <div className="text-sm text-red-600">Blocked Tasks</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
            <div className="text-3xl font-bold text-yellow-900">{totalPendingAcceptance}</div>
            <div className="text-sm text-yellow-600">Pending Acceptance</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
            <div className="text-3xl font-bold text-orange-900">{totalUrgent}</div>
            <div className="text-sm text-orange-600">Urgent Priority</div>
          </div>
        </div>

        {['day', 'evening', 'night'].map((shift) => {
          const shiftData = byShift[shift as keyof typeof byShift];
          if (shiftData.length === 0) return null;

          const shiftIcons = { day: '☀️', evening: '🌆', night: '🌙' };
          const shiftColors = {
            day: 'bg-yellow-50 border-yellow-200 text-yellow-900',
            evening: 'bg-orange-50 border-orange-200 text-orange-900',
            night: 'bg-blue-50 border-blue-200 text-blue-900'
          };

          return (
            <div key={shift} className={`rounded-lg border-2 ${shiftColors[shift as keyof typeof shiftColors]} p-4`}>
              <div className="flex items-center gap-2 mb-4">
                <div className="text-2xl">{shiftIcons[shift as keyof typeof shiftIcons]}</div>
                <div className="text-lg font-bold capitalize">{shift} Shift</div>
              </div>

              <div className="space-y-3">
                {shiftData.map((item, idx) => (
                  <div key={idx} className="bg-white rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="font-bold text-slate-900">{item.department_name}</div>
                      <div className="text-sm text-slate-600">{item.staff_on_duty} staff</div>
                    </div>

                    <div className="grid grid-cols-4 gap-3 text-sm">
                      <div>
                        <div className="text-slate-600">Not Started</div>
                        <div className="font-bold text-slate-900">{item.not_started}</div>
                      </div>
                      <div>
                        <div className="text-slate-600">In Progress</div>
                        <div className="font-bold text-blue-600">{item.in_progress}</div>
                      </div>
                      <div>
                        <div className="text-slate-600">Completed</div>
                        <div className="font-bold text-green-600">{item.completed}</div>
                      </div>
                      <div>
                        <div className="text-slate-600">Blocked</div>
                        <div className="font-bold text-red-600">{item.blocked}</div>
                      </div>
                    </div>

                    {(item.pending_acceptance > 0 || item.urgent_priority > 0 || item.high_priority > 0) && (
                      <div className="mt-3 pt-3 border-t border-slate-200 flex gap-3 text-xs">
                        {item.pending_acceptance > 0 && (
                          <div className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full border border-yellow-300 font-semibold">
                            {item.pending_acceptance} Pending Acceptance
                          </div>
                        )}
                        {item.urgent_priority > 0 && (
                          <div className="px-2 py-1 bg-red-100 text-red-800 rounded-full border border-red-300 font-semibold">
                            {item.urgent_priority} Urgent
                          </div>
                        )}
                        {item.high_priority > 0 && (
                          <div className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full border border-orange-300 font-semibold">
                            {item.high_priority} High Priority
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {(totalBlocked > 0 || totalPendingAcceptance > 0 || totalUrgent > 0) && (
        <div className="bg-red-50 border-t-2 border-red-200 px-6 py-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <div className="font-bold text-red-900 mb-1">Action Required</div>
              <div className="text-sm text-red-800">
                {totalBlocked > 0 && `${totalBlocked} blocked task(s) need resolution. `}
                {totalPendingAcceptance > 0 && `${totalPendingAcceptance} assignment(s) awaiting staff acceptance. `}
                {totalUrgent > 0 && `${totalUrgent} urgent priority task(s) require immediate attention.`}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
