import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useResilienceManagement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createIncident = useCallback(async (params: {
    incidentTitle: string;
    incidentDescription: string;
    severity: string;
    scope: string;
    impactedSystems?: string[];
  }) => {
    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('create_incident', {
        p_incident_title: params.incidentTitle,
        p_incident_description: params.incidentDescription,
        p_severity: params.severity,
        p_scope: params.scope,
        p_impacted_systems: params.impactedSystems || []
      });

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create incident';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const updateIncidentStatus = useCallback(async (params: {
    incidentId: string;
    newStatus: string;
    mitigationAction?: string;
    rootCause?: string;
  }) => {
    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('update_incident_status', {
        p_incident_id: params.incidentId,
        p_new_status: params.newStatus,
        p_mitigation_action: params.mitigationAction || null,
        p_root_cause: params.rootCause || null
      });

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update incident';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getCircuitBreakerState = useCallback(async (breakerName?: string) => {
    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('get_circuit_breaker_state', {
        p_breaker_name: breakerName || null
      });

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get circuit breaker state';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getSystemDegradationStatus = useCallback(async () => {
    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('get_system_degradation_status');

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get degradation status';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const enterDegradedMode = useCallback(async (params: {
    subsystemName: string;
    subsystemCategory: string;
    degradationLevel: string;
    degradationReason: string;
    disabledFeatures?: string[];
  }) => {
    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('enter_degraded_mode', {
        p_subsystem_name: params.subsystemName,
        p_subsystem_category: params.subsystemCategory,
        p_degradation_level: params.degradationLevel,
        p_degradation_reason: params.degradationReason,
        p_disabled_features: params.disabledFeatures || [],
        p_core_care_logging_available: true,
        p_emergency_escalation_available: true
      });

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to enter degraded mode';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const exitDegradedMode = useCallback(async (params: {
    degradationId: string;
    recoveryAction: string;
  }) => {
    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('exit_degraded_mode', {
        p_degradation_id: params.degradationId,
        p_recovery_action: params.recoveryAction
      });

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to exit degraded mode';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const createBackup = useCallback(async (params: {
    backupType: string;
    backupScope: string;
    backupLocation: string;
    retentionDays?: number;
  }) => {
    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('create_backup', {
        p_backup_type: params.backupType,
        p_backup_scope: params.backupScope,
        p_backup_location: params.backupLocation,
        p_retention_days: params.retentionDays || 90
      });

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create backup';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const verifyBackup = useCallback(async (params: {
    backupId: string;
    verificationType: string;
    checksumVerified: boolean;
    restoreTested: boolean;
    restoreDurationSeconds?: number;
  }) => {
    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('verify_backup', {
        p_backup_id: params.backupId,
        p_verification_type: params.verificationType,
        p_checksum_verified: params.checksumVerified,
        p_restore_tested: params.restoreTested,
        p_restore_duration_seconds: params.restoreDurationSeconds || null
      });

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to verify backup';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getBackupStatus = useCallback(async () => {
    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('get_backup_status');

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get backup status';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const runDataIntegrityCheck = useCallback(async (params: {
    checkType: string;
    tableName: string;
    checkScope?: string;
  }) => {
    try {
      setError(null);
      const { data, error: rpcError } = await supabase.rpc('run_data_integrity_check', {
        p_check_type: params.checkType,
        p_table_name: params.tableName,
        p_check_scope: params.checkScope || 'SAMPLE'
      });

      if (rpcError) throw rpcError;
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to run integrity check';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  return {
    loading,
    error,
    createIncident,
    updateIncidentStatus,
    getCircuitBreakerState,
    getSystemDegradationStatus,
    enterDegradedMode,
    exitDegradedMode,
    createBackup,
    verifyBackup,
    getBackupStatus,
    runDataIntegrityCheck
  };
}
