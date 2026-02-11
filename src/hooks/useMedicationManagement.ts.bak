import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface MedicationScheduleItem {
  id: string;
  scheduled_time: string;
  expected_at: string;
  status: 'PENDING' | 'COMPLETED' | 'MISSED' | 'SKIPPED';
  completed_at?: string;
  medication_name: string;
  dosage: string;
  route: string;
  is_controlled: boolean;
  is_prn: boolean;
  special_instructions?: string;
}

export interface MedicationIncident {
  id: string;
  resident_id: string;
  medication_id?: string;
  incident_type: string;
  severity: string;
  description: string;
  auto_generated: boolean;
  created_at: string;
  supervisor_acknowledged_at?: string;
  resolved_at?: string;
}

export function useMedicationManagement(residentId?: string) {
  const [schedule, setSchedule] = useState<MedicationScheduleItem[]>([]);
  const [incidents, setIncidents] = useState<MedicationIncident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSchedule = useCallback(async (date: Date = new Date()) => {
    if (!residentId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_resident_medication_schedule', {
        p_resident_id: residentId,
        p_date: date.toISOString().split('T')[0]
      });

      if (rpcError) throw rpcError;

      setSchedule(data?.schedules || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [residentId]);

  const loadIncidents = useCallback(async () => {
    if (!residentId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('medication_incidents')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (queryError) throw queryError;

      setIncidents(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [residentId]);

  const logAdministration = useCallback(async (params: {
    medicationId: string;
    scheduleId: string;
    status: 'TAKEN' | 'SKIPPED' | 'REFUSED';
    dosageGiven: string;
    routeUsed: string;
    reasonForSkip?: string;
    residentResponse?: string;
    sideEffectsObserved?: string;
    verifiedBy?: string;
  }) => {
    if (!residentId) throw new Error('Resident ID required');

    setError(null);

    const { data, error: rpcError } = await supabase.rpc('log_medication_administration', {
      p_resident_id: residentId,
      p_medication_id: params.medicationId,
      p_schedule_id: params.scheduleId,
      p_status: params.status,
      p_dosage_given: params.dosageGiven,
      p_route_used: params.routeUsed,
      p_reason_for_skip: params.reasonForSkip,
      p_resident_response: params.residentResponse,
      p_side_effects_observed: params.sideEffectsObserved,
      p_verified_by: params.verifiedBy,
      p_language_context: 'en'
    });

    if (rpcError) {
      setError(rpcError.message);
      throw rpcError;
    }

    await loadSchedule();
    await loadIncidents();

    return data;
  }, [residentId, loadSchedule, loadIncidents]);

  const checkInteractions = useCallback(async (medicationName: string) => {
    if (!residentId) throw new Error('Resident ID required');

    const { data, error: rpcError } = await supabase.rpc('check_medication_interactions', {
      p_resident_id: residentId,
      p_medication_name: medicationName
    });

    if (rpcError) throw rpcError;

    return data;
  }, [residentId]);

  useEffect(() => {
    if (residentId) {
      loadSchedule();
      loadIncidents();
    }
  }, [residentId, loadSchedule, loadIncidents]);

  const addMedication = useCallback(async (medicationData: {
    resident_id: string;
    medication_name: string;
    dosage: string;
    dosage_unit?: string;
    frequency?: string;
    scheduled_time?: string;
    instructions?: string;
    prescribed_by?: string;
    purpose?: string;
    start_date?: string;
    end_date?: string;
    side_effects_to_watch?: string;
  }) => {
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('resident_medications')
        .insert([{
          ...medicationData,
          status: 'ACTIVE',
          created_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      await loadSchedule();
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [loadSchedule]);

  const updateMedication = useCallback(async (medicationId: string, updates: any) => {
    setError(null);

    try {
      const { data, error: updateError } = await supabase
        .from('resident_medications')
        .update(updates)
        .eq('id', medicationId)
        .select()
        .single();

      if (updateError) throw updateError;

      await loadSchedule();
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [loadSchedule]);

  const removeMedication = useCallback(async (medicationId: string) => {
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('resident_medications')
        .update({ status: 'DISCONTINUED' })
        .eq('id', medicationId);

      if (deleteError) throw deleteError;

      await loadSchedule();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [loadSchedule]);

  const getMedications = useCallback(async () => {
    if (!residentId) return [];

    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('resident_medications')
        .select('*')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false });

      if (queryError) throw queryError;

      return data || [];
    } catch (err: any) {
      setError(err.message);
      return [];
    }
  }, [residentId]);

  return {
    schedule,
    incidents,
    loading,
    error,
    logAdministration,
    checkInteractions,
    refresh: loadSchedule,
    addMedication,
    updateMedication,
    removeMedication,
    medications: schedule,
    getMedications
  };
}
