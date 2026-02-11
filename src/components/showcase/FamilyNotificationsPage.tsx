import React, { useState, useEffect } from 'react';
import { useShowcase } from '../../contexts/ShowcaseContext';
import { supabase } from '../../lib/supabase';

export const FamilyNotificationsPage: React.FC = () => {
  const { mockUserId } = useShowcase();
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    if (!mockUserId) return;

    supabase.from('notification_log')
      .select('*')
      .eq('recipient_user_id', mockUserId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setNotifications(data);
      });
  }, [mockUserId]);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '24px',
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '24px',
        }}>
          <h1 style={{
            margin: '0 0 12px 0',
            fontSize: '28px',
            fontWeight: 700,
            color: '#0f172a',
          }}>
            Notifications
          </h1>
          <p style={{
            margin: 0,
            fontSize: '15px',
            color: '#64748b',
          }}>
            Updates about your loved one's care and well-being.
          </p>
        </div>

        {notifications.length === 0 ? (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            padding: '48px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            <div style={{
              fontSize: '48px',
              marginBottom: '16px',
            }}>📬</div>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: '18px',
              fontWeight: 600,
              color: '#0f172a',
            }}>
              No new notifications
            </h3>
            <p style={{
              margin: 0,
              fontSize: '14px',
              color: '#64748b',
            }}>
              You're all caught up!
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {notifications.map((notification, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  padding: '20px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  borderLeft: notification.type === 'urgent' ? '4px solid #dc2626' : '4px solid #10b981',
                }}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '8px',
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#0f172a',
                  }}>
                    {notification.title}
                  </h3>
                  <span style={{
                    fontSize: '12px',
                    color: '#64748b',
                  }}>
                    {notification.time}
                  </span>
                </div>
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#334155',
                  lineHeight: '1.5',
                }}>
                  {notification.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
