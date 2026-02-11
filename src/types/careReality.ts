export type CareRealityType = 'FULL_AGENCY' | 'HOME_CARE' | 'INDEPENDENT_SENIOR';

export interface CareRealityConfig {
  type: CareRealityType;
  name: string;
  description: string;
  enabledModules: {
    workforce: boolean;
    supervision: boolean;
    scheduling: boolean;
    compliance: boolean;
    familyPortal: boolean;
    seniorPortal: boolean;
    messaging: boolean;
    payroll: boolean;
    billing: boolean;
  };
  enabledRoles: string[];
  defaultPermissions: Record<string, string[]>;
}

export const CARE_REALITY_CONFIGS: Record<CareRealityType, CareRealityConfig> = {
  FULL_AGENCY: {
    type: 'FULL_AGENCY',
    name: 'Full Agency-Managed Care',
    description: 'Complete agency operations with full governance, compliance, and workforce management',
    enabledModules: {
      workforce: true,
      supervision: true,
      scheduling: true,
      compliance: true,
      familyPortal: true,
      seniorPortal: true,
      messaging: true,
      payroll: true,
      billing: true
    },
    enabledRoles: ['AGENCY_ADMIN', 'SUPERVISOR', 'CAREGIVER', 'FAMILY', 'SENIOR'],
    defaultPermissions: {
      AGENCY_ADMIN: ['*'],
      SUPERVISOR: ['view_all_residents', 'manage_staff', 'approve_incidents', 'view_reports'],
      CAREGIVER: ['view_assigned_residents', 'log_care', 'log_medications', 'send_messages'],
      FAMILY: ['view_linked_resident', 'view_care_timeline', 'send_messages'],
      SENIOR: ['view_own_data', 'manage_preferences']
    }
  },
  HOME_CARE: {
    type: 'HOME_CARE',
    name: 'Home Care with Caregivers',
    description: 'Home-based care with caregivers and optional supervision, reduced governance overhead',
    enabledModules: {
      workforce: true,
      supervision: false,
      scheduling: true,
      compliance: false,
      familyPortal: true,
      seniorPortal: true,
      messaging: true,
      payroll: false,
      billing: false
    },
    enabledRoles: ['CAREGIVER', 'FAMILY', 'SENIOR'],
    defaultPermissions: {
      CAREGIVER: ['view_assigned_residents', 'log_care', 'log_medications', 'send_messages'],
      FAMILY: ['view_linked_resident', 'view_care_timeline', 'manage_notifications', 'send_messages'],
      SENIOR: ['view_own_data', 'manage_preferences', 'manage_emergency_contacts']
    }
  },
  INDEPENDENT_SENIOR: {
    type: 'INDEPENDENT_SENIOR',
    name: 'Independent Senior with Family Oversight',
    description: 'Senior-controlled care with optional family oversight, workforce modules disabled',
    enabledModules: {
      workforce: false,
      supervision: false,
      scheduling: false,
      compliance: false,
      familyPortal: true,
      seniorPortal: true,
      messaging: true,
      payroll: false,
      billing: false
    },
    enabledRoles: ['SENIOR', 'FAMILY'],
    defaultPermissions: {
      SENIOR: ['*'],
      FAMILY: ['view_linked_resident', 'view_care_timeline', 'receive_notifications', 'send_messages']
    }
  }
};

export function getAvailableTabsForReality(reality: CareRealityType, role: string): string[] {
  const config = CARE_REALITY_CONFIGS[reality];

  const allTabs: Record<string, string[]> = {
    AGENCY_ADMIN: ['dashboard', 'residents', 'staff', 'scheduling', 'compliance', 'billing', 'analytics', 'settings'],
    SUPERVISOR: ['dashboard', 'residents', 'staff', 'incidents', 'reports', 'messaging'],
    CAREGIVER: ['dashboard', 'residents', 'care-log', 'medications', 'messaging', 'shift'],
    FAMILY: ['dashboard', 'care-timeline', 'notifications', 'messaging', 'settings'],
    SENIOR: ['dashboard', 'health', 'medications', 'appointments', 'emergency', 'settings']
  };

  let tabs = allTabs[role] || [];

  if (!config.enabledModules.workforce) {
    tabs = tabs.filter(t => !['staff', 'scheduling', 'shift'].includes(t));
  }

  if (!config.enabledModules.supervision) {
    tabs = tabs.filter(t => !['incidents', 'reports'].includes(t));
  }

  if (!config.enabledModules.compliance) {
    tabs = tabs.filter(t => t !== 'compliance');
  }

  if (!config.enabledModules.payroll || !config.enabledModules.billing) {
    tabs = tabs.filter(t => t !== 'billing');
  }

  if (!config.enabledModules.messaging) {
    tabs = tabs.filter(t => t !== 'messaging');
  }

  return tabs;
}

export function hasPermissionInReality(
  reality: CareRealityType,
  role: string,
  permission: string
): boolean {
  const config = CARE_REALITY_CONFIGS[reality];
  const rolePermissions = config.defaultPermissions[role] || [];

  if (rolePermissions.includes('*')) {
    return true;
  }

  return rolePermissions.includes(permission);
}
