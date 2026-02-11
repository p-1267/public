import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface GlobalEmergencyStatus {
  emergency_state: string;
  updated_at: string;
}

export function useGlobalEmergencyStatus() {
  const [status, setStatus] = useState<GlobalEmergencyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchEmergencyStatus() {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('brain_state')
          .select('emergency_state, updated_at')
          .maybeSingle();

        if (fetchError) throw fetchError;

        if (isMounted) {
          setStatus(data ? {
            emergency_state: data.emergency_state,
            updated_at: data.updated_at
          } : null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Failed to fetch emergency status'));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchEmergencyStatus();

    const channel = supabase
      .channel('global-emergency-status')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'brain_state'
        },
        () => {
          fetchEmergencyStatus();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      channel.unsubscribe();
    };
  }, []);

  return { status, loading, error };
}
