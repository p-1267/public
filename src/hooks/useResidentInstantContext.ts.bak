import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface ResidentInstantContext {
  resident: {
    id: string;
    first_name: string;
    last_name: string;
    room_number: string;
    care_level: string;
  };
  last_medications: Array<{
    medication_name: string;
    administered_at: string;
    administered_by: string;
    status: string;
  }>;
  last_vitals: {
    recorded_at: string;
    heart_rate: number;
    blood_pressure_systolic: number;
    blood_pressure_diastolic: number;
    temperature: number;
    oxygen_saturation: number;
  } | null;
  recent_visits: Array<{
    accessed_by: string;
    accessed_at: string;
    access_method: string;
    minutes_ago: number;
  }>;
  active_signals: Array<{
    signal_type: string;
    severity: string;
    message: string;
    created_at: string;
  }>;
  context_generated_at: string;
}

export interface AccessValidationResult {
  access_log_id: string;
  resident_id: string;
  duplicate_visit_detected: boolean;
  last_visit_by?: string;
  last_visit_minutes_ago?: number;
}

export function useResidentInstantContext() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [context, setContext] = useState<ResidentInstantContext | null>(null);
  const [accessResult, setAccessResult] = useState<AccessValidationResult | null>(null);

  const validateAndLogAccess = useCallback(async (
    token: string,
    accessMethod: 'qr_scan' | 'proximity' | 'nfc' | 'manual' = 'qr_scan',
    deviceInfo: Record<string, any> = {}
  ) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('validate_and_log_access', {
        p_token: token,
        p_access_method: accessMethod,
        p_device_info: deviceInfo
      });

      if (rpcError) throw rpcError;

      setAccessResult(data);
      return data as AccessValidationResult;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to validate access token';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchInstantContext = useCallback(async (residentId: string) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_resident_instant_context', {
        p_resident_id: residentId
      });

      if (rpcError) throw rpcError;

      setContext(data);
      return data as ResidentInstantContext;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to fetch resident context';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const scanAndFetchContext = useCallback(async (
    token: string,
    accessMethod: 'qr_scan' | 'proximity' | 'nfc' | 'manual' = 'qr_scan',
    deviceInfo: Record<string, any> = {}
  ) => {
    setLoading(true);
    setError(null);

    try {
      const accessData = await validateAndLogAccess(token, accessMethod, deviceInfo);

      const contextData = await fetchInstantContext(accessData.resident_id);

      return {
        access: accessData,
        context: contextData
      };
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to scan and fetch context';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [validateAndLogAccess, fetchInstantContext]);

  const generateToken = useCallback(async (
    residentId: string,
    tokenType: 'qr_code' | 'proximity' | 'nfc' = 'qr_code',
    expiresAt?: string
  ) => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('generate_resident_access_token', {
        p_resident_id: residentId,
        p_token_type: tokenType,
        p_expires_at: expiresAt || null
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to generate access token';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    context,
    accessResult,
    validateAndLogAccess,
    fetchInstantContext,
    scanAndFetchContext,
    generateToken
  };
}
