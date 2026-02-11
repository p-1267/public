import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Invitation {
  id: string;
  target_email: string | null;
  target_phone: string | null;
  role_name: string;
  resident_count: number;
  invited_by_name: string;
  expires_at: string | null;
  status: string;
  created_at: string;
}

export interface CreateInvitationParams {
  target_email?: string;
  target_phone?: string;
  intended_role_id: string;
  resident_scope: string[];
  permission_set?: Record<string, any>;
  expires_in_days?: number;
}

export function useInvitations() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInvitations = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('list_pending_invitations');

      if (rpcError) throw rpcError;

      if (data && data.success) {
        setInvitations(data.invitations || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invitations');
    } finally {
      setLoading(false);
    }
  }, []);

  const createInvitation = useCallback(async (params: CreateInvitationParams) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('create_invitation', {
        p_target_email: params.target_email || null,
        p_target_phone: params.target_phone || null,
        p_intended_role_id: params.intended_role_id,
        p_resident_scope: params.resident_scope,
        p_permission_set: JSON.stringify(params.permission_set || {}),
        p_expires_in_days: params.expires_in_days || 7
      });

      if (rpcError) throw rpcError;

      if (data && !data.success) {
        throw new Error(data.error || 'Failed to create invitation');
      }

      await fetchInvitations();

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create invitation';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [fetchInvitations]);

  const revokeInvitation = useCallback(async (invitationId: string) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('revoke_invitation', {
        p_invitation_id: invitationId
      });

      if (rpcError) throw rpcError;

      if (data && !data.success) {
        throw new Error('Failed to revoke invitation');
      }

      await fetchInvitations();

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to revoke invitation';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, [fetchInvitations]);

  const verifyInvitation = useCallback(async (invitationCode: string) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('verify_invitation', {
        p_invitation_code: invitationCode
      });

      if (rpcError) throw rpcError;

      if (data && !data.success) {
        throw new Error(data.error || 'Invalid invitation code');
      }

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to verify invitation';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const acceptInvitation = useCallback(async (
    invitationCode: string,
    userId: string,
    displayName: string,
    acceptedTerms: boolean
  ) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('accept_invitation', {
        p_invitation_code: invitationCode,
        p_user_id: userId,
        p_display_name: displayName,
        p_accepted_terms: acceptedTerms
      });

      if (rpcError) throw rpcError;

      if (data && !data.success) {
        throw new Error('Failed to accept invitation');
      }

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to accept invitation';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  useEffect(() => {
    fetchInvitations();
  }, [fetchInvitations]);

  return {
    invitations,
    loading,
    error,
    createInvitation,
    revokeInvitation,
    verifyInvitation,
    acceptInvitation,
    refresh: fetchInvitations
  };
}
