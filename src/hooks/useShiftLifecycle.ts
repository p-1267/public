import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface ActiveShift {
  active: boolean;
  shift_id?: string;
  start_time?: string;
  end_time?: string;
  status?: string;
  location_context?: string;
  assigned_residents?: Array<{
    resident_id: string;
    resident_name: string;
    room_number: string;
  }>;
}

export interface ShiftHandoffReport {
  shift_period: {
    start: string;
    end: string;
  };
  medications: any[];
  vitals: any[];
  incidents: any[];
  active_signals: any[];
  care_notes: any[];
}

export function useShiftLifecycle() {
  const [activeShift, setActiveShift] = useState<ActiveShift | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadActiveShift();

    const channel = supabase
      .channel('shift-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shifts'
        },
        () => {
          console.log('[useShiftLifecycle] Shift update received');
          loadActiveShift();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, []);

  const loadActiveShift = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_active_shift');

      if (rpcError) throw rpcError;

      setActiveShift(data);
    } catch (err) {
      console.error('Failed to load active shift:', err);
      setError(err instanceof Error ? err.message : 'Failed to load shift');
      setActiveShift({ active: false });
    } finally {
      setLoading(false);
    }
  };

  const startShift = async (
    shiftId?: string,
    locationContext?: string,
    notes?: string
  ): Promise<{ success: boolean; shift_id?: string; error?: string }> => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('start_shift', {
        p_shift_id: shiftId || null,
        p_location_context: locationContext || null,
        p_notes: notes || null
      });

      if (rpcError) throw rpcError;

      if (data.success) {
        await loadActiveShift();
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start shift';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const endShift = async (
    shiftId: string,
    handoffNotes?: string,
    summary?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('end_shift', {
        p_shift_id: shiftId,
        p_handoff_notes: handoffNotes || null,
        p_summary: summary || null
      });

      if (rpcError) throw rpcError;

      if (data.success) {
        await loadActiveShift();
      }

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to end shift';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const submitHandoffNotes = async (
    shiftId: string,
    notes: string,
    criticalItems?: any
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('submit_handoff_notes', {
        p_shift_id: shiftId,
        p_notes: notes,
        p_critical_items: criticalItems || null
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit handoff notes';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  };

  const getHandoffReport = async (
    caregiverId: string,
    shiftStart: string,
    shiftEnd: string
  ): Promise<ShiftHandoffReport | null> => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_shift_handoff_report', {
        p_caregiver_id: caregiverId,
        p_shift_start: shiftStart,
        p_shift_end: shiftEnd
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      console.error('Failed to get handoff report:', err);
      setError(err instanceof Error ? err.message : 'Failed to get handoff report');
      return null;
    }
  };

  return {
    activeShift,
    loading,
    error,
    startShift,
    endShift,
    submitHandoffNotes,
    getHandoffReport,
    refreshShift: loadActiveShift
  };
}
