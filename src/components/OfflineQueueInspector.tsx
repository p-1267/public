import { useOfflineQueueDiagnostics } from '../hooks/useOfflineQueueDiagnostics';

export function OfflineQueueInspector() {
  const { diagnostics, loading, error } = useOfflineQueueDiagnostics();

  if (loading) {
    return (
      <div style={{
        padding: '24px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
          Offline Queue Diagnostics
        </div>
        <div style={{ color: '#64748b' }}>Loading queue diagnostics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '24px',
        backgroundColor: '#fef2f2',
        borderRadius: '8px',
        border: '1px solid #fecaca'
      }}>
        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#dc2626' }}>
          Offline Queue Diagnostics
        </div>
        <div style={{ color: '#dc2626' }}>Error: {error.message}</div>
      </div>
    );
  }

  const statusColor = diagnostics.isHealthy ? '#10b981' : '#f59e0b';
  const statusBg = diagnostics.isHealthy ? '#d1fae5' : '#fef3c7';
  const statusText = diagnostics.isHealthy ? 'Healthy' : 'Issues Detected';

  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '18px', fontWeight: '600' }}>
          Offline Queue Diagnostics
        </div>
        <div style={{
          padding: '6px 12px',
          backgroundColor: statusBg,
          color: statusColor,
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          {statusText}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard label="Total Actions" value={diagnostics.totalActions} />
        <StatCard label="High Retry Count" value={diagnostics.highRetryActions.length} warning={diagnostics.highRetryActions.length > 0} />
        <StatCard label="Stale Actions" value={diagnostics.staleActions.length} warning={diagnostics.staleActions.length > 0} />
        <StatCard label="Corrupted Actions" value={diagnostics.corruptedActions.length} warning={diagnostics.corruptedActions.length > 0} />
      </div>

      {diagnostics.oldestAction && (
        <div style={{
          padding: '16px',
          backgroundColor: '#f8fafc',
          borderRadius: '6px',
          marginBottom: '16px'
        }}>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px' }}>
            Oldest Queued Action
          </div>
          <div style={{ fontSize: '13px', color: '#64748b' }}>
            <div><strong>Type:</strong> {diagnostics.oldestAction.type}</div>
            <div><strong>Age:</strong> {formatAge(diagnostics.oldestAction.timestamp)}</div>
            <div><strong>Retry Count:</strong> {diagnostics.oldestAction.retryCount}</div>
          </div>
        </div>
      )}

      {diagnostics.issues.length > 0 && (
        <div style={{
          padding: '16px',
          backgroundColor: '#fef3c7',
          borderRadius: '6px',
          border: '1px solid #fbbf24'
        }}>
          <div style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#92400e' }}>
            Issues Detected
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#92400e' }}>
            {diagnostics.issues.map((issue, idx) => (
              <li key={idx} style={{ fontSize: '13px', marginBottom: '4px' }}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      <div style={{
        marginTop: '16px',
        padding: '12px',
        backgroundColor: '#eff6ff',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#1e40af'
      }}>
        This inspector shows read-only diagnostics of the offline action queue. Actions with high retry counts or corruption are flagged but not automatically removed.
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  warning?: boolean;
}

function StatCard({ label, value, warning }: StatCardProps) {
  return (
    <div style={{
      padding: '16px',
      backgroundColor: warning ? '#fef2f2' : '#f8fafc',
      borderRadius: '6px',
      border: `1px solid ${warning ? '#fecaca' : '#e2e8f0'}`
    }}>
      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{
        fontSize: '24px',
        fontWeight: '700',
        color: warning ? '#dc2626' : '#0f172a'
      }}>
        {value}
      </div>
    </div>
  );
}

function formatAge(timestamp: number): string {
  const ageMs = Date.now() - timestamp;
  const ageMinutes = Math.floor(ageMs / 60000);
  const ageHours = Math.floor(ageMinutes / 60);

  if (ageHours > 0) {
    return `${ageHours}h ${ageMinutes % 60}m`;
  }
  return `${ageMinutes}m`;
}
