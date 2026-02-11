import { useState, useEffect } from 'react';
import { offlineQueueService, QueuedAction } from '../services/offlineQueue';

export interface QueueDiagnostics {
  totalActions: number;
  oldestAction: QueuedAction | null;
  highRetryActions: QueuedAction[];
  staleActions: QueuedAction[];
  corruptedActions: QueuedAction[];
  isHealthy: boolean;
  issues: string[];
}

const MAX_RETRY_THRESHOLD = 3;
const STALE_THRESHOLD_MS = 5 * 60 * 1000;

export function useOfflineQueueDiagnostics() {
  const [diagnostics, setDiagnostics] = useState<QueueDiagnostics>({
    totalActions: 0,
    oldestAction: null,
    highRetryActions: [],
    staleActions: [],
    corruptedActions: [],
    isHealthy: true,
    issues: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function analyzeDiagnostics() {
      try {
        setLoading(true);
        setError(null);

        await offlineQueueService.initialize();
        const actions = await offlineQueueService.getAll();

        const now = Date.now();
        const issues: string[] = [];

        const highRetryActions = actions.filter(a => a.retryCount >= MAX_RETRY_THRESHOLD);
        const staleActions = actions.filter(a => (now - a.timestamp) > STALE_THRESHOLD_MS);
        const corruptedActions = actions.filter(a => !isValidAction(a));

        let oldestAction: QueuedAction | null = null;
        if (actions.length > 0) {
          oldestAction = actions.reduce((oldest, current) =>
            current.timestamp < oldest.timestamp ? current : oldest
          );
        }

        if (highRetryActions.length > 0) {
          issues.push(`${highRetryActions.length} action(s) with high retry count`);
        }

        if (staleActions.length > 0) {
          issues.push(`${staleActions.length} stale action(s) older than 5 minutes`);
        }

        if (corruptedActions.length > 0) {
          issues.push(`${corruptedActions.length} corrupted or malformed action(s)`);
        }

        const isHealthy = issues.length === 0;

        if (isMounted) {
          setDiagnostics({
            totalActions: actions.length,
            oldestAction,
            highRetryActions,
            staleActions,
            corruptedActions,
            isHealthy,
            issues
          });
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to analyze queue'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    analyzeDiagnostics();

    const unsubscribe = offlineQueueService.subscribe(() => {
      analyzeDiagnostics();
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  return { diagnostics, loading, error };
}

function isValidAction(action: QueuedAction): boolean {
  if (!action.id || !action.type || !action.payload) {
    return false;
  }

  if (typeof action.expectedVersion !== 'number' || action.expectedVersion < 0) {
    return false;
  }

  if (typeof action.timestamp !== 'number' || action.timestamp <= 0) {
    return false;
  }

  if (typeof action.retryCount !== 'number' || action.retryCount < 0) {
    return false;
  }

  const validTypes = ['UPDATE_CARE_STATE', 'UPDATE_EMERGENCY_STATE', 'UPDATE_OFFLINE_ONLINE_STATE'];
  if (!validTypes.includes(action.type)) {
    return false;
  }

  return true;
}
