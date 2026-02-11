/**
 * Identity Lifecycle Hook
 *
 * Purpose: Manage user identity state lifecycle
 *
 * CRITICAL: Identity states follow strict FSM:
 * INVITED → VERIFIED → ACTIVE → (SUSPENDED ↔ ACTIVE) → REVOKED → ARCHIVED
 *
 * Revocation rules:
 * - Immediate session invalidation
 * - Offline access lock
 * - Audit record written
 * - NO grace period
 *
 * Section 19: Identity Lifecycle & Revocation
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export type IdentityState =
  | 'INVITED'
  | 'VERIFIED'
  | 'ACTIVE'
  | 'SUSPENDED'
  | 'REVOKED'
  | 'ARCHIVED';

export interface UserIdentityState {
  user_id: string;
  current_state: IdentityState;
  previous_state: IdentityState | null;
  state_version: number;
  suspended_reason?: string;
  revoked_reason?: string;
  revoked_by?: string;
  state_changed_at: string;
}

export interface AccessRevocation {
  user_id: string;
  revoked_by: string;
  revocation_type: 'MEMBERSHIP' | 'DEVICE' | 'FULL_ACCESS';
  target_id?: string;
  reason: string;
  immediate_effect: boolean;
  sessions_invalidated: boolean;
  offline_access_revoked: boolean;
}

export interface TemporaryAccessGrant {
  id: string;
  user_id: string;
  resident_id: string;
  granted_by: string;
  starts_at: string;
  ends_at: string;
  permissions: Record<string, any>;
  reason: string;
  auto_revoked: boolean;
  manually_revoked: boolean;
}

export function useIdentityLifecycle(userId: string) {
  const [identityState, setIdentityState] = useState<UserIdentityState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch current identity state
  const fetchIdentityState = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('user_identity_state')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      setIdentityState(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIdentityState();

    // Subscribe to real-time changes
    const subscription = supabase
      .channel(`identity_state_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_identity_state',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          if (payload.new) {
            setIdentityState(payload.new as UserIdentityState);
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  // Check if user is active
  const isActive = (): boolean => {
    return identityState?.current_state === 'ACTIVE';
  };

  // Check if user is revoked
  const isRevoked = (): boolean => {
    return identityState?.current_state === 'REVOKED';
  };

  // Check if user is suspended
  const isSuspended = (): boolean => {
    return identityState?.current_state === 'SUSPENDED';
  };

  // Verify user (move from INVITED to VERIFIED)
  const verifyUser = async () => {
    try {
      const { data, error } = await supabase.rpc('verify_user_identity', {
        p_user_id: userId
      });

      if (error) throw error;
      await fetchIdentityState();
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Activate user (move from VERIFIED to ACTIVE)
  const activateUser = async () => {
    try {
      const { data, error } = await supabase.rpc('activate_user', {
        p_user_id: userId
      });

      if (error) throw error;
      await fetchIdentityState();
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Suspend user with reason
  const suspendUser = async (reason: string, suspendedBy: string) => {
    try {
      const { data, error } = await supabase.rpc('suspend_user', {
        p_user_id: userId,
        p_reason: reason,
        p_suspended_by: suspendedBy
      });

      if (error) throw error;
      await fetchIdentityState();
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Unsuspend user (return to ACTIVE)
  const unsuspendUser = async (unsuspendedBy: string) => {
    try {
      const { data, error } = await supabase.rpc('unsuspend_user', {
        p_user_id: userId,
        p_unsuspended_by: unsuspendedBy
      });

      if (error) throw error;
      await fetchIdentityState();
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Revoke user access (PERMANENT)
  const revokeUser = async (reason: string, revokedBy: string) => {
    try {
      // First create revocation record
      const { error: revocationError } = await supabase
        .from('access_revocations')
        .insert({
          user_id: userId,
          revoked_by: revokedBy,
          revocation_type: 'FULL_ACCESS',
          reason: reason,
          immediate_effect: true,
          sessions_invalidated: true,
          offline_access_revoked: true,
          audit_sealed: true
        });

      if (revocationError) throw revocationError;

      // Then update identity state
      const { data, error } = await supabase.rpc('revoke_user', {
        p_user_id: userId,
        p_reason: reason,
        p_revoked_by: revokedBy
      });

      if (error) throw error;

      // Invalidate current session immediately
      await supabase.auth.signOut({ scope: 'others' });

      await fetchIdentityState();
      return data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Grant temporary access
  const grantTemporaryAccess = async (
    residentId: string,
    startsAt: string,
    endsAt: string,
    permissions: Record<string, any>,
    reason: string,
    grantedBy: string
  ) => {
    try {
      const { data, error } = await supabase
        .from('temporary_access_grants')
        .insert({
          user_id: userId,
          resident_id: residentId,
          granted_by: grantedBy,
          starts_at: startsAt,
          ends_at: endsAt,
          permissions: permissions,
          reason: reason
        })
        .select()
        .single();

      if (error) throw error;
      return data as TemporaryAccessGrant;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Revoke temporary access
  const revokeTemporaryAccess = async (grantId: string, revokedBy: string) => {
    try {
      const { error } = await supabase
        .from('temporary_access_grants')
        .update({
          manually_revoked: true,
          manually_revoked_by: revokedBy
        })
        .eq('id', grantId);

      if (error) throw error;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Get all access revocations for this user
  const getRevocations = async (): Promise<AccessRevocation[]> => {
    try {
      const { data, error } = await supabase
        .from('access_revocations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AccessRevocation[];
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  // Get active temporary access grants
  const getActiveTemporaryAccess = async (): Promise<TemporaryAccessGrant[]> => {
    try {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from('temporary_access_grants')
        .select('*')
        .eq('user_id', userId)
        .eq('manually_revoked', false)
        .eq('auto_revoked', false)
        .lte('starts_at', now)
        .gte('ends_at', now);

      if (error) throw error;
      return data as TemporaryAccessGrant[];
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return {
    identityState,
    loading,
    error,
    isActive,
    isRevoked,
    isSuspended,
    verifyUser,
    activateUser,
    suspendUser,
    unsuspendUser,
    revokeUser,
    grantTemporaryAccess,
    revokeTemporaryAccess,
    getRevocations,
    getActiveTemporaryAccess,
    refetch: fetchIdentityState
  };
}
