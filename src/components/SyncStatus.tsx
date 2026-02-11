import { useSyncStatus, SyncStatus as SyncStatusType } from '../hooks/useSyncStatus';

const statusConfig: Record<SyncStatusType, { label: string; color: string; bgColor: string }> = {
  synced: {
    label: 'Synced',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
  },
  syncing: {
    label: 'Syncing',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.1)',
  },
  offline: {
    label: 'Offline',
    color: '#6b7280',
    bgColor: 'rgba(107, 114, 128, 0.1)',
  },
  pending: {
    label: 'Pending',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.1)',
  },
};

export function SyncStatus() {
  const { status, pendingCount } = useSyncStatus();
  const config = statusConfig[status];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '12px',
        backgroundColor: config.bgColor,
        fontSize: '12px',
        fontWeight: 500,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: config.color,
          animation: status === 'syncing' ? 'pulse 1.5s infinite' : undefined,
        }}
      />
      <span style={{ color: config.color }}>
        {config.label}
        {pendingCount > 0 && status !== 'synced' && ` (${pendingCount})`}
      </span>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
