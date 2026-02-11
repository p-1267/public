import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useMessaging() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkPhase26Entry = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('check_phase26_entry_gate');

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to check Phase 26 entry';
      setError(errorMsg);
      throw new Error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  const createThread = useCallback(async (params: {
    contextType: string;
    contextId: string;
    subject: string;
    initialParticipants?: string[];
  }) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('create_message_thread', {
        p_context_type: params.contextType,
        p_context_id: params.contextId,
        p_subject: params.subject,
        p_initial_participants: params.initialParticipants || []
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to create thread');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create thread';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getUserThreads = useCallback(async (contextType?: string) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_user_threads', {
        p_context_type: contextType || null
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get threads';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const sendMessage = useCallback(async (params: {
    threadId: string;
    content: string;
    messageType?: string;
    isOfflineQueued?: boolean;
    deviceFingerprint?: string;
  }) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('send_message', {
        p_thread_id: params.threadId,
        p_content: params.content,
        p_message_type: params.messageType || 'TEXT',
        p_is_offline_queued: params.isOfflineQueued || false,
        p_device_fingerprint: params.deviceFingerprint || null
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to send message');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getThreadMessages = useCallback(async (threadId: string, limit: number = 50) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_thread_messages', {
        p_thread_id: threadId,
        p_limit: limit
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get messages';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const markMessageRead = useCallback(async (messageId: string, deviceFingerprint?: string) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('mark_message_read', {
        p_message_id: messageId,
        p_device_fingerprint: deviceFingerprint || null
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to mark message as read');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to mark message as read';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const addThreadParticipant = useCallback(async (params: {
    threadId: string;
    userId: string;
    canSend?: boolean;
  }) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('add_thread_participant', {
        p_thread_id: params.threadId,
        p_user_id: params.userId,
        p_can_send: params.canSend || null
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to add participant');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to add participant';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const createAnnouncement = useCallback(async (params: {
    title: string;
    content: string;
    targetRoles: string[];
    requiresAcknowledgment?: boolean;
    priority?: string;
    expiresAt?: string;
  }) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('create_announcement', {
        p_title: params.title,
        p_content: params.content,
        p_target_roles: params.targetRoles,
        p_requires_acknowledgment: params.requiresAcknowledgment || false,
        p_priority: params.priority || 'NORMAL',
        p_expires_at: params.expiresAt || null
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to create announcement');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to create announcement';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getUserAnnouncements = useCallback(async (includeExpired: boolean = false) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_user_announcements', {
        p_include_expired: includeExpired
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get announcements';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const acknowledgeAnnouncement = useCallback(async (announcementId: string, deviceFingerprint?: string) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('acknowledge_announcement', {
        p_announcement_id: announcementId,
        p_device_fingerprint: deviceFingerprint || null
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error(data.message || 'Failed to acknowledge announcement');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to acknowledge announcement';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  return {
    loading,
    error,
    checkPhase26Entry,
    createThread,
    getUserThreads,
    sendMessage,
    getThreadMessages,
    markMessageRead,
    addThreadParticipant,
    createAnnouncement,
    getUserAnnouncements,
    acknowledgeAnnouncement
  };
}
