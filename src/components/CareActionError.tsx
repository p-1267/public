interface CareActionErrorProps {
  errorCode: string;
  onDismiss: () => void;
}

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_ACTION_FOR_STATE: 'This action is not available right now',
  BLOCKED_BY_EMERGENCY: 'Care actions are locked during an emergency',
  VERSION_MISMATCH: 'State changed, please try again',
  NETWORK_ERROR: 'Connection issue - action queued for sync',
  INVALID_TRANSITION: 'This transition is not allowed',
  SAME_STATE: 'Already in this state',
  NO_BRAIN_STATE: 'System state unavailable',
};

export function CareActionError({ errorCode, onDismiss }: CareActionErrorProps) {
  const message = ERROR_MESSAGES[errorCode] ?? 'An unexpected error occurred';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '6px',
        color: '#991b1b',
        fontSize: '14px',
      }}
    >
      <span>{message}</span>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: '#991b1b',
          cursor: 'pointer',
          padding: '4px 8px',
          fontSize: '18px',
          lineHeight: 1,
        }}
        aria-label="Dismiss error"
      >
        x
      </button>
    </div>
  );
}
