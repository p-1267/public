import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useTransparency() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getDataProcessingHistory = useCallback(async (params: {
    residentId?: string;
    userId?: string;
    limit?: number;
  }) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_data_processing_history', {
        p_resident_id: params.residentId || null,
        p_user_id: params.userId || null,
        p_limit: params.limit || 100
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get processing history';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getThirdPartyIntegrations = useCallback(async () => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_third_party_integrations');

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get third-party integrations';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getTransparencySummary = useCallback(async (params: {
    residentId?: string;
    userId?: string;
  }) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_transparency_summary', {
        p_resident_id: params.residentId || null,
        p_user_id: params.userId || null
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get transparency summary';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  return {
    loading,
    error,
    getDataProcessingHistory,
    getThirdPartyIntegrations,
    getTransparencySummary
  };
}
