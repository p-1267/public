import { useState } from 'react';

interface Level4ActivePanelProps {
  showToggle?: boolean;
}

export function Level4ActivePanel({ showToggle = true }: Level4ActivePanelProps) {
  const [enabled, setEnabled] = useState(true);

  if (!enabled && showToggle) {
    return (
      <div className="bg-gray-200 border-2 border-gray-400 rounded-lg p-4 flex items-center justify-between">
        <div className="text-gray-700 font-bold">Level 4 Predictive Intelligence (Disabled)</div>
        <button
          onClick={() => setEnabled(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700"
        >
          ENABLE LEVEL 4 SIMULATION
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 text-white rounded-lg p-6 border-4 border-blue-500">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-3xl font-bold mb-1 flex items-center gap-3">
            <span className="text-4xl">🧠</span>
            LEVEL 4: PREDICTIVE INTELLIGENCE
          </div>
          <div className="text-lg opacity-90">Risk Forecasting & Scenario Modeling</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-green-600 px-4 py-2 rounded-lg border-2 border-green-400 font-bold flex items-center gap-2">
            <span className="text-xl">✓</span>
            <span>ACTIVE</span>
          </div>
          <div className="bg-red-600 px-4 py-2 rounded-lg border-2 border-red-400 font-bold">
            SHOWCASE SIMULATION
          </div>
        </div>
      </div>

      {showToggle && (
        <div className="bg-blue-800/50 rounded-lg p-3 mb-4 border-2 border-blue-400 flex items-center justify-between">
          <div className="text-sm font-bold">LEVEL 4 SIMULATION MODE</div>
          <button
            onClick={() => setEnabled(false)}
            className="bg-red-600 text-white px-3 py-1 rounded-lg font-bold hover:bg-red-700 text-sm"
          >
            DISABLE
          </button>
        </div>
      )}

      <div className="bg-blue-800/50 rounded-lg p-4 mb-4 border-2 border-blue-400">
        <div className="text-sm font-bold mb-2">STATUS: ACTIVE (SIMULATION / DEMONSTRATION MODE)</div>
        <div className="text-sm opacity-90">
          Level 4 is demonstrating predictive capabilities using synthetic data.
        </div>
        <div className="mt-2 bg-red-900/50 rounded p-2 text-xs font-bold border border-red-400">
          NO EXECUTION | NO AUTONOMY | HUMAN CONFIRMATION REQUIRED FOR ALL ACTIONS
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/10 rounded-lg p-4 border-2 border-white/20">
          <div className="text-2xl mb-1">🔮</div>
          <div className="text-sm font-bold mb-1">Early Warning Signals</div>
          <div className="text-3xl font-bold mb-2">7</div>
          <div className="text-xs opacity-75">Predicted before clinical onset</div>
        </div>

        <div className="bg-white/10 rounded-lg p-4 border-2 border-white/20">
          <div className="text-2xl mb-1">📊</div>
          <div className="text-sm font-bold mb-1">Risk Projections</div>
          <div className="text-3xl font-bold mb-2">12</div>
          <div className="text-xs opacity-75">Active scenario models running</div>
        </div>

        <div className="bg-white/10 rounded-lg p-4 border-2 border-white/20">
          <div className="text-2xl mb-1">⏰</div>
          <div className="text-sm font-bold mb-1">Forecast Horizon</div>
          <div className="text-3xl font-bold mb-2">72h</div>
          <div className="text-xs opacity-75">Prediction window</div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-red-900/50 border-2 border-red-500 rounded-lg p-4">
          <div className="flex items-start gap-3 mb-2">
            <div className="text-2xl">⚠️</div>
            <div className="flex-grow">
              <div className="font-bold text-lg mb-1">HIGH-RISK FORECAST: Fall Event</div>
              <div className="text-sm opacity-90 mb-2">
                Resident Linda Johnson (Room 412) — <span className="font-bold">78% probability within 48 hours</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <div className="font-bold mb-1">Contributing Factors:</div>
                  <ul className="space-y-1 opacity-90">
                    <li>• Mobility score declining (5→3→2 over 3 days)</li>
                    <li>• Confusion increasing (alertness 5→2)</li>
                    <li>• Fall risk assessment overdue 24 hours</li>
                    <li>• Historical pattern: 2 falls in past 90 days</li>
                  </ul>
                </div>
                <div>
                  <div className="font-bold mb-1">Confidence Ranges:</div>
                  <ul className="space-y-1 opacity-90">
                    <li>• Base rate: 78% (±12%)</li>
                    <li>• If assessment completed: 45% (±15%)</li>
                    <li>• If mobility aids added: 32% (±18%)</li>
                    <li>• If bed alarm installed: 28% (±20%)</li>
                  </ul>
                </div>
              </div>
              <div className="mt-3 bg-red-800/50 rounded px-3 py-2 text-xs font-bold border border-red-400">
                <div className="mb-1">EVIDENCE LINKS:</div>
                <ul className="space-y-1 opacity-90">
                  <li>• Mobility decline: 3-day trend data (source: vital signs log)</li>
                  <li>• Overdue assessment: task management system</li>
                  <li>• Fall history: incident reports (2024-10-15, 2024-11-22)</li>
                </ul>
              </div>
              <div className="mt-2 bg-red-800/50 rounded px-3 py-2 text-xs font-bold border border-red-400">
                LEVEL 4 CANNOT DETERMINE: Exact timing of fall event. Clinical judgment required for intervention timing.
              </div>
            </div>
          </div>
        </div>

        <div className="bg-orange-900/50 border-2 border-orange-500 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">📉</div>
            <div className="flex-grow">
              <div className="font-bold text-lg mb-1">DETERIORATION FORECAST: Respiratory Decline</div>
              <div className="text-sm opacity-90 mb-2">
                Resident Michael Lewis (Room 221) — <span className="font-bold">65% probability of hospitalization within 72 hours</span>
              </div>
              <div className="text-xs opacity-90 mb-2">
                <div className="font-bold mb-1">Pattern Detection:</div>
                O2 saturation declining (94%→91%→88%), respiratory rate increasing, food intake down 30% in 3 days.
                Historical: COPD exacerbation every 4-6 months. Last: 4 months ago.
              </div>
              <div className="mt-2 bg-orange-800/50 rounded px-3 py-2 text-xs font-bold border border-orange-400">
                <div className="mb-1">EVIDENCE LINKS:</div>
                <ul className="space-y-1 opacity-90">
                  <li>• O2 saturation trend: vital signs monitoring (Jan 4-6)</li>
                  <li>• Food intake decline: nutrition logs</li>
                  <li>• COPD history: medical records</li>
                </ul>
              </div>
              <div className="mt-2 bg-orange-800/50 rounded px-3 py-2 text-xs font-bold border border-orange-400">
                LEVEL 4 RECOMMENDED ACTION (NO EXECUTION): Increase monitoring to q2h. Physician notification within 12 hours if trend continues.
              </div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-900/50 border-2 border-yellow-500 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl">⚖️</div>
            <div className="flex-grow">
              <div className="font-bold text-lg mb-1">WORKFLOW IMPACT PROJECTION: Medication Cascade</div>
              <div className="text-sm opacity-90 mb-2">
                Current late medication pattern (Maria Rodriguez) → <span className="font-bold">Projected impact on 3 additional residents within 48 hours</span>
              </div>
              <div className="text-xs opacity-90 mb-2">
                Model predicts: If morning medication timing not corrected, staffing bottleneck will affect residents in rooms 204, 207, 210, 225 during 9:00-9:30 window.
                Confidence: 72% (±15%)
              </div>
              <div className="mt-2 bg-yellow-800/50 rounded px-3 py-2 text-xs font-bold border border-yellow-400">
                <div className="mb-1">EVIDENCE LINKS:</div>
                <ul className="space-y-1 opacity-90">
                  <li>• Medication timing pattern: 4 delays in 6 days (medication administration log)</li>
                  <li>• Staffing schedule: nurse-to-resident ratios (morning shift)</li>
                  <li>• Historical workflow data: similar patterns in Nov 2025</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 bg-black/30 rounded-lg p-4 border-2 border-blue-400">
        <div className="text-sm font-bold mb-3">WHY LEVEL 4 IS RESTRICTED IN PRODUCTION:</div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div>
            <div className="font-bold mb-1 text-red-300">Regulatory Constraints:</div>
            <ul className="space-y-1 opacity-90">
              <li>• Predictive models not approved for autonomous clinical decisions</li>
              <li>• Requires physician oversight for implementation</li>
              <li>• State regulations require human confirmation of all predictions</li>
              <li>• Medical device classification pending if implemented</li>
            </ul>
          </div>
          <div>
            <div className="font-bold mb-1 text-red-300">Safety & Accountability:</div>
            <ul className="space-y-1 opacity-90">
              <li>• False positive rate must be below 5% (current: 12%)</li>
              <li>• Liability framework undefined for prediction-based actions</li>
              <li>• Model explainability requirements not yet met</li>
              <li>• Human-in-the-loop mandatory for all predicted interventions</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4 bg-blue-700/50 rounded-lg p-4 border-2 border-blue-300">
        <div className="text-sm font-bold mb-2">LEVEL 4 CAPABILITIES (DEMONSTRATED IN SHOWCASE):</div>
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <div className="font-bold mb-1">Risk Forecasting:</div>
            <ul className="space-y-1 opacity-90">
              <li>• Fall probability modeling</li>
              <li>• Infection onset prediction</li>
              <li>• Hospitalization risk scoring</li>
              <li>• Deterioration trajectory analysis</li>
            </ul>
          </div>
          <div>
            <div className="font-bold mb-1">Pattern Recognition:</div>
            <ul className="space-y-1 opacity-90">
              <li>• Multi-resident trend correlation</li>
              <li>• Workflow bottleneck prediction</li>
              <li>• Staffing adequacy forecasting</li>
              <li>• Medication cascade effects</li>
            </ul>
          </div>
          <div>
            <div className="font-bold mb-1">Scenario Modeling:</div>
            <ul className="space-y-1 opacity-90">
              <li>• "What if" intervention testing</li>
              <li>• Resource allocation optimization</li>
              <li>• Confidence range calculation</li>
              <li>• Impact projection with evidence links</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center text-sm opacity-75 bg-blue-800/30 rounded p-3 border border-blue-500">
        Level 4 intelligence is demonstrating predictive capabilities using simulated data in a controlled showcase environment.
        All forecasts include evidence links to source data. Production deployment requires regulatory approval, enhanced model validation, and liability framework establishment.
      </div>
    </div>
  );
}
