import { useShowcase } from '../contexts/ShowcaseContext';

const ROLE_OPTIONS = [
  { value: 'AGENCY_ADMIN', label: 'Agency Admin' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'CAREGIVER', label: 'Caregiver' },
  { value: 'SENIOR', label: 'Senior' },
  { value: 'FAMILY_VIEWER', label: 'Family Member' },
];

export function ShowcaseNavPanel() {
  const { currentRole, currentScenario, dataStore, selectedResidentId, setSelectedResident, setRole, logout, goBackToScenarioSelection } = useShowcase();

  if (!dataStore || !currentScenario) return null;

  const residents = dataStore.residents;

  return (
    <div style={{
      position: 'fixed',
      top: '16px',
      right: '16px',
      backgroundColor: '#fff',
      border: '2px solid #3b82f6',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 1000,
      minWidth: '280px',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{
          display: 'inline-block',
          backgroundColor: '#3b82f6',
          color: '#fff',
          padding: '4px 12px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.5px'
        }}>
          SHOWCASE
        </div>
        <button
          onClick={logout}
          style={{
            padding: '6px 12px',
            backgroundColor: '#ef4444',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ marginBottom: '12px' }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#64748b',
          marginBottom: '6px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Viewing As
        </div>
        <select
          value={currentRole || ''}
          onChange={(e) => setRole(e.target.value as any)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #3b82f6',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            color: '#0f172a',
            backgroundColor: '#eff6ff',
            cursor: 'pointer'
          }}
        >
          {ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{
        marginBottom: '12px',
        paddingBottom: '12px',
        borderBottom: '1px solid #e2e8f0'
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 500,
          color: '#64748b',
          marginBottom: '4px'
        }}>
          Scenario
        </div>
        <div style={{
          fontSize: '13px',
          fontWeight: 500,
          color: '#0f172a',
          marginBottom: '8px'
        }}>
          {currentScenario.name}
        </div>
        <button
          onClick={goBackToScenarioSelection}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: '#fff',
            color: '#3b82f6',
            border: '1px solid #3b82f6',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#3b82f6';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#fff';
            e.currentTarget.style.color = '#3b82f6';
          }}
        >
          ← Change Scenario
        </button>
      </div>

      {(currentRole === 'SENIOR' || currentRole === 'FAMILY_VIEWER') && residents.length > 1 && (
        <div style={{ marginTop: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            color: '#64748b',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            View As
          </label>
          <select
            value={selectedResidentId || ''}
            onChange={(e) => setSelectedResident(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#0f172a',
              cursor: 'pointer'
            }}
          >
            {residents.map((resident) => (
              <option key={resident.id} value={resident.id}>
                {resident.full_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={{
        marginTop: '16px',
        padding: '12px',
        backgroundColor: '#fef3c7',
        border: '1px solid #fbbf24',
        borderRadius: '6px',
        fontSize: '11px',
        color: '#92400e',
        lineHeight: '1.4'
      }}>
        <strong>Simulated data.</strong> All actions are in-memory only.
      </div>

      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0' }}>
        <div style={{
          fontSize: '12px',
          fontWeight: 600,
          color: '#64748b',
          marginBottom: '12px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Showcases
        </div>

        <a
          href="#operational-reality"
          style={{
            display: 'block',
            width: '100%',
            padding: '10px',
            backgroundColor: '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            textAlign: 'center',
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'background-color 0.2s',
            marginBottom: '12px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
        >
          🎯 Operational Reality
        </a>

        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          color: '#64748b',
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          Work Packages
        </div>

        <a
          href="#wp1-scenario-execution"
          style={{
            display: 'block',
            width: '100%',
            padding: '8px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            textAlign: 'left',
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'background-color 0.2s',
            marginBottom: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
        >
          WP1: Run a Day Scenario
        </a>

        <a
          href="#wp2-truth-enforced"
          style={{
            display: 'block',
            width: '100%',
            padding: '8px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            textAlign: 'left',
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'background-color 0.2s',
            marginBottom: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
        >
          WP2: Truth-Enforced Tasks
        </a>

        <a
          href="#wp3-brain-intelligence"
          style={{
            display: 'block',
            width: '100%',
            padding: '8px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            textAlign: 'left',
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'background-color 0.2s',
            marginBottom: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
        >
          WP3: Brain Intelligence
        </a>

        <a
          href="#wp4-shadow-ai"
          style={{
            display: 'block',
            width: '100%',
            padding: '8px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            textAlign: 'left',
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'background-color 0.2s',
            marginBottom: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
        >
          WP4: Shadow AI Learning
        </a>

        <a
          href="#wp5-ai-reports"
          style={{
            display: 'block',
            width: '100%',
            padding: '8px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            textAlign: 'left',
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'background-color 0.2s',
            marginBottom: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
        >
          WP5: AI-Generated Reports
        </a>

        <a
          href="#wp6-offline-first"
          style={{
            display: 'block',
            width: '100%',
            padding: '8px',
            backgroundColor: '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            textAlign: 'left',
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'background-color 0.2s',
            marginBottom: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
        >
          WP6: Offline-First Operation
        </a>

        <a
          href="#wp6-acceptance"
          style={{
            display: 'block',
            width: '100%',
            padding: '8px',
            backgroundColor: '#f59e0b',
            color: '#fff',
            border: '2px solid #d97706',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            textAlign: 'left',
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'background-color 0.2s',
            marginBottom: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d97706'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f59e0b'}
        >
          ⚠️ WP6: ACCEPTANCE TEST
        </a>

        <a
          href="#wp7-background-jobs"
          style={{
            display: 'block',
            width: '100%',
            padding: '8px',
            backgroundColor: '#7c3aed',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            textAlign: 'left',
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'background-color 0.2s',
            marginBottom: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#6d28d9'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#7c3aed'}
        >
          WP7: Background Jobs & Automation
        </a>

        <a
          href="#wp7-acceptance"
          style={{
            display: 'block',
            width: '100%',
            padding: '8px',
            backgroundColor: '#f59e0b',
            color: '#fff',
            border: '2px solid #d97706',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            textAlign: 'left',
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'background-color 0.2s',
            marginBottom: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d97706'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f59e0b'}
        >
          ⚠️ WP7: ACCEPTANCE TEST
        </a>

        <a
          href="#wp8-acceptance"
          style={{
            display: 'block',
            width: '100%',
            padding: '8px',
            backgroundColor: '#f59e0b',
            color: '#fff',
            border: '2px solid #d97706',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 700,
            textAlign: 'left',
            cursor: 'pointer',
            textDecoration: 'none',
            transition: 'background-color 0.2s',
            marginBottom: '4px'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d97706'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f59e0b'}
        >
          ⚠️ WP8: EXTERNAL INTEGRATIONS
        </a>
      </div>
    </div>
  );
}
