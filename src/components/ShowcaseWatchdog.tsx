import { useState, useEffect } from 'react';
import { useShowcase } from '../contexts/ShowcaseContext';

export function ShowcaseWatchdog() {
  const { currentStep, goBackToScenarioSelection } = useShowcase();
  const [showEmergencyReset, setShowEmergencyReset] = useState(false);
  const [stuckTimer, setStuckTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timer
    if (stuckTimer) {
      clearTimeout(stuckTimer);
      setStuckTimer(null);
    }

    // If we're on the role interface, start a watchdog timer
    if (currentStep === 'ROLE_INTERFACE') {
      const timer = setTimeout(() => {
        console.warn('[WATCHDOG] Loading exceeded 12s, showing emergency reset');
        setShowEmergencyReset(true);
      }, 12000);
      setStuckTimer(timer);
    } else {
      setShowEmergencyReset(false);
    }

    return () => {
      if (stuckTimer) clearTimeout(stuckTimer);
    };
  }, [currentStep]);

  const handleEmergencyReset = () => {
    console.log('[WATCHDOG] Emergency reset triggered');
    setShowEmergencyReset(false);
    goBackToScenarioSelection();
  };

  if (!showEmergencyReset) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 10000,
        backgroundColor: '#fef2f2',
        border: '3px solid #ef4444',
        borderRadius: '12px',
        padding: '16px 20px',
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        maxWidth: '320px',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
        <div style={{ fontSize: '24px', flexShrink: 0 }}>⚠️</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#991b1b', marginBottom: '8px' }}>
            Loading Taking Too Long
          </div>
          <div style={{ fontSize: '14px', color: '#7f1d1d', marginBottom: '12px' }}>
            The page has been loading for over 12 seconds. This may indicate a database issue.
          </div>
          <button
            onClick={handleEmergencyReset}
            style={{
              width: '100%',
              background: '#ef4444',
              color: 'white',
              padding: '10px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Reset Showcase
          </button>
        </div>
      </div>
    </div>
  );
}
