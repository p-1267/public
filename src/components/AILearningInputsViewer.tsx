import { useState } from 'react'
import { useAILearningInputs } from '../hooks/useAILearningInputs'

const cellStyle: React.CSSProperties = {
  padding: '12px 8px',
  fontSize: '13px',
  color: '#334155',
  borderBottom: '1px solid #f1f5f9',
  verticalAlign: 'top',
}

const headerStyle: React.CSSProperties = {
  padding: '12px 8px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid #e2e8f0',
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '-'
  return new Date(dateString).toLocaleString()
}

function formatJson(value: Record<string, unknown>): string {
  return JSON.stringify(value)
}

export function AILearningInputsViewer() {
  const { inputs, isLoading, error, acknowledgeInput } = useAILearningInputs()
  const [acknowledging, setAcknowledging] = useState<string | null>(null)
  const [ackError, setAckError] = useState<string | null>(null)

  const handleMarkReviewed = async (inputId: string) => {
    setAcknowledging(inputId)
    setAckError(null)

    const result = await acknowledgeInput(inputId)

    if (!result.success) {
      setAckError(result.error ?? 'Failed to mark as reviewed')
    }
    setAcknowledging(null)
  }

  if (isLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
        Loading AI inputs...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        padding: '16px',
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        color: '#dc2626',
      }}>
        Error loading AI inputs: {error}
      </div>
    )
  }

  const pendingCount = inputs.filter(i => !i.acknowledged).length

  return (
    <div style={{
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#f8fafc',
      }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#0f172a' }}>
          AI Learning Inputs
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
          {inputs.length} total, {pendingCount} pending review
        </p>
        <p style={{ margin: '8px 0 0 0', fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
          Note: Marking as reviewed confirms human review only. It does not approve, accept, or execute any suggestions.
        </p>
      </div>

      {ackError && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fef2f2',
          borderBottom: '1px solid #fecaca',
          color: '#dc2626',
          fontSize: '13px',
        }}>
          {ackError}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={headerStyle}>Type</th>
              <th style={headerStyle}>Data</th>
              <th style={headerStyle}>Source User</th>
              <th style={headerStyle}>Status</th>
              <th style={headerStyle}>Reviewed By</th>
              <th style={headerStyle}>Reviewed At</th>
              <th style={headerStyle}>Created</th>
              <th style={headerStyle}>Action</th>
            </tr>
          </thead>
          <tbody>
            {inputs.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ ...cellStyle, textAlign: 'center', color: '#94a3b8' }}>
                  No AI learning inputs
                </td>
              </tr>
            ) : (
              inputs.map((input) => (
                <tr key={input.id}>
                  <td style={cellStyle}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      backgroundColor: '#dbeafe',
                      color: '#1e40af',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 500,
                    }}>
                      {input.input_type}
                    </span>
                  </td>
                  <td style={{
                    ...cellStyle,
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    maxWidth: '250px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }} title={formatJson(input.input_data)}>
                    {formatJson(input.input_data)}
                  </td>
                  <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: '11px' }}>
                    {input.source_user_id ?? '-'}
                  </td>
                  <td style={cellStyle}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      backgroundColor: input.acknowledged ? '#dcfce7' : '#fef3c7',
                      color: input.acknowledged ? '#166534' : '#92400e',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 500,
                    }}>
                      {input.acknowledged ? 'Reviewed' : 'Pending'}
                    </span>
                  </td>
                  <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: '11px' }}>
                    {input.acknowledged_by_user_id ?? '-'}
                  </td>
                  <td style={cellStyle}>{formatDate(input.acknowledged_at)}</td>
                  <td style={cellStyle}>{formatDate(input.created_at)}</td>
                  <td style={cellStyle}>
                    {!input.acknowledged && (
                      <button
                        onClick={() => handleMarkReviewed(input.id)}
                        disabled={acknowledging === input.id}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 500,
                          backgroundColor: acknowledging === input.id ? '#e2e8f0' : '#0f172a',
                          color: acknowledging === input.id ? '#64748b' : '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: acknowledging === input.id ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {acknowledging === input.id ? 'Marking...' : 'Mark Reviewed'}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
