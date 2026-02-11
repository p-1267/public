import { ConflictRecord } from '../services/offlineIndexedDB';

interface ConflictResolutionModalProps {
  conflict: ConflictRecord;
  onResolve: (conflictId: string, resolution: 'local' | 'server' | 'merged') => void;
  onClose: () => void;
}

export function ConflictResolutionModal({ conflict, onResolve, onClose }: ConflictResolutionModalProps) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '12px',
        padding: '24px',
        maxWidth: '600px',
        width: '90%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: '#fef3c7',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '16px'
          }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
          </div>
          <div>
            <h3 style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: '#0f172a'
            }}>
              Sync Conflict Detected
            </h3>
            <div style={{
              fontSize: '13px',
              color: '#64748b',
              marginTop: '4px'
            }}>
              Data was modified both locally and on server
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#f1f5f9',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <div style={{
            fontSize: '12px',
            fontWeight: 600,
            color: '#64748b',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Conflict Details
          </div>
          <div style={{ fontSize: '13px', color: '#475569' }}>
            Operation ID: {conflict.operationId}
          </div>
          <div style={{ fontSize: '13px', color: '#475569' }}>
            Detected: {new Date(conflict.timestamp).toLocaleString()}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '24px'
        }}>
          <div style={{
            border: '2px solid #3b82f6',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#3b82f6',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{ marginRight: '8px' }}>📱</span>
              Your Local Changes
            </div>
            <pre style={{
              fontSize: '12px',
              color: '#334155',
              backgroundColor: '#f8fafc',
              padding: '12px',
              borderRadius: '6px',
              overflow: 'auto',
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {JSON.stringify(conflict.localVersion, null, 2)}
            </pre>
          </div>

          <div style={{
            border: '2px solid #f59e0b',
            borderRadius: '8px',
            padding: '16px'
          }}>
            <div style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#f59e0b',
              marginBottom: '12px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <span style={{ marginRight: '8px' }}>☁️</span>
              Server Version
            </div>
            <pre style={{
              fontSize: '12px',
              color: '#334155',
              backgroundColor: '#f8fafc',
              padding: '12px',
              borderRadius: '6px',
              overflow: 'auto',
              margin: 0,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word'
            }}>
              {JSON.stringify(conflict.serverVersion, null, 2)}
            </pre>
          </div>
        </div>

        <div style={{
          backgroundColor: '#fef3c7',
          border: '1px solid #fbbf24',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#92400e',
            marginBottom: '6px'
          }}>
            Choose Resolution Strategy
          </div>
          <div style={{
            fontSize: '12px',
            color: '#92400e',
            lineHeight: '1.5'
          }}>
            Select which version to keep. This action cannot be undone.
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          marginBottom: '12px'
        }}>
          <button
            onClick={() => onResolve(conflict.id, 'local')}
            style={{
              padding: '12px',
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
          >
            Keep Local Changes
          </button>

          <button
            onClick={() => onResolve(conflict.id, 'server')}
            style={{
              padding: '12px',
              backgroundColor: '#f59e0b',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d97706'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f59e0b'}
          >
            Keep Server Version
          </button>
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '10px',
            backgroundColor: '#e2e8f0',
            color: '#475569',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Decide Later
        </button>
      </div>
    </div>
  );
}
