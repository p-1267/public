import React, { useState } from 'react';

interface DuplicateWarningModalProps {
  actionType: string;
  lastAction: {
    type: string;
    timestamp: string;
    by: string;
    minutesAgo: number;
  };
  onProceed: (reason: string) => void;
  onCancel: () => void;
}

export function DuplicateWarningModal({
  actionType,
  lastAction,
  onProceed,
  onCancel
}: DuplicateWarningModalProps) {
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);

  const handleProceed = () => {
    if (acknowledged) {
      onProceed(reason || 'Override: Caregiver confirmed action needed');
    }
  };

  const getActionLabel = (type: string) => {
    switch (type) {
      case 'vitals':
        return 'Vital Signs Recording';
      case 'medication':
        return 'Medication Administration';
      case 'prn':
        return 'PRN Medication';
      default:
        return 'Action';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="bg-yellow-50 border-b-2 border-yellow-300 px-6 py-4">
          <div className="flex items-center gap-3">
            <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <h3 className="text-lg font-bold text-yellow-900">Duplicate Action Warning</h3>
              <p className="text-sm text-yellow-800">This action was recently performed</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-gray-700 mb-2">
              {getActionLabel(actionType)}
            </p>
            <div className="space-y-1 text-sm text-gray-600">
              <p>
                <span className="font-medium">Last performed:</span>{' '}
                {lastAction.minutesAgo} minute{lastAction.minutesAgo !== 1 ? 's' : ''} ago
              </p>
              <p>
                <span className="font-medium">By:</span> {lastAction.by}
              </p>
              <p className="text-xs text-gray-500 mt-2">
                {new Date(lastAction.timestamp).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              <span className="font-semibold">Note:</span> This is a warning, not a block. If you need to proceed (e.g., recheck vitals, correct dosage), you may continue.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Override (Optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Vitals recheck requested by supervisor, correcting previous entry..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              id="acknowledge"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1"
            />
            <label htmlFor="acknowledge" className="text-sm text-gray-700">
              I acknowledge this action was recently performed and confirm I need to proceed
            </label>
          </div>
        </div>

        <div className="bg-gray-50 border-t px-6 py-4 flex gap-3">
          <button
            onClick={handleProceed}
            disabled={!acknowledged}
            className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Proceed Anyway
          </button>
          <button
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
