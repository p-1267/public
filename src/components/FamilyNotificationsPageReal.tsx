import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useShowcase } from '../contexts/ShowcaseContext';

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  created_at: string;
  read_at: string | null;
  metadata: {
    test_name?: string;
    result_status?: string;
    is_critical?: boolean;
    abnormal_flag?: string;
    medication_name?: string;
    appointment_date?: string;
    [key: string]: any;
  } | null;
}

export const FamilyNotificationsPageReal: React.FC = () => {
  const { selectedResidentId } = useShowcase();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');

  useEffect(() => {
    if (selectedResidentId) {
      loadNotifications();
    }
  }, [selectedResidentId, filter]);

  const loadNotifications = async () => {
    if (!selectedResidentId) return;

    setLoading(true);
    try {
      // Get current user to check if they have family access
      const { data: { user } } = await supabase.auth.getUser();

      let query = supabase
        .from('notification_log')
        .select('*')
        .eq('resident_id', selectedResidentId)
        .order('created_at', { ascending: false })
        .limit(100);

      // Apply filters
      if (filter === 'unread') {
        query = query.is('read_at', null);
      } else if (filter === 'critical') {
        query = query.eq('priority', 'CRITICAL');
      }

      const { data, error } = await query;

      if (error) throw error;

      setNotifications(data || []);
    } catch (err) {
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notification_log')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications
        .filter(n => !n.read_at)
        .map(n => n.id);

      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notification_log')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds);

      if (error) throw error;

      // Reload notifications
      loadNotifications();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'CRITICAL': return '#dc2626';
      case 'HIGH': return '#ea580c';
      case 'MEDIUM': return '#f59e0b';
      case 'LOW': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getNotificationIcon = (type: string, metadata: any) => {
    if (type === 'LAB_RESULT') {
      if (metadata?.is_critical) return '🚨';
      if (metadata?.abnormal_flag) return '⚠️';
      return '🔬';
    }
    if (type === 'MEDICATION') return '💊';
    if (type === 'APPOINTMENT') return '📅';
    if (type === 'EMERGENCY') return '🚨';
    if (type === 'FALL') return '⚠️';
    if (type === 'VITAL_SIGN') return '❤️';
    return '📢';
  };

  const unreadCount = notifications.filter(n => !n.read_at).length;

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading notifications...</div>
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: '32px 24px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '600',
            margin: '0 0 8px 0',
            color: '#1a1a1a'
          }}>
            Notifications
            {unreadCount > 0 && (
              <span style={{
                marginLeft: '12px',
                background: '#ef4444',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '700'
              }}>
                {unreadCount}
              </span>
            )}
          </h1>
          <p style={{
            fontSize: '18px',
            color: '#666',
            margin: 0
          }}>
            Stay updated on your loved one's care
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              border: '2px solid #3b82f6',
              background: 'white',
              color: '#3b82f6',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Mark All Read
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        marginBottom: '24px',
        borderBottom: '2px solid #e5e7eb'
      }}>
        {[
          { key: 'all', label: 'All' },
          { key: 'unread', label: `Unread (${unreadCount})` },
          { key: 'critical', label: 'Critical' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            style={{
              padding: '12px 24px',
              fontSize: '16px',
              fontWeight: '600',
              border: 'none',
              background: 'transparent',
              color: filter === tab.key ? '#3b82f6' : '#6b7280',
              borderBottom: filter === tab.key ? '2px solid #3b82f6' : '2px solid transparent',
              cursor: 'pointer',
              marginBottom: '-2px'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div style={{
          background: 'white',
          border: '2px solid #e5e7eb',
          borderRadius: '12px',
          padding: '48px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📬</div>
          <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#1a1a1a' }}>
            No notifications
          </div>
          <div style={{ fontSize: '16px', color: '#666' }}>
            {filter === 'unread' ? 'All caught up!' : filter === 'critical' ? 'No critical alerts' : 'Notifications will appear here'}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map(notification => (
            <div
              key={notification.id}
              onClick={() => !notification.read_at && markAsRead(notification.id)}
              style={{
                background: notification.read_at ? '#f9fafb' : 'white',
                border: `2px solid ${notification.priority === 'CRITICAL' ? '#fecaca' : '#e5e7eb'}`,
                borderLeft: `6px solid ${getPriorityColor(notification.priority)}`,
                borderRadius: '12px',
                padding: '20px',
                cursor: notification.read_at ? 'default' : 'pointer',
                opacity: notification.read_at ? 0.7 : 1
              }}
            >
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ fontSize: '32px', flexShrink: 0 }}>
                  {getNotificationIcon(notification.notification_type, notification.metadata)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <div>
                      <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        margin: '0 0 4px 0',
                        color: '#1a1a1a'
                      }}>
                        {notification.title}
                      </h3>
                      <div style={{ fontSize: '14px', color: '#666' }}>
                        {formatDate(notification.created_at)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {!notification.read_at && (
                        <span style={{
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          background: '#3b82f6',
                          display: 'block'
                        }} />
                      )}
                      <span style={{
                        background: getPriorityColor(notification.priority),
                        color: 'white',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700'
                      }}>
                        {notification.priority}
                      </span>
                    </div>
                  </div>

                  <p style={{
                    fontSize: '16px',
                    lineHeight: '1.6',
                    color: '#374151',
                    margin: '0 0 12px 0'
                  }}>
                    {notification.message}
                  </p>

                  {/* Lab Result Details */}
                  {notification.notification_type === 'LAB_RESULT' && notification.metadata && (
                    <div style={{
                      background: notification.metadata.is_critical ? '#fef2f2' : '#f3f4f6',
                      padding: '12px',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                        Test: {notification.metadata.test_name}
                      </div>
                      <div style={{ color: '#666' }}>
                        Status: {notification.metadata.result_status}
                        {notification.metadata.abnormal_flag && (
                          <span style={{
                            marginLeft: '8px',
                            background: '#ef4444',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: '700'
                          }}>
                            {notification.metadata.abnormal_flag}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {!notification.read_at && (
                    <div style={{
                      marginTop: '12px',
                      fontSize: '14px',
                      color: '#3b82f6',
                      fontWeight: '600'
                    }}>
                      Click to mark as read
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
