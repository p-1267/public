import React, { useState, useEffect } from 'react';
import { IntelligenceSignalCard, IntelligenceSignal } from './IntelligenceSignalCard';
import { AllClearDisplay } from './AllClearDisplay';
import { BrainEvidenceStrip } from './BrainEvidenceStrip';
import { NumericEvidence } from './NumericEvidence';
import { Level4ActivePanel } from '../Level4ActivePanel';
import { WhyExplanation } from './WhyExplanation';

const mockSignals: IntelligenceSignal[] = [
  {
    id: 's1',
    type: 'critical',
    title: 'Medication overdue - Maria Rodriguez',
    summary: 'Lisinopril 10mg scheduled for 9:00 AM has not been administered (48 min overdue)',
    timestamp: '3 min ago',
    residentName: 'Maria Rodriguez',
    category: 'Medication',
    why: {
      summary: 'Medication administration window exceeded; timely administration critical for blood pressure management',
      observed: [
        'Scheduled time: 9:00 AM',
        'Current time: 9:48 AM',
        'No administration logged in care_logs',
        'Caregiver shift started on time at 7:00 AM'
      ],
      rulesFired: [
        'Medication overdue detection: time_since_due > 30 minutes',
        'Critical medication flag: blood pressure control',
        'Adherence risk: missed administration impacts efficacy'
      ],
      dataUsed: [
        'medication_administration_schedule',
        'care_logs (medication events)',
        'resident_medications (criticality flags)',
        'shift_attendance'
      ],
      cannotConclude: [
        'Whether medication was given without documentation',
        'Reason for delay (staffing, emergency, resident refusal)',
        'Clinical appropriateness of delay',
        'Current resident blood pressure status'
      ],
      humanAction: 'Verify medication status with on-floor caregiver and document reason for delay if administered'
    },
    actionable: true,
    suggestedAction: 'Contact Caregiver'
  },
  {
    id: 's2',
    type: 'warning',
    title: 'Pattern detected: Late medication administration',
    summary: 'Maria Rodriguez blood pressure meds administered 30+ min late 3 times this week',
    timestamp: '15 min ago',
    residentName: 'Maria Rodriguez',
    category: 'Medication',
    why: {
      summary: 'Consistent late administration pattern may indicate workflow issue affecting medication efficacy',
      observed: [
        'Monday 1/13: administered 9:32 AM (scheduled 9:00 AM)',
        'Wednesday 1/15: administered 9:28 AM (scheduled 9:00 AM)',
        'Friday 1/17: administered 9:45 AM (scheduled 9:00 AM)',
        'Pattern window: 7 days'
      ],
      rulesFired: [
        'Medication timing deviation > 30 min',
        'Pattern detection: 3+ occurrences within 7 days',
        'Compliance threshold exceeded'
      ],
      dataUsed: [
        'care_logs.medication_administration (last 7 days)',
        'resident_medications.schedule',
        'compliance_rules (30 min window)'
      ],
      cannotConclude: [
        'Clinical impact on resident (requires physician evaluation)',
        'Root cause (staffing, workflow, priority conflicts)',
        'Whether delays are clinically justified'
      ],
      humanAction: 'Review 9 AM staffing levels and consider task prioritization adjustment or schedule modification'
    },
    actionable: true,
    suggestedAction: 'Review Schedule'
  }
];

export const SupervisorExceptionsView: React.FC = () => {
  const [expandedSignal, setExpandedSignal] = useState<string | null>(null);
  const [showAllClear, setShowAllClear] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const criticalCount = mockSignals.filter(s => s.type === 'critical').length;
  const warningCount = mockSignals.filter(s => s.type === 'warning').length;
  const onTrackCount = 12;

  const handleSignalAction = (signalId: string) => {
    console.log('Signal action:', signalId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-gray-950 p-8">
      <div className="max-w-7xl mx-auto">
        <BrainEvidenceStrip
          lastScan={currentTime.toLocaleTimeString()}
          rulesEvaluated={27}
          signalsGenerated={mockSignals.length}
        />

        <Level4ActivePanel showToggle={false} />

        <header className="mb-10">
          <h1 className="text-6xl font-black text-white mb-4 tracking-tight">Supervisor Dashboard</h1>
          <p className="text-2xl text-slate-300 font-medium mb-8">Exception-based oversight • Intelligence-driven</p>

          <NumericEvidence
            metrics={[
              { label: 'CRITICAL', value: criticalCount, status: 'urgent', unit: '' },
              { label: 'WARNINGS', value: warningCount, status: 'attention', unit: '' },
              { label: 'ON TRACK', value: onTrackCount, status: 'good', unit: 'residents' },
              { label: 'COVERAGE', value: 100, status: 'good', unit: '%' }
            ]}
          />

          {(criticalCount > 0 || warningCount > 0) && (
            <div className="bg-gradient-to-r from-rose-900/50 to-red-900/50 border-l-8 border-rose-400 rounded-2xl p-8 mb-8 shadow-2xl backdrop-blur-lg">
              <div className="flex items-center gap-10">
                {criticalCount > 0 && (
                  <div className="flex items-center gap-4">
                    <span className="text-6xl">🚨</span>
                    <div>
                      <div className="font-black text-rose-200 text-4xl tracking-tight">{criticalCount} Critical</div>
                      <div className="text-lg text-rose-300 font-semibold">Requires immediate attention</div>
                    </div>
                  </div>
                )}
                {warningCount > 0 && (
                  <div className="flex items-center gap-4">
                    <span className="text-5xl">⚠️</span>
                    <div>
                      <div className="font-black text-amber-200 text-3xl tracking-tight">{warningCount} High Priority</div>
                      <div className="text-base text-amber-300 font-semibold">Review recommended</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </header>

        <main>
          {showAllClear || mockSignals.length === 0 ? (
            <AllClearDisplay
              message="No exceptions detected"
              details={[
                'All medications administered on schedule',
                'No overdue tasks or missed care',
                'All residents within baseline parameters',
                'Staffing levels adequate',
                'No device or system issues'
              ]}
            />
          ) : (
            <div className="space-y-6">
              {mockSignals.map(signal => (
                <div key={signal.id}>
                  <IntelligenceSignalCard
                    signal={signal}
                    onAction={handleSignalAction}
                  />
                  {expandedSignal === signal.id && signal.why && (
                    <div className="mt-4">
                      <WhyExplanation
                        explanation={signal.why}
                        onClose={() => setExpandedSignal(null)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>

        <footer className="mt-12 text-center text-sm text-slate-400 font-medium">
          Exception-driven oversight • Level 3 intelligence active • Human judgment required
        </footer>
      </div>
    </div>
  );
};
