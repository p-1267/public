import { useState, useCallback } from 'react';

export interface VersionConflict {
  expectedVersion: number;
  actualVersion: number;
  operation: string;
  timestamp: string;
  resolved: boolean;
}

export function useVersionConflictHandler() {
  const [conflicts, setConflicts] = useState<VersionConflict[]>([]);
  const [activeConflict, setActiveConflict] = useState<VersionConflict | null>(null);

  const detectConflict = useCallback((
    expectedVersion: number,
    actualVersion: number,
    operation: string
  ): boolean => {
    if (expectedVersion !== actualVersion) {
      const conflict: VersionConflict = {
        expectedVersion,
        actualVersion,
        operation,
        timestamp: new Date().toISOString(),
        resolved: false
      };

      setConflicts(prev => [...prev, conflict]);
      setActiveConflict(conflict);

      return true;
    }

    return false;
  }, []);

  const handleConflictError = useCallback((error: any, operation: string): {
    isConflict: boolean;
    userMessage: string;
    shouldRetry: boolean;
  } => {
    const errorMessage = error?.message || String(error);

    const isVersionConflict =
      errorMessage.includes('version') ||
      errorMessage.includes('conflict') ||
      errorMessage.includes('concurrent') ||
      errorMessage.includes('expected_version');

    if (isVersionConflict) {
      return {
        isConflict: true,
        userMessage: `Version conflict detected during ${operation}. The state was modified by another user or process. Please refresh and try again.`,
        shouldRetry: false
      };
    }

    return {
      isConflict: false,
      userMessage: `Operation failed: ${errorMessage}`,
      shouldRetry: false
    };
  }, []);

  const clearActiveConflict = useCallback(() => {
    if (activeConflict) {
      setConflicts(prev =>
        prev.map(c =>
          c === activeConflict ? { ...c, resolved: true } : c
        )
      );
      setActiveConflict(null);
    }
  }, [activeConflict]);

  const getUnresolvedConflicts = useCallback(() => {
    return conflicts.filter(c => !c.resolved);
  }, [conflicts]);

  return {
    conflicts,
    activeConflict,
    detectConflict,
    handleConflictError,
    clearActiveConflict,
    getUnresolvedConflicts
  };
}
