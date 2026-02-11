import { useEmergencyBlockStatus } from '../hooks/useEmergencyBlockStatus';
import { useAuditCompleteness } from '../hooks/useAuditCompleteness';
import { OfflineQueueInspector } from './OfflineQueueInspector';
import { AutomationStatusPanel } from './AutomationStatusPanel';
import { DeviceHealthDashboard } from './DeviceHealthDashboard';
import { IntegrationHealthPanel } from './IntegrationHealthPanel';

export function SystemHealthPanel() {
  const { blockStatus, isLoading: emergencyLoading, error: emergencyError } = useEmergencyBlockStatus();
  const { report, loading: auditLoading, error: auditError } = useAuditCompleteness();

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      padding: '0',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', marginBottom: '8px' }}>
          System Health & Diagnostics
        </h2>
        <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>
          Read-only diagnostics and system invariant verification. No actions can be taken from this panel.
        </p>
      </div>

      <div style={{ display: 'grid', gap: '24px' }}>
        <AutomationStatusPanel />

        <EmergencyBlockPanel blockStatus={blockStatus} loading={emergencyLoading} error={emergencyError} />

        <AuditCompletenessPanel report={report} loading={auditLoading} error={auditError} />

        <DeviceHealthDashboard />

        <IntegrationHealthPanel />

        <OfflineQueueInspector />

        <SystemInvariantsPanel />
      </div>
    </div>
  );
}

interface EmergencyBlockPanelProps {
  blockStatus: any;
  loading: boolean;
  error: Error | null;
}

function EmergencyBlockPanel({ blockStatus, loading, error }: EmergencyBlockPanelProps) {
  if (loading) {
    return <Panel title="Emergency Block Status" loading />;
  }

  if (error) {
    return <Panel title="Emergency Block Status" error={error.message} />;
  }

  const statusColor = blockStatus.isEmergencyActive ? '#dc2626' : '#10b981';
  const statusBg = blockStatus.isEmergencyActive ? '#fee2e2' : '#d1fae5';

  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
        Emergency Block Status
      </div>

      <div style={{
        padding: '16px',
        backgroundColor: statusBg,
        borderRadius: '6px',
        marginBottom: '16px'
      }}>
        <div style={{ fontSize: '14px', fontWeight: '600', color: statusColor, marginBottom: '8px' }}>
          {blockStatus.isEmergencyActive ? 'Emergency Active - Actions Blocked' : 'No Active Emergency'}
        </div>
        {blockStatus.blockReason && (
          <div style={{ fontSize: '13px', color: statusColor }}>
            {blockStatus.blockReason}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
        <StatusItem
          label="Care Actions"
          blocked={blockStatus.careActionsBlocked}
        />
        <StatusItem
          label="Non-Emergency Transitions"
          blocked={blockStatus.nonEmergencyTransitionsBlocked}
        />
      </div>

      {blockStatus.allowedActions && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#f8fafc',
          borderRadius: '6px'
        }}>
          <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '6px', color: '#64748b' }}>
            Allowed Actions:
          </div>
          <div style={{ fontSize: '13px', color: '#0f172a' }}>
            {blockStatus.allowedActions.join(', ')}
          </div>
        </div>
      )}
    </div>
  );
}

interface StatusItemProps {
  label: string;
  blocked: boolean;
}

function StatusItem({ label, blocked }: StatusItemProps) {
  return (
    <div style={{
      padding: '12px',
      backgroundColor: blocked ? '#fef2f2' : '#f0fdf4',
      borderRadius: '6px',
      border: `1px solid ${blocked ? '#fecaca' : '#bbf7d0'}`
    }}>
      <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{
        fontSize: '14px',
        fontWeight: '600',
        color: blocked ? '#dc2626' : '#10b981'
      }}>
        {blocked ? 'Blocked' : 'Allowed'}
      </div>
    </div>
  );
}

interface AuditCompletenessPanelProps {
  report: any;
  loading: boolean;
  error: Error | null;
}

function AuditCompletenessPanel({ report, loading, error }: AuditCompletenessPanelProps) {
  if (loading) {
    return <Panel title="Audit Log Completeness" loading />;
  }

  if (error) {
    return <Panel title="Audit Log Completeness" error={error.message} />;
  }

  const statusColor = report.isComplete ? '#10b981' : '#f59e0b';
  const statusBg = report.isComplete ? '#d1fae5' : '#fef3c7';

  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '18px', fontWeight: '600' }}>
          Audit Log Completeness
        </div>
        <div style={{
          padding: '6px 12px',
          backgroundColor: statusBg,
          color: statusColor,
          borderRadius: '4px',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          {report.isComplete ? 'Complete' : 'Issues Detected'}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <MetricCard label="Total Entries" value={report.totalEntries} />
        <MetricCard label="Without Actor" value={report.entriesWithoutActor} warning={report.entriesWithoutActor > 0} />
        <MetricCard label="Invalid Actor" value={report.entriesWithInvalidActor} warning={report.entriesWithInvalidActor > 0} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginBottom: '16px' }}>
        <MetricCard label="Recent State Transitions" value={report.recentStateTransitions} />
        <MetricCard label="Recent Audit Entries" value={report.recentAuditEntries} />
      </div>

      {report.issues.length > 0 && (
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
            {report.issues.map((issue: string, idx: number) => (
              <li key={idx} style={{ fontSize: '13px', marginBottom: '4px' }}>{issue}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number;
  warning?: boolean;
}

function MetricCard({ label, value, warning }: MetricCardProps) {
  return (
    <div style={{
      padding: '12px',
      backgroundColor: warning ? '#fef2f2' : '#f8fafc',
      borderRadius: '6px',
      border: `1px solid ${warning ? '#fecaca' : '#e2e8f0'}`
    }}>
      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{
        fontSize: '20px',
        fontWeight: '700',
        color: warning ? '#dc2626' : '#0f172a'
      }}>
        {value}
      </div>
    </div>
  );
}

function SystemInvariantsPanel() {
  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#eff6ff',
      borderRadius: '8px',
      border: '1px solid #bfdbfe'
    }}>
      <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#1e40af' }}>
        System Invariants (Verified)
      </div>

      <ul style={{ margin: 0, paddingLeft: '20px', color: '#1e40af' }}>
        <li style={{ marginBottom: '8px', fontSize: '14px' }}>
          Emergency ACTIVE blocks all non-emergency state transitions
        </li>
        <li style={{ marginBottom: '8px', fontSize: '14px' }}>
          All state mutations require version checking
        </li>
        <li style={{ marginBottom: '8px', fontSize: '14px' }}>
          Permission denial is surfaced, not silent
        </li>
        <li style={{ marginBottom: '8px', fontSize: '14px' }}>
          Offline replay respects emergency supremacy
        </li>
        <li style={{ marginBottom: '8px', fontSize: '14px' }}>
          Audit entries reference valid actors or system
        </li>
      </ul>

      <div style={{
        marginTop: '16px',
        padding: '12px',
        backgroundColor: '#ffffff',
        borderRadius: '6px',
        fontSize: '12px',
        color: '#64748b'
      }}>
        These invariants are verified at runtime. Violations are logged but not auto-corrected.
      </div>
    </div>
  );
}

interface PanelProps {
  title: string;
  loading?: boolean;
  error?: string;
}

function Panel({ title, loading, error }: PanelProps) {
  return (
    <div style={{
      padding: '24px',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #e2e8f0'
    }}>
      <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
        {title}
      </div>
      {loading && <div style={{ color: '#64748b' }}>Loading...</div>}
      {error && <div style={{ color: '#dc2626' }}>Error: {error}</div>}
    </div>
  );
}
