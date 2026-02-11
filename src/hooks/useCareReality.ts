import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { CareRealityType, CARE_REALITY_CONFIGS, getAvailableTabsForReality, hasPermissionInReality } from '../types/careReality';

export function useCareReality(agencyId?: string) {
  const [careReality, setCareReality] = useState<CareRealityType>('FULL_AGENCY');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCareReality = useCallback(async () => {
    if (!agencyId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('agencies')
        .select('metadata')
        .eq('id', agencyId)
        .single();

      if (queryError) throw queryError;

      const savedReality = data?.metadata?.care_reality_type;
      if (savedReality && ['FULL_AGENCY', 'HOME_CARE', 'INDEPENDENT_SENIOR'].includes(savedReality)) {
        setCareReality(savedReality as CareRealityType);
      } else {
        setCareReality('FULL_AGENCY');
      }
    } catch (err: any) {
      setError(err.message);
      setCareReality('FULL_AGENCY');
    } finally {
      setLoading(false);
    }
  }, [agencyId]);

  const updateCareReality = useCallback(async (newReality: CareRealityType) => {
    if (!agencyId) throw new Error('Agency ID required');

    setError(null);

    try {
      const { data: agency, error: fetchError } = await supabase
        .from('agencies')
        .select('metadata')
        .eq('id', agencyId)
        .single();

      if (fetchError) throw fetchError;

      const updatedMetadata = {
        ...(agency?.metadata || {}),
        care_reality_type: newReality,
        care_reality_updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from('agencies')
        .update({ metadata: updatedMetadata })
        .eq('id', agencyId);

      if (updateError) throw updateError;

      setCareReality(newReality);
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [agencyId]);

  const getAvailableTabs = useCallback((role: string) => {
    return getAvailableTabsForReality(careReality, role);
  }, [careReality]);

  const checkPermission = useCallback((role: string, permission: string) => {
    return hasPermissionInReality(careReality, role, permission);
  }, [careReality]);

  const getCurrentConfig = useCallback(() => {
    return CARE_REALITY_CONFIGS[careReality];
  }, [careReality]);

  useEffect(() => {
    if (agencyId) {
      loadCareReality();
    }
  }, [agencyId, loadCareReality]);

  return {
    careReality,
    loading,
    error,
    updateCareReality,
    getAvailableTabs,
    checkPermission,
    getCurrentConfig,
    refresh: loadCareReality
  };
}
