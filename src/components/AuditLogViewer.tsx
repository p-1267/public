import { useAuditLog } from '../hooks/useAuditLog'

type SortColumn = 'created_at' | 'action_type' | 'target_type' | 'brain_state_version'

const columnHeaderStyle: React.CSSProperties = {
  padding: '12px 8px',
  textAlign: 'left',
  fontSize: '12px',
  fontWeight: 600,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  borderBottom: '1px solid #e2e8f0',
  cursor: 'pointer',
  userSelect: 'none',
}

const cellStyle: React.CSSProperties = {
  padding: '12px 8px',
  fontSize: '13px',
  color: '#334155',
  borderBottom: '1px solid #f1f5f9',
  verticalAlign: 'top',
}

const jsonCellStyle: React.CSSProperties = {
  ...cellStyle,
  fontFamily: 'monospace',
  fontSize: '11px',
  maxWidth: '200px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

function formatJson(value: Record<string, unknown> | null): string {
  if (!value) return '-'
  return JSON.stringify(value)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString()
}

export function AuditLogViewer() {
  const { entries, isLoading, error, sortColumn, sortDirection, setSort } = useAuditLog()

  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSort(column, sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSort(column, 'desc')
    }
  }

  const getSortIndicator = (column: SortColumn) => {
    if (column !== sortColumn) return ''
    return sortDirection === 'asc' ? ' \u2191' : ' \u2193'
  }

  if (isLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
        Loading audit log...
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
        Error loading audit log: {error}
      </div>
    )
  }

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
          Audit Log
        </h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
          Read-only view of all system events ({entries.length} entries)
        </p>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={columnHeaderStyle} onClick={() => handleSort('created_at')}>
                Timestamp{getSortIndicator('created_at')}
              </th>
              <th style={columnHeaderStyle} onClick={() => handleSort('action_type')}>
                Action{getSortIndicator('action_type')}
              </th>
              <th style={columnHeaderStyle}>Actor ID</th>
              <th style={columnHeaderStyle} onClick={() => handleSort('target_type')}>
                Target Type{getSortIndicator('target_type')}
              </th>
              <th style={columnHeaderStyle}>Target ID</th>
              <th style={columnHeaderStyle}>Previous State</th>
              <th style={columnHeaderStyle}>New State</th>
              <th style={columnHeaderStyle} onClick={() => handleSort('brain_state_version')}>
                Version{getSortIndicator('brain_state_version')}
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ ...cellStyle, textAlign: 'center', color: '#94a3b8' }}>
                  No audit entries
                </td>
              </tr>
            ) : (
              entries.map((entry) => (
                <tr key={entry.id}>
                  <td style={cellStyle}>{formatDate(entry.created_at)}</td>
                  <td style={cellStyle}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      backgroundColor: '#f1f5f9',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 500,
                    }}>
                      {entry.action_type}
                    </span>
                  </td>
                  <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: '11px' }}>
                    {entry.actor_id ?? '-'}
                  </td>
                  <td style={cellStyle}>{entry.target_type ?? '-'}</td>
                  <td style={{ ...cellStyle, fontFamily: 'monospace', fontSize: '11px' }}>
                    {entry.target_id ?? '-'}
                  </td>
                  <td style={jsonCellStyle} title={formatJson(entry.previous_state)}>
                    {formatJson(entry.previous_state)}
                  </td>
                  <td style={jsonCellStyle} title={formatJson(entry.new_state)}>
                    {formatJson(entry.new_state)}
                  </td>
                  <td style={cellStyle}>{entry.brain_state_version ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
