import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useTraining() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getUserTrainingModules = useCallback(async (contextType?: string) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_user_training_modules', {
        p_context_type: contextType || null
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get training modules';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const startTrainingModule = useCallback(async (moduleId: string) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('start_training_module', {
        p_module_id: moduleId
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to start training module');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start training module';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const completeTrainingModule = useCallback(async (moduleId: string, progressData?: any) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('complete_training_module', {
        p_module_id: moduleId,
        p_progress_data: progressData || null
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to complete training module');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to complete training module';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const dismissTrainingModule = useCallback(async (moduleId: string) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('dismiss_training_module', {
        p_module_id: moduleId
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to dismiss training module');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to dismiss training module';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getUserTrainingProgress = useCallback(async () => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_user_training_progress');

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get training progress';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  return {
    loading,
    error,
    getUserTrainingModules,
    startTrainingModule,
    completeTrainingModule,
    dismissTrainingModule,
    getUserTrainingProgress
  };
}
