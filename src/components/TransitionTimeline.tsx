import { useBrainStateHistory } from '../hooks/useBrainStateHistory'

export function TransitionTimeline() {
  const { history, isLoading, error } = useBrainStateHistory()

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
        Loading timeline...
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
          fontSize: '18px',
          fontWeight: 600,
          color: '#0f172a',
          marginBottom: '24px',
        }}
      >
        State Transition Timeline
      </h2>

      <div style={{ position: 'relative', paddingLeft: '32px' }}>
        <div
          style={{
            position: 'absolute',
            left: '7px',
            top: '8px',
            bottom: '8px',
            width: '2px',
            backgroundColor: '#e2e8f0',
          }}
        />

        {history.map((entry, index) => {
          const previous = history[index + 1]
          const changes: string[] = []

          if (previous) {
            if (entry.care_state !== previous.care_state) {
              changes.push(
                `Care: ${previous.care_state} → ${entry.care_state}`
              )
            }
            if (entry.emergency_state !== previous.emergency_state) {
              changes.push(
                `Emergency: ${previous.emergency_state} → ${entry.emergency_state}`
              )
            }
            if (entry.offline_online_state !== previous.offline_online_state) {
              changes.push(
                `Offline/Online: ${previous.offline_online_state} → ${entry.offline_online_state}`
              )
            }
          }

          return (
            <div
              key={entry.id}
              style={{
                position: 'relative',
                marginBottom: '24px',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: '-28px',
                  top: '4px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: entry.emergency_state !== 'NONE' ? '#dc2626' : '#0f172a',
                  border: '2px solid #ffffff',
                }}
              />

              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px',
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: '#0f172a',
                      }}
                    >
                      Version {entry.state_version}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#64748b',
                        marginTop: '2px',
                      }}
                    >
                      {new Date(entry.changed_at).toLocaleString()}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#64748b',
                    }}
                  >
                    {entry.changed_by || 'System'}
                  </div>
                </div>

                {changes.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    {changes.map((change, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: '13px',
                          color: '#0f172a',
                          marginTop: '4px',
                          fontFamily: 'monospace',
                        }}
                      >
                        {change}
                      </div>
                    ))}
                  </div>
                )}

                {index === 0 && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '8px 12px',
                      backgroundColor: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      borderRadius: '6px',
                      fontSize: '12px',
                      color: '#0369a1',
                    }}
                  >
                    Current State
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {history.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px',
            color: '#64748b',
          }}
        >
          No timeline entries found
        </div>
      )}
    </div>
  )
}
