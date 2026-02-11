import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useOTAManagement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const releaseVersion = useCallback(async (params: {
    versionNumber: string;
    versionType: string;
    releaseNotes?: string;
    breakingChanges?: string[];
  }) => {
    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('release_version', {
        p_version_number: params.versionNumber,
        p_version_type: params.versionType,
        p_release_notes: params.releaseNotes || '',
        p_breaking_changes: params.breakingChanges || []
      });

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to release version';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getCurrentVersions = useCallback(async () => {
    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('get_current_versions');
      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get current versions';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const createUpdatePackage = useCallback(async (params: {
    packageVersion: string;
    componentType: string;
    changeClassification: string;
    packageSignature: string;
    packageChecksum: string;
    backwardCompatible: boolean;
    requiresAdminAcknowledgment?: boolean;
    requiresUserNotification?: boolean;
    releaseNotes?: string;
    breakingChanges?: string[];
    affectedComponents?: string[];
  }) => {
    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('create_update_package', {
        p_package_version: params.packageVersion,
        p_component_type: params.componentType,
        p_change_classification: params.changeClassification,
        p_package_signature: params.packageSignature,
        p_package_checksum: params.packageChecksum,
        p_backward_compatible: params.backwardCompatible,
        p_requires_admin_acknowledgment: params.requiresAdminAcknowledgment || false,
        p_requires_user_notification: params.requiresUserNotification || false,
        p_release_notes: params.releaseNotes || '',
        p_breaking_changes: params.breakingChanges || [],
        p_affected_components: params.affectedComponents || []
      });

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create update package';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const deployUpdate = useCallback(async (params: {
    packageId: string;
    environment: string;
    deploymentStage: string;
    adminAcknowledged?: boolean;
  }) => {
    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('deploy_update', {
        p_package_id: params.packageId,
        p_environment: params.environment,
        p_deployment_stage: params.deploymentStage,
        p_admin_acknowledged: params.adminAcknowledged || false
      });

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to deploy update';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const completeDeployment = useCallback(async (params: {
    deploymentId: string;
    healthCheckPassed: boolean;
    healthCheckDetails?: any;
  }) => {
    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('complete_deployment', {
        p_deployment_id: params.deploymentId,
        p_health_check_passed: params.healthCheckPassed,
        p_health_check_details: params.healthCheckDetails || {}
      });

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to complete deployment';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const triggerRollback = useCallback(async (params: {
    deploymentId: string;
    rollbackTrigger: string;
    rollbackReason: string;
  }) => {
    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('trigger_rollback', {
        p_deployment_id: params.deploymentId,
        p_rollback_trigger: params.rollbackTrigger,
        p_rollback_reason: params.rollbackReason
      });

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to trigger rollback';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getDeploymentStatus = useCallback(async (environment: string = 'PRODUCTION') => {
    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('get_deployment_status', {
        p_environment: environment
      });

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get deployment status';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getSystemHealth = useCallback(async (environment: string = 'PRODUCTION') => {
    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('get_system_health', {
        p_environment: environment
      });

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get system health';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const checkVersionDrift = useCallback(async (environment: string = 'PRODUCTION') => {
    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('check_version_drift', {
        p_environment: environment
      });

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to check version drift';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const verifyClientVersionOnStartup = useCallback(async (params: {
    deviceId: string;
    clientVersion: string;
  }) => {
    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('verify_client_version_on_startup', {
        p_device_id: params.deviceId,
        p_client_version: params.clientVersion
      });

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to verify client version';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  return {
    loading,
    error,
    releaseVersion,
    getCurrentVersions,
    createUpdatePackage,
    deployUpdate,
    completeDeployment,
    triggerRollback,
    getDeploymentStatus,
    getSystemHealth,
    checkVersionDrift,
    verifyClientVersionOnStartup
  };
}
