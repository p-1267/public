import { useState, useEffect, useRef, useCallback } from 'react';
import { useBrainState } from '../hooks/useBrainState';
import { useConnectivity } from '../hooks/useConnectivity';
import { useUserPermissions } from '../hooks/useUserPermissions';
import { useShowcase } from '../contexts/ShowcaseContext';
import { getValidActionsForState } from '../services/careActions';
import { dispatch } from '../services/careActionService';
import { CareActionType, CareState, CARE_ACTION_TYPES } from '../types/care';
import { CareActionError } from './CareActionError';
import { BrainBlockModal } from './BrainBlockModal';
import { SHOWCASE_MODE } from '../config/showcase';

const ACTION_LABELS: Record<CareActionType, string> = {
  [CARE_ACTION_TYPES.START_PREPARATION]: 'Start Preparation',
  [CARE_ACTION_TYPES.BEGIN_CARE]: 'Begin Care',
  [CARE_ACTION_TYPES.CANCEL_PREPARATION]: 'Cancel',
  [CARE_ACTION_TYPES.PAUSE_CARE]: 'Pause',
  [CARE_ACTION_TYPES.RESUME_CARE]: 'Resume',
  [CARE_ACTION_TYPES.BEGIN_COMPLETION]: 'Complete',
  [CARE_ACTION_TYPES.COMPLETE_SESSION]: 'Finish Session',
};

export function CareActionButtons() {
  const { brainState, version, isLoading } = useBrainState();
  const connectivity = useConnectivity();
  const { hasPermission, loading: permissionsLoading } = useUserPermissions();
  const { mockUserId, mockAgencyId, selectedResidentId } = useShowcase();

  const [pendingAction, setPendingAction] = useState<CareActionType | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [blockingRule, setBlockingRule] = useState<any | null>(null);

  const prevVersionRef = useRef<number | null>(null);

  useEffect(() => {
    if (prevVersionRef.current !== null && version !== null && version !== prevVersionRef.current) {
      setPendingAction(null);
    }
    prevVersionRef.current = version;
  }, [version]);

  const handleActionClick = useCallback(async (action: CareActionType) => {
    if (!brainState || version === null) return;

    setPendingAction(action);
    setErrorCode(null);
    setBlockingRule(null);

    const userId = mockUserId || 'unknown-user';
    const agencyId = mockAgencyId || 'unknown-agency';
    const residentId = selectedResidentId || undefined;
    const mode = SHOWCASE_MODE ? 'showcase' : 'production';

    const result = await dispatch(
      action,
      brainState.care_state as CareState,
      version,
      {
        userId,
        agencyId,
        residentId,
        mode
      }
    );

    if (!result.success) {
      setPendingAction(null);

      if (result.brainBlocked && result.blockingRule) {
        setBlockingRule(result.blockingRule);
      } else {
        setErrorCode(result.errorCode ?? 'UNKNOWN_ERROR');
      }
    }
  }, [brainState, version, mockUserId, mockAgencyId, selectedResidentId]);

  const handleDismissError = useCallback(() => {
    setErrorCode(null);
  }, []);

  const handleCloseBrainBlock = useCallback(() => {
    setBlockingRule(null);
  }, []);

  if (isLoading || permissionsLoading) {
    return null;
  }

  if (!hasPermission('WRITE_CARE_DATA')) {
    return null;
  }

  if (!brainState) {
    return null;
  }

  const currentCareState = brainState.care_state as CareState;
  const isEmergencyActive = brainState.emergency_state === 'ACTIVE';
  const validActions = getValidActionsForState(currentCareState);
  const isOffline = connectivity === 'offline';

  if (validActions.length === 0) {
    return null;
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {validActions.map((action) => {
            const isPending = pendingAction === action;
            const isDisabled = pendingAction !== null || isEmergencyActive;

            return (
              <button
                key={action}
                onClick={() => handleActionClick(action)}
                disabled={isDisabled}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isDisabled ? '#9ca3af' : '#2563eb',
                  color: 'white',
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: isDisabled ? 0.7 : 1,
                }}
              >
                {isPending && (
                  <span
                    style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid transparent',
                      borderTopColor: 'white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                    }}
                  />
                )}
                {ACTION_LABELS[action]}
                {isOffline && !isPending && (
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#fbbf24',
                    }}
                    title="Offline - action will be queued"
                  />
                )}
              </button>
            );
          })}
        </div>
        {errorCode && (
          <CareActionError errorCode={errorCode} onDismiss={handleDismissError} />
        )}
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
      {blockingRule && (
        <BrainBlockModal
          rule={blockingRule}
          mode={SHOWCASE_MODE ? 'showcase' : 'production'}
          onClose={handleCloseBrainBlock}
        />
      )}
    </>
  );
}
