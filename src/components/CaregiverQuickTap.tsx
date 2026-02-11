import { useState } from 'react';
import { useBrainState } from '../hooks/useBrainState';
import { useShowcase } from '../contexts/ShowcaseContext';
import { dispatch } from '../services/careActionService';
import { CARE_ACTION_TYPES, CareState } from '../types/care';
import { SHOWCASE_MODE } from '../config/showcase';
import { BrainBlockModal } from './BrainBlockModal';
import { MedicationQuickTap } from './MedicationQuickTap';

export function CaregiverQuickTap() {
  const { brainState, version } = useBrainState();
  const { mockUserId, mockAgencyId, selectedResidentId } = useShowcase();
  const [processing, setProcessing] = useState(false);
  const [blockingRule, setBlockingRule] = useState<any | null>(null);

  const handleQuickAction = async (action: typeof CARE_ACTION_TYPES[keyof typeof CARE_ACTION_TYPES]) => {
    if (!brainState || version === null || !selectedResidentId) return;

    setProcessing(true);
    setBlockingRule(null);

    const result = await dispatch(
      action,
      brainState.care_state as CareState,
      version,
      {
        userId: mockUserId || 'unknown',
        agencyId: mockAgencyId || 'unknown',
        residentId: selectedResidentId,
        mode: SHOWCASE_MODE ? 'showcase' : 'production'
      }
    );

    if (!result.success) {
      if (result.brainBlocked && result.blockingRule) {
        setBlockingRule(result.blockingRule);
      } else {
        alert(`Action failed: ${result.errorMessage}`);
      }
    }

    setProcessing(false);
  };

  const currentState = brainState?.care_state as CareState;
  const isEmergency = brainState?.emergency_state === 'ACTIVE';

  return (
    <>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <QuickActionButton
            label="Start Prep"
            icon="📋"
            onClick={() => handleQuickAction(CARE_ACTION_TYPES.START_PREPARATION)}
            disabled={processing || isEmergency || currentState !== 'IDLE'}
          />
          <QuickActionButton
            label="Begin Care"
            icon="▶️"
            onClick={() => handleQuickAction(CARE_ACTION_TYPES.BEGIN_CARE)}
            disabled={processing || isEmergency || currentState !== 'PREPARING'}
          />
          <QuickActionButton
            label="Pause Care"
            icon="⏸️"
            onClick={() => handleQuickAction(CARE_ACTION_TYPES.PAUSE_CARE)}
            disabled={processing || isEmergency || currentState !== 'IN_PROGRESS'}
          />
          <QuickActionButton
            label="Resume Care"
            icon="▶️"
            onClick={() => handleQuickAction(CARE_ACTION_TYPES.RESUME_CARE)}
            disabled={processing || isEmergency || currentState !== 'PAUSED'}
          />
          <QuickActionButton
            label="Complete"
            icon="✅"
            onClick={() => handleQuickAction(CARE_ACTION_TYPES.BEGIN_COMPLETION)}
            disabled={processing || isEmergency || currentState !== 'IN_PROGRESS'}
            className="col-span-2"
          />
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Medications</h3>
          {selectedResidentId ? (
            <MedicationQuickTap residentId={selectedResidentId} />
          ) : (
            <div className="text-gray-500 text-sm">Select a resident to view medications</div>
          )}
        </div>

        <div className="border-t border-gray-200 pt-4 mt-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Care Logging</h3>
          <div className="grid grid-cols-3 gap-2">
            <QuickLogButton label="Meal" icon="🍽️" />
            <QuickLogButton label="Vitals" icon="❤️" />
            <QuickLogButton label="Mood" icon="😊" />
            <QuickLogButton label="Bathroom" icon="🚽" />
            <QuickLogButton label="Activity" icon="🚶" />
            <QuickLogButton label="Sleep" icon="😴" />
          </div>
        </div>
      </div>

      {blockingRule && (
        <BrainBlockModal
          rule={blockingRule}
          mode={SHOWCASE_MODE ? 'showcase' : 'production'}
          onClose={() => setBlockingRule(null)}
        />
      )}
    </>
  );
}

function QuickActionButton({ label, icon, onClick, disabled, className = '' }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${className} bg-blue-600 text-white py-4 px-4 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold text-sm flex flex-col items-center gap-1 transition`}
    >
      <span className="text-2xl">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function QuickLogButton({ label, icon }: any) {
  const handleClick = () => {
    if (SHOWCASE_MODE) {
      alert('Quick logging is visible in Showcase Mode but blocked from execution');
      return;
    }
    alert(`${label} logging would open detailed form here`);
  };

  return (
    <button
      onClick={handleClick}
      className="bg-gray-100 text-gray-700 py-3 px-2 rounded-lg hover:bg-gray-200 font-medium text-xs flex flex-col items-center gap-1 transition"
    >
      <span className="text-xl">{icon}</span>
      <span>{label}</span>
    </button>
  );
}
