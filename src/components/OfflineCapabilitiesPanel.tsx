import { OfflineQueueInspector } from './OfflineQueueInspector';
import { SyncStatus } from './SyncStatus';
import { useConnectivity } from '../hooks/useConnectivity';
import { useSyncStatus } from '../hooks/useSyncStatus';

export function OfflineCapabilitiesPanel() {
  const connectivity = useConnectivity();
  const { lastSyncTime } = useSyncStatus();

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never';
    const secondsAgo = Math.floor((Date.now() - lastSyncTime) / 1000);
    if (secondsAgo < 60) return `${secondsAgo}s ago`;
    const minutesAgo = Math.floor(secondsAgo / 60);
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    const hoursAgo = Math.floor(minutesAgo / 60);
    return `${hoursAgo}h ago`;
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
            Offline Capabilities
          </h1>
          <p style={{ color: '#64748b', fontSize: '14px' }}>
            Real-time sync status and offline queue diagnostics
          </p>
        </div>
        <SyncStatus />
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <StatCard
          label="Network Status"
          value={connectivity === 'online' ? 'Online' : 'Offline'}
          color={connectivity === 'online' ? '#10b981' : '#6b7280'}
          bgColor={connectivity === 'online' ? '#d1fae5' : '#f3f4f6'}
        />
        <StatCard
          label="Last Sync"
          value={formatLastSync()}
          color="#3b82f6"
          bgColor="#dbeafe"
        />
        <StatCard
          label="Offline-First"
          value="Enabled"
          color="#8b5cf6"
          bgColor="#ede9fe"
        />
      </div>

      <OfflineQueueInspector />

      <div style={{
        marginTop: '24px',
        padding: '20px',
        backgroundColor: '#f8fafc',
        borderRadius: '8px',
        border: '1px solid #e2e8f0'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '12px' }}>
          How Offline-First Works
        </h3>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#64748b', fontSize: '14px' }}>
          <li style={{ marginBottom: '8px' }}>
            All care actions are saved locally first (IndexedDB)
          </li>
          <li style={{ marginBottom: '8px' }}>
            Actions automatically sync when network connection is restored
          </li>
          <li style={{ marginBottom: '8px' }}>
            Conflict resolution handled automatically with versioning
          </li>
          <li style={{ marginBottom: '8px' }}>
            Queue diagnostics show pending actions and retry status
          </li>
          <li>
            Real-time sync status indicator shows current state
          </li>
        </ul>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  color: string;
  bgColor: string;
}

function StatCard({ label, value, color, bgColor }: StatCardProps) {
  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>
        {label}
      </div>
      <div style={{
        fontSize: '24px',
        fontWeight: '700',
        color: color
      }}>
        {value}
      </div>
      <div style={{
        marginTop: '8px',
        height: '4px',
        borderRadius: '2px',
        backgroundColor: bgColor
      }} />
    </div>
  );
}
