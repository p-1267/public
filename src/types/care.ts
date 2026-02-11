export const CARE_STATES = {
  IDLE: 'IDLE',
  PREPARING: 'PREPARING',
  ACTIVE: 'ACTIVE',
  PAUSED: 'PAUSED',
  COMPLETING: 'COMPLETING',
} as const;

export type CareState = (typeof CARE_STATES)[keyof typeof CARE_STATES];

export const CARE_ACTION_TYPES = {
  START_PREPARATION: 'START_PREPARATION',
  BEGIN_CARE: 'BEGIN_CARE',
  CANCEL_PREPARATION: 'CANCEL_PREPARATION',
  PAUSE_CARE: 'PAUSE_CARE',
  RESUME_CARE: 'RESUME_CARE',
  BEGIN_COMPLETION: 'BEGIN_COMPLETION',
  COMPLETE_SESSION: 'COMPLETE_SESSION',
} as const;

export type CareActionType = (typeof CARE_ACTION_TYPES)[keyof typeof CARE_ACTION_TYPES];

export const CARE_ERROR_CODES = {
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  BLOCKED_BY_EMERGENCY: 'BLOCKED_BY_EMERGENCY',
  VERSION_MISMATCH: 'VERSION_MISMATCH',
  SAME_STATE: 'SAME_STATE',
  NO_BRAIN_STATE: 'NO_BRAIN_STATE',
  INVALID_ACTION_FOR_STATE: 'INVALID_ACTION_FOR_STATE',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

export type CareErrorCode = (typeof CARE_ERROR_CODES)[keyof typeof CARE_ERROR_CODES];

export interface CareTransitionResult {
  success: boolean;
  error_code?: CareErrorCode;
  message?: string;
  previous_state?: CareState;
  new_state?: CareState;
  current_state?: CareState;
  current_version?: number;
  new_version?: number;
  action_context?: CareActionContext;
}

export interface CareActionContext {
  action_type: CareActionType;
  initiated_at: string;
  source: 'direct' | 'replay';
}

export interface CareAction {
  type: CareActionType;
  context: CareActionContext;
}

export const EMERGENCY_STATES = {
  NONE: 'NONE',
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
} as const;

export type EmergencyState = (typeof EMERGENCY_STATES)[keyof typeof EMERGENCY_STATES];

export const EMERGENCY_ACTION_TYPES = {
  TRIGGER_EMERGENCY: 'TRIGGER_EMERGENCY',
  ACTIVATE_EMERGENCY: 'ACTIVATE_EMERGENCY',
  RESOLVE_EMERGENCY: 'RESOLVE_EMERGENCY',
} as const;

export type EmergencyActionType = (typeof EMERGENCY_ACTION_TYPES)[keyof typeof EMERGENCY_ACTION_TYPES];

export const EMERGENCY_ERROR_CODES = {
  INVALID_TRANSITION: 'INVALID_TRANSITION',
  VERSION_CONFLICT: 'VERSION_CONFLICT',
  NO_BRAIN_STATE: 'NO_BRAIN_STATE',
  NO_CHANGE: 'NO_CHANGE',
  UPDATE_FAILED: 'UPDATE_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
} as const;

export type EmergencyErrorCode = (typeof EMERGENCY_ERROR_CODES)[keyof typeof EMERGENCY_ERROR_CODES];

export interface EmergencyTransitionResult {
  success: boolean;
  error?: EmergencyErrorCode;
  message?: string;
  from_state?: EmergencyState;
  to_state?: EmergencyState;
  new_version?: number;
}
