import { useVersionConflictHandler } from '../hooks/useVersionConflictHandler';

export function VersionConflictNotice() {
  const { activeConflict, conflicts, clearActiveConflict, getUnresolvedConflicts } = useVersionConflictHandler();

  const unresolvedConflicts = getUnresolvedConflicts();

  if (!activeConflict && unresolvedConflicts.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      right: '24px',
      maxWidth: '400px',
      backgroundColor: '#fff3e0',
      border: '2px solid #f57c00',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      zIndex: 1000
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
        <div style={{ fontSize: '16px', fontWeight: '600', color: '#e65100' }}>
          Version Conflict Detected
        </div>
        {activeConflict && (
          <button
            onClick={clearActiveConflict}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '18px',
              color: '#e65100',
              cursor: 'pointer',
              padding: '0',
              marginLeft: '8px'
            }}
          >
            ×
          </button>
        )}
      </div>

      {activeConflict && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            <strong>Operation:</strong> {activeConflict.operation}
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
            <strong>Expected Version:</strong> {activeConflict.expectedVersion}
            <br />
            <strong>Actual Version:</strong> {activeConflict.actualVersion}
          </div>
          <div style={{ fontSize: '14px', color: '#666' }}>
            <strong>Time:</strong> {new Date(activeConflict.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}

      <div style={{
        padding: '12px',
        backgroundColor: '#fff',
        borderRadius: '4px',
        fontSize: '14px',
        color: '#333',
        marginTop: '12px'
      }}>
        The state was modified by another user or process. Please refresh and try again.
      </div>

      {unresolvedConflicts.length > 1 && (
        <div style={{
          marginTop: '12px',
          fontSize: '12px',
          color: '#666'
        }}>
          {unresolvedConflicts.length - 1} other unresolved conflict(s)
        </div>
      )}
    </div>
  );
}
