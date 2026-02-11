import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Incident {
  id: string;
  resident_id: string;
  medication_id?: string;
  incident_type: string;
  severity: string;
  description: string;
  auto_generated: boolean;
  reported_by: string;
  supervisor_notified_at?: string;
  supervisor_acknowledged_by?: string;
  supervisor_acknowledged_at?: string;
  resolution_notes?: string;
  resolved_at?: string;
  created_at: string;
}

export function useIncidentManagement(agencyId?: string) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadIncidents = useCallback(async () => {
    if (!agencyId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('medication_incidents')
        .select(`
          *,
          residents!inner(agency_id)
        `)
        .eq('residents.agency_id', agencyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (queryError) throw queryError;

      setIncidents(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  const acknowledgeIncident = useCallback(async (incidentId: string, notes?: string) => {
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('medication_incidents')
        .update({
          supervisor_acknowledged_by: (await supabase.auth.getUser()).data.user?.id,
          supervisor_acknowledged_at: new Date().toISOString(),
          resolution_notes: notes
        })
        .eq('id', incidentId);

      if (updateError) throw updateError;

      await loadIncidents();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [loadIncidents]);

  const resolveIncident = useCallback(async (incidentId: string, resolutionNotes: string) => {
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('medication_incidents')
        .update({
          resolution_notes: resolutionNotes,
          resolved_at: new Date().toISOString()
        })
        .eq('id', incidentId);

      if (updateError) throw updateError;

      await loadIncidents();
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [loadIncidents]);

  useEffect(() => {
    if (agencyId) {
      loadIncidents();
    }
  }, [agencyId, loadIncidents]);

  return {
    incidents,
    loading,
    error,
    acknowledgeIncident,
    resolveIncident,
    refresh: loadIncidents
  };
}
