import { useSeniorCareTimeline } from '../hooks/useSeniorCareTimeline';

export function SeniorCareStatus() {
  const { timeline, loading, error } = useSeniorCareTimeline();

  if (loading) {
    return (
      <div style={{
        padding: '24px',
        backgroundColor: '#f5f5f5',
        borderRadius: '12px',
        border: '2px solid #e0e0e0'
      }}>
        <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
          Care Status (Informational)
        </div>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading...</div>
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
        <div style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
          Care Status (Informational)
        </div>
        <div style={{ fontSize: '18px', color: '#e65100' }}>
          Unable to load care status
        </div>
      </div>
    );
  }

  const careEvents = timeline.filter(entry =>
    entry.action_type.includes('care_') ||
    entry.action_type.includes('CARE_')
  );

  const latestCareEvent = careEvents[0];

  let statusText = 'No recent care activity';
  let statusColor = '#666';
  let backgroundColor = '#f5f5f5';
  let borderColor = '#e0e0e0';

  if (latestCareEvent) {
    const actionType = latestCareEvent.action_type.toLowerCase();

    if (actionType.includes('start') || actionType.includes('begin')) {
      statusText = 'Care in progress';
      statusColor = '#1976d2';
      backgroundColor = '#e3f2fd';
      borderColor = '#1976d2';
    } else if (actionType.includes('pause')) {
      statusText = 'Care paused';
      statusColor = '#f57c00';
      backgroundColor = '#fff3e0';
      borderColor = '#f57c00';
    } else if (actionType.includes('resume')) {
      statusText = 'Care resumed';
      statusColor = '#1976d2';
      backgroundColor = '#e3f2fd';
      borderColor = '#1976d2';
    } else if (actionType.includes('complete') || actionType.includes('end')) {
      statusText = 'Care completed';
      statusColor = '#388e3c';
      backgroundColor = '#e8f5e9';
      borderColor = '#388e3c';
    }
  }

  const timeAgo = latestCareEvent ? formatTimeAgo(latestCareEvent.created_at) : null;

  return (
    <div style={{
      padding: '24px',
      backgroundColor,
      borderRadius: '12px',
      border: `3px solid ${borderColor}`
    }}>
      <div style={{
        fontSize: '20px',
        fontWeight: '600',
        color: '#333',
        marginBottom: '16px'
      }}>
        Care Status (Informational)
      </div>
      <div style={{
        fontSize: '28px',
        fontWeight: '700',
        color: statusColor,
        marginBottom: '8px'
      }}>
        {statusText}
      </div>
      {latestCareEvent && (
        <div style={{ fontSize: '16px', color: '#666', marginTop: '12px' }}>
          Last activity: {timeAgo}
          <br />
          By: {latestCareEvent.actor_name}
        </div>
      )}
    </div>
  );
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}
