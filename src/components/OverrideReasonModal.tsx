import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  taskId: string;
  ownerName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

export function OverrideReasonModal({ taskId, ownerName, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const predefinedReasons = [
    'Emergency situation requires immediate action',
    'Confirmed with other caregiver to take over',
    'Other caregiver is unavailable',
    'Coordination issue - resident needs immediate care',
    'Other (specify below)'
  ];

  const handleConfirm = async () => {
    const finalReason = selectedReason === 'Other (specify below)' ? reason : selectedReason;

    if (!finalReason.trim()) {
      return;
    }

    setSubmitting(true);

    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      await supabase.from('task_overrides').insert({
        task_id: taskId,
        overridden_by: user.user.id,
        override_reason: finalReason,
        previous_owner_name: ownerName,
        created_at: new Date().toISOString()
      });

      onConfirm(finalReason);
    } catch (err) {
      console.error('Override logging failed:', err);
      onConfirm(finalReason);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = () => {
    if (selectedReason === 'Other (specify below)') {
      return reason.trim().length > 0;
    }
    return selectedReason.trim().length > 0;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl">
        <div className="p-8">
          <div className="mb-6">
            <h2 className="text-3xl font-light text-gray-900 mb-2">Override Task Ownership</h2>
            <p className="text-lg text-gray-600">
              This task is currently being handled by <span className="font-medium">{ownerName}</span>
            </p>
          </div>

          <div className="mb-6 p-4 bg-amber-50 border-2 border-amber-500 rounded-2xl">
            <div className="flex items-start space-x-3">
              <div className="text-2xl">⚠️</div>
              <div className="flex-1">
                <div className="font-semibold text-amber-900 mb-1">Important</div>
                <div className="text-amber-800 text-sm">
                  Overriding a task may cause duplicate work or coordination issues.
                  Only proceed if you have confirmed with the other caregiver or in an emergency situation.
                  This action will be logged and audited.
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <label className="block text-gray-700 text-lg font-medium mb-2">
              Select reason for override:
            </label>

            <div className="space-y-2">
              {predefinedReasons.map((r) => (
                <label
                  key={r}
                  className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    selectedReason === r
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={selectedReason === r}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="mt-1 mr-3"
                  />
                  <span className="text-gray-900">{r}</span>
                </label>
              ))}
            </div>

            {selectedReason === 'Other (specify below)' && (
              <div className="mt-4">
                <label className="block text-gray-700 mb-2">Specify reason:</label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Please provide a detailed reason for this override..."
                  rows={4}
                  className="w-full p-4 border-2 border-gray-200 rounded-2xl focus:border-blue-500 focus:outline-none text-lg resize-none"
                  maxLength={500}
                />
                <div className="text-right text-sm text-gray-500 mt-1">
                  {reason.length}/500 characters
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-4">
            <button
              onClick={onCancel}
              disabled={submitting}
              className="flex-1 p-4 rounded-2xl border-2 border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!canSubmit() || submitting}
              className="flex-1 p-4 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Logging Override...' : 'Confirm Override'}
            </button>
          </div>

          <div className="mt-4 text-center text-sm text-gray-500">
            This override will be recorded in the audit log
          </div>
        </div>
      </div>
    </div>
  );
}
