import { supabase } from '../lib/supabase';

export type SyncResult = {
  success: true;
  newVersion: number;
} | {
  success: false;
  error: 'VERSION_CONFLICT' | 'INVALID_TRANSITION' | 'NO_BRAIN_STATE' | 'UPDATE_FAILED' | 'NETWORK_ERROR' | 'BLOCKED_BY_EMERGENCY' | 'SAME_STATE';
  message: string;
  currentVersion?: number;
};

export interface BrainStateSnapshot {
  careState: string;
  emergencyState: string;
  offlineOnlineState: string;
  stateVersion: number;
}

class StateSyncService {
  async fetchCurrentState(): Promise<BrainStateSnapshot | null> {
    const { data, error } = await supabase
      .from('brain_state')
      .select('care_state, emergency_state, offline_online_state, state_version')
      .maybeSingle();

    if (error || !data) return null;

    return {
      careState: data.care_state,
      emergencyState: data.emergency_state,
      offlineOnlineState: data.offline_online_state,
      stateVersion: data.state_version,
    };
  }

  async updateEmergencyState(newState: string, expectedVersion: number): Promise<SyncResult> {
    try {
      const { data, error } = await supabase
        .rpc('request_emergency_transition', {
          p_new_state: newState,
          p_expected_version: expectedVersion,
        });

      if (error) {
        return {
          success: false,
          error: 'NETWORK_ERROR',
          message: error.message,
        };
      }

      if (data.success) {
        return {
          success: true,
          newVersion: data.new_version,
        };
      }

      return {
        success: false,
        error: data.error,
        message: data.message,
        currentVersion: data.current_version,
      };
    } catch (err) {
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  async updateCareState(
    newState: string,
    expectedVersion: number,
    actionContext?: Record<string, unknown>
  ): Promise<SyncResult> {
    try {
      const { data, error } = await supabase
        .rpc('request_care_transition', {
          p_new_state: newState,
          p_expected_version: expectedVersion,
          p_action_context: actionContext ?? null,
        });

      if (error) {
        return {
          success: false,
          error: 'NETWORK_ERROR',
          message: error.message,
        };
      }

      if (data.success) {
        return {
          success: true,
          newVersion: data.new_version,
        };
      }

      const errorCode = data.error_code as SyncResult extends { success: false } ? SyncResult['error'] : never;
      return {
        success: false,
        error: errorCode === 'VERSION_MISMATCH' ? 'VERSION_CONFLICT' : errorCode,
        message: data.message,
        currentVersion: data.current_version,
      };
    } catch (err) {
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }

  async updateOfflineOnlineState(newState: string, expectedVersion: number): Promise<SyncResult> {
    try {
      const { data, error } = await supabase
        .rpc('update_offline_online_state', {
          p_new_state: newState,
          p_expected_version: expectedVersion,
        });

      if (error) {
        return {
          success: false,
          error: 'NETWORK_ERROR',
          message: error.message,
        };
      }

      if (data.success) {
        return {
          success: true,
          newVersion: data.new_version ?? expectedVersion,
        };
      }

      return {
        success: false,
        error: data.error,
        message: data.message,
        currentVersion: data.current_version,
      };
    } catch (err) {
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: err instanceof Error ? err.message : 'Unknown error',
      };
    }
  }
}

export const stateSyncService = new StateSyncService();
