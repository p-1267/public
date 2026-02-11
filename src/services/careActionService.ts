import { supabase } from '../lib/supabase';
import { connectivityService } from './connectivity';
import { offlineQueueService } from './offlineQueue';
import { validateActionForState } from './careActions';
import { checkAllPhase1Requirements, formatBlockingMessage } from './brainBlocking';
import { enforceSOPRules } from './sopEnforcement';
import { BrainBlockError } from '../types/brainBlocking';
import { SHOWCASE_MODE } from '../config/showcase';
import {
  CareState,
  CareActionType,
  CareTransitionResult,
  CareActionContext,
  CARE_ERROR_CODES,
} from '../types/care';

export interface DispatchResult {
  success: boolean;
  queued: boolean;
  queueId?: string;
  result?: CareTransitionResult;
  errorCode?: string;
  errorMessage?: string;
  brainBlocked?: boolean;
  blockingRule?: any;
}

async function executeTransition(
  targetState: CareState,
  expectedVersion: number,
  actionContext: CareActionContext
): Promise<CareTransitionResult> {

  const { data, error } = await supabase.rpc('request_care_transition', {
    p_new_state: targetState,
    p_expected_version: expectedVersion,
    p_action_context: actionContext,
  });

  if (error) {
    return {
      success: false,
      error_code: CARE_ERROR_CODES.NETWORK_ERROR,
      message: error.message,
    };
  }

  return data as CareTransitionResult;
}

export async function dispatch(
  action: CareActionType,
  currentState: CareState,
  currentVersion: number,
  context?: {
    userId?: string;
    agencyId?: string;
    residentId?: string;
    mode?: 'production' | 'showcase';
  }
): Promise<DispatchResult> {
  const mode = context?.mode || (SHOWCASE_MODE ? 'showcase' : 'production');

  if (SHOWCASE_MODE && mode === 'production') {
    return {
      success: false,
      queued: false,
      errorCode: CARE_ERROR_CODES.VALIDATION_ERROR,
      errorMessage: 'Showcase Mode: writes are disabled in production mode. Use showcase scenarios.',
    };
  }

  // CRITICAL: Brain blocking check - runs before ANY care action
  // This enforces Phase 1 requirements and CANNOT be bypassed
  if (context?.userId && context?.agencyId) {
    try {
      const brainCheck = await checkAllPhase1Requirements(
        context.userId,
        context.agencyId,
        context.residentId
      );

      if (brainCheck.blocked && brainCheck.rule) {
        // Create BrainBlockError with full context
        const blockError = new BrainBlockError({
          rule: brainCheck.rule,
          mode: mode
        });

        // In showcase mode, we still block but with different messaging
        return {
          success: false,
          queued: false,
          brainBlocked: true,
          blockingRule: brainCheck.rule,
          errorCode: 'BRAIN_BLOCK',
          errorMessage: blockError.getDisplayMessage(),
        };
      }
    } catch (err: any) {
      // If Brain check itself fails, we BLOCK for safety
      return {
        success: false,
        queued: false,
        brainBlocked: true,
        errorCode: 'BRAIN_CHECK_FAILED',
        errorMessage: `Brain enforcement check failed: ${err.message}\n\nFor safety, this action is blocked until the check can complete.`,
      };
    }
  } else {
    // Missing required context - BLOCK
    return {
      success: false,
      queued: false,
      brainBlocked: true,
      errorCode: 'MISSING_CONTEXT',
      errorMessage: 'Cannot execute care action: missing user, agency, or resident context.\n\nThis is required for legal and audit compliance.',
    };
  }

  // Standard validation
  const validation = validateActionForState(action, currentState);

  if (!validation.valid) {
    return {
      success: false,
      queued: false,
      errorCode: validation.errorCode,
      errorMessage: validation.errorMessage,
    };
  }

  const targetState = validation.targetState!;
  const actionContext: CareActionContext = {
    action_type: action,
    initiated_at: new Date().toISOString(),
    source: 'direct',
  };

  // CRITICAL: SOP Runtime Enforcement - runs after Brain checks
  // This enforces timing rules, procedure rules, documentation rules
  if (context?.residentId && context?.agencyId && context?.userId) {
    try {
      await enforceSOPRules({
        actionType: action,
        actionTime: new Date(),
        userId: context.userId,
        userRole: 'CAREGIVER',
        agencyId: context.agencyId,
        residentId: context.residentId,
        actionDetails: {
          action_type: action,
          current_state: currentState,
          target_state: targetState
        }
      });
    } catch (sopError: any) {
      return {
        success: false,
        queued: false,
        errorCode: 'SOP_VIOLATION',
        errorMessage: `SOP Enforcement Blocked Action:\n\n${sopError.message}`,
      };
    }
  }

  // Offline queueing
  if (!connectivityService.isOnline()) {
    const queueId = await offlineQueueService.enqueue({
      type: 'UPDATE_CARE_STATE',
      payload: {
        action,
        targetState,
        actionContext,
      },
      expectedVersion: currentVersion,
    });

    return {
      success: true,
      queued: true,
      queueId,
    };
  }

  // Execute transition
  const result = await executeTransition(targetState, currentVersion, actionContext);

  return {
    success: result.success,
    queued: false,
    result,
    errorCode: result.error_code,
    errorMessage: result.message,
  };
}

export async function replayQueuedCareAction(
  action: CareActionType,
  targetState: CareState,
  actionContext: CareActionContext,
  expectedVersion: number
): Promise<CareTransitionResult> {
  const replayContext: CareActionContext = {
    ...actionContext,
    source: 'replay',
  };

  return executeTransition(targetState, expectedVersion, replayContext);
}
