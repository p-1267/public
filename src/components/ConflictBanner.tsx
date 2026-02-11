import React, { useState } from 'react';
import { OverrideReasonModal } from './OverrideReasonModal';

interface Props {
  taskId: string;
  ownerName: string;
  onOverride?: (reason: string) => void;
}

export function ConflictBanner({ taskId, ownerName, onOverride }: Props) {
  const [showOverrideModal, setShowOverrideModal] = useState(false);

  const handleOverride = (reason: string) => {
    if (onOverride) {
      onOverride(reason);
    }
    setShowOverrideModal(false);
  };

  return (
    <>
      <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-500 rounded-xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-2xl">⚠️</div>
            <div>
              <div className="font-semibold text-amber-900">Task In Progress</div>
              <div className="text-amber-700 text-sm mt-1">
                Currently being worked on by <span className="font-medium">{ownerName}</span>
              </div>
            </div>
          </div>
          {onOverride && (
            <button
              onClick={() => setShowOverrideModal(true)}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium transition-all"
            >
              Override
            </button>
          )}
        </div>

        <div className="mt-3 p-3 bg-white rounded-lg text-sm text-gray-700">
          <div className="font-medium mb-1">Coordination Notice:</div>
          <div>
            This task is already being handled. Proceeding may cause duplicate work or coordination issues.
            Only override if you have confirmed with the other caregiver or in an emergency.
          </div>
        </div>
      </div>

      {showOverrideModal && (
        <OverrideReasonModal
          taskId={taskId}
          ownerName={ownerName}
          onConfirm={handleOverride}
          onCancel={() => setShowOverrideModal(false)}
        />
      )}
    </>
  );
}
