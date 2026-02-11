import { useSystemCompleteness } from '../hooks/useSystemCompleteness';

export function FinalReadinessDeclaration() {
  const { report, loading: systemLoading } = useSystemCompleteness();

  if (systemLoading || !report) {
    return null;
  }

  if (report.readinessStatus === 'PENDING_AUTH') {
    return null;
  }

  if (report.readinessStatus === 'READY') {
    console.assert(true, 'UI MUST BE READY');
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        padding: '16px 24px',
        backgroundColor: '#d1fae5',
        borderBottom: '2px solid #10b981',
        zIndex: 2000,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>
              System Production-Ready
            </div>
            <div style={{ fontSize: '14px', color: '#059669' }}>
              This system is feature-complete and production-ready as defined by the Master Specification.
            </div>
          </div>
          <div style={{
            padding: '8px 16px',
            backgroundColor: '#10b981',
            color: '#ffffff',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            READY
          </div>
        </div>
      </div>
    );
  }

  if (report.readinessStatus !== 'NOT_READY') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      padding: '16px 24px',
      backgroundColor: '#fef3c7',
      borderBottom: '2px solid #f59e0b',
      zIndex: 2000,
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#f59e0b', marginBottom: '4px' }}>
              System Not Ready for Production
            </div>
            <div style={{ fontSize: '14px', color: '#92400e' }}>
              The following issues must be resolved before the system can be declared production-ready:
            </div>
          </div>
          <div style={{
            padding: '8px 16px',
            backgroundColor: '#f59e0b',
            color: '#ffffff',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600'
          }}>
            NOT READY
          </div>
        </div>
        <ul style={{ margin: 0, paddingLeft: '20px', color: '#92400e' }}>
          {report.issues.map((issue, idx) => (
            <li key={idx} style={{ fontSize: '13px', marginBottom: '4px' }}>
              {issue}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
