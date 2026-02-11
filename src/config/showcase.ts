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
    id: 'agency-managed-care',
    name: 'Agency-Managed Care',
    description: 'Agency owns governance, compliance, escalation. Caregivers and supervisors execute. Senior is passive or partially active. Family access limited.',
    defaultRole: 'AGENCY_ADMIN',
    data: {
      residents: [
        {
          id: 'showcase-resident-1',
          full_name: 'Emma Thompson',
          date_of_birth: '1948-03-15',
          status: 'active',
          metadata: { room_number: '102' }
        }
      ],
      medications: [
        {
          id: 'showcase-med-1',
          resident_id: 'showcase-resident-1',
          medication_name: 'Atorvastatin',
          dosage: '20mg',
          frequency: 'DAILY',
          route: 'ORAL',
          schedule: { times: ['20:00'] },
          is_prn: false,
          is_active: true
        },
        {
          id: 'showcase-med-2',
          resident_id: 'showcase-resident-1',
          medication_name: 'Lisinopril',
          dosage: '10mg',
          frequency: 'DAILY',
          route: 'ORAL',
          schedule: { times: ['08:00'] },
          is_prn: false,
          is_active: true
        }
      ],
      shifts: [
        {
          id: 'showcase-shift-1',
          caregiver_id: 'showcase-user-caregiver',
          start_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
          status: 'IN_PROGRESS',
          location_context: 'Showcase Care Facility'
        }
      ],
      assignments: [
        {
          id: 'showcase-assignment-1',
          resident_id: 'showcase-resident-1',
          caregiver_user_id: 'showcase-user-caregiver',
          status: 'active'
        }
      ],
      users: [
        {
          id: 'showcase-user-agency_admin',
          display_name: 'Admin User',
          role: 'AGENCY_ADMIN'
        },
        {
          id: 'showcase-user-supervisor',
          display_name: 'Sam Supervisor',
          role: 'SUPERVISOR'
        },
        {
          id: 'showcase-user-caregiver',
          display_name: 'Jamie Caregiver',
          role: 'CAREGIVER'
        }
      ],
      brainState: {
        resident_id: 'showcase-resident-1',
        current_state: 'NORMAL',
        last_transition: new Date(Date.now() - 30 * 60 * 1000).toISOString()
      }
    }
  },
  {
    id: 'home-care-hybrid',
    name: 'Home Care (Hybrid: Family + Caregiver)',
    description: 'Caregiver executes care. Family participates. Supervisor optional. Agency governance optional.',
    defaultRole: 'CAREGIVER',
    data: {
      residents: [
        {
          id: 'showcase-resident-2',
          full_name: 'Robert Chen',
          date_of_birth: '1942-07-22',
          status: 'active',
          metadata: { location: 'Home Care' }
        }
      ],
      medications: [
        {
          id: 'showcase-med-3',
          resident_id: 'showcase-resident-2',
          medication_name: 'Metformin',
          dosage: '500mg',
          frequency: 'TWICE_DAILY',
          route: 'ORAL',
          schedule: { times: ['08:00', '20:00'] },
          is_prn: false,
          is_active: true,
          last_administered: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString(),
          due_now: true
        }
      ],
      shifts: [
        {
          id: 'showcase-shift-2',
          caregiver_id: 'showcase-user-caregiver',
          start_time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
          end_time: new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString(),
          status: 'IN_PROGRESS',
          location_context: 'Home Visit'
        }
      ],
      assignments: [
        {
          id: 'showcase-assignment-2',
          resident_id: 'showcase-resident-2',
          caregiver_user_id: 'showcase-user-caregiver',
          status: 'active'
        }
      ],
      users: [
        {
          id: 'showcase-user-caregiver',
          display_name: 'Alex Caregiver',
          role: 'CAREGIVER'
        },
        {
          id: 'showcase-user-family_viewer',
          display_name: 'Linda Chen (Daughter)',
          role: 'FAMILY_VIEWER'
        }
      ]
    }
  },
  {
    id: 'independent-senior-family',
    name: 'Independent Senior + Family',
    description: 'Senior operates independently. Family oversight. No workforce. No agency governance.',
    defaultRole: 'SENIOR',
    data: {
      residents: [
        {
          id: 'showcase-resident-3',
          full_name: 'Dorothy Parker',
          date_of_birth: '1940-05-12',
          status: 'active',
          metadata: { location: 'Independent Living' }
        }
      ],
      medications: [
        {
          id: 'showcase-med-4',
          resident_id: 'showcase-resident-3',
          medication_name: 'Aspirin',
          dosage: '81mg',
          frequency: 'DAILY',
          route: 'ORAL',
          is_active: true
        }
      ],
      shifts: [],
      assignments: [],
      users: [
        {
          id: 'showcase-user-senior',
          display_name: 'Dorothy Parker',
          role: 'SENIOR'
        },
        {
          id: 'showcase-user-family_viewer',
          display_name: 'Sarah Parker (Daughter)',
          role: 'FAMILY_VIEWER'
        }
      ],
      brainState: {
        resident_id: 'showcase-resident-3',
        current_state: 'NORMAL',
        last_transition: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      }
    }
  }
];
