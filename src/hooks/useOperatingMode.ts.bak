import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type OperatingMode = 'SELF_MANAGE' | 'FAMILY_ADMIN';

export function useOperatingMode(residentId: string | null) {
  const [mode, setMode] = useState<OperatingMode>('SELF_MANAGE');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!residentId) {
      setLoading(false);
      return;
    }

    fetchMode();
  }, [residentId]);

  const fetchMode = async () => {
    if (!residentId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: err } = await supabase.rpc('get_resident_operating_mode', {
        p_resident_id: residentId
      });

      if (err) throw err;

      setMode(data as OperatingMode);
    } catch (err) {
      console.error('Error fetching operating mode:', err);
      setError(err instanceof Error ? err.message : 'Failed to load operating mode');
      setMode('SELF_MANAGE');
    } finally {
      setLoading(false);
    }
  };

  const setOperatingMode = async (newMode: OperatingMode, reason?: string) => {
    if (!residentId) return;

    try {
      setError(null);

      const { error: err } = await supabase.rpc('set_resident_operating_mode', {
        p_resident_id: residentId,
        p_mode: newMode,
        p_reason: reason || null
      });

      if (err) throw err;

      setMode(newMode);
    } catch (err) {
      console.error('Error setting operating mode:', err);
      setError(err instanceof Error ? err.message : 'Failed to update operating mode');
      throw err;
    }
  };

  const enableFamilyAdminMode = (reason?: string) => {
    return setOperatingMode('FAMILY_ADMIN', reason);
  };

  const enableSelfManageMode = (reason?: string) => {
    return setOperatingMode('SELF_MANAGE', reason);
  };

  return {
    mode,
    loading,
    error,
    setOperatingMode,
    enableFamilyAdminMode,
    enableSelfManageMode,
    isSelfManage: mode === 'SELF_MANAGE',
    isFamilyAdmin: mode === 'FAMILY_ADMIN',
    refresh: fetchMode
  };
}

export function useFamilyAdminControl(residentId: string | null) {
  const [hasControl, setHasControl] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!residentId) {
      setLoading(false);
      return;
    }

    checkControl();
  }, [residentId]);

  const checkControl = async () => {
    if (!residentId) return;

    try {
      setLoading(true);

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        setHasControl(false);
        return;
      }

      const { data, error } = await supabase.rpc('check_family_admin_control', {
        p_user_id: user.user.id,
        p_resident_id: residentId
      });

      if (error) throw error;

      setHasControl(data || false);
    } catch (err) {
      console.error('Error checking family admin control:', err);
      setHasControl(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    hasControl,
    loading,
    refresh: checkControl
  };
}
