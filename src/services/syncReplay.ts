import { offlineQueueService, QueuedAction } from './offlineQueue';
import { stateSyncService } from './stateSync';
import { connectivityService } from './connectivity';

export type ReplayResult = {
  processed: number;
  succeeded: number;
  failed: number;
  discarded: number;
};

type ReplayListener = (result: ReplayResult) => void;

const MAX_RETRIES = 3;

class SyncReplayService {
  private isReplaying = false;
  private listeners: Set<ReplayListener> = new Set();

  initialize(): void {
    connectivityService.subscribe((status) => {
      if (status === 'online') {
        this.replay();
      }
    });
  }

  async replay(): Promise<ReplayResult> {
    if (this.isReplaying) {
      return { processed: 0, succeeded: 0, failed: 0, discarded: 0 };
    }

    this.isReplaying = true;

    const result: ReplayResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      discarded: 0,
    };

    try {
      const currentState = await stateSyncService.fetchCurrentState();
      if (!currentState) {
        this.isReplaying = false;
        return result;
      }

      const actions = await offlineQueueService.getAll();

      for (const action of actions) {
        result.processed++;

        if (action.expectedVersion < currentState.stateVersion) {
          await offlineQueueService.dequeue(action.id);
          result.discarded++;
          continue;
        }

        if (action.retryCount >= MAX_RETRIES) {
          await offlineQueueService.dequeue(action.id);
          result.discarded++;
          continue;
        }

        const syncResult = await this.executeAction(action, currentState.stateVersion);

        if (syncResult.success) {
          await offlineQueueService.dequeue(action.id);
          currentState.stateVersion = syncResult.newVersion;
          result.succeeded++;
        } else if (syncResult.error === 'VERSION_CONFLICT') {
          await offlineQueueService.dequeue(action.id);
          result.discarded++;
          if (syncResult.currentVersion) {
            currentState.stateVersion = syncResult.currentVersion;
          }
        } else if (syncResult.error === 'BLOCKED_BY_EMERGENCY') {
          result.failed++;
          break;
        } else if (syncResult.error === 'NETWORK_ERROR') {
          await offlineQueueService.incrementRetry(action.id);
          result.failed++;
          break;
        } else {
          await offlineQueueService.dequeue(action.id);
          result.failed++;
        }
      }
    } finally {
      this.isReplaying = false;
      this.notifyListeners(result);
    }

    return result;
  }

  private async executeAction(
    action: QueuedAction,
    currentVersion: number
  ): Promise<{ success: true; newVersion: number } | { success: false; error: string; currentVersion?: number }> {
    switch (action.type) {
      case 'UPDATE_EMERGENCY_STATE': {
        const payload = action.payload as { state: string };
        return stateSyncService.updateEmergencyState(payload.state, currentVersion);
      }

      case 'UPDATE_CARE_STATE': {
        const payload = action.payload as {
          targetState: string;
          actionContext?: Record<string, unknown>;
        };
        const replayContext = payload.actionContext
          ? { ...payload.actionContext, source: 'replay' }
          : { source: 'replay' };
        return stateSyncService.updateCareState(payload.targetState, currentVersion, replayContext);
      }

      case 'UPDATE_OFFLINE_ONLINE_STATE': {
        const payload = action.payload as { state: string };
        return stateSyncService.updateOfflineOnlineState(payload.state, currentVersion);
      }

      default:
        return { success: false, error: 'UNKNOWN_ACTION' };
    }
  }

  subscribe(listener: ReplayListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(result: ReplayResult): void {
    this.listeners.forEach(listener => listener(result));
  }

  isProcessing(): boolean {
    return this.isReplaying;
  }
}

export const syncReplayService = new SyncReplayService();
