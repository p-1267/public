import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useAttendance() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPhase24Entry = useCallback(async (shiftId?: string) => {
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('check_phase24_entry_gate', {
        p_shift_id: shiftId || null
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to check Phase 24 entry';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const clockIn = useCallback(async (params: {
    shiftId: string;
    deviceFingerprint: string;
    connectivityState: string;
    deviceTimestamp: string;
    gpsLatitude?: number;
    gpsLongitude?: number;
    gpsAccuracy?: number;
  }) => {

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('clock_in', {
        p_shift_id: params.shiftId,
        p_device_fingerprint: params.deviceFingerprint,
        p_connectivity_state: params.connectivityState,
        p_device_timestamp: params.deviceTimestamp,
        p_gps_latitude: params.gpsLatitude || null,
        p_gps_longitude: params.gpsLongitude || null,
        p_gps_accuracy: params.gpsAccuracy || null
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to clock in');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to clock in';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const clockOut = useCallback(async (params: {
    shiftId: string;
    deviceFingerprint: string;
    connectivityState: string;
    deviceTimestamp: string;
    gpsLatitude?: number;
    gpsLongitude?: number;
    gpsAccuracy?: number;
  }) => {

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('clock_out', {
        p_shift_id: params.shiftId,
        p_device_fingerprint: params.deviceFingerprint,
        p_connectivity_state: params.connectivityState,
        p_device_timestamp: params.deviceTimestamp,
        p_gps_latitude: params.gpsLatitude || null,
        p_gps_longitude: params.gpsLongitude || null,
        p_gps_accuracy: params.gpsAccuracy || null
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to clock out');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to clock out';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getShiftAttendance = useCallback(async (shiftId: string) => {
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_shift_attendance', {
        p_shift_id: shiftId
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get shift attendance';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const closeShift = useCallback(async (shiftId: string) => {

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('close_shift', {
        p_shift_id: shiftId
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to close shift';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const sealShift = useCallback(async (shiftId: string) => {

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('seal_shift', {
        p_shift_id: shiftId
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to seal shift';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const createManualOverride = useCallback(async (params: {
    shiftId: string;
    overrideType: string;
    reason: string;
    attendanceEventId?: string;
    correctedData?: any;
  }) => {

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('create_manual_attendance_override', {
        p_shift_id: params.shiftId,
        p_override_type: params.overrideType,
        p_reason: params.reason,
        p_attendance_event_id: params.attendanceEventId || null,
        p_corrected_data: params.correctedData || {}
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to create override');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create manual override';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getAttendanceAnomalies = useCallback(async (shiftId?: string) => {
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_attendance_anomalies', {
        p_shift_id: shiftId || null
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get attendance anomalies';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  return {
    loading,
    error,
    checkPhase24Entry,
    clockIn,
    clockOut,
    getShiftAttendance,
    closeShift,
    sealShift,
    createManualOverride,
    getAttendanceAnomalies
  };
}
