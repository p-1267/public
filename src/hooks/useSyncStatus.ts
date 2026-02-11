import { useState, useEffect, useMemo } from 'react';
import { useConnectivity } from './useConnectivity';
import { offlineQueueService, QueuedAction } from '../services/offlineQueue';
import { syncReplayService } from '../services/syncReplay';

export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'pending';

export interface SyncState {
  status: SyncStatus;
  pendingCount: number;
  lastSyncTime: number | null;
}

export function useSyncStatus(): SyncState {
  const connectivity = useConnectivity();
  const [pendingActions, setPendingActions] = useState<QueuedAction[]>([]);
  const [isReplaying, setIsReplaying] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  useEffect(() => {
    offlineQueueService.initialize();
    syncReplayService.initialize();

    const unsubscribeQueue = offlineQueueService.subscribe(setPendingActions);
    const unsubscribeReplay = syncReplayService.subscribe((result) => {
      if (result.succeeded > 0 || result.processed > 0) {
        setLastSyncTime(Date.now());
      }
    });

    const checkReplaying = setInterval(() => {
      setIsReplaying(syncReplayService.isProcessing());
    }, 100);

    return () => {
      unsubscribeQueue();
      unsubscribeReplay();
      clearInterval(checkReplaying);
    };
  }, []);

  const status = useMemo<SyncStatus>(() => {
    if (connectivity === 'offline') return 'offline';
    if (isReplaying) return 'syncing';
    if (pendingActions.length > 0) return 'pending';
    return 'synced';
  }, [connectivity, isReplaying, pendingActions.length]);

  return {
    status,
    pendingCount: pendingActions.length,
    lastSyncTime,
  };
}
