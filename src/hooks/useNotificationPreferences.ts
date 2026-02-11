import { useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useNotificationPreferences() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateFamilyNotificationPreferences = useCallback(async (prefs: {
    residentId: string;
    quietHoursStart?: string;
    quietHoursEnd?: string;
    channelInApp?: boolean;
    channelPush?: boolean;
    channelSms?: boolean;
    channelEmail?: boolean;
    summaryFrequency?: string;
    deviceFingerprint?: string;
  }) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('update_family_notification_preferences', {
        p_resident_id: prefs.residentId,
        p_quiet_hours_start: prefs.quietHoursStart || null,
        p_quiet_hours_end: prefs.quietHoursEnd || null,
        p_channel_in_app: prefs.channelInApp ?? null,
        p_channel_push: prefs.channelPush ?? null,
        p_channel_sms: prefs.channelSms ?? null,
        p_channel_email: prefs.channelEmail ?? null,
        p_summary_frequency: prefs.summaryFrequency || null,
        p_device_fingerprint: prefs.deviceFingerprint || null
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error('Failed to update notification preferences');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update notification preferences';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getFamilyNotificationPreferences = useCallback(async (residentId: string) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_family_notification_preferences', {
        p_resident_id: residentId
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get notification preferences';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const updateAgencyNotificationPolicy = useCallback(async (policy: {
    mandatoryAlertTypes?: string[];
    emergencyChannels?: string[];
    criticalChannels?: string[];
    allowQuietHours?: boolean;
    maxSuppressionHours?: number;
    deviceFingerprint?: string;
  }) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('update_agency_notification_policy', {
        p_mandatory_alert_types: policy.mandatoryAlertTypes || null,
        p_emergency_channels: policy.emergencyChannels || null,
        p_critical_channels: policy.criticalChannels || null,
        p_allow_quiet_hours: policy.allowQuietHours ?? null,
        p_max_suppression_hours: policy.maxSuppressionHours ?? null,
        p_device_fingerprint: policy.deviceFingerprint || null
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error('Failed to update agency notification policy');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update agency notification policy';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getAgencyNotificationPolicy = useCallback(async () => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_agency_notification_policy');

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get agency notification policy';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const sendNotification = useCallback(async (notification: {
    residentId: string;
    recipientUserId: string;
    notificationType: string;
    alertType: string;
    message: string;
  }) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('send_notification', {
        p_resident_id: notification.residentId,
        p_recipient_user_id: notification.recipientUserId,
        p_notification_type: notification.notificationType,
        p_alert_type: notification.alertType,
        p_message: notification.message
      });

      if (rpcError) throw rpcError;
      if (data && !data.success) throw new Error('Failed to send notification');

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to send notification';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const getNotificationHistory = useCallback(async (params?: {
    residentId?: string;
    notificationType?: string;
    limit?: number;
    offset?: number;
  }) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('get_notification_history', {
        p_resident_id: params?.residentId || null,
        p_notification_type: params?.notificationType || null,
        p_limit: params?.limit || 50,
        p_offset: params?.offset || 0
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to get notification history';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  const markNotificationRead = useCallback(async (notificationId: string) => {
    try {
      setError(null);

      const { data, error: rpcError } = await supabase.rpc('mark_notification_read', {
        p_notification_id: notificationId
      });

      if (rpcError) throw rpcError;

      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to mark notification as read';
      setError(errorMsg);
      throw new Error(errorMsg);
    }
  }, []);

  return {
    loading,
    error,
    updateFamilyNotificationPreferences,
    getFamilyNotificationPreferences,
    updateAgencyNotificationPolicy,
    getAgencyNotificationPolicy,
    sendNotification,
    getNotificationHistory,
    markNotificationRead
  };
}
