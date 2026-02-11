import { supabase } from '../lib/supabase';

export interface GeneratedScenario {
  id: string;
  name: string;
  description: string;
  conflicts: string[];
  risks: string[];
  actors: string[];
}

export async function generateRichScenarios() {
  const scenarios: GeneratedScenario[] = [];

  const scenario1 = await generateMedicationTimingViolation();
  scenarios.push(scenario1);

  const scenario2 = await generateRoleBoundaryViolation();
  scenarios.push(scenario2);

  const scenario3 = await generateWorkloadConflict();
  scenarios.push(scenario3);

  const scenario4 = await generateDeterioratingResident();
  scenarios.push(scenario4);

  const scenario5 = await generateHygieneVsClinicalConflict();
  scenarios.push(scenario5);

  return scenarios;
}

async function generateMedicationTimingViolation(): Promise<GeneratedScenario> {
  const residentId = 'resident-maria-rodriguez';
  const caregiverId = 'caregiver-alice-johnson';

  const violations = [
    { scheduled: '09:00:00', actual: '09:32:00', minutes_late: 32, day: 'Monday' },
    { scheduled: '09:00:00', actual: '09:28:00', minutes_late: 28, day: 'Wednesday' },
    { scheduled: '09:00:00', actual: '09:45:00', minutes_late: 45, day: 'Friday' }
  ];

  return {
    id: 'scenario-med-timing',
    name: 'Repeated Late Medication Administration',
    description: 'Maria Rodriguez blood pressure medication consistently administered 30+ minutes late',
    conflicts: [
      'Medication efficacy compromised',
      'Compliance threshold violated (30 min)',
      'Pattern indicates systemic scheduling issue'
    ],
    risks: [
      'RISK: Resident health degradation due to inconsistent medication timing',
      'RISK: Regulatory compliance violation if pattern continues',
      'RISK: Caregiver may be overloaded during 9 AM window'
    ],
    actors: ['Maria Rodriguez (resident)', 'Alice Johnson (care aide)', 'Morning shift supervisor']
  };
}

async function generateRoleBoundaryViolation(): Promise<GeneratedScenario> {
  return {
    id: 'scenario-role-violation',
    name: 'Care Aide Administering Injectable Medication',
    description: 'Non-licensed care aide attempting to administer insulin injection',
    conflicts: [
      'Care aide lacks licensure for injectable medications',
      'Task requires RN or LPN certification',
      'Supervisor approved action verbally (no documentation)'
    ],
    risks: [
      'RISK: Legal liability if adverse event occurs',
      'RISK: Regulatory violation (state board of nursing)',
      'RISK: Resident safety compromised by unqualified administration',
      'CRITICAL: This action is UNACCEPTABLE and must be blocked'
    ],
    actors: ['Robert Chen (care aide - NOT LICENSED)', 'John Smith (resident - diabetic)', 'Supervisor (verbal override)']
  };
}

async function generateWorkloadConflict(): Promise<GeneratedScenario> {
  return {
    id: 'scenario-workload',
    name: 'Caregiver Assigned Beyond Safe Ratio',
    description: 'Licensed nurse assigned 8 high-acuity residents simultaneously',
    conflicts: [
      'State regulation: Max 6 residents per RN in skilled nursing',
      'Current assignment: 8 residents',
      '3 residents require q2h monitoring',
      'Overlapping medication windows create impossible schedule'
    ],
    risks: [
      'RISK: Nurse cannot physically complete all required tasks',
      'RISK: Delayed response to emergencies',
      'RISK: Medication errors due to time pressure',
      'JUDGMENT: This staffing configuration is UNSAFE and requires immediate correction'
    ],
    actors: ['Sarah Williams (RN - overloaded)', '8 residents', 'Staffing coordinator']
  };
}

async function generateDeterioratingResident(): Promise<GeneratedScenario> {
  return {
    id: 'scenario-deterioration',
    name: 'Subtle Multi-Day Resident Deterioration',
    description: 'Margaret Thompson showing gradual decline across multiple indicators',
    conflicts: [
      'No single measurement is critical',
      'Pattern emerges only when viewed together',
      'Individual caregivers see their shift as "normal"',
      'System detects correlation between decreased food intake and increasing lethargy'
    ],
    risks: [
      'RISK: Early infection or metabolic change not yet diagnosed',
      'RISK: Continued decline without intervention',
      'JUDGMENT: This resident requires physician evaluation within 24 hours',
      'SYSTEM CANNOT DETERMINE: Specific medical cause (requires clinical assessment)'
    ],
    actors: ['Margaret Thompson (resident)', 'Multiple caregivers (cross-shift)', 'Physician (not yet notified)']
  };
}

async function generateHygieneVsClinicalConflict(): Promise<GeneratedScenario> {
  return {
    id: 'scenario-hygiene-conflict',
    name: 'Housekeeping Interrupting Critical Clinical Window',
    description: 'Housekeeping staff entering room during post-meal insulin administration',
    conflicts: [
      'Housekeeping scheduled for 12:30 PM room cleaning',
      'Post-lunch insulin must be administered 12:15-12:45 PM',
      'Resident becomes agitated with multiple people in room',
      'Both tasks are required but physically incompatible'
    ],
    risks: [
      'RISK: Medication administration delayed or skipped',
      'RISK: Resident safety during agitation',
      'JUDGMENT: Clinical task takes priority; housekeeping must be rescheduled',
      'SYSTEM DETECTION: Scheduling algorithm failed to identify conflict'
    ],
    actors: ['David Martinez (resident - diabetic)', 'Care aide (medication)', 'Housekeeping staff', 'Scheduler']
  };
}

export async function generateCognitiveJudgments(scenarios: GeneratedScenario[]) {
  const judgments = [];

  for (const scenario of scenarios) {
    const judgment = {
      scenario_id: scenario.id,
      what_is_happening: scenario.description,
      what_is_wrong: scenario.conflicts[0],
      what_is_at_risk: scenario.risks.filter(r => r.startsWith('RISK:')),
      who_is_affected: scenario.actors,
      what_should_happen_next: determineNextAction(scenario),
      what_must_not_be_done: determineProhibitions(scenario),
      what_is_still_missing: ['Supervisor acknowledgment', 'Corrective action plan'],
      what_is_blocked: determineBlockages(scenario),
      judgment: extractJudgment(scenario.risks),
      system_cannot_determine: scenario.risks.filter(r => r.includes('CANNOT DETERMINE'))
    };

    judgments.push(judgment);
  }

  return judgments;
}

function determineNextAction(scenario: GeneratedScenario): string {
  if (scenario.id === 'scenario-role-violation') {
    return 'IMMEDIATE: Block medication administration. Assign licensed nurse. Document incident.';
  }
  if (scenario.id === 'scenario-workload') {
    return 'IMMEDIATE: Reassign 2 residents to available nurse. If unavailable, escalate to DON for emergency staffing.';
  }
  if (scenario.id === 'scenario-deterioration') {
    return 'URGENT: Notify physician within 4 hours. Increase monitoring to q2h. Document all observations.';
  }
  if (scenario.id === 'scenario-hygiene-conflict') {
    return 'Reschedule housekeeping to 2:00 PM. Prioritize clinical task. Update scheduling algorithm.';
  }
  return 'Review pattern. Adjust workflow. Monitor for recurrence.';
}

function determineProhibitions(scenario: GeneratedScenario): string[] {
  if (scenario.id === 'scenario-role-violation') {
    return [
      'DO NOT allow care aide to administer injectable medications',
      'DO NOT accept verbal overrides for licensure requirements',
      'DO NOT proceed without licensed nurse present'
    ];
  }
  if (scenario.id === 'scenario-workload') {
    return [
      'DO NOT assign additional residents to this nurse',
      'DO NOT reduce monitoring frequency to save time',
      'DO NOT proceed with current configuration'
    ];
  }
  return ['DO NOT ignore this pattern'];
}

function determineBlockages(scenario: GeneratedScenario): string[] {
  if (scenario.id === 'scenario-role-violation') {
    return ['Medication administration BLOCKED: Insufficient licensure', 'Task reassignment REQUIRED before proceeding'];
  }
  if (scenario.id === 'scenario-workload') {
    return ['New resident admissions BLOCKED until staffing corrected', 'Non-urgent tasks DEPRIORITIZED'];
  }
  return [];
}

function extractJudgment(risks: string[]): string {
  const judgmentRisk = risks.find(r => r.startsWith('JUDGMENT:') || r.startsWith('CRITICAL:'));
  return judgmentRisk?.replace(/^(JUDGMENT:|CRITICAL:)\s*/, '') || 'Requires review';
}
