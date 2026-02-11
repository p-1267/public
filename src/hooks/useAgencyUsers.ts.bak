import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SHOWCASE_MODE } from '../config/showcase';
import { useShowcase } from '../contexts/ShowcaseContext';

interface User {
  id: string;
  email: string;
  role_name: string;
  display_name: string | null;
  is_active: boolean;
  agency_id: string | null;
  created_at: string;
}

export function useAgencyUsers(agencyId: string | null) {
  const showcaseContext = SHOWCASE_MODE ? useShowcase() : null;
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (SHOWCASE_MODE && showcaseContext && showcaseContext.dataStore) {
      const store = showcaseContext.dataStore;
      let filteredUsers = store.users;

      if (showcaseContext.currentRole === 'CAREGIVER') {
        filteredUsers = store.users.filter((u: any) => u.id === showcaseContext.mockUserId);
      } else if (showcaseContext.currentRole === 'SENIOR' || showcaseContext.currentRole === 'FAMILY_VIEWER') {
        filteredUsers = [];
      }

      setUsers(filteredUsers);
      setLoading(false);
      return;
    }

    if (!agencyId) {
      setLoading(false);
      return;
    }

    fetchUsers();
  }, [agencyId, showcaseContext]);

  const fetchUsers = async () => {
    if (!agencyId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('user_profiles')
        .select(`
          id,
          display_name,
          is_active,
          agency_id,
          created_at,
          role_id,
          roles!inner (
            name
          )
        `)
        .eq('agency_id', agencyId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const usersWithEmail = await Promise.all(
        (data || []).map(async (user) => {
          const { data: authUser } = await supabase.auth.admin.getUserById(user.id);
          return {
            id: user.id,
            email: authUser?.user?.email || 'unknown',
            role_name: (user.roles as any).name,
            display_name: user.display_name,
            is_active: user.is_active,
            agency_id: user.agency_id,
            created_at: user.created_at
          };
        })
      );

      setUsers(usersWithEmail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const inviteUser = async (email: string, roleName: string) => {

    if (!agencyId) {
      throw new Error('Agency ID required');
    }

    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('invite_user', {
        p_email: email,
        p_role_name: roleName,
        p_agency_id: agencyId
      });

      if (rpcError) throw rpcError;

      await fetchUsers();
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to invite user';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const assignRole = async (userId: string, roleName: string) => {

    try {
      setError(null);

      const { error: rpcError } = await supabase.rpc('assign_user_role', {
        p_user_id: userId,
        p_role_name: roleName
      });

      if (rpcError) throw rpcError;

      await fetchUsers();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to assign role';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  const deactivateUser = async (userId: string) => {

    try {
      setError(null);

      const { error: rpcError } = await supabase.rpc('deactivate_user', {
        p_user_id: userId
      });

      if (rpcError) throw rpcError;

      await fetchUsers();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to deactivate user';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  };

  return {
    users,
    loading,
    error,
    inviteUser,
    assignRole,
    deactivateUser,
    refresh: fetchUsers
  };
}
