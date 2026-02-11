import type { ShowcaseRole } from '../config/showcase';
import type { ScenarioId } from '../config/scenarioArchitecture';
import type { ScenarioWiringValidation, TabWiring, ActionWiring, FormWiring, ReportWiring, LanguageWiring } from '../types/scenarioWiring';

const AGENCY_MANAGED_TABS: TabWiring[] = [
  {
    tabId: 'state',
    tabName: 'State',
    scenarios: ['agency-managed-care'],
    allowedRoles: ['AGENCY_ADMIN', 'SUPERVISOR'],
    backendServices: ['brain_state'],
    dataMode: 'READ_ONLY',
    purpose: 'View current brain state and transitions',
    status: 'FULLY_WIRED'
  },
  {
    tabId: 'dashboard',
    tabName: 'Dashboard',
    scenarios: ['agency-managed-care'],
    allowedRoles: ['AGENCY_ADMIN', 'SUPERVISOR'],
    backendServices: ['residents', 'assignments', 'shifts', 'brain_state'],
    dataMode: 'SIMULATED',
    purpose: 'Overview of agency operations',
    status: 'FULLY_WIRED'
  },
  {
    tabId: 'agency',
    tabName: 'Agency',
    scenarios: ['agency-managed-care'],
    allowedRoles: ['AGENCY_ADMIN'],
    backendServices: ['users', 'residents', 'assignments'],
    dataMode: 'SIMULATED',
    purpose: 'Manage agency settings and configuration',
    status: 'FULLY_WIRED'
  },
  {
    tabId: 'users',
    tabName: 'Users',
    scenarios: ['agency-managed-care'],
    allowedRoles: ['AGENCY_ADMIN', 'SUPERVISOR'],
    backendServices: ['users', 'roles', 'permissions'],
    dataMode: 'SIMULATED',
    purpose: 'Manage staff users and roles',
    status: 'FULLY_WIRED'
  },
  {
    tabId: 'residents',
    tabName: 'Residents',
    scenarios: ['agency-managed-care'],
    allowedRoles: ['AGENCY_ADMIN', 'SUPERVISOR'],
    backendServices: ['residents'],
    dataMode: 'SIMULATED',
    purpose: 'Manage resident profiles',
    status: 'FULLY_WIRED'
  },
  {
    tabId: 'assignments',
    tabName: 'Assignments',
    scenarios: ['agency-managed-care'],
    allowedRoles: ['AGENCY_ADMIN', 'SUPERVISOR', 'CAREGIVER'],
    backendServices: ['assignments', 'residents', 'users'],
    dataMode: 'SIMULATED',
    purpose: 'Manage caregiver-resident assignments',
    status: 'FULLY_WIRED'
  },
  {
    tabId: 'senior',
    tabName: 'My Care',
    scenarios: ['agency-managed-care'],
    allowedRoles: ['SENIOR', 'FAMILY_VIEWER'],
    backendServices: ['residents', 'medications', 'brain_state'],
    dataMode: 'READ_ONLY',
    purpose: 'View care timeline and status',
    status: 'FULLY_WIRED'
  },
  {
    tabId: 'audit',
    tabName: 'Audit Log',
    scenarios: ['agency-managed-care'],
    allowedRoles: ['AGENCY_ADMIN', 'SUPERVISOR'],
    backendServices: ['audit_log'],
    dataMode: 'READ_ONLY',
    purpose: 'View audit trail',
    status: 'FULLY_WIRED'
  },
  {
    tabId: 'ai-inputs',
    tabName: 'AI Inputs',
    scenarios: ['agency-managed-care'],
    allowedRoles: ['AGENCY_ADMIN', 'SUPERVISOR', 'CAREGIVER'],
    backendServices: ['ai_inputs'],
    dataMode: 'SIMULATED',
    purpose: 'View AI learning inputs',
    status: 'FULLY_WIRED'
  },
  {
    tabId: 'compliance',
    tabName: 'Compliance',
    scenarios: ['agency-managed-care'],
    allowedRoles: ['AGENCY_ADMIN', 'SUPERVISOR'],
    backendServices: ['compliance'],
    dataMode: 'SIMULATED',
    purpose: 'View compliance status',
    status: 'FULLY_WIRED'
  }
];

const HOME_CARE_TABS: TabWiring[] = [
  {
    tabId: 'assignments',
    tabName: 'Assignments',
    scenarios: ['home-care-hybrid'],
    allowedRoles: ['CAREGIVER'],
    backendServices: ['assignments', 'residents', 'medications'],
    dataMode: 'SIMULATED',
    purpose: 'View and execute care assignments',
    status: 'FULLY_WIRED'
  },
  {
    tabId: 'senior',
    tabName: 'My Care',
    scenarios: ['home-care-hybrid'],
    allowedRoles: ['SENIOR', 'FAMILY_VIEWER'],
    backendServices: ['residents', 'medications', 'brain_state'],
    dataMode: 'SIMULATED',
    purpose: 'View care timeline and self-service features',
    status: 'FULLY_WIRED'
  },
  {
    tabId: 'ai-inputs',
    tabName: 'AI Inputs',
    scenarios: ['home-care-hybrid'],
    allowedRoles: ['CAREGIVER'],
    backendServices: ['ai_inputs'],
    dataMode: 'SIMULATED',
    purpose: 'View AI suggestions',
    status: 'FULLY_WIRED'
  }
];

const INDEPENDENT_SENIOR_TABS: TabWiring[] = [
  {
    tabId: 'senior',
    tabName: 'My Care',
    scenarios: ['independent-senior-family'],
    allowedRoles: ['SENIOR', 'FAMILY_VIEWER'],
    backendServices: ['residents', 'medications', 'brain_state', 'devices'],
    dataMode: 'SIMULATED',
    purpose: 'Self-service care management',
    status: 'FULLY_WIRED'
  }
];

const AGENCY_ACTIONS: ActionWiring[] = [
  {
    actionId: 'add-caregiver',
    actionName: 'Add Caregiver',
    tabId: 'users',
    purpose: 'Create new caregiver user',
    opensModal: 'UserInviteModal',
    readsData: ['roles', 'permissions'],
    writesData: ['users'],
    canBeBlocked: true,
    blockReasons: ['ONBOARDING_INCOMPLETE', 'INSURANCE_EXPIRED'],
    allowedRoles: ['AGENCY_ADMIN'],
    scenarios: ['agency-managed-care'],
    isSimulatedInShowcase: true,
    status: 'WIRED'
  },
  {
    actionId: 'add-resident',
    actionName: 'Add Resident',
    tabId: 'residents',
    purpose: 'Create new resident profile',
    opensModal: 'ResidentForm',
    readsData: [],
    writesData: ['residents'],
    canBeBlocked: true,
    blockReasons: ['ONBOARDING_INCOMPLETE'],
    allowedRoles: ['AGENCY_ADMIN', 'SUPERVISOR'],
    scenarios: ['agency-managed-care'],
    isSimulatedInShowcase: true,
    status: 'WIRED'
  },
  {
    actionId: 'assign-caregiver',
    actionName: 'Assign Caregiver',
    tabId: 'assignments',
    purpose: 'Assign caregiver to resident',
    opensModal: 'AssignmentForm',
    readsData: ['users', 'residents'],
    writesData: ['assignments'],
    canBeBlocked: true,
    blockReasons: ['PERMISSION_DENIED'],
    allowedRoles: ['AGENCY_ADMIN', 'SUPERVISOR'],
    scenarios: ['agency-managed-care'],
    isSimulatedInShowcase: true,
    status: 'WIRED'
  },
  {
    actionId: 'log-medication',
    actionName: 'Log Medication',
    tabId: 'assignments',
    purpose: 'Record medication administration',
    opensModal: 'MedicationLogModal',
    readsData: ['medications', 'residents'],
    writesData: ['medications'],
    canBeBlocked: true,
    blockReasons: ['BRAIN_BLOCK', 'SOP_VIOLATION', 'EMERGENCY_ACTIVE'],
    allowedRoles: ['CAREGIVER'],
    scenarios: ['agency-managed-care', 'home-care-hybrid'],
    isSimulatedInShowcase: true,
    status: 'WIRED'
  },
  {
    actionId: 'trigger-emergency',
    actionName: 'Trigger Emergency',
    tabId: 'assignments',
    purpose: 'Trigger emergency state transition',
    opensModal: 'EmergencyModal',
    readsData: ['brain_state'],
    writesData: ['brain_state'],
    canBeBlocked: false,
    allowedRoles: ['CAREGIVER', 'SUPERVISOR', 'SENIOR'],
    scenarios: ['agency-managed-care', 'home-care-hybrid', 'independent-senior-family'],
    isSimulatedInShowcase: true,
    status: 'WIRED'
  }
];

const AGENCY_FORMS: FormWiring[] = [
  {
    formId: 'user-invite-form',
    formName: 'User Invitation Form',
    purpose: 'Invite new staff member',
    requiredFields: ['email', 'display_name', 'role'],
    optionalFields: ['phone', 'credentials'],
    validationRules: {
      email: 'Valid email format',
      display_name: 'Non-empty string',
      role: 'Must be valid role from roles table'
    },
    backendTarget: 'users',
    scenarios: ['agency-managed-care'],
    allowedRoles: ['AGENCY_ADMIN'],
    status: 'COMPLETE'
  },
  {
    formId: 'resident-form',
    formName: 'Resident Profile Form',
    purpose: 'Create or edit resident profile',
    requiredFields: ['full_name', 'date_of_birth'],
    optionalFields: ['room_number', 'emergency_contacts', 'physicians', 'medications'],
    validationRules: {
      full_name: 'Non-empty string',
      date_of_birth: 'Valid date in past'
    },
    backendTarget: 'residents',
    scenarios: ['agency-managed-care', 'home-care-hybrid'],
    allowedRoles: ['AGENCY_ADMIN', 'SUPERVISOR'],
    status: 'COMPLETE'
  },
  {
    formId: 'medication-log-form',
    formName: 'Medication Administration Form',
    purpose: 'Log medication administration',
    requiredFields: ['medication_id', 'administered_at', 'administered_by'],
    optionalFields: ['notes', 'witness'],
    validationRules: {
      medication_id: 'Must exist in medications table',
      administered_at: 'Valid timestamp within allowed window'
    },
    backendTarget: 'medications',
    scenarios: ['agency-managed-care', 'home-care-hybrid'],
    allowedRoles: ['CAREGIVER'],
    status: 'COMPLETE'
  }
];

const REPORTS: ReportWiring[] = [
  {
    reportId: 'care-timeline',
    reportName: 'Care Timeline',
    dataSource: ['brain_state', 'medications', 'assignments'],
    filters: ['date_range', 'resident', 'caregiver'],
    scenarios: ['agency-managed-care', 'home-care-hybrid', 'independent-senior-family'],
    allowedRoles: ['AGENCY_ADMIN', 'SUPERVISOR', 'CAREGIVER', 'SENIOR', 'FAMILY_VIEWER'],
    exportEnabled: false,
    status: 'AVAILABLE'
  },
  {
    reportId: 'audit-log',
    reportName: 'Audit Log',
    dataSource: ['audit_log'],
    filters: ['date_range', 'table_name', 'user_id'],
    scenarios: ['agency-managed-care'],
    allowedRoles: ['AGENCY_ADMIN', 'SUPERVISOR'],
    exportEnabled: false,
    status: 'AVAILABLE'
  },
  {
    reportId: 'medication-report',
    reportName: 'Medication Administration Report',
    dataSource: ['medications'],
    filters: ['date_range', 'resident', 'medication_name'],
    scenarios: ['agency-managed-care', 'home-care-hybrid'],
    allowedRoles: ['AGENCY_ADMIN', 'SUPERVISOR'],
    exportEnabled: false,
    status: 'AVAILABLE'
  }
];

const LANGUAGE_CONFIG: LanguageWiring = {
  supportedLanguages: ['en', 'es', 'zh', 'ar', 'hi'],
  voiceInputLanguages: ['en', 'es', 'zh', 'ar', 'hi'],
  outputLanguages: ['en', 'es', 'zh', 'ar', 'hi'],
  translationMode: 'AI_ASSISTED',
  storageLocation: 'voice_documentation',
  scenarios: ['agency-managed-care', 'home-care-hybrid']
};

export function validateScenarioWiring(scenarioId: ScenarioId, currentRole: ShowcaseRole): ScenarioWiringValidation {
  const scenarioName = getScenarioName(scenarioId);
  const tabs = getTabsForScenario(scenarioId, currentRole);
  const actions = getActionsForScenario(scenarioId, currentRole);
  const forms = getFormsForScenario(scenarioId, currentRole);
  const reports = getReportsForScenario(scenarioId, currentRole);
  const language = LANGUAGE_CONFIG;

  const gaps: string[] = [];
  const extras: string[] = [];
  const mismatches: string[] = [];

  tabs.forEach(tab => {
    if (tab.status === 'MISSING') gaps.push(`Tab missing: ${tab.tabName}`);
    if (tab.status === 'EXTRA') extras.push(`Extra tab: ${tab.tabName}`);
    if (tab.issues) mismatches.push(...tab.issues);
  });

  actions.forEach(action => {
    if (action.status === 'MISSING') gaps.push(`Action missing: ${action.actionName} in ${action.tabId}`);
    if (action.status === 'BROKEN') mismatches.push(`Action broken: ${action.actionName}`);
    if (action.issues) mismatches.push(...action.issues);
  });

  forms.forEach(form => {
    if (form.status === 'INCOMPLETE') gaps.push(`Form incomplete: ${form.formName}`);
    if (form.status === 'MISCONFIGURED') mismatches.push(`Form misconfigured: ${form.formName}`);
    if (form.missingFields?.length) gaps.push(`Missing fields in ${form.formName}: ${form.missingFields.join(', ')}`);
  });

  const overallStatus = gaps.length === 0 && mismatches.length === 0 ? 'VALID' :
                       gaps.length > 0 ? 'INCOMPLETE' : 'NEEDS_REVIEW';

  return {
    scenarioId,
    scenarioName,
    tabs,
    actions,
    forms,
    reports,
    language,
    overallStatus,
    gaps,
    extras,
    mismatches
  };
}

function getScenarioName(scenarioId: ScenarioId): string {
  const names: Record<ScenarioId, string> = {
    'agency-managed-care': 'Agency-Managed Care',
    'home-care-hybrid': 'Home Care (Hybrid)',
    'independent-senior-family': 'Independent Senior + Family'
  };
  return names[scenarioId];
}

function getTabsForScenario(scenarioId: ScenarioId, currentRole: ShowcaseRole): TabWiring[] {
  let tabs: TabWiring[] = [];

  switch (scenarioId) {
    case 'agency-managed-care':
      tabs = AGENCY_MANAGED_TABS;
      break;
    case 'home-care-hybrid':
      tabs = HOME_CARE_TABS;
      break;
    case 'independent-senior-family':
      tabs = INDEPENDENT_SENIOR_TABS;
      break;
  }

  return tabs.filter(tab => tab.allowedRoles.includes(currentRole));
}

function getActionsForScenario(scenarioId: ScenarioId, currentRole: ShowcaseRole): ActionWiring[] {
  return AGENCY_ACTIONS.filter(
    action => action.scenarios.includes(scenarioId) && action.allowedRoles.includes(currentRole)
  );
}

function getFormsForScenario(scenarioId: ScenarioId, currentRole: ShowcaseRole): FormWiring[] {
  return AGENCY_FORMS.filter(
    form => form.scenarios.includes(scenarioId) && form.allowedRoles.includes(currentRole)
  );
}

function getReportsForScenario(scenarioId: ScenarioId, currentRole: ShowcaseRole): ReportWiring[] {
  return REPORTS.filter(
    report => report.scenarios.includes(scenarioId) && report.allowedRoles.includes(currentRole)
  );
}

export function getWiringSummary(validation: ScenarioWiringValidation): string {
  const lines: string[] = [];

  lines.push(`Scenario: ${validation.scenarioName}`);
  lines.push(`Status: ${validation.overallStatus}`);
  lines.push(`Tabs: ${validation.tabs.length}`);
  lines.push(`Actions: ${validation.actions.length}`);
  lines.push(`Forms: ${validation.forms.length}`);
  lines.push(`Reports: ${validation.reports.length}`);

  if (validation.gaps.length > 0) {
    lines.push(`\nGaps: ${validation.gaps.length}`);
    validation.gaps.forEach(gap => lines.push(`  - ${gap}`));
  }

  if (validation.extras.length > 0) {
    lines.push(`\nExtras: ${validation.extras.length}`);
    validation.extras.forEach(extra => lines.push(`  - ${extra}`));
  }

  if (validation.mismatches.length > 0) {
    lines.push(`\nMismatches: ${validation.mismatches.length}`);
    validation.mismatches.forEach(mismatch => lines.push(`  - ${mismatch}`));
  }

  return lines.join('\n');
}
