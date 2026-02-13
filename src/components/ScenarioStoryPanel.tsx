import { CheckCircle, ArrowRight } from 'lucide-react';

interface ScenarioStoryPanelProps {
  scenarioId: string;
  currentRole: string;
}

const SCENARIO_STORIES: Record<string, {
  differences: string[];
  ctas: { label: string; description: string }[];
}> = {
  'self-managed': {
    differences: [
      'Senior logs own health data, medications, and vitals',
      'Family monitors timeline and receives alerts',
      'No caregivers or agency staff involved'
    ],
    ctas: [
      { label: 'Log Vitals', description: 'Senior submits blood pressure, weight' },
      { label: 'Log Medication', description: 'Senior records medication taken' },
      { label: 'See WHY/RISK', description: 'View intelligence signals and risk scores' }
    ]
  },
  'family-managed': {
    differences: [
      'Family actively manages and monitors care',
      'Family can submit observations and requests',
      'Senior may self-report with family oversight'
    ],
    ctas: [
      { label: 'Submit Family Observation', description: 'Family reports concerns or changes' },
      { label: 'View Care Timeline', description: 'See all care events and correlations' },
      { label: 'Configure Notifications', description: 'Set alert preferences' }
    ]
  },
  'direct-hire': {
    differences: [
      'Family hires and directs caregiver directly',
      'Caregiver completes tasks assigned by family',
      'Family sees caregiver NOW/NEXT/LATER view'
    ],
    ctas: [
      { label: 'Assign Task', description: 'Family creates task for caregiver' },
      { label: 'Complete with Evidence', description: 'Caregiver logs completion + evidence' },
      { label: 'See Caregiver NOW', description: 'View caregiver real-time task list' }
    ]
  },
  'agency-home-care': {
    differences: [
      'Supervisor triages exceptions and assigns tasks',
      'Caregivers work shifts and complete assigned tasks',
      'Agency manages compliance and scheduling'
    ],
    ctas: [
      { label: 'Supervisor Triage', description: 'Review exception queue and prioritize' },
      { label: 'Assign Shift/Task', description: 'Supervisor assigns work to caregivers' },
      { label: 'Exception-Only View', description: 'Supervisor sees only flagged items' }
    ]
  },
  'agency-facility': {
    differences: [
      'Departments organize work (Nursing, Kitchen, Housekeeping)',
      'Supervisors manage department workboards',
      'Full staffing, compliance, and audit capabilities'
    ],
    ctas: [
      { label: 'Department Workboards', description: 'View department-specific task lists' },
      { label: 'Rounds/Incident', description: 'Log facility rounds and incidents' },
      { label: 'Staffing View', description: 'Manage shifts, attendance, and capacity' }
    ]
  }
};

export function ScenarioStoryPanel({ scenarioId, currentRole }: ScenarioStoryPanelProps) {
  const story = SCENARIO_STORIES[scenarioId];

  if (!story) {
    return null;
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
      <h3 className="text-base font-bold text-gray-900 mb-4">
        What's Different in This Scenario
      </h3>

      <div className="space-y-2 mb-5">
        {story.differences.map((diff, index) => (
          <div key={index} className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-gray-700">{diff}</span>
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-bold text-gray-900 mb-3">
          Try These Actions
        </h4>
        <div className="space-y-2">
          {story.ctas.map((cta, index) => (
            <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded border border-blue-100">
              <ArrowRight className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-sm font-semibold text-blue-900">{cta.label}</div>
                <div className="text-xs text-blue-700">{cta.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
        All actions write to database via RPCs. Click any CTA to see real DB updates and UI refresh.
      </div>
    </div>
  );
}
