import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SHOWCASE_MODE } from '../config/showcase';
import { useShowcase } from '../contexts/ShowcaseContext';

interface Resident {
  id: string;
  agency_id: string;
  full_name: string;
  date_of_birth: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  created_by: string;
}

export function useResidents(agencyId: string | null) {
  const showcaseContext = SHOWCASE_MODE ? useShowcase() : null;
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agencyId) {
      setLoading(false);
      return;
    }

    fetchResidents();
  }, [agencyId, showcaseContext]);

  const fetchResidents = async () => {
    if (!agencyId) return;

    try {
      setLoading(true);
      setError(null);

      // Single RPC with simulation filtering
      const { data, error: rpcError } = await supabase.rpc('get_agency_residents', {
        p_agency_id: agencyId,
        p_include_simulation: SHOWCASE_MODE
      });

      if (rpcError) throw rpcError;

      setResidents(data || []);
      console.log('[useResidents] Loaded residents:', data?.length || 0);
    } catch (err) {
      console.error('[useResidents] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch residents');
    } finally {
      setLoading(false);
    }
  };

  const registerResident = async (
    fullName: string,
    dateOfBirth: string
  ) => {
    if (!agencyId) {
      throw new Error('Agency ID required');
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('register_resident', {
        p_full_name: fullName,
        p_date_of_birth: dateOfBirth,
        p_agency_id: agencyId
      });

      if (rpcError) throw rpcError;

      await fetchResidents();
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to register resident';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  return {
    residents,
    loading,
    error,
    registerResident,
    refresh: fetchResidents
  };
}
