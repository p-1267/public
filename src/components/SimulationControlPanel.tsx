import { useState } from 'react';
import { simulationEngine, SimulationResult } from '../services/simulationEngine';

export function SimulationControlPanel() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<SimulationResult[]>([]);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  const runScenario = async (
    name: string,
    runner: () => Promise<SimulationResult>
  ) => {
    setRunning(true);
    setActiveScenario(name);
    setResults([]);

    try {
      const result = await runner();
      setResults([result]);
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setRunning(false);
      setActiveScenario(null);
    }
  };

  const runAllScenarios = async () => {
    setRunning(true);
    setActiveScenario('All Scenarios');
    setResults([]);

    try {
      const allResults = await simulationEngine.runAllScenarios();
      setResults(allResults);
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setRunning(false);
      setActiveScenario(null);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
          Simulation Control Panel
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '16px' }}>
          Trigger real care events that flow through actual backend workflows. No demo logic - these create real database records, trigger real notifications, and activate real intelligence signals.
        </p>
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fef3c7',
          borderLeft: '4px solid #f59e0b',
          borderRadius: '4px',
          fontSize: '13px',
          color: '#92400e'
        }}>
          <strong>Production Simulation:</strong> All scenarios write to real tables, trigger real RPCs, and generate real audit logs. This is NOT mock data.
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <ScenarioCard
          title="Medication → Timeline → Notification"
          description="Records medication administration, updates senior timeline, queues family notification"
          flow={['Database Insert', 'Audit Log Entry', 'Notification Queue', 'Family Alert']}
          onRun={() => runScenario('Medication', () => simulationEngine.runMedicationScenario())}
          disabled={running}
          color="#10b981"
        />

        <ScenarioCard
          title="Abnormal Vitals → Risk → Alert"
          description="Records vitals outside normal range, generates intelligence signal, sends caregiver alert"
          flow={['Vitals Recorded', 'Risk Detection', 'Signal Created', 'Caregiver Alert']}
          onRun={() => runScenario('Vitals', () => simulationEngine.runAbnormalVitalsScenario())}
          disabled={running}
          color="#ef4444"
        />

        <ScenarioCard
          title="Task Difficulty → AI Feedback"
          description="Marks task as difficult, records AI learning input, generates pattern analysis signal"
          flow={['Task Status Update', 'Learning Input', 'Pattern Analysis', 'Supervisor Signal']}
          onRun={() => runScenario('Task', () => simulationEngine.runTaskDifficultyScenario())}
          disabled={running}
          color="#8b5cf6"
        />

        <ScenarioCard
          title="Incident → Supervisor Visibility"
          description="Logs incident in audit trail, creates supervisor alert signal, queues notification"
          flow={['Audit Log Entry', 'Intelligence Signal', 'Supervisor Alert', 'Review Required']}
          onRun={() => runScenario('Incident', () => simulationEngine.runIncidentScenario())}
          disabled={running}
          color="#f59e0b"
        />
      </div>

      <div style={{ marginBottom: '32px', textAlign: 'center' }}>
        <button
          onClick={runAllScenarios}
          disabled={running}
          style={{
            padding: '14px 32px',
            backgroundColor: running ? '#94a3b8' : '#3b82f6',
            color: '#ffffff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: running ? 'not-allowed' : 'pointer',
            boxShadow: running ? 'none' : '0 2px 8px rgba(59, 130, 246, 0.3)'
          }}
        >
          {running ? `Running ${activeScenario}...` : 'Run All Scenarios'}
        </button>
      </div>

      {results.length > 0 && (
        <div style={{ marginTop: '32px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '16px' }}>
            Simulation Results
          </h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            {results.map((result, index) => (
              <ResultCard key={index} result={result} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface ScenarioCardProps {
  title: string;
  description: string;
  flow: string[];
  onRun: () => void;
  disabled: boolean;
  color: string;
}

function ScenarioCard({ title, description, flow, onRun, disabled, color }: ScenarioCardProps) {
  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#ffffff',
      borderRadius: '12px',
      border: '2px solid #e2e8f0',
      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        marginBottom: '12px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: color
        }} />
        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
          {title}
        </h3>
      </div>

      <p style={{
        fontSize: '13px',
        color: '#64748b',
        marginBottom: '16px',
        lineHeight: '1.5'
      }}>
        {description}
      </p>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        marginBottom: '16px',
        padding: '12px',
        backgroundColor: '#f8fafc',
        borderRadius: '6px'
      }}>
        {flow.map((step, index) => (
          <div key={index} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '12px',
            color: '#475569'
          }}>
            <span style={{ color: color, fontWeight: '600' }}>{index + 1}.</span>
            {step}
          </div>
        ))}
      </div>

      <button
        onClick={onRun}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: disabled ? '#e2e8f0' : color,
          color: '#ffffff',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s'
        }}
      >
        {disabled ? 'Running...' : 'Run Scenario'}
      </button>
    </div>
  );
}

interface ResultCardProps {
  result: SimulationResult;
}

function ResultCard({ result }: ResultCardProps) {
  const statusColor = result.success ? '#10b981' : '#ef4444';
  const statusBg = result.success ? '#d1fae5' : '#fee2e2';

  return (
    <div style={{
      padding: '20px',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '2px solid #e2e8f0'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>
          {result.scenario}
        </h3>
        <div style={{
          padding: '4px 12px',
          backgroundColor: statusBg,
          color: statusColor,
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          {result.success ? 'SUCCESS' : 'FAILED'}
        </div>
      </div>

      {result.events.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px', color: '#475569' }}>
            Events:
          </div>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            fontSize: '13px',
            color: '#64748b'
          }}>
            {result.events.map((event, index) => (
              <div key={index} style={{ paddingLeft: '8px' }}>
                {event}
              </div>
            ))}
          </div>
        </div>
      )}

      {Object.keys(result.entityIds).length > 0 && (
        <div style={{
          padding: '12px',
          backgroundColor: '#f8fafc',
          borderRadius: '6px',
          fontSize: '12px'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '8px', color: '#475569' }}>
            Entity IDs (Database Records):
          </div>
          {Object.entries(result.entityIds).map(([key, value]) => (
            <div key={key} style={{ color: '#64748b', fontFamily: 'monospace' }}>
              <strong>{key}:</strong> {value}
            </div>
          ))}
        </div>
      )}

      {result.errors && result.errors.length > 0 && (
        <div style={{
          marginTop: '12px',
          padding: '12px',
          backgroundColor: '#fee2e2',
          borderRadius: '6px',
          fontSize: '12px',
          color: '#dc2626'
        }}>
          <strong>Errors:</strong>
          {result.errors.map((error, index) => (
            <div key={index}>{error}</div>
          ))}
        </div>
      )}
    </div>
  );
}
