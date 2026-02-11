import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Agency {
  id: string;
  name: string;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
  created_by: string;
  updated_at: string;
}

interface AgencyStats {
  userCount: number;
  residentCount: number;
  activeCaregivers: number;
}

export function useAgency(agencyId: string | null) {
  const [agency, setAgency] = useState<Agency | null>(null);
  const [stats, setStats] = useState<AgencyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agencyId) {
      setLoading(false);
      return;
    }

    fetchAgency();
    fetchStats();
  }, [agencyId]);

  const fetchAgency = async () => {
    if (!agencyId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_agency', {
        p_agency_id: agencyId
      });

      if (rpcError) throw rpcError;

      if (data && data.length > 0) {
        setAgency(data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch agency');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!agencyId) return;

    try {
      const [usersResult, residentsResult, assignmentsResult] = await Promise.all([
        supabase
          .from('user_profiles')
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId)
          .eq('is_active', true),
        supabase
          .from('residents')
          .select('id', { count: 'exact', head: true })
          .eq('agency_id', agencyId)
          .eq('status', 'active'),
        supabase
          .from('caregiver_assignments')
          .select('caregiver_user_id', { count: 'exact' })
          .eq('agency_id', agencyId)
          .eq('status', 'active')
      ]);

      setStats({
        userCount: usersResult.count || 0,
        residentCount: residentsResult.count || 0,
        activeCaregivers: assignmentsResult.data?.length || 0
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const createAgency = async (name: string, metadata: Record<string, unknown> = {}) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('create_agency', {
        p_name: name,
        p_metadata: metadata
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create agency';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const updateAgency = async (metadata: Record<string, unknown>) => {
    if (!agencyId) {
      throw new Error('Agency ID required');
    }

    try {
      setError(null);

      const { error: rpcError } = await supabase.rpc('update_agency', {
        p_agency_id: agencyId,
        p_metadata: metadata
      });

      if (rpcError) throw rpcError;

      await fetchAgency();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update agency';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  return {
    agency,
    stats,
    loading,
    error,
    createAgency,
    updateAgency,
    refresh: fetchAgency
  };
}
