import { useSeniorCareTimeline } from '../hooks/useSeniorCareTimeline';

export function SeniorCareTimeline() {
  const { timeline, loading, error } = useSeniorCareTimeline();

  if (loading) {
    return (
      <div style={{
        padding: '24px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '2px solid #e0e0e0'
      }}>
        <div style={{ fontSize: '22px', fontWeight: '600', marginBottom: '16px', color: '#333' }}>
          Recent Care Activity
        </div>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading activity...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '24px',
        backgroundColor: '#fff3e0',
        borderRadius: '12px',
        border: '2px solid #ffb74d'
      }}>
        <div style={{ fontSize: '22px', fontWeight: '600', marginBottom: '16px', color: '#333' }}>
          Recent Care Activity
        </div>
        <div style={{ fontSize: '18px', color: '#e65100' }}>
          Unable to load activity timeline
        </div>
      </div>
    );
  }

  if (timeline.length === 0) {
    return (
      <div style={{
        padding: '24px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        border: '2px solid #e0e0e0'
      }}>
        <div style={{ fontSize: '22px', fontWeight: '600', marginBottom: '16px', color: '#333' }}>
          Recent Care Activity
        </div>
        <div style={{ fontSize: '18px', color: '#666' }}>
          No recent activity recorded
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      border: '2px solid #e0e0e0'
    }}>
      <div style={{ fontSize: '22px', fontWeight: '600', marginBottom: '20px', color: '#333' }}>
        Recent Care Activity
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {timeline.slice(0, 10).map((entry) => (
          <TimelineEntry key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}

interface TimelineEntryProps {
  entry: {
    id: string;
    action_type: string;
    actor_name: string;
    created_at: string;
    metadata?: any;
  };
}

function TimelineEntry({ entry }: TimelineEntryProps) {
  const actionLabel = formatActionType(entry.action_type);
  const timeFormatted = formatTimestamp(entry.created_at);

  let iconColor = '#1976d2';
  let backgroundColor = '#e3f2fd';

  if (entry.action_type.toLowerCase().includes('emergency')) {
    iconColor = '#d32f2f';
    backgroundColor = '#ffebee';
  } else if (entry.action_type.toLowerCase().includes('complete')) {
    iconColor = '#388e3c';
    backgroundColor = '#e8f5e9';
  } else if (entry.action_type.toLowerCase().includes('pause')) {
    iconColor = '#f57c00';
    backgroundColor = '#fff3e0';
  }

  return (
    <div style={{
      display: 'flex',
      gap: '16px',
      padding: '16px',
      backgroundColor: '#fafafa',
      borderRadius: '8px',
      border: '1px solid #e0e0e0'
    }}>
      <div style={{
        width: '12px',
        height: '12px',
        borderRadius: '50%',
        backgroundColor: iconColor,
        marginTop: '6px',
        flexShrink: 0
      }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '18px', fontWeight: '600', color: '#333', marginBottom: '4px' }}>
          {actionLabel}
        </div>
        <div style={{ fontSize: '16px', color: '#666', marginBottom: '4px' }}>
          By: {entry.actor_name}
        </div>
        <div style={{ fontSize: '14px', color: '#888' }}>
          {timeFormatted}
        </div>
      </div>
    </div>
  );
}

function formatActionType(actionType: string): string {
  const typeMap: Record<string, string> = {
    'care_started': 'Care Started',
    'care_paused': 'Care Paused',
    'care_resumed': 'Care Resumed',
    'care_completed': 'Care Completed',
    'emergency_triggered': 'Emergency Triggered',
    'emergency_resolved': 'Emergency Resolved',
    'caregiver_checked_in': 'Caregiver Checked In',
    'CARE_STARTED': 'Care Started',
    'CARE_PAUSED': 'Care Paused',
    'CARE_RESUMED': 'Care Resumed',
    'CARE_COMPLETED': 'Care Completed'
  };

  return typeMap[actionType] || actionType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}
