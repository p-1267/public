import {
  CareState,
  CareActionType,
  CARE_STATES,
  CARE_ACTION_TYPES,
  CARE_ERROR_CODES,
  CareErrorCode,
} from '../types/care';

interface ActionMapping {
  fromStates: readonly CareState[];
  toState: CareState;
}

const ACTION_TO_TRANSITION: Record<CareActionType, ActionMapping> = {
  [CARE_ACTION_TYPES.START_PREPARATION]: {
    fromStates: [CARE_STATES.IDLE],
    toState: CARE_STATES.PREPARING,
  },
  [CARE_ACTION_TYPES.BEGIN_CARE]: {
    fromStates: [CARE_STATES.PREPARING],
    toState: CARE_STATES.ACTIVE,
  },
  [CARE_ACTION_TYPES.CANCEL_PREPARATION]: {
    fromStates: [CARE_STATES.PREPARING],
    toState: CARE_STATES.IDLE,
  },
  [CARE_ACTION_TYPES.PAUSE_CARE]: {
    fromStates: [CARE_STATES.ACTIVE],
    toState: CARE_STATES.PAUSED,
  },
  [CARE_ACTION_TYPES.RESUME_CARE]: {
    fromStates: [CARE_STATES.PAUSED],
    toState: CARE_STATES.ACTIVE,
  },
  [CARE_ACTION_TYPES.BEGIN_COMPLETION]: {
    fromStates: [CARE_STATES.ACTIVE, CARE_STATES.PAUSED],
    toState: CARE_STATES.COMPLETING,
  },
  [CARE_ACTION_TYPES.COMPLETE_SESSION]: {
    fromStates: [CARE_STATES.COMPLETING],
    toState: CARE_STATES.IDLE,
  },
};

export interface ActionValidationResult {
  valid: boolean;
  targetState?: CareState;
  errorCode?: CareErrorCode;
  errorMessage?: string;
}

export function validateActionForState(
  action: CareActionType,
  currentState: CareState
): ActionValidationResult {
  const mapping = ACTION_TO_TRANSITION[action];

  if (!mapping) {
    return {
      valid: false,
      errorCode: CARE_ERROR_CODES.INVALID_ACTION_FOR_STATE,
      errorMessage: `Unknown action type: ${action}`,
    };
  }

  const isValidFromState = mapping.fromStates.includes(currentState);

  if (!isValidFromState) {
    return {
      valid: false,
      errorCode: CARE_ERROR_CODES.INVALID_ACTION_FOR_STATE,
      errorMessage: `Action ${action} not valid from state ${currentState}. Valid from: ${mapping.fromStates.join(', ')}`,
    };
  }

  return {
    valid: true,
    targetState: mapping.toState,
  };
}

export function getTargetState(action: CareActionType): CareState | null {
  const mapping = ACTION_TO_TRANSITION[action];
  return mapping?.toState ?? null;
}

export function getValidActionsForState(currentState: CareState): CareActionType[] {
  const validActions: CareActionType[] = [];

  for (const [action, mapping] of Object.entries(ACTION_TO_TRANSITION)) {
    if (mapping.fromStates.includes(currentState)) {
      validActions.push(action as CareActionType);
    }
  }

  return validActions;
}
