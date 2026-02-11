import React, { useState } from 'react';

interface SeniorSOSButtonProps {
  residentId: string;
  residentName: string;
}

export const SeniorSOSButton: React.FC<SeniorSOSButtonProps> = ({ residentId, residentName }) => {
  const [emergencyTriggered, setEmergencyTriggered] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const handleSOSPress = () => {
    setEmergencyTriggered(true);

    // In real implementation, this would trigger emergency protocols
    console.log(`🚨 EMERGENCY TRIGGERED for ${residentName} (${residentId})`);

    // Simulate notification to family and emergency contacts
    setTimeout(() => {
      alert('Emergency alert sent to:\n• Emergency Services\n• Family Members\n• Primary Care Team');
    }, 500);
  };

  const handleImOK = () => {
    setEmergencyTriggered(false);
    setConfirmCancel(false);
    alert('Emergency cancelled. Your contacts have been notified that you\'re OK.');
  };

  if (emergencyTriggered) {
    return (
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          background: 'white',
          padding: '48px',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          textAlign: 'center',
          maxWidth: '500px',
          width: '90%'
        }}
      >
        <div style={{
          fontSize: '80px',
          marginBottom: '24px',
          animation: 'pulse 1s infinite'
        }}>
          🚨
        </div>
        <h2 style={{
          fontSize: '36px',
          fontWeight: '700',
          color: '#dc2626',
          marginBottom: '16px'
        }}>
          EMERGENCY ALERT SENT
        </h2>
        <p style={{
          fontSize: '24px',
          color: '#666',
          marginBottom: '32px'
        }}>
          Help is on the way. Emergency contacts have been notified.
        </p>

        {!confirmCancel ? (
          <button
            onClick={() => setConfirmCancel(true)}
            style={{
              width: '100%',
              padding: '24px',
              fontSize: '28px',
              fontWeight: '700',
              background: '#22c55e',
              color: 'white',
              border: 'none',
              borderRadius: '16px',
              cursor: 'pointer'
            }}
          >
            I'm OK - Cancel Alert
          </button>
        ) : (
          <div>
            <p style={{
              fontSize: '22px',
              color: '#dc2626',
              fontWeight: '600',
              marginBottom: '24px'
            }}>
              Are you sure you're OK?
            </p>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button
                onClick={handleImOK}
                style={{
                  flex: 1,
                  padding: '20px',
                  fontSize: '24px',
                  fontWeight: '700',
                  background: '#22c55e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}
              >
                Yes, I'm OK
              </button>
              <button
                onClick={() => setConfirmCancel(false)}
                style={{
                  flex: 1,
                  padding: '20px',
                  fontSize: '24px',
                  fontWeight: '700',
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer'
                }}
              >
                No, I Need Help
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleSOSPress}
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        background: '#dc2626',
        color: 'white',
        border: '4px solid white',
        boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.6)',
        fontSize: '32px',
        fontWeight: '700',
        cursor: 'pointer',
        zIndex: 9998,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(220, 38, 38, 0.8)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(220, 38, 38, 0.6)';
      }}
      title="Emergency SOS - Press if you need immediate help"
    >
      SOS
    </button>
  );
};
