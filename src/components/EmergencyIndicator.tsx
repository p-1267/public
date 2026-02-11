interface EmergencyIndicatorProps {
  state: string;
}

const stateConfig: Record<string, { label: string; color: string; bgColor: string; pulse: boolean }> = {
  NONE: {
    label: 'Normal',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    pulse: false,
  },
  PENDING: {
    label: 'Emergency Pending',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.15)',
    pulse: true,
  },
  ACTIVE: {
    label: 'Emergency Active',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.15)',
    pulse: true,
  },
};

export function EmergencyIndicator({ state }: EmergencyIndicatorProps) {
  const config = stateConfig[state] || stateConfig.NONE;

  if (state === 'NONE') {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        borderRadius: '8px',
        backgroundColor: config.bgColor,
        border: `1px solid ${config.color}`,
        animation: config.pulse ? 'emergencyPulse 2s infinite' : undefined,
      }}
    >
      <span
        style={{
          width: '10px',
          height: '10px',
          borderRadius: '50%',
          backgroundColor: config.color,
          animation: config.pulse ? 'dotPulse 1s infinite' : undefined,
        }}
      />
      <span
        style={{
          color: config.color,
          fontWeight: 600,
          fontSize: '14px',
          letterSpacing: '0.025em',
        }}
      >
        {config.label}
      </span>
      <style>{`
        @keyframes emergencyPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        @keyframes dotPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
