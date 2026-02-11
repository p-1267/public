import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useShowcase } from '../../contexts/ShowcaseContext';

interface ShiftInfo {
  shift_start: string;
  shift_end: string;
  status: string;
}

export const CaregiverShiftPage: React.FC = () => {
  const { mockUserId } = useShowcase();
  const [currentShift, setCurrentShift] = useState<ShiftInfo | null>(null);
  const [handoffNotes, setHandoffNotes] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShiftInfo();
  }, [mockUserId]);

  const loadShiftInfo = async () => {
    if (!mockUserId) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('shifts')
        .select('*')
        .eq('user_id', mockUserId)
        .gte('shift_start', today)
        .lte('shift_start', `${today}T23:59:59`)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading shift:', error);
      }

      if (data) {
        setCurrentShift({
          shift_start: data.shift_start,
          shift_end: data.shift_end,
          status: data.status || 'in_progress',
        });
      }
    } catch (error) {
      console.error('Failed to load shift info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!currentShift || !handoffNotes.trim()) return;

    console.log('Saving handoff notes:', handoffNotes);
    alert('Handoff notes saved successfully!');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">Loading shift information...</div>
      </div>
    );
  }

  if (!currentShift) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">📋</div>
          <div className="text-xl font-semibold text-gray-900 mb-2">No Active Shift</div>
          <div className="text-gray-600">You don't have an active shift for today.</div>
        </div>
      </div>
    );
  }

  const shiftStart = new Date(currentShift.shift_start);
  const shiftEnd = new Date(currentShift.shift_end);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">My Shift</h2>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="text-3xl">✅</div>
              <div>
                <div className="text-sm font-semibold text-green-700">ACTIVE SHIFT</div>
                <div className="text-lg font-bold text-green-900">Currently On Duty</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-300">
              <div className="text-sm font-semibold text-blue-700 mb-1">SHIFT START</div>
              <div className="text-2xl font-bold text-blue-900">
                {shiftStart.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-300">
              <div className="text-sm font-semibold text-blue-700 mb-1">SHIFT END</div>
              <div className="text-2xl font-bold text-blue-900">
                {shiftEnd.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Handoff Notes for Next Shift
            </label>
            <textarea
              value={handoffNotes}
              onChange={(e) => setHandoffNotes(e.target.value)}
              rows={6}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter important information for the next caregiver (resident updates, unfinished tasks, concerns, etc.)"
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleSaveNotes}
              disabled={!handoffNotes.trim()}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Save Handoff Notes
            </button>
            <button
              onClick={() => {
                if (confirm('End your shift and clock out?')) {
                  alert('Shift ended. Handoff notes saved.');
                }
              }}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
            >
              End Shift & Clock Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
