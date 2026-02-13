export const SHOWCASE_MODE = import.meta.env.VITE_SHOWCASE_MODE === 'true';

export type ShowcaseRole = 'AGENCY_ADMIN' | 'SUPERVISOR' | 'CAREGIVER' | 'SENIOR' | 'FAMILY_VIEWER' | 'FAMILY_ADMIN';

export interface ShowcaseScenario {
  id: string;
  name: string;
  description: string;
  defaultRole: ShowcaseRole;
  data: {
    residents: any[];
    medications: any[];
    shifts: any[];
    assignments: any[];
    users: any[];
    brainState?: any;
  };
}

export const SHOWCASE_SCENARIOS: ShowcaseScenario[] = [
  {
    id: 'self-managed',
    name: 'A) SELF - Senior Independent',
    description: 'Senior manages own care independently. Family monitors. No caregivers or agency.',
    defaultRole: 'SENIOR',
    data: {
      residents: [],
      medications: [],
      shifts: [],
      assignments: [],
      users: []
    }
  },
  {
    id: 'family-managed',
    name: 'B) FAMILY_MANAGED - Family Oversight',
    description: 'Family oversees and manages senior care. Senior may self-report. No formal agency.',
    defaultRole: 'FAMILY_ADMIN',
    data: {
      residents: [],
      medications: [],
      shifts: [],
      assignments: [],
      users: []
    }
  },
  {
    id: 'direct-hire',
    name: 'C) DIRECT_HIRE - Family Hires Caregiver',
    description: 'Family hires and directs caregiver directly. Hybrid model with family control.',
    defaultRole: 'CAREGIVER',
    data: {
      residents: [],
      medications: [],
      shifts: [],
      assignments: [],
      users: []
    }
  },
  {
    id: 'agency-home-care',
    name: 'D) AGENCY_HOME_CARE - Agency In-Home',
    description: 'Agency provides professional in-home care. Supervisors manage caregivers.',
    defaultRole: 'SUPERVISOR',
    data: {
      residents: [],
      medications: [],
      shifts: [],
      assignments: [],
      users: []
    }
  },
  {
    id: 'agency-facility',
    name: 'E) AGENCY_FACILITY - Agency Facility',
    description: 'Full agency facility care with departments, compliance, and workforce management.',
    defaultRole: 'AGENCY_ADMIN',
    data: {
      residents: [],
      medications: [],
      shifts: [],
      assignments: [],
      users: []
    }
  }
];
