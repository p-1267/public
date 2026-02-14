import { useState, useEffect, useCallback } from 'react';
import { residentCareStateService, ResidentCareState } from '../services/residentCareStateService';
import { SHOWCASE_MODE } from '../config/showcase';
import { useShowcase } from '../contexts/ShowcaseContext';

export function useResidentCareState(residentId: string | null, agencyId?: string) {
  const [state, setState] = useState<ResidentCareState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    if (!residentId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const careState = await residentCareStateService.fetchResidentCareState(residentId, agencyId);
      setState(careState);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [residentId, agencyId]);

  useEffect(() => {
    loadState();

    if (!residentId) return;

    if (SHOWCASE_MODE) {
      const interval = setInterval(() => {
        loadState();
      }, 5000);
      return () => clearInterval(interval);
    }

    const unsubscribe = residentCareStateService.subscribeResidentCareState(
      residentId,
      (updatedState) => {
        setState(updatedState);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [residentId, loadState]);

  const refresh = useCallback(() => {
    loadState();
  }, [loadState]);

  return { state, loading, error, refresh };
}

export function useResidentCareStateList(residentIds: string[], agencyId?: string) {
  const [states, setStates] = useState<Map<string, ResidentCareState>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { selectedResidentId } = useShowcase();

  const loadStates = useCallback(async () => {
    if (residentIds.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (SHOWCASE_MODE) {
        const mockStates = new Map<string, ResidentCareState>();
        residentIds.forEach(id => {
          mockStates.set(id, generateShowcaseState(id, selectedResidentId));
        });
        setStates(mockStates);
      } else {
        const statePromises = residentIds.map(id =>
          residentCareStateService.fetchResidentCareState(id, agencyId)
        );
        const results = await Promise.all(statePromises);
        const statesMap = new Map<string, ResidentCareState>();
        results.forEach(state => {
          statesMap.set(state.residentId, state);
        });
        setStates(statesMap);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [residentIds, agencyId, selectedResidentId]);

  useEffect(() => {
    loadStates();

    if (residentIds.length === 0) return;

    if (SHOWCASE_MODE) {
      const interval = setInterval(() => {
        loadStates();
      }, 5000);
      return () => clearInterval(interval);
    }

    const unsubscribes = residentIds.map(id =>
      residentCareStateService.subscribeResidentCareState(id, (updatedState) => {
        setStates(prev => {
          const newMap = new Map(prev);
          newMap.set(updatedState.residentId, updatedState);
          return newMap;
        });
      })
    );

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, [residentIds, loadStates]);

  const refresh = useCallback(() => {
    loadStates();
  }, [loadStates]);

  return { states, loading, error, refresh };
}

function generateShowcaseState(residentId: string, _mockResidentId: any): ResidentCareState {
  const now = new Date();

  // Simplified: return DB-only state placeholder
  return {
    residentId,
    residentName: 'Resident',
    lastUpdated: now.toISOString(),
    status: 'all_clear',
    recentActions: [],
    pendingActions: [],
    activeSignals: [],
    summary: {
      completedLast2Hours: 0,
      dueSoon: 0,
      overdue: 0,
      activeIncidents: 0,
      activeSignals: 0
    }
  };
}
