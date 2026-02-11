import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useIntegrations() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerIntegration = useCallback(async (params: {
    integrationType: string;
    providerName: string;
    credentialId: string;
    supportedDataDomains: string[];
    readOnly?: boolean;
    limitedWrite?: boolean;
    requiredConsentDomains?: string[];
    configuration?: any;
  }) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('register_integration', {
        p_integration_type: params.integrationType,
        p_provider_name: params.providerName,
        p_credential_id: params.credentialId,
        p_supported_data_domains: params.supportedDataDomains,
        p_read_only: params.readOnly ?? true,
        p_limited_write: params.limitedWrite ?? false,
        p_required_consent_domains: params.requiredConsentDomains ?? [],
        p_configuration: params.configuration ?? {}
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to register integration');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to register integration';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getAgencyIntegrations = useCallback(async () => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_agency_integrations');

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get integrations';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const verifyIntegrationActivationGates = useCallback(async (integrationId: string) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('verify_integration_activation_gates', {
        p_integration_id: integrationId
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to verify activation gates';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const activateIntegration = useCallback(async (integrationId: string) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('activate_integration', {
        p_integration_id: integrationId
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to activate integration');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to activate integration';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const suspendIntegration = useCallback(async (params: {
    integrationId: string;
    suspendedReason: string;
  }) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('suspend_integration', {
        p_integration_id: params.integrationId,
        p_suspended_reason: params.suspendedReason
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to suspend integration');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to suspend integration';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const enableIntegrationForAgency = useCallback(async (params: {
    integrationId: string;
    enabled: boolean;
  }) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('enable_integration_for_agency', {
        p_integration_id: params.integrationId,
        p_enabled: params.enabled
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to update integration');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update integration';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getExternalObservations = useCallback(async (residentId: string, limit: number = 50) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_external_observations', {
        p_resident_id: residentId,
        p_limit: limit
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get observations';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getIntegrationConflicts = useCallback(async (resolutionStatus?: string) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_integration_conflicts', {
        p_resolution_status: resolutionStatus || 'PENDING'
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get conflicts';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  return {
    loading,
    error,
    registerIntegration,
    getAgencyIntegrations,
    verifyIntegrationActivationGates,
    activateIntegration,
    suspendIntegration,
    enableIntegrationForAgency,
    getExternalObservations,
    getIntegrationConflicts
  };
}
