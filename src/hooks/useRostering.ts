import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useRostering() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPhase23Entry = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('check_phase23_entry_gate');

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to check Phase 23 entry';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const createShift = useCallback(async (shift: {
    caregiverId: string;
    startTime: string;
    endTime: string;
    locationContext: string;
    expectedCareIntensity: string;
    residentAssignments: Array<{
      resident_id: string;
      care_type: string;
      estimated_duration_minutes: number;
    }>;
    notes?: string;
  }) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('create_shift', {
        p_caregiver_id: shift.caregiverId,
        p_start_time: shift.startTime,
        p_end_time: shift.endTime,
        p_location_context: shift.locationContext,
        p_expected_care_intensity: shift.expectedCareIntensity,
        p_resident_assignments: shift.residentAssignments,
        p_notes: shift.notes || null
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to create shift');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create shift';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const updateShift = useCallback(async (params: {
    shiftId: string;
    startTime?: string;
    endTime?: string;
    locationContext?: string;
    expectedCareIntensity?: string;
    notes?: string;
    reason?: string;
  }) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('update_shift', {
        p_shift_id: params.shiftId,
        p_start_time: params.startTime || null,
        p_end_time: params.endTime || null,
        p_location_context: params.locationContext || null,
        p_expected_care_intensity: params.expectedCareIntensity || null,
        p_notes: params.notes || null,
        p_reason: params.reason || null
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error('Failed to update shift');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update shift';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const cancelShift = useCallback(async (shiftId: string, reason: string) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('cancel_shift', {
        p_shift_id: shiftId,
        p_reason: reason
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error('Failed to cancel shift');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to cancel shift';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getShiftsByDateRange = useCallback(async (params: {
    startDate: string;
    endDate: string;
    caregiverId?: string;
    status?: string;
  }) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_shifts_by_date_range', {
        p_start_date: params.startDate,
        p_end_date: params.endDate,
        p_caregiver_id: params.caregiverId || null,
        p_status: params.status || null
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get shifts';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const validateShiftAgainstLaborRules = useCallback(async (params: {
    caregiverId: string;
    startTime: string;
    endTime: string;
    agencyId: string;
  }) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('validate_shift_against_labor_rules', {
        p_caregiver_id: params.caregiverId,
        p_start_time: params.startTime,
        p_end_time: params.endTime,
        p_agency_id: params.agencyId
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to validate shift';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getRosteringDashboard = useCallback(async (startDate: string, endDate: string) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_rostering_dashboard', {
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get rostering dashboard';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getCoverageGaps = useCallback(async (startDate: string, endDate: string) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_coverage_gaps', {
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get coverage gaps';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getOverlappingShifts = useCallback(async (startDate: string, endDate: string) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_overlapping_shifts', {
        p_start_date: startDate,
        p_end_date: endDate
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get overlapping shifts';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  return {
    loading,
    error,
    checkPhase23Entry,
    createShift,
    updateShift,
    cancelShift,
    getShiftsByDateRange,
    validateShiftAgainstLaborRules,
    getRosteringDashboard,
    getCoverageGaps,
    getOverlappingShifts
  };
}
