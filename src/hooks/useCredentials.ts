import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useCredentials() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCredentialTypes = useCallback(async () => {
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_credential_types');

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get credential types';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const createCredential = useCallback(async (params: {
    credentialTypeKey: string;
    credentialName: string;
    encryptedCredentials: string;
    configuration?: any;
  }) => {
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('create_credential', {
        p_credential_type_key: params.credentialTypeKey,
        p_credential_name: params.credentialName,
        p_encrypted_credentials: params.encryptedCredentials,
        p_configuration: params.configuration || {}
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to create credential');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create credential';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getAgencyCredentials = useCallback(async () => {
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_agency_credentials');

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get credentials';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const activateSandboxCredential = useCallback(async (credentialId: string) => {
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('activate_sandbox_credential', {
        p_credential_id: credentialId
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to activate sandbox');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to activate sandbox';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const verifyLiveActivationGates = useCallback(async (credentialId: string) => {
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('verify_live_activation_gates', {
        p_credential_id: credentialId
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to verify activation gates';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const activateLiveCredential = useCallback(async (params: {
    credentialId: string;
    confirmationPhrase: string;
    deviceFingerprint: string;
  }) => {
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('activate_live_credential', {
        p_credential_id: params.credentialId,
        p_confirmation_phrase: params.confirmationPhrase,
        p_device_fingerprint: params.deviceFingerprint
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to activate live credential');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to activate live credential';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const rotateCredential = useCallback(async (params: {
    credentialId: string;
    newEncryptedCredentials: string;
    rotationReason: string;
    rotationType?: string;
  }) => {
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('rotate_credential', {
        p_credential_id: params.credentialId,
        p_new_encrypted_credentials: params.newEncryptedCredentials,
        p_rotation_reason: params.rotationReason,
        p_rotation_type: params.rotationType || 'MANUAL'
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to rotate credential');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to rotate credential';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const revokeCredential = useCallback(async (params: {
    credentialId: string;
    revokedReason: string;
  }) => {
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('revoke_credential', {
        p_credential_id: params.credentialId,
        p_revoked_reason: params.revokedReason
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to revoke credential');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to revoke credential';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  return {
    loading,
    error,
    getCredentialTypes,
    createCredential,
    getAgencyCredentials,
    activateSandboxCredential,
    verifyLiveActivationGates,
    activateLiveCredential,
    rotateCredential,
    revokeCredential
  };
}
