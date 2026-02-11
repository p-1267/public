import { useGlobalEmergencyStatus } from '../hooks/useGlobalEmergencyStatus';

export function SeniorEmergencyIndicator() {
  const { status, loading, error } = useGlobalEmergencyStatus();

  if (loading) {
    return (
      <div style={{
        padding: '24px',
        backgroundColor: '#f5f5f5',
        borderRadius: '12px',
        border: '2px solid #e0e0e0'
      }}>
        <div style={{ fontSize: '18px', color: '#666' }}>Loading system status...</div>
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
        <div style={{ fontSize: '18px', color: '#e65100', fontWeight: '600' }}>
          Unable to load system status
        </div>
      </div>
    );
  }

  const isEmergency = status?.emergency_state === 'active';
  const backgroundColor = isEmergency ? '#ffebee' : '#e8f5e9';
  const borderColor = isEmergency ? '#ef5350' : '#66bb6a';
  const textColor = isEmergency ? '#c62828' : '#2e7d32';
  const statusText = isEmergency ? 'Emergency Active' : 'No Active Emergency';

  return (
    <div style={{
      padding: '24px',
      backgroundColor,
      borderRadius: '12px',
      border: `3px solid ${borderColor}`
    }}>
      <div style={{
        fontSize: '16px',
        color: '#666',
        marginBottom: '8px',
        fontWeight: '500'
      }}>
        System Emergency Status
      </div>
      <div style={{
        fontSize: '28px',
        color: textColor,
        fontWeight: '700',
        marginBottom: '8px'
      }}>
        {statusText}
      </div>
      <div style={{
        fontSize: '14px',
        color: '#888',
        marginTop: '12px'
      }}>
        This is the system-wide emergency status
      </div>
    </div>
  );
}
