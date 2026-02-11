import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useConsent() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getConsentDomains = useCallback(async () => {
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_consent_domains');

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get consent domains';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const grantConsent = useCallback(async (params: {
    grantedDomains: string[];
    residentId?: string;
    userId?: string;
    grantedByRelationship?: string;
    legalRepresentativeId?: string;
    languageContext?: string;
    deviceFingerprint?: string;
  }) => {
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('grant_consent', {
        p_granted_domains: params.grantedDomains,
        p_resident_id: params.residentId || null,
        p_user_id: params.userId || null,
        p_granted_by_relationship: params.grantedByRelationship || null,
        p_legal_representative_id: params.legalRepresentativeId || null,
        p_language_context: params.languageContext || 'en',
        p_device_fingerprint: params.deviceFingerprint || null
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to grant consent');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to grant consent';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const revokeConsent = useCallback(async (params: {
    revokedReason: string;
    residentId?: string;
    userId?: string;
  }) => {
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('revoke_consent', {
        p_revoked_reason: params.revokedReason,
        p_resident_id: params.residentId || null,
        p_user_id: params.userId || null
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to revoke consent');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to revoke consent';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getActiveConsent = useCallback(async (params: {
    residentId?: string;
    userId?: string;
  }) => {
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_active_consent', {
        p_resident_id: params.residentId || null,
        p_user_id: params.userId || null
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get active consent';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const verifyConsent = useCallback(async (params: {
    consentDomain: string;
    residentId?: string;
    userId?: string;
  }) => {
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('verify_consent', {
        p_consent_domain: params.consentDomain,
        p_resident_id: params.residentId || null,
        p_user_id: params.userId || null
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to verify consent';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getConsentHistory = useCallback(async (params: {
    residentId?: string;
    userId?: string;
  }) => {
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_consent_history', {
        p_resident_id: params.residentId || null,
        p_user_id: params.userId || null
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get consent history';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  return {
    loading,
    error,
    getConsentDomains,
    grantConsent,
    revokeConsent,
    getActiveConsent,
    verifyConsent,
    getConsentHistory
  };
}
