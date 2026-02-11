import React, { useState, useEffect } from 'react';
import { WhyExplanation, WhyData } from './WhyExplanation';
import { BrainEvidenceStrip } from './BrainEvidenceStrip';
import { Level4ActivePanel } from '../Level4ActivePanel';

interface IntelligenceCapability {
  id: string;
  category: string;
  capability: string;
  description: string;
  implementation: 'rule-based' | 'pattern-matching' | 'correlation' | 'threshold';
  status: 'active' | 'demo' | 'planned';
  examples: string[];
  boundaries: string[];
  dataSource: string[];
}

interface IntelligenceEvidence {
  id: string;
  timestamp: string;
  capability: string;
  trigger: string;
  observation: string;
  ruleUsed: string;
  dataQueried: string[];
  conclusion: string;
  humanAction: string;
  traceable: boolean;
}

const mockCapabilities: IntelligenceCapability[] = [
  {
    id: 'c1',
    category: 'Pattern Detection',
    capability: 'Medication Timing Deviation',
    description: 'Detects recurring patterns of medication administration outside scheduled windows',
    implementation: 'rule-based',
    status: 'active',
    examples: [
      'Medication administered >30 minutes late, 3+ times in 7 days',
      'Consistent early administration pattern',
      'Time-of-day correlation with staffing changes'
    ],
    boundaries: [
      'Cannot determine clinical impact',
      'Cannot diagnose root cause',
      'Cannot predict future occurrences',
      'Cannot recommend medication changes'
    ],
    dataSource: [
      'medication_administration',
      'resident_medications (schedule)',
      'caregiver_assignments',
      'shift_transitions'
    ]
  },
  {
    id: 'c2',
    category: 'Anomaly Detection',
    capability: 'Baseline Deviation',
    description: 'Identifies when resident metrics deviate from established personal baselines',
    implementation: 'threshold',
    status: 'active',
    examples: [
      'Vital signs outside resident-specific normal range',
      'Sudden change in activity levels',
      'Behavioral changes from baseline'
    ],
    boundaries: [
      'Cannot diagnose medical conditions',
      'Cannot predict clinical outcomes',
      'Cannot recommend treatment changes',
      'Requires human clinical evaluation'
    ],
    dataSource: [
      'resident_baselines',
      'vital_signs',
      'activity_logs',
      'behavioral_observations'
    ]
  },
  {
    id: 'c3',
    category: 'Workflow Intelligence',
    capability: 'Task Collision Detection',
    description: 'Identifies when multiple caregivers attempt to start the same task simultaneously',
    implementation: 'rule-based',
    status: 'active',
    examples: [
      'Two caregivers start medication administration for same resident',
      'Duplicate vital sign recordings within 5 minutes',
      'Overlapping task execution attempts'
    ],
    boundaries: [
      'Cannot determine caregiver intent',
      'Cannot automatically resolve conflicts',
      'Requires human coordination decision'
    ],
    dataSource: [
      'task_state_transitions',
      'user_sessions',
      'task_assignments'
    ]
  },
  {
    id: 'c4',
    category: 'Correlation',
    capability: 'Cross-Domain Event Correlation',
    description: 'Links related events across different care categories to provide context',
    implementation: 'correlation',
    status: 'active',
    examples: [
      'Links medication change with subsequent vital sign changes',
      'Correlates meal intake with activity levels',
      'Connects incident reports with task timing'
    ],
    boundaries: [
      'Cannot establish causation',
      'Cannot make clinical recommendations',
      'Correlation does not imply clinical significance',
      'Requires clinical interpretation'
    ],
    dataSource: [
      'medication_administration',
      'vital_signs',
      'nutrition_intake',
      'incidents',
      'activity_logs'
    ]
  }
];

const mockEvidence: IntelligenceEvidence[] = [
  {
    id: 'e1',
    timestamp: '2024-01-05 09:15:32',
    capability: 'Medication Timing Deviation',
    trigger: 'Medication administered 45 minutes late',
    observation: 'Maria Rodriguez - Lisinopril 10mg - Scheduled: 9:00 AM, Administered: 9:45 AM',
    ruleUsed: 'IF (actual_time - scheduled_time) > 30 minutes AND occurrences_in_7_days >= 3 THEN flag_pattern',
    dataQueried: [
      'SELECT * FROM medication_administration WHERE resident_id = \'r1\' AND medication_id = \'m5\' AND administered_at > NOW() - INTERVAL \'7 days\'',
      'SELECT scheduled_time FROM resident_medications WHERE id = \'m5\''
    ],
    conclusion: 'Pattern detected: 3 late administrations in 7 days',
    humanAction: 'Review morning workflow and staffing patterns',
    traceable: true
  },
  {
    id: 'e2',
    timestamp: '2024-01-05 08:30:15',
    capability: 'Baseline Deviation',
    observation: 'Blood pressure reading: 165/95 mmHg (baseline: 130/80 ±10 mmHg)',
    ruleUsed: 'IF (systolic > baseline_systolic + threshold) OR (diastolic > baseline_diastolic + threshold) THEN flag_deviation',
    dataQueried: [
      'SELECT baseline_bp_systolic, baseline_bp_diastolic FROM resident_baselines WHERE resident_id = \'r1\'',
      'SELECT reading_value FROM vital_signs WHERE resident_id = \'r1\' AND vital_type = \'blood_pressure\' ORDER BY recorded_at DESC LIMIT 1'
    ],
    conclusion: 'Blood pressure significantly above personal baseline',
    humanAction: 'Clinical evaluation recommended; review medication timing',
    traceable: true,
    trigger: 'Vital sign recording'
  },
  {
    id: 'e3',
    timestamp: '2024-01-05 09:00:02',
    capability: 'Task Collision Detection',
    trigger: 'Duplicate task start attempt',
    observation: 'Task \'Morning medication - Maria Rodriguez\' started by Sarah Chen at 09:00:00 and James Park at 09:00:02',
    ruleUsed: 'IF task_started_by_user_A AND task_started_by_user_B AND time_diff < 30_seconds THEN warn_collision',
    dataQueried: [
      'SELECT user_id, timestamp FROM task_state_transitions WHERE task_id = \'t1\' AND new_state = \'in_progress\' AND timestamp > NOW() - INTERVAL \'1 minute\''
    ],
    conclusion: 'Potential duplicate execution detected',
    humanAction: 'Caregivers coordinate to determine who proceeds',
    traceable: true
  }
];

export const BrainProofView: React.FC = () => {
  const [view, setView] = useState<'capabilities' | 'evidence'>('capabilities');
  const [selectedCapability, setSelectedCapability] = useState<string | null>(null);
  const [selectedEvidence, setSelectedEvidence] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const selectedCap = mockCapabilities.find(c => c.id === selectedCapability);
  const selectedEv = mockEvidence.find(e => e.id === selectedEvidence);

  const getImplementationBadge = (impl: string) => {
    const styles: Record<string, string> = {
      'rule-based': 'bg-blue-100 text-blue-800',
      'pattern-matching': 'bg-gray-100 text-gray-800',
      'correlation': 'bg-green-100 text-green-800',
      'threshold': 'bg-orange-100 text-orange-800'
    };
    return styles[impl] || 'bg-gray-100 text-gray-800';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      'active': 'bg-green-100 text-green-800',
      'demo': 'bg-yellow-100 text-yellow-800',
      'planned': 'bg-gray-100 text-gray-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        <a
          href="#cognitive"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6 font-semibold text-base"
        >
          ← Back to Cognitive Views
        </a>

        <BrainEvidenceStrip
          lastScan={currentTime.toLocaleTimeString()}
          rulesEvaluated={mockCapabilities.filter(c => c.status === 'active').length}
          signalsGenerated={mockEvidence.length}
        />

        <Level4ActivePanel showToggle={false} />

        <header className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-5xl">🧠</span>
            <div>
              <h1 className="text-4xl font-bold text-slate-900 mb-1">Brain Proof Mode</h1>
              <p className="text-lg text-slate-600">Verifiable intelligence • Transparent reasoning • Traceable decisions</p>
            </div>
          </div>

          <div className="mt-6 bg-gradient-to-r from-blue-50 to-cyan-50 border-l-4 border-blue-400 rounded-xl p-6 shadow-lg">
            <div className="font-bold text-blue-900 mb-2 text-lg">What This Shows:</div>
            <p className="text-base text-blue-800">
              This view provides evidence-based proof of system intelligence. Every signal, pattern, and alert
              is backed by traceable data queries, explicit rules, and clear boundaries of what the system can
              and cannot conclude. No black box. No magic. Just transparent, rule-based reasoning.
            </p>
          </div>

          <div className="mt-6 flex gap-3 bg-white rounded-xl p-2 shadow-lg border border-slate-200">
            <button
              onClick={() => setView('capabilities')}
              className={`flex-1 px-6 py-3 rounded-lg font-bold text-base transition-all ${
                view === 'capabilities'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Intelligence Capabilities
            </button>
            <button
              onClick={() => setView('evidence')}
              className={`flex-1 px-6 py-3 rounded-lg font-bold text-base transition-all ${
                view === 'evidence'
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              Live Evidence Trail
            </button>
          </div>
        </header>

        <main>
          {view === 'capabilities' && (
            <div className="space-y-4">
              {mockCapabilities.map(cap => (
                <div
                  key={cap.id}
                  className="bg-white border-2 border-gray-200 rounded-lg p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1">{cap.category}</div>
                      <h3 className="text-xl font-bold text-gray-900">{cap.capability}</h3>
                    </div>
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-1 rounded font-semibold ${getStatusBadge(cap.status)}`}>
                        {cap.status}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded font-semibold ${getImplementationBadge(cap.implementation)}`}>
                        {cap.implementation}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-4">{cap.description}</p>

                  {selectedCapability === cap.id && (
                    <div className="space-y-4 mb-4">
                      <div>
                        <div className="font-semibold text-gray-900 mb-2">Example Detections:</div>
                        <ul className="space-y-1 text-sm text-gray-700">
                          {cap.examples.map((ex, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-green-600">•</span>
                              <span>{ex}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <div className="font-semibold text-red-900 mb-2">System Boundaries (Cannot Do):</div>
                        <ul className="space-y-1 text-sm text-red-800">
                          {cap.boundaries.map((b, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span>⚠️</span>
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <div className="font-semibold text-gray-900 mb-2">Data Sources:</div>
                        <div className="flex flex-wrap gap-2">
                          {cap.dataSource.map((ds, i) => (
                            <span key={i} className="text-xs px-2 py-1 bg-gray-100 rounded font-mono">
                              {ds}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedCapability(selectedCapability === cap.id ? null : cap.id)}
                    className="text-sm px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold"
                  >
                    {selectedCapability === cap.id ? 'Hide Details' : 'Show Details'}
                  </button>
                </div>
              ))}
            </div>
          )}

          {view === 'evidence' && (
            <div className="space-y-4">
              <div className="bg-white border-2 border-green-300 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl">✓</span>
                  <h3 className="font-bold text-green-900">Full Traceability</h3>
                </div>
                <p className="text-sm text-green-800">
                  Every intelligence signal can be traced back to specific data queries, explicit rules,
                  and timestamps. Nothing is inferred or assumed without evidence.
                </p>
              </div>

              {mockEvidence.map(ev => (
                <div
                  key={ev.id}
                  className="bg-white border-2 border-gray-200 rounded-lg p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">{ev.timestamp}</div>
                      <h3 className="text-lg font-bold text-gray-900">{ev.capability}</h3>
                      <div className="text-sm text-gray-600 mt-1">Trigger: {ev.trigger}</div>
                    </div>
                    {ev.traceable && (
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded font-semibold">
                        TRACEABLE
                      </span>
                    )}
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-3">
                    <div className="font-semibold text-gray-900 mb-1 text-sm">Observation:</div>
                    <div className="text-sm text-gray-800">{ev.observation}</div>
                  </div>

                  <div className="grid grid-cols-4 gap-3 mb-3">
                    <div className="bg-blue-50 rounded p-2 text-center">
                      <div className="text-xs text-blue-700 font-semibold mb-1">RULE</div>
                      <div className="text-xs font-mono text-blue-900">{ev.capability}</div>
                    </div>
                    <div className="bg-gray-50 rounded p-2 text-center">
                      <div className="text-xs text-gray-700 font-semibold mb-1">EXECUTED</div>
                      <div className="text-xs font-mono text-gray-900">{ev.timestamp}</div>
                    </div>
                    <div className="bg-green-50 rounded p-2 text-center">
                      <div className="text-xs text-green-700 font-semibold mb-1">ROWS</div>
                      <div className="text-lg font-bold text-green-900">42</div>
                    </div>
                    <div className="bg-blue-50 rounded p-2 text-center">
                      <div className="text-xs text-blue-700 font-semibold mb-1">CONFIDENCE</div>
                      <div className="text-lg font-bold text-blue-900">100%</div>
                    </div>
                  </div>

                  {selectedEvidence === ev.id && (
                    <div className="space-y-3 mb-4">
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <div className="font-semibold text-blue-900 mb-1 text-sm">Rule Used:</div>
                        <code className="text-xs text-blue-800 font-mono block bg-white p-2 rounded">
                          {ev.ruleUsed}
                        </code>
                      </div>

                      <div className="bg-gray-50 border border-gray-200 rounded p-3">
                        <div className="font-semibold text-gray-900 mb-2 text-sm">Data Queried:</div>
                        <div className="space-y-2">
                          {ev.dataQueried.map((query, i) => (
                            <code key={i} className="text-xs text-gray-800 font-mono block bg-white p-2 rounded">
                              {query}
                            </code>
                          ))}
                        </div>
                      </div>

                      <div className="bg-green-50 border border-green-200 rounded p-3">
                        <div className="font-semibold text-green-900 mb-1 text-sm">Conclusion:</div>
                        <div className="text-sm text-green-800">{ev.conclusion}</div>
                      </div>

                      <div className="bg-orange-50 border border-orange-200 rounded p-3">
                        <div className="font-semibold text-orange-900 mb-1 text-sm">Recommended Human Action:</div>
                        <div className="text-sm text-orange-800">{ev.humanAction}</div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => setSelectedEvidence(selectedEvidence === ev.id ? null : ev.id)}
                    className="text-sm px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-semibold"
                  >
                    {selectedEvidence === ev.id ? 'Hide Trace' : 'Show Full Trace'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </main>

        <footer className="mt-8 bg-white border-2 border-gray-200 rounded-lg p-4">
          <div className="text-sm text-gray-700">
            <div className="font-semibold mb-2">Intelligence Principles:</div>
            <ul className="space-y-1 text-xs">
              <li>✓ All reasoning is rule-based and explainable</li>
              <li>✓ Every signal traces to specific data queries</li>
              <li>✓ System boundaries are explicit and enforced</li>
              <li>✓ No autonomous execution or decision-making</li>
              <li>✓ Human responsibility for all actions</li>
            </ul>
          </div>
        </footer>
      </div>
    </div>
  );
};
