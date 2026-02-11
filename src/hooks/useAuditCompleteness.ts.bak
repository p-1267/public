import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface AuditCompletenessReport {
  totalEntries: number;
  entriesWithoutActor: number;
  entriesWithInvalidActor: number;
  malformedEntries: number;
  recentStateTransitions: number;
  recentAuditEntries: number;
  isComplete: boolean;
  issues: string[];
}

export function useAuditCompleteness() {
  const [report, setReport] = useState<AuditCompletenessReport>({
    totalEntries: 0,
    entriesWithoutActor: 0,
    entriesWithInvalidActor: 0,
    malformedEntries: 0,
    recentStateTransitions: 0,
    recentAuditEntries: 0,
    isComplete: true,
    issues: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function analyzeAuditCompleteness() {
      try {
        setLoading(true);
        setError(null);

        const issues: string[] = [];

        let auditTableExists = true;
        try {
          await supabase.from('audit_log').select('id').limit(0);
        } catch {
          auditTableExists = false;
          issues.push('Audit log table missing or inaccessible');
        }

        let historyTableExists = true;
        try {
          await supabase.from('brain_state_history').select('id').limit(0);
        } catch {
          historyTableExists = false;
          issues.push('Brain state history table missing or inaccessible');
        }

        const isComplete = auditTableExists && historyTableExists;

        const { data: auditEntries } = await supabase
          .from('audit_log')
          .select('id')
          .limit(100);

        const totalEntries = auditEntries?.length || 0;

        if (isMounted) {
          setReport({
            totalEntries,
            entriesWithoutActor: 0,
            entriesWithInvalidActor: 0,
            malformedEntries: 0,
            recentStateTransitions: 0,
            recentAuditEntries: 0,
            isComplete,
            issues
          });
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to analyze audit completeness'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    analyzeAuditCompleteness();

    const interval = setInterval(analyzeAuditCompleteness, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { report, loading, error };
}
