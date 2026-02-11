import { supabase } from '../lib/supabase';
import { checkAllPhase1Requirements } from './brainBlocking';
import { BrainBlockError } from '../types/brainBlocking';
import {
  EmergencyState,
  EmergencyActionType,
  EmergencyTransitionResult,
  EMERGENCY_STATES,
  EMERGENCY_ACTION_TYPES,
  EMERGENCY_ERROR_CODES,
} from '../types/care';

const ACTION_TO_TARGET_STATE: Record<EmergencyActionType, EmergencyState> = {
  [EMERGENCY_ACTION_TYPES.TRIGGER_EMERGENCY]: EMERGENCY_STATES.PENDING,
  [EMERGENCY_ACTION_TYPES.ACTIVATE_EMERGENCY]: EMERGENCY_STATES.ACTIVE,
  [EMERGENCY_ACTION_TYPES.RESOLVE_EMERGENCY]: EMERGENCY_STATES.NONE,
};

const VALID_ACTIONS_FOR_STATE: Record<EmergencyState, EmergencyActionType[]> = {
  [EMERGENCY_STATES.NONE]: [EMERGENCY_ACTION_TYPES.TRIGGER_EMERGENCY],
  [EMERGENCY_STATES.PENDING]: [EMERGENCY_ACTION_TYPES.ACTIVATE_EMERGENCY],
  [EMERGENCY_STATES.ACTIVE]: [EMERGENCY_ACTION_TYPES.RESOLVE_EMERGENCY],
};

export function getValidActionsForState(state: EmergencyState): EmergencyActionType[] {
  return VALID_ACTIONS_FOR_STATE[state] ?? [];
}

export async function dispatchEmergencyAction(
  action: EmergencyActionType,
  currentVersion: number,
  context?: {
    userId?: string;
    agencyId?: string;
    residentId?: string;
    mode?: 'production' | 'showcase';
  }
): Promise<EmergencyTransitionResult> {
  const mode = context?.mode || 'production';

  // CRITICAL: Brain blocking check for emergency actions
  // Emergency actions MUST also comply with Phase 1 requirements
  if (context?.userId && context?.agencyId) {
    try {
      const brainCheck = await checkAllPhase1Requirements(
        context.userId,
        context.agencyId,
        context.residentId
      );

      if (brainCheck.blocked && brainCheck.rule) {
        const blockError = new BrainBlockError({
          rule: brainCheck.rule,
          mode: mode
        });

        return {
          success: false,
          error: 'BRAIN_BLOCK',
          message: blockError.getDisplayMessage(),
        };
      }
    } catch (err: any) {
      return {
        success: false,
        error: 'BRAIN_CHECK_FAILED',
        message: `Brain enforcement check failed: ${err.message}\n\nFor safety, this emergency action is blocked until the check can complete.`,
      };
    }
  } else {
    return {
      success: false,
      error: 'MISSING_CONTEXT',
      message: 'Cannot execute emergency action: missing user, agency, or resident context.\n\nThis is required for legal and audit compliance.',
    };
  }

  const targetState = ACTION_TO_TARGET_STATE[action];

  const { data, error } = await supabase.rpc('request_emergency_transition', {
    p_new_state: targetState,
    p_expected_version: currentVersion,
  });

  if (error) {
    return {
      success: false,
      error: EMERGENCY_ERROR_CODES.NETWORK_ERROR,
      message: error.message,
    };
  }

  return data as EmergencyTransitionResult;
}
