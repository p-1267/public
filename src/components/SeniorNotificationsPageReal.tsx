import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useSeniorResident } from '../hooks/useSeniorResident';

interface Notification {
  id: string;
  notification_type: string;
  severity: string;
  title: string;
  message: string;
  delivered_at: string;
  read_at: string | null;
  action_url: string | null;
}

export const SeniorNotificationsPageReal: React.FC = () => {
  const { resident, loading: residentLoading } = useSeniorResident();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (resident) {
      loadNotifications();
    }
  }, [resident]);

  const loadNotifications = async () => {
    if (!resident) return;

    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('notification_log')
        .select('*')
        .eq('user_id', user.id)
        .order('delivered_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
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

      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      );
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('notification_log')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  if (residentLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <p className="text-2xl text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <p className="text-2xl text-gray-600 mb-4">No resident profile found</p>
          <p className="text-lg text-gray-500">Please contact your care team to set up your account.</p>
        </div>
      </div>
    );
  }

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.read_at)
    : notifications;

  const unreadCount = notifications.filter(n => !n.read_at).length;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
      case 'HIGH':
        return 'border-red-500';
      case 'MEDIUM':
        return 'border-yellow-500';
      default:
        return 'border-blue-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'MEDICATION_REMINDER':
        return '💊';
      case 'APPOINTMENT_REMINDER':
        return '📅';
      case 'HEALTH_ALERT':
        return '🏥';
      case 'LAB_RESULT':
        return '🔬';
      case 'MESSAGE':
        return '💬';
      default:
        return '📢';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            My Notifications
          </h1>
          <p className="text-2xl text-gray-600">
            Important messages from your care team
          </p>
        </div>

        <div className="mb-6 flex justify-between items-center">
          <div className="flex gap-3">
            <button
              onClick={() => setFilter('all')}
              className={`px-6 py-3 rounded-xl text-xl font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-6 py-3 rounded-xl text-xl font-semibold transition-colors ${
                filter === 'unread'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xl font-semibold transition-colors"
            >
              Mark All as Read
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="bg-gray-50 rounded-2xl p-12 text-center">
            <div className="text-6xl mb-4">📬</div>
            <p className="text-3xl text-gray-500">
              {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
            </p>
            <p className="text-xl text-gray-400 mt-4">
              {filter === 'unread' ? "You're all caught up!" : 'Notifications from your care team will appear here'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white border-l-4 ${getSeverityColor(notification.severity)} rounded-xl shadow-sm hover:shadow-md transition-shadow ${
                  !notification.read_at ? 'bg-blue-50' : ''
                }`}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{getTypeIcon(notification.notification_type)}</span>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">
                          {notification.title}
                        </h3>
                        {!notification.read_at && (
                          <span className="inline-block mt-1 px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-semibold">
                            NEW
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-lg text-gray-500">
                      {formatTime(notification.delivered_at)}
                    </span>
                  </div>

                  <p className="text-xl text-gray-700 mb-4">
                    {notification.message}
                  </p>

                  <div className="flex gap-3">
                    {notification.action_url && (
                      <button
                        onClick={() => window.location.href = notification.action_url!}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg font-medium transition-colors"
                      >
                        View Details
                      </button>
                    )}
                    {!notification.read_at && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-lg font-medium transition-colors"
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
