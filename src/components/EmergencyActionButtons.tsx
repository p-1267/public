import { useState, useCallback } from 'react';
import { useUserPermissions } from '../hooks/useUserPermissions';
import {
  EmergencyState,
  EmergencyActionType,
  EMERGENCY_STATES,
  EMERGENCY_ACTION_TYPES,
} from '../types/care';
import {
  getValidActionsForState,
  dispatchEmergencyAction,
} from '../services/emergencyActionService';
import { BrainBlockModal } from './BrainBlockModal';
import { SHOWCASE_MODE } from '../config/showcase';

interface EmergencyActionButtonsProps {
  emergencyState: EmergencyState;
  version: number;
}

interface ActionConfig {
  label: string;
  color: string;
  bgColor: string;
  hoverBgColor: string;
}

const ACTION_CONFIG: Record<EmergencyActionType, ActionConfig> = {
  [EMERGENCY_ACTION_TYPES.TRIGGER_EMERGENCY]: {
    label: 'Trigger Emergency',
    color: '#ffffff',
    bgColor: '#dc2626',
    hoverBgColor: '#b91c1c',
  },
  [EMERGENCY_ACTION_TYPES.ACTIVATE_EMERGENCY]: {
    label: 'Activate Emergency',
    color: '#ffffff',
    bgColor: '#dc2626',
    hoverBgColor: '#b91c1c',
  },
  [EMERGENCY_ACTION_TYPES.RESOLVE_EMERGENCY]: {
    label: 'Resolve Emergency',
    color: '#ffffff',
    bgColor: '#059669',
    hoverBgColor: '#047857',
  },
};

export function EmergencyActionButtons({
  emergencyState,
  version,
}: EmergencyActionButtonsProps) {
  const { hasPermission, loading: permissionsLoading } = useUserPermissions();
  const { mockUserId, mockAgencyId, selectedResidentId } = useShowcaseData();
  const [pendingAction, setPendingAction] = useState<EmergencyActionType | null>(null);
  const [optimisticState, setOptimisticState] = useState<EmergencyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blockingRule, setBlockingRule] = useState<any | null>(null);

  const effectiveState = optimisticState ?? emergencyState;

  const handleAction = useCallback(
    async (action: EmergencyActionType) => {
      setError(null);
      setBlockingRule(null);
      setPendingAction(action);

      if (action === EMERGENCY_ACTION_TYPES.TRIGGER_EMERGENCY) {
        setOptimisticState(EMERGENCY_STATES.PENDING);
      }

      const userId = mockUserId || 'unknown-user';
      const agencyId = mockAgencyId || 'unknown-agency';
      const residentId = selectedResidentId || undefined;
      const mode = SHOWCASE_MODE ? 'showcase' : 'production';

      const result = await dispatchEmergencyAction(action, version, {
        userId,
        agencyId,
        residentId,
        mode
      });

      if (!result.success) {
        setOptimisticState(null);

        if (result.error === 'BRAIN_BLOCK' || result.error === 'BRAIN_CHECK_FAILED' || result.error === 'MISSING_CONTEXT') {
          try {
            const parsedMessage = JSON.parse(result.message ?? '{}');
            if (parsedMessage.rule) {
              setBlockingRule(parsedMessage.rule);
            } else {
              setError(result.message ?? 'Action blocked');
            }
          } catch {
            setError(result.message ?? 'Action blocked');
          }
        } else {
          setError(result.message ?? 'Action failed');
        }
      } else {
        setOptimisticState(null);
      }

      setPendingAction(null);
    },
    [version, mockUserId, mockAgencyId, selectedResidentId]
  );

  const handleCloseBrainBlock = useCallback(() => {
    setBlockingRule(null);
  }, []);

  if (permissionsLoading) {
    return null;
  }

  if (!hasPermission('TRIGGER_EMERGENCY')) {
    return null;
  }

  const validActions = getValidActionsForState(effectiveState);

  if (validActions.length === 0) {
    return null;
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {validActions.map((action) => {
            const config = ACTION_CONFIG[action];
            const isLoading = pendingAction === action;

            return (
              <button
                key={action}
                onClick={() => handleAction(action)}
                disabled={pendingAction !== null}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 600,
                  color: config.color,
                  backgroundColor: isLoading ? config.hoverBgColor : config.bgColor,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: pendingAction !== null ? 'not-allowed' : 'pointer',
                  opacity: pendingAction !== null && !isLoading ? 0.6 : 1,
                  transition: 'background-color 150ms ease, opacity 150ms ease',
                }}
                onMouseEnter={(e) => {
                  if (pendingAction === null) {
                    e.currentTarget.style.backgroundColor = config.hoverBgColor;
                  }
                }}
                onMouseLeave={(e) => {
                  if (pendingAction === null) {
                    e.currentTarget.style.backgroundColor = config.bgColor;
                  }
                }}
              >
                {isLoading ? 'Processing...' : config.label}
              </button>
            );
          })}
        </div>

        {error && (
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '8px',
              color: '#dc2626',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}
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
