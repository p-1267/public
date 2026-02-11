import { useState, useEffect } from 'react';
import { useMessaging } from '../hooks/useMessaging';

export function AnnouncementsPanel() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { getUserAnnouncements, acknowledgeAnnouncement } = useMessaging();

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await getUserAnnouncements();
      setAnnouncements(data.announcements || []);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (announcementId: string) => {
    try {
      setMessage(null);
      await acknowledgeAnnouncement(announcementId);
      setMessage({ type: 'success', text: 'Announcement acknowledged' });
      loadAnnouncements();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Failed to acknowledge' });
    }
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { color: string }> = {
      URGENT: { color: 'bg-red-100 text-red-800' },
      HIGH: { color: 'bg-orange-100 text-orange-800' },
      NORMAL: { color: 'bg-blue-100 text-blue-800' },
      LOW: { color: 'bg-gray-100 text-gray-800' }
    };
    const badge = badges[priority] || badges.NORMAL;
    return <span className={`px-2 py-1 rounded text-xs font-bold ${badge.color}`}>{priority}</span>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-12">
        <div className="text-gray-600">Loading announcements...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold mb-6">Agency Announcements</h2>

      {message && (
        <div className={`border rounded p-4 mb-6 ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-red-50 border-red-200 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {announcements.length === 0 ? (
        <div className="text-gray-600 text-center py-8">No announcements at this time</div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <div
              key={announcement.id}
              className={`border rounded-lg p-4 ${
                announcement.is_acknowledged
                  ? 'bg-gray-50 border-gray-200'
                  : announcement.priority === 'URGENT'
                  ? 'bg-red-50 border-red-300'
                  : announcement.priority === 'HIGH'
                  ? 'bg-orange-50 border-orange-300'
                  : 'bg-blue-50 border-blue-300'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold">{announcement.title}</h3>
                    {getPriorityBadge(announcement.priority)}
                  </div>
                  <div className="text-sm text-gray-600">
                    By {announcement.created_by} • {new Date(announcement.created_at).toLocaleString()}
                  </div>
                </div>
                {announcement.is_acknowledged && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-bold">
                    Acknowledged
                  </span>
                )}
              </div>

              <div className="text-sm text-gray-800 mb-3 whitespace-pre-wrap">
                {announcement.content}
              </div>

              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-600">
                  {announcement.expires_at && (
                    <span>Expires: {new Date(announcement.expires_at).toLocaleDateString()}</span>
                  )}
                </div>
                {announcement.requires_acknowledgment && !announcement.is_acknowledged && (
                  <button
                    onClick={() => handleAcknowledge(announcement.id)}
                    className="px-4 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 text-sm"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded p-4 mt-6">
        <p className="text-sm text-blue-800 font-semibold">Announcement Requirements:</p>
        <p className="text-sm text-blue-800 mt-1">
          All announcements are scoped to specific roles and may require acknowledgment for compliance tracking. Acknowledgment status is immutable and auditable.
        </p>
      </div>
    </div>
  );
}
