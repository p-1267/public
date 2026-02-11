import { useBrainState } from './useBrainState';

export interface EmergencyBlockStatus {
  isEmergencyActive: boolean;
  careActionsBlocked: boolean;
  nonEmergencyTransitionsBlocked: boolean;
  blockReason: string | null;
  allowedActions: string[];
}

export function useEmergencyBlockStatus() {
  const { brainState, isLoading, error } = useBrainState();

  const isEmergencyActive = brainState?.emergency_state === 'active';

  const blockStatus: EmergencyBlockStatus = {
    isEmergencyActive,
    careActionsBlocked: isEmergencyActive,
    nonEmergencyTransitionsBlocked: isEmergencyActive,
    blockReason: isEmergencyActive
      ? 'Emergency is active. All non-emergency actions are blocked.'
      : null,
    allowedActions: isEmergencyActive
      ? ['Resolve Emergency', 'View Emergency Status']
      : ['All actions']
  };

  const isActionBlocked = (actionType: string): { blocked: boolean; reason?: string } => {
    if (!isEmergencyActive) {
      return { blocked: false };
    }

    const emergencyActions = [
      'resolve_emergency',
      'view_emergency',
      'trigger_emergency',
      'UPDATE_EMERGENCY_STATE'
    ];

    const isEmergencyAction = emergencyActions.some(ea =>
      actionType.toLowerCase().includes(ea.toLowerCase())
    );

    if (isEmergencyAction) {
      return { blocked: false };
    }

    return {
      blocked: true,
      reason: 'This action is blocked because an emergency is currently active. Please resolve the emergency first.'
    };
  };

  const getCareActionBlockMessage = (): string | null => {
    if (!isEmergencyActive) {
      return null;
    }

    return 'Care actions are currently blocked due to an active emergency. The emergency must be resolved before normal care operations can resume.';
  };

  const getReplayBlockMessage = (): string | null => {
    if (!isEmergencyActive) {
      return null;
    }

    return 'Offline action replay is paused due to an active emergency. Queued actions will resume after emergency resolution.';
  };

  return {
    blockStatus,
    isActionBlocked,
    getCareActionBlockMessage,
    getReplayBlockMessage,
    isLoading,
    error
  };
}
