import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useAIAssistance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getAIAssistanceConfig = useCallback(async () => {
          consent_given_at: null,
          consent_withdrawn_at: null
        }
      };
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_ai_assistance_config');

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get AI config';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const updateAIAssistanceConfig = useCallback(async (params: {
    isEnabled?: boolean;
    shadowAIEnabled?: boolean;
    voiceGuidanceEnabled?: boolean;
    suggestionTypesEnabled?: string[];
    consentAction?: string;
  }) => {
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('update_ai_assistance_config', {
        p_is_enabled: params.isEnabled ?? null,
        p_shadow_ai_enabled: params.shadowAIEnabled ?? null,
        p_voice_guidance_enabled: params.voiceGuidanceEnabled ?? null,
        p_suggestion_types_enabled: params.suggestionTypesEnabled ?? null,
        p_consent_action: params.consentAction ?? null
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to update AI config');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update AI config';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getUserAISuggestions = useCallback(async () => {
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_user_ai_suggestions');

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get AI suggestions';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const dismissAISuggestion = useCallback(async (suggestionId: string) => {
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('dismiss_ai_suggestion', {
        p_suggestion_id: suggestionId
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to dismiss suggestion');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to dismiss suggestion';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const acceptAISuggestion = useCallback(async (suggestionId: string) => {
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('accept_ai_suggestion', {
        p_suggestion_id: suggestionId
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to accept suggestion');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to accept suggestion';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  return {
    loading,
    error,
    getAIAssistanceConfig,
    updateAIAssistanceConfig,
    getUserAISuggestions,
    dismissAISuggestion,
    acceptAISuggestion
  };
}
