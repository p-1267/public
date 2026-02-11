import { useState } from 'react'
import { useBrainStateHistory } from '../hooks/useBrainStateHistory'

export function BrainStateHistoryViewer() {
  const { history, isLoading, error } = useBrainStateHistory()
  const [dateFilter, setDateFilter] = useState<string>('')

  const filteredHistory = dateFilter
    ? history.filter((entry) => entry.changed_at >= dateFilter)
    : history

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '48px', color: '#64748b' }}>
        Loading history...
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
      <div
        style={{
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <label
          htmlFor="date-filter"
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: '#0f172a',
          }}
        >
          Filter from date:
        </label>
        <input
          id="date-filter"
          type="datetime-local"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          style={{
            padding: '8px 12px',
            fontSize: '14px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            color: '#0f172a',
          }}
        />
        {dateFilter && (
          <button
            onClick={() => setDateFilter('')}
            style={{
              padding: '8px 12px',
              fontSize: '14px',
              backgroundColor: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              color: '#0f172a',
              cursor: 'pointer',
            }}
          >
            Clear filter
          </button>
        )}
        <span style={{ fontSize: '14px', color: '#64748b', marginLeft: 'auto' }}>
          Showing {filteredHistory.length} of {history.length} entries
        </span>
      </div>

      <div
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr
                style={{
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                }}
              >
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Timestamp
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Version
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Care State
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Emergency State
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Offline/Online
                </th>
                <th
                  style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748b',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Changed By
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((entry) => (
                <tr
                  key={entry.id}
                  style={{ borderBottom: '1px solid #e2e8f0' }}
                >
                  <td
                    style={{
                      padding: '12px 16px',
                      fontSize: '14px',
                      color: '#0f172a',
                    }}
                  >
                    {new Date(entry.changed_at).toLocaleString()}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontSize: '14px',
                      color: '#0f172a',
                      fontFamily: 'monospace',
                    }}
                  >
                    {entry.state_version}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontSize: '14px',
                      color: '#0f172a',
                      fontWeight: 500,
                    }}
                  >
                    {entry.care_state}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontSize: '14px',
                      color: entry.emergency_state !== 'NONE' ? '#dc2626' : '#0f172a',
                      fontWeight: entry.emergency_state !== 'NONE' ? 600 : 500,
                    }}
                  >
                    {entry.emergency_state}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontSize: '14px',
                      color: '#0f172a',
                      fontWeight: 500,
                    }}
                  >
                    {entry.offline_online_state}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontSize: '14px',
                      color: '#64748b',
                    }}
                  >
                    {entry.changed_by || 'System'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredHistory.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '48px',
            color: '#64748b',
          }}
        >
          No history entries found
        </div>
      )}
    </div>
  )
}
