import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { SHOWCASE_MODE } from '../config/showcase';
import { useShowcase } from '../contexts/ShowcaseContext';

interface UseUserPermissionsResult {
  permissions: Set<string>;
  hasPermission: (name: string) => boolean;
  loading: boolean;
  error: string | null;
}

export function useUserPermissions(): UseUserPermissionsResult {
  const showcaseContext = SHOWCASE_MODE ? useShowcase() : null;
  const [permissionNames, setPermissionNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    if (SHOWCASE_MODE && showcaseContext) {
      setPermissionNames(Array.from(showcaseContext.permissions));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setPermissionNames([]);
      setLoading(false);
      return;
    }

    const { data, error: fetchError } = await supabase
      .from('user_effective_permissions')
      .select('permission_name')
      .eq('granted', true);

    if (fetchError) {
      setError(fetchError.message);
      setPermissionNames([]);
    } else {
      setPermissionNames(data?.map((row) => row.permission_name) ?? []);
    }

    setLoading(false);
  }, [showcaseContext]);

  useEffect(() => {
    fetchPermissions();

    if (SHOWCASE_MODE) {
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchPermissions();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchPermissions]);

  const permissions = useMemo(() => new Set(permissionNames), [permissionNames]);

  const hasPermission = useCallback(
    (name: string): boolean => {
      if (SHOWCASE_MODE && showcaseContext) {
        return showcaseContext.hasPermission(name);
      }
      return permissions.has(name);
    },
    [permissions, showcaseContext]
  );

  return { permissions, hasPermission, loading, error };
}
