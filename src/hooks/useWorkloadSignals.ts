import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useWorkloadSignals() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const detectWorkloadSignals = useCallback(async (lookbackDays: number = 14) => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('detect_workload_signals', {
        p_lookback_days: lookbackDays
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to detect workload signals';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const getActiveWorkloadSignals = useCallback(async () => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_active_workload_signals');

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get active workload signals';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const acknowledgeWorkloadSignal = useCallback(async (signalId: string, notes?: string) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('acknowledge_workload_signal', {
        p_signal_id: signalId,
        p_notes: notes || null
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error('Failed to acknowledge signal');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to acknowledge workload signal';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getCaregiverSignals = useCallback(async (caregiverId: string, includeAcknowledged: boolean = false) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_caregiver_signals', {
        p_caregiver_id: caregiverId,
        p_include_acknowledged: includeAcknowledged
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get caregiver signals';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  return {
    loading,
    error,
    detectWorkloadSignals,
    getActiveWorkloadSignals,
    acknowledgeWorkloadSignal,
    getCaregiverSignals
  };
}
