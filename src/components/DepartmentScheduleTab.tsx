import React, { useState } from 'react';
import { useDepartmentSchedules } from '../hooks/useDepartments';

interface DepartmentScheduleTabProps {
  departmentId: string;
}

const SHIFT_COLORS = {
  day: 'bg-yellow-100 text-yellow-900 border-yellow-300',
  evening: 'bg-orange-100 text-orange-900 border-orange-300',
  night: 'bg-blue-100 text-blue-900 border-blue-300'
};

const SHIFT_TIMES = {
  day: '07:00 - 15:00',
  evening: '15:00 - 23:00',
  night: '23:00 - 07:00'
};

const STATUS_COLORS = {
  scheduled: 'bg-slate-100 text-slate-700 border-slate-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  in_progress: 'bg-green-100 text-green-800 border-green-300',
  completed: 'bg-slate-100 text-slate-600 border-slate-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300'
};

export const DepartmentScheduleTab: React.FC<DepartmentScheduleTabProps> = ({ departmentId }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const { schedules, loading, error } = useDepartmentSchedules(departmentId, selectedDate);
  const [filterShift, setFilterShift] = useState<string>('all');

  const filteredSchedules = schedules.filter(schedule => {
    return filterShift === 'all' || schedule.shift_type === filterShift;
  });

  const schedulesByShift = {
    day: filteredSchedules.filter(s => s.shift_type === 'day'),
    evening: filteredSchedules.filter(s => s.shift_type === 'evening'),
    night: filteredSchedules.filter(s => s.shift_type === 'night')
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-xl text-slate-600">Loading schedule...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border-2 border-red-200 rounded-xl">
        <div className="text-red-900 font-bold mb-2">Error Loading Schedule</div>
        <div className="text-red-700">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
          <select
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value)}
            className="px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Shifts</option>
            <option value="day">Day Shift</option>
            <option value="evening">Evening Shift</option>
            <option value="night">Night Shift</option>
          </select>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold whitespace-nowrap">
          + Add Shift
        </button>
      </div>

      {filteredSchedules.length === 0 ? (
        <div className="bg-white rounded-xl border-2 border-slate-200 p-12 text-center">
          <div className="text-6xl mb-4">📅</div>
          <div className="text-2xl font-bold text-slate-900 mb-2">No Shifts Scheduled</div>
          <div className="text-lg text-slate-600 mb-6">No staff scheduled for {new Date(selectedDate).toLocaleDateString()}</div>
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
            Schedule Staff
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {(filterShift === 'all' || filterShift === 'day') && schedulesByShift.day.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-yellow-300 overflow-hidden">
              <div className="bg-yellow-50 px-6 py-3 border-b border-yellow-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">☀️</div>
                    <div>
                      <div className="font-bold text-yellow-900 text-lg">Day Shift</div>
                      <div className="text-sm text-yellow-700">{SHIFT_TIMES.day}</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-yellow-900">
                    {schedulesByShift.day.length} staff on duty
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {schedulesByShift.day.map((schedule) => (
                  <div key={schedule.id} className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center gap-4 flex-1">
                      <div>
                        <div className="font-bold text-slate-900">{schedule.user_name}</div>
                        <div className="text-sm text-slate-600">{schedule.position_title} • {schedule.employee_id}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-sm text-slate-600">Assignments</div>
                        <div className="text-lg font-bold text-slate-900">{schedule.assignments_count}</div>
                      </div>
                      <span className={`px-3 py-1 text-xs font-bold rounded-full border ${STATUS_COLORS[schedule.status as keyof typeof STATUS_COLORS]}`}>
                        {schedule.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(filterShift === 'all' || filterShift === 'evening') && schedulesByShift.evening.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-orange-300 overflow-hidden">
              <div className="bg-orange-50 px-6 py-3 border-b border-orange-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🌆</div>
                    <div>
                      <div className="font-bold text-orange-900 text-lg">Evening Shift</div>
                      <div className="text-sm text-orange-700">{SHIFT_TIMES.evening}</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-orange-900">
                    {schedulesByShift.evening.length} staff on duty
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {schedulesByShift.evening.map((schedule) => (
                  <div key={schedule.id} className="flex items-center justify-between p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-center gap-4 flex-1">
                      <div>
                        <div className="font-bold text-slate-900">{schedule.user_name}</div>
                        <div className="text-sm text-slate-600">{schedule.position_title} • {schedule.employee_id}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-sm text-slate-600">Assignments</div>
                        <div className="text-lg font-bold text-slate-900">{schedule.assignments_count}</div>
                      </div>
                      <span className={`px-3 py-1 text-xs font-bold rounded-full border ${STATUS_COLORS[schedule.status as keyof typeof STATUS_COLORS]}`}>
                        {schedule.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(filterShift === 'all' || filterShift === 'night') && schedulesByShift.night.length > 0 && (
            <div className="bg-white rounded-xl border-2 border-blue-300 overflow-hidden">
              <div className="bg-blue-50 px-6 py-3 border-b border-blue-300">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">🌙</div>
                    <div>
                      <div className="font-bold text-blue-900 text-lg">Night Shift</div>
                      <div className="text-sm text-blue-700">{SHIFT_TIMES.night}</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-blue-900">
                    {schedulesByShift.night.length} staff on duty
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-3">
                {schedulesByShift.night.map((schedule) => (
                  <div key={schedule.id} className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-4 flex-1">
                      <div>
                        <div className="font-bold text-slate-900">{schedule.user_name}</div>
                        <div className="text-sm text-slate-600">{schedule.position_title} • {schedule.employee_id}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-sm text-slate-600">Assignments</div>
                        <div className="text-lg font-bold text-slate-900">{schedule.assignments_count}</div>
                      </div>
                      <span className={`px-3 py-1 text-xs font-bold rounded-full border ${STATUS_COLORS[schedule.status as keyof typeof STATUS_COLORS]}`}>
                        {schedule.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {filteredSchedules.length > 0 && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">ℹ️</div>
            <div>
              <div className="font-bold text-blue-900 mb-1">24-Hour Coverage</div>
              <div className="text-sm text-blue-800">
                Total staff scheduled: {filteredSchedules.length} • Day: {schedulesByShift.day.length} • Evening: {schedulesByShift.evening.length} • Night: {schedulesByShift.night.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
