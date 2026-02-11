export type ScenarioId = 'agency-managed-care' | 'home-care-hybrid' | 'independent-senior-family';

export type CapabilityLevel = 'INCLUDED' | 'LIMITED' | 'EXCLUDED';

export const SCENARIO_META = {
  'agency-managed-care': {
    description: 'Professional agency manages all aspects of care with full compliance enforcement.',
    ownsDecisions: 'Agency',
    executesCare: 'Caregiver',
    supervises: 'Supervisor',
    primaryValue: 'Compliance & Safety'
  },
  'home-care-hybrid': {
    description: 'Family hires and directs a caregiver with optional agency support.',
    ownsDecisions: 'Family',
    executesCare: 'Caregiver',
    supervises: 'Family',
    primaryValue: 'Cost & Control'
  },
  'independent-senior-family': {
    description: 'Senior manages their own daily care with family monitoring and support.',
    ownsDecisions: 'Senior and Family',
    executesCare: 'Senior',
    supervises: 'Family',
    primaryValue: 'Independence'
  }
};

export interface ScenarioArchitecture {
  scenarioId: ScenarioId;
  activeRoles: {
    role: string;
    status: 'CORE' | 'OPTIONAL' | 'NOT_USED';
    description: string;
  }[];
  capabilities: {
    category: string;
    level: CapabilityLevel;
    description: string;
  }[];
}

export const SCENARIO_ARCHITECTURES: Record<ScenarioId, ScenarioArchitecture> = {
  'agency-managed-care': {
    scenarioId: 'agency-managed-care',
    activeRoles: [
      {
        role: 'AGENCY_ADMIN',
        status: 'CORE',
        description: 'Owns governance, onboarding, compliance, insurance, SOPs'
      },
      {
        role: 'SUPERVISOR',
        status: 'CORE',
        description: 'Manages workforce, shifts, assignments, escalations'
      },
      {
        role: 'CAREGIVER',
        status: 'CORE',
        description: 'Executes care actions, logs medications, voice documentation'
      },
      {
        role: 'SENIOR',
        status: 'OPTIONAL',
        description: 'Passive recipient or limited self-reporting'
      },
      {
        role: 'FAMILY_VIEWER',
        status: 'LIMITED',
        description: 'Read-only access to care timeline and notifications'
      }
    ],
    capabilities: [
      {
        category: 'Agency Governance',
        level: 'INCLUDED',
        description: 'Organization onboarding, insurance config, SOP ingestion, compliance panels'
      },
      {
        category: 'Workforce Management',
        level: 'INCLUDED',
        description: 'Caregiver assignments, shift scheduling, clock-in/out, attendance tracking'
      },
      {
        category: 'Senior Capabilities',
        level: 'LIMITED',
        description: 'Senior has limited self-service access, primarily passive'
      },
      {
        category: 'Family Capabilities',
        level: 'LIMITED',
        description: 'Family has read-only timeline and notification preferences'
      },
      {
        category: 'Emergency & Safety',
        level: 'INCLUDED',
        description: 'Full emergency state machine, escalation, SOP enforcement'
      },
      {
        category: 'Medications',
        level: 'INCLUDED',
        description: 'Caregiver administers, logs, medication schedules enforced'
      },
      {
        category: 'AI Assistance',
        level: 'INCLUDED',
        description: 'Training, suggestions, draft reports available to caregivers and supervisors'
      },
      {
        category: 'Devices & Sensors',
        level: 'INCLUDED',
        description: 'Device pairing, health tracking, data ingestion'
      },
      {
        category: 'Billing / Payroll / Exports',
        level: 'INCLUDED',
        description: 'Payroll exports, billing exports, financial adjustments'
      },
      {
        category: 'Analytics & Audit',
        level: 'INCLUDED',
        description: 'Full analytics domains, forensic replay, audit logs'
      },
      {
        category: 'Messaging',
        level: 'INCLUDED',
        description: 'Secure messaging between agency staff, announcements'
      },
      {
        category: 'Voice Documentation',
        level: 'INCLUDED',
        description: 'Multilingual voice-to-text, translation, structured documentation'
      }
    ]
  },

  'home-care-hybrid': {
    scenarioId: 'home-care-hybrid',
    activeRoles: [
      {
        role: 'CAREGIVER',
        status: 'CORE',
        description: 'Primary care executor, logs care actions and medications'
      },
      {
        role: 'FAMILY_VIEWER',
        status: 'CORE',
        description: 'Active participant, sees timeline, can message caregiver'
      },
      {
        role: 'SENIOR',
        status: 'OPTIONAL',
        description: 'May self-report vitals or medications'
      },
      {
        role: 'SUPERVISOR',
        status: 'OPTIONAL',
        description: 'Optional oversight, may review care logs'
      },
      {
        role: 'AGENCY_ADMIN',
        status: 'OPTIONAL',
        description: 'Optional governance, minimal compliance requirements'
      }
    ],
    capabilities: [
      {
        category: 'Agency Governance',
        level: 'LIMITED',
        description: 'Optional agency onboarding, minimal compliance enforcement'
      },
      {
        category: 'Workforce Management',
        level: 'LIMITED',
        description: 'Caregiver assignments exist, shift management optional'
      },
      {
        category: 'Senior Capabilities',
        level: 'INCLUDED',
        description: 'Senior may self-report vitals, medications, emergency alerts'
      },
      {
        category: 'Family Capabilities',
        level: 'INCLUDED',
        description: 'Family participates actively, messaging, timeline, notification preferences'
      },
      {
        category: 'Emergency & Safety',
        level: 'INCLUDED',
        description: 'Emergency state machine active, family notified, escalation may be limited'
      },
      {
        category: 'Medications',
        level: 'INCLUDED',
        description: 'Caregiver logs medications, family may be notified'
      },
      {
        category: 'AI Assistance',
        level: 'INCLUDED',
        description: 'AI suggestions available to caregiver and family'
      },
      {
        category: 'Devices & Sensors',
        level: 'INCLUDED',
        description: 'Device pairing available, data shared with family'
      },
      {
        category: 'Billing / Payroll / Exports',
        level: 'LIMITED',
        description: 'Billing exports available if agency involved, payroll optional'
      },
      {
        category: 'Analytics & Audit',
        level: 'LIMITED',
        description: 'Care timeline available, forensic replay limited to family-accessible data'
      },
      {
        category: 'Messaging',
        level: 'INCLUDED',
        description: 'Messaging between caregiver, family, and senior'
      },
      {
        category: 'Voice Documentation',
        level: 'INCLUDED',
        description: 'Caregiver can use voice documentation, family may view transcripts'
      }
    ]
  },

  'independent-senior-family': {
    scenarioId: 'independent-senior-family',
    activeRoles: [
      {
        role: 'SENIOR',
        status: 'CORE',
        description: 'Primary user, self-reports vitals, medications, emergency alerts'
      },
      {
        role: 'FAMILY_VIEWER',
        status: 'CORE',
        description: 'Oversight role, monitors timeline, receives alerts'
      },
      {
        role: 'CAREGIVER',
        status: 'NOT_USED',
        description: 'No workforce involved'
      },
      {
        role: 'SUPERVISOR',
        status: 'NOT_USED',
        description: 'No workforce management'
      },
      {
        role: 'AGENCY_ADMIN',
        status: 'NOT_USED',
        description: 'No agency governance'
      }
    ],
    capabilities: [
      {
        category: 'Agency Governance',
        level: 'EXCLUDED',
        description: 'No agency onboarding, no compliance panels, no SOPs'
      },
      {
        category: 'Workforce Management',
        level: 'EXCLUDED',
        description: 'No caregivers, no shifts, no assignments'
      },
      {
        category: 'Senior Capabilities',
        level: 'INCLUDED',
        description: 'Senior operates all self-service features: vitals, medications, emergency'
      },
      {
        category: 'Family Capabilities',
        level: 'INCLUDED',
        description: 'Family monitors timeline, receives alerts, configures notification preferences'
      },
      {
        category: 'Emergency & Safety',
        level: 'INCLUDED',
        description: 'Emergency state machine active, family notified immediately'
      },
      {
        category: 'Medications',
        level: 'INCLUDED',
        description: 'Senior self-logs medications, family may receive reminders'
      },
      {
        category: 'AI Assistance',
        level: 'LIMITED',
        description: 'AI suggestions for senior, accessibility-focused'
      },
      {
        category: 'Devices & Sensors',
        level: 'INCLUDED',
        description: 'Senior pairs devices, data shared with family'
      },
      {
        category: 'Billing / Payroll / Exports',
        level: 'EXCLUDED',
        description: 'No payroll, no billing exports (no workforce)'
      },
      {
        category: 'Analytics & Audit',
        level: 'LIMITED',
        description: 'Care timeline available, forensic replay limited to senior+family data'
      },
      {
        category: 'Messaging',
        level: 'LIMITED',
        description: 'Messaging between senior and family only'
      },
      {
        category: 'Voice Documentation',
        level: 'LIMITED',
        description: 'Senior may use voice notes, family may view'
      }
    ]
  }
};

export interface FeatureScenarioMapping {
  featureName: string;
  category: string;
  applicableScenarios: {
    scenarioId: ScenarioId;
    visibility: 'CORE' | 'OPTIONAL' | 'NOT_USED';
    enforcement: 'BRAIN' | 'PERMISSION' | 'PLAN' | 'NONE';
    executableInShowcase: boolean;
    notes?: string;
  }[];
}

export const FEATURE_SCENARIO_MAPPINGS: FeatureScenarioMapping[] = [
  {
    featureName: 'Organization Onboarding',
    category: 'Agency Governance',
    applicableScenarios: [
      { scenarioId: 'agency-managed-care', visibility: 'CORE', enforcement: 'BRAIN', executableInShowcase: false, notes: 'Blocks care until complete' },
      { scenarioId: 'home-care-hybrid', visibility: 'OPTIONAL', enforcement: 'PERMISSION', executableInShowcase: false, notes: 'May be skipped' },
      { scenarioId: 'independent-senior-family', visibility: 'NOT_USED', enforcement: 'NONE', executableInShowcase: false, notes: 'Not applicable' }
    ]
  },
  {
    featureName: 'Insurance Configuration',
    category: 'Agency Governance',
    applicableScenarios: [
      { scenarioId: 'agency-managed-care', visibility: 'CORE', enforcement: 'BRAIN', executableInShowcase: false, notes: 'Blocks care if expired' },
      { scenarioId: 'home-care-hybrid', visibility: 'OPTIONAL', enforcement: 'PERMISSION', executableInShowcase: false, notes: 'Optional' },
      { scenarioId: 'independent-senior-family', visibility: 'NOT_USED', enforcement: 'NONE', executableInShowcase: false, notes: 'Not applicable' }
    ]
  },
  {
    featureName: 'SOP Ingestion & Enforcement',
    category: 'Agency Governance',
    applicableScenarios: [
      { scenarioId: 'agency-managed-care', visibility: 'CORE', enforcement: 'BRAIN', executableInShowcase: false, notes: 'SOPs actively enforced during care' },
      { scenarioId: 'home-care-hybrid', visibility: 'OPTIONAL', enforcement: 'PERMISSION', executableInShowcase: false, notes: 'Optional enforcement' },
      { scenarioId: 'independent-senior-family', visibility: 'NOT_USED', enforcement: 'NONE', executableInShowcase: false, notes: 'No SOPs' }
    ]
  },
  {
    featureName: 'Caregiver Assignments',
    category: 'Workforce Management',
    applicableScenarios: [
      { scenarioId: 'agency-managed-care', visibility: 'CORE', enforcement: 'PERMISSION', executableInShowcase: false },
      { scenarioId: 'home-care-hybrid', visibility: 'CORE', enforcement: 'PERMISSION', executableInShowcase: false },
      { scenarioId: 'independent-senior-family', visibility: 'NOT_USED', enforcement: 'NONE', executableInShowcase: false, notes: 'No caregivers' }
    ]
  },
  {
    featureName: 'Shift Scheduling',
    category: 'Workforce Management',
    applicableScenarios: [
      { scenarioId: 'agency-managed-care', visibility: 'CORE', enforcement: 'PERMISSION', executableInShowcase: false },
      { scenarioId: 'home-care-hybrid', visibility: 'OPTIONAL', enforcement: 'PERMISSION', executableInShowcase: false },
      { scenarioId: 'independent-senior-family', visibility: 'NOT_USED', enforcement: 'NONE', executableInShowcase: false }
    ]
  },
  {
    featureName: 'Medication Administration',
    category: 'Medications',
    applicableScenarios: [
      { scenarioId: 'agency-managed-care', visibility: 'CORE', enforcement: 'BRAIN', executableInShowcase: false, notes: 'Caregiver logs' },
      { scenarioId: 'home-care-hybrid', visibility: 'CORE', enforcement: 'BRAIN', executableInShowcase: false, notes: 'Caregiver or senior logs' },
      { scenarioId: 'independent-senior-family', visibility: 'CORE', enforcement: 'BRAIN', executableInShowcase: false, notes: 'Senior self-logs' }
    ]
  },
  {
    featureName: 'Emergency State Machine',
    category: 'Emergency & Safety',
    applicableScenarios: [
      { scenarioId: 'agency-managed-care', visibility: 'CORE', enforcement: 'BRAIN', executableInShowcase: false, notes: 'Full escalation chain' },
      { scenarioId: 'home-care-hybrid', visibility: 'CORE', enforcement: 'BRAIN', executableInShowcase: false, notes: 'Family notified' },
      { scenarioId: 'independent-senior-family', visibility: 'CORE', enforcement: 'BRAIN', executableInShowcase: false, notes: 'Senior triggers, family notified' }
    ]
  },
  {
    featureName: 'Voice Documentation',
    category: 'Voice Documentation',
    applicableScenarios: [
      { scenarioId: 'agency-managed-care', visibility: 'CORE', enforcement: 'PERMISSION', executableInShowcase: false, notes: 'Caregiver uses' },
      { scenarioId: 'home-care-hybrid', visibility: 'CORE', enforcement: 'PERMISSION', executableInShowcase: false, notes: 'Caregiver uses' },
      { scenarioId: 'independent-senior-family', visibility: 'OPTIONAL', enforcement: 'PERMISSION', executableInShowcase: false, notes: 'Senior may use voice notes' }
    ]
  },
  {
    featureName: 'Messaging',
    category: 'Messaging',
    applicableScenarios: [
      { scenarioId: 'agency-managed-care', visibility: 'CORE', enforcement: 'PERMISSION', executableInShowcase: false, notes: 'Agency staff + family' },
      { scenarioId: 'home-care-hybrid', visibility: 'CORE', enforcement: 'PERMISSION', executableInShowcase: false, notes: 'Caregiver + family + senior' },
      { scenarioId: 'independent-senior-family', visibility: 'CORE', enforcement: 'PERMISSION', executableInShowcase: false, notes: 'Senior + family only' }
    ]
  },
  {
    featureName: 'Device Pairing',
    category: 'Devices & Sensors',
    applicableScenarios: [
      { scenarioId: 'agency-managed-care', visibility: 'CORE', enforcement: 'PERMISSION', executableInShowcase: false },
      { scenarioId: 'home-care-hybrid', visibility: 'CORE', enforcement: 'PERMISSION', executableInShowcase: false },
      { scenarioId: 'independent-senior-family', visibility: 'CORE', enforcement: 'PERMISSION', executableInShowcase: false }
    ]
  },
  {
    featureName: 'Payroll Exports',
    category: 'Billing / Payroll / Exports',
    applicableScenarios: [
      { scenarioId: 'agency-managed-care', visibility: 'CORE', enforcement: 'PERMISSION', executableInShowcase: false },
      { scenarioId: 'home-care-hybrid', visibility: 'OPTIONAL', enforcement: 'PERMISSION', executableInShowcase: false, notes: 'If agency involved' },
      { scenarioId: 'independent-senior-family', visibility: 'NOT_USED', enforcement: 'NONE', executableInShowcase: false, notes: 'No workforce' }
    ]
  },
  {
    featureName: 'Forensic Replay',
    category: 'Analytics & Audit',
    applicableScenarios: [
      { scenarioId: 'agency-managed-care', visibility: 'CORE', enforcement: 'PERMISSION', executableInShowcase: false, notes: 'Full audit access' },
      { scenarioId: 'home-care-hybrid', visibility: 'OPTIONAL', enforcement: 'PERMISSION', executableInShowcase: false, notes: 'Limited to family data' },
      { scenarioId: 'independent-senior-family', visibility: 'OPTIONAL', enforcement: 'PERMISSION', executableInShowcase: false, notes: 'Limited to senior+family data' }
    ]
  },
  {
    featureName: 'Senior Accessibility Settings',
    category: 'Senior Capabilities',
    applicableScenarios: [
      { scenarioId: 'agency-managed-care', visibility: 'OPTIONAL', enforcement: 'PERMISSION', executableInShowcase: false, notes: 'If senior has access' },
      { scenarioId: 'home-care-hybrid', visibility: 'CORE', enforcement: 'PERMISSION', executableInShowcase: false },
      { scenarioId: 'independent-senior-family', visibility: 'CORE', enforcement: 'PERMISSION', executableInShowcase: false }
    ]
  },
  {
    featureName: 'Family Notification Preferences',
    category: 'Family Capabilities',
    applicableScenarios: [
      { scenarioId: 'agency-managed-care', visibility: 'OPTIONAL', enforcement: 'PERMISSION', executableInShowcase: false, notes: 'Limited family access' },
      { scenarioId: 'home-care-hybrid', visibility: 'CORE', enforcement: 'PERMISSION', executableInShowcase: false },
      { scenarioId: 'independent-senior-family', visibility: 'CORE', enforcement: 'PERMISSION', executableInShowcase: false }
    ]
  }
];
