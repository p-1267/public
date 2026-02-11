import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useShowcaseMode } from '../../hooks/useShowcaseMode';
import { CapacityPlanningDisplay } from '../CapacityPlanningDisplay';

function generateUUID(): string {
  return crypto.randomUUID();
}

interface Shift {
  id: string;
  caregiver_id: string;
  caregiver_name: string;
  start_time: string;
  end_time: string;
  status: string;
  resident_count: number;
  shift_type: string;
}

export const SupervisorSchedulingPage: React.FC = () => {
  const { isShowcaseMode } = useShowcaseMode();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [shiftDate, setShiftDate] = useState(new Date().toISOString().split('T')[0]);
  const [shiftType, setShiftType] = useState('Morning');
  const [startTime, setStartTime] = useState('07:00');
  const [endTime, setEndTime] = useState('15:00');
  const [caregiverId, setCaregiverId] = useState('00000000-0000-0000-0000-000000000003');
  const [residentCount, setResidentCount] = useState(1);
  const [notes, setNotes] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState<string>(generateUUID());

  useEffect(() => {
    loadShifts();
  }, [isShowcaseMode]);

  const loadShifts = async () => {
    setLoading(true);
    const agencyId = '00000000-0000-0000-0000-000000000001';
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 7);

    const { data, error } = await supabase.rpc('get_upcoming_shifts_for_supervisor', {
      p_agency_id: agencyId,
      p_start_date: today.toISOString().split('T')[0],
      p_end_date: endDate.toISOString().split('T')[0],
      p_is_simulation: isShowcaseMode,
    });

    if (!error && data) {
      setShifts(data);
    }
    setLoading(false);
  };

  const handleAssignShift = async () => {
    setSubmitting(true);
    const agencyId = '00000000-0000-0000-0000-000000000001';

    // Fetch residents for assignment
    const { data: residentsData } = await supabase
      .from('residents')
      .select('id')
      .eq('agency_id', agencyId)
      .limit(residentCount);

    const residentIds = residentsData?.map(r => r.id) || [];

    const { data, error } = await supabase.rpc('assign_shift_as_supervisor', {
      p_agency_id: agencyId,
      p_caregiver_id: caregiverId,
      p_shift_date: shiftDate,
      p_shift_type: shiftType,
      p_start_time: startTime,
      p_end_time: endTime,
      p_resident_ids: residentIds,
      p_notes: notes || null,
      p_idempotency_key: idempotencyKey,
      p_is_simulation: isShowcaseMode,
    });

    if (!error) {
      setIdempotencyKey(generateUUID());
      setNotes('');
      loadShifts();
    }

    setSubmitting(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800';
      case 'IN_PROGRESS': return 'bg-green-100 text-green-800';
      case 'COMPLETED': return 'bg-gray-100 text-gray-800';
      case 'CANCELLED': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <CapacityPlanningDisplay forecastDays={7} />

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Shift</h2>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={shiftDate}
              onChange={(e) => setShiftDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Shift Type</label>
            <select
              value={shiftType}
              onChange={(e) => setShiftType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="Morning">Morning (7am-3pm)</option>
              <option value="Afternoon">Afternoon (3pm-11pm)</option>
              <option value="Night">Night (11pm-7am)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign Caregiver</label>
            <select
              value={caregiverId}
              onChange={(e) => setCaregiverId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="00000000-0000-0000-0000-000000000003">Jennifer Martinez</option>
              <option value="00000000-0000-0000-0000-000000000004">Michael Thompson</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Number of Residents</label>
            <input
              type="number"
              min="1"
              max="10"
              value={residentCount}
              onChange={(e) => setResidentCount(parseInt(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="Optional shift notes..."
            />
          </div>
        </div>

        <button
          onClick={handleAssignShift}
          disabled={submitting}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
        >
          {submitting ? 'Creating Shift...' : 'Create Shift'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Upcoming Shifts (Next 7 Days)</h2>

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading shifts...</div>
        ) : shifts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No shifts scheduled</div>
        ) : (
          <div className="space-y-3">
            {shifts.map((shift) => (
              <div
                key={shift.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="font-medium text-gray-900">{shift.caregiver_name}</div>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(shift.status)}`}>
                        {shift.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium">{shift.shift_type}</span> •
                      <span className="ml-2">{new Date(shift.start_time).toLocaleString()}</span> -
                      <span className="ml-2">{new Date(shift.end_time).toLocaleTimeString()}</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {shift.resident_count} residents assigned
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
