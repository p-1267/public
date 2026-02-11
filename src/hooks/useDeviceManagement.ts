import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useDeviceManagement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPhase21Entry = useCallback(async () => {
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('check_phase21_entry_gate');

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to check Phase 21 entry';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const startDevicePairing = useCallback(async (pairingData: {
    deviceId: string;
    residentId: string;
    deviceType: string;
    deviceName: string;
    manufacturer: string;
    model: string;
  }) => {

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('start_device_pairing', {
        p_device_id: pairingData.deviceId,
        p_resident_id: pairingData.residentId,
        p_device_type: pairingData.deviceType,
        p_device_name: pairingData.deviceName,
        p_manufacturer: pairingData.manufacturer,
        p_model: pairingData.model
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error('Failed to start device pairing');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start device pairing';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const completePairingStep = useCallback(async (stepData: {
    pairingSessionId: string;
    deviceId: string;
    residentId: string;
    step: string;
    stepData: any;
    success?: boolean;
    errorMessage?: string;
  }) => {

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('complete_pairing_step', {
        p_pairing_session_id: stepData.pairingSessionId,
        p_device_id: stepData.deviceId,
        p_resident_id: stepData.residentId,
        p_step: stepData.step,
        p_step_data: JSON.stringify(stepData.stepData),
        p_success: stepData.success ?? true,
        p_error_message: stepData.errorMessage || null
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to complete pairing step';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const finalizeDevicePairing = useCallback(async (finalData: {
    pairingSessionId: string;
    deviceId: string;
    residentId: string;
    deviceType: string;
    deviceName: string;
    manufacturer: string;
    model: string;
    firmwareVersion: string;
    batteryLevel: number;
    capabilities: any;
  }) => {

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('finalize_device_pairing', {
        p_pairing_session_id: finalData.pairingSessionId,
        p_device_id: finalData.deviceId,
        p_resident_id: finalData.residentId,
        p_device_type: finalData.deviceType,
        p_device_name: finalData.deviceName,
        p_manufacturer: finalData.manufacturer,
        p_model: finalData.model,
        p_firmware_version: finalData.firmwareVersion,
        p_battery_level: finalData.batteryLevel,
        p_capabilities: JSON.stringify(finalData.capabilities)
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error('Failed to finalize device pairing');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to finalize device pairing';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const updateDeviceHealth = useCallback(async (healthData: {
    deviceId: string;
    batteryLevel: number;
    signalStrength?: number;
    firmwareVersion?: string;
  }) => {

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('update_device_health', {
        p_device_id: healthData.deviceId,
        p_battery_level: healthData.batteryLevel,
        p_signal_strength: healthData.signalStrength || null,
        p_firmware_version: healthData.firmwareVersion || null
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error('Failed to update device health');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update device health';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getDeviceTrustState = useCallback(async (deviceId: string) => {
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_device_trust_state', {
        p_device_id: deviceId
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get device trust state';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const revokeDevice = useCallback(async (deviceId: string, reason: string) => {

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('revoke_device', {
        p_device_id: deviceId,
        p_revocation_reason: reason
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error('Failed to revoke device');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to revoke device';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getResidentDevices = useCallback(async (residentId: string) => {
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_resident_devices', {
        p_resident_id: residentId
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get resident devices';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const logDeviceDataEvent = useCallback(async (eventData: {
    deviceId: string;
    eventType: string;
    eventData: any;
    dataSource?: string;
  }) => {

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('log_device_data_event', {
        p_device_id: eventData.deviceId,
        p_event_type: eventData.eventType,
        p_event_data: JSON.stringify(eventData.eventData),
        p_data_source: eventData.dataSource || 'LIVE'
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error('Failed to log device data event');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to log device data event';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  return {
    loading,
    error,
    checkPhase21Entry,
    startDevicePairing,
    completePairingStep,
    finalizeDevicePairing,
    updateDeviceHealth,
    getDeviceTrustState,
    revokeDevice,
    getResidentDevices,
    logDeviceDataEvent
  };
}
