import { useSupervisorStats } from '../hooks/useSupervisorStats'
import { OperationalMetrics } from './OperationalMetrics'

export function SupervisorDashboard() {
  const { stats, isLoading, error } = useSupervisorStats()

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
        Loading dashboard...
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
      <h2
        style={{
          fontSize: '24px',
          fontWeight: 600,
          color: '#0f172a',
          marginBottom: '24px',
        }}
      >
        Supervisor Dashboard
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
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
            Current Care State
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#0f172a',
            }}
          >
            {stats.currentState?.care_state || 'N/A'}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
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
            Emergency State
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color:
                stats.currentState?.emergency_state !== 'NONE'
                  ? '#dc2626'
                  : '#0f172a',
            }}
          >
            {stats.currentState?.emergency_state || 'N/A'}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
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
            Offline/Online State
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#0f172a',
            }}
          >
            {stats.currentState?.offline_online_state || 'N/A'}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
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
            State Version
          </div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#0f172a',
              fontFamily: 'monospace',
            }}
          >
            {stats.currentState?.state_version || 'N/A'}
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
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
            Transitions (24h)
          </div>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: '#0f172a',
            }}
          >
            {stats.recentTransitions24h}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
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
            Pending AI Inputs
          </div>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: stats.pendingAIInputs > 0 ? '#ea580c' : '#0f172a',
            }}
          >
            {stats.pendingAIInputs}
          </div>
        </div>

        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '20px',
          }}
        >
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
            Emergency Events
          </div>
          <div
            style={{
              fontSize: '32px',
              fontWeight: 700,
              color: stats.emergencyEventCount > 0 ? '#dc2626' : '#0f172a',
            }}
          >
            {stats.emergencyEventCount}
          </div>
        </div>
      </div>

      <OperationalMetrics />
    </div>
  )
}
