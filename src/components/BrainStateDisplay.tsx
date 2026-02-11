import type { BrainState } from '../lib/database.types'
import { StateIndicator } from './StateIndicator'

interface BrainStateDisplayProps {
  brainState: BrainState
}

function getCareStateVariant(state: string): 'neutral' | 'active' | 'warning' | 'error' {
  switch (state) {
    case 'UNINITIALIZED':
      return 'neutral'
    case 'ACTIVE':
      return 'active'
    case 'PAUSED':
      return 'warning'
    default:
      return 'neutral'
  }
}

function getEmergencyStateVariant(state: string): 'neutral' | 'active' | 'warning' | 'error' {
  switch (state) {
    case 'NONE':
      return 'active'
    case 'PENDING':
      return 'warning'
    case 'ACTIVE':
      return 'error'
    default:
      return 'neutral'
  }
}

function getConnectivityVariant(state: string): 'neutral' | 'active' | 'warning' | 'error' {
  switch (state) {
    case 'ONLINE':
      return 'active'
    case 'OFFLINE':
      return 'warning'
    default:
      return 'neutral'
  }
}

export function BrainStateDisplay({ brainState }: BrainStateDisplayProps) {
  const lastTransition = brainState.last_transition_at
    ? new Date(brainState.last_transition_at).toLocaleString()
    : 'Never'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
      }}>
        <StateIndicator
          label="Care State"
          value={brainState.care_state}
          variant={getCareStateVariant(brainState.care_state)}
        />
        <StateIndicator
          label="Emergency State"
          value={brainState.emergency_state}
          variant={getEmergencyStateVariant(brainState.emergency_state)}
        />
        <StateIndicator
          label="Connectivity"
          value={brainState.offline_online_state}
          variant={getConnectivityVariant(brainState.offline_online_state)}
        />
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '12px 16px',
        backgroundColor: '#f1f5f9',
        borderRadius: '6px',
        fontSize: '13px',
        color: '#475569',
      }}>
        <span>Version: {brainState.state_version}</span>
        <span>Last Transition: {lastTransition}</span>
      </div>
    </div>
  )
}
