import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Device {
  id: string;
  device_name: string | null;
  device_type: string | null;
  trust_state: string;
  first_seen_at: string;
  last_seen_at: string;
  last_ip_address: string | null;
  revoked_at: string | null;
  revoked_reason: string | null;
}

export function useDeviceTrust(userId?: string) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('list_user_devices', {
        p_user_id: userId || null
      });

      if (rpcError) throw rpcError;

      if (data && data.success) {
        setDevices(data.devices || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch devices');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const registerDevice = useCallback(async (
    deviceFingerprint: string,
    deviceName: string,
    deviceType: string,
    userAgent?: string
  ) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('register_device', {
        p_device_fingerprint: deviceFingerprint,
        p_device_name: deviceName,
        p_device_type: deviceType,
        p_user_agent: userAgent || null
      });

      if (rpcError) throw rpcError;

      if (data && !data.success) {
        throw new Error('Failed to register device');
      }

      await fetchDevices();

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to register device';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [fetchDevices]);

  const updateDeviceActivity = useCallback(async (deviceFingerprint: string) => {
    try {
      const { error: rpcError } = await supabase.rpc('update_device_activity', {
        p_device_fingerprint: deviceFingerprint
      });

      if (rpcError) throw rpcError;
    } catch (err) {
      console.error('Failed to update device activity:', err);
    }
  }, []);

  const revokeDevice = useCallback(async (deviceId: string, reason: string) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('revoke_device', {
        p_device_id: deviceId,
        p_reason: reason
      });

      if (rpcError) throw rpcError;

      if (data && !data.success) {
        throw new Error('Failed to revoke device');
      }

      await fetchDevices();

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to revoke device';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [fetchDevices]);

  const markDeviceSuspicious = useCallback(async (deviceId: string, reason: string) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('mark_device_suspicious', {
        p_device_id: deviceId,
        p_reason: reason
      });

      if (rpcError) throw rpcError;

      if (data && !data.success) {
        throw new Error('Failed to mark device suspicious');
      }

      await fetchDevices();

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to mark device suspicious';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [fetchDevices]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  return {
    devices,
    loading,
    error,
    registerDevice,
    updateDeviceActivity,
    revokeDevice,
    markDeviceSuspicious,
    refresh: fetchDevices
  };
}
