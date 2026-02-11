import { useBrainStateHistory } from '../hooks/useBrainStateHistory'
import { useTransitionSummary } from '../hooks/useTransitionSummary'

export function OperationalMetrics() {
  const { history, isLoading, error } = useBrainStateHistory()
  const summary = useTransitionSummary(history)

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
        Loading metrics...
      </div>
    )
  }

  if (error) {
    return (
      <div
        style={{
          padding: '16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626',
        }}
      >
        Error: {error}
      </div>
    )
  }

  return (
    <div>
      <h3
        style={{
          fontSize: '18px',
          fontWeight: 600,
          color: '#0f172a',
          marginBottom: '16px',
        }}
      >
        Operational Metrics
      </h3>

      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '24px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '24px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '8px',
              }}
            >
              Total State Changes
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              {summary.totalTransitions}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '8px',
              }}
            >
              Care Transitions
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              {summary.careTransitions}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '8px',
              }}
            >
              Emergency Transitions
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: summary.emergencyTransitions > 0 ? '#dc2626' : '#0f172a',
              }}
            >
              {summary.emergencyTransitions}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '8px',
              }}
            >
              Offline/Online Changes
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              {summary.offlineOnlineTransitions}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '8px',
              }}
            >
              Last 24 Hours
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              {summary.last24h}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '8px',
              }}
            >
              Last 7 Days
            </div>
            <div
              style={{
                fontSize: '28px',
                fontWeight: 700,
                color: '#0f172a',
              }}
            >
              {summary.last7d}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
