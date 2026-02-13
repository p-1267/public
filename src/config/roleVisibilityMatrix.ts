import type { ShowcaseRole } from './showcase';

export type ModuleName =
  | 'TaskExecutionModule'
  | 'MedicationAdministrationModule'
  | 'VoiceDocumentationModule'
  | 'ShiftHandoffModule'
  | 'ResidentLookupModule'
  | 'SupervisorExceptionsModule'
  | 'SupervisorReviewModule'
  | 'SupervisorSchedulingModule'
  | 'AgencyComplianceModule'
  | 'AgencyBillingModule'
  | 'AgencyUsersModule'
  | 'AgencyPoliciesModule'
  | 'DepartmentsModule'
  | 'SeniorHealthInputsModule'
  | 'SeniorMedicationsModule'
  | 'SeniorAppointmentsModule'
  | 'SeniorDevicePairingModule'
  | 'SeniorMessagingModule'
  | 'SeniorSettingsModule'
  | 'FamilyHealthMonitoringModule'
  | 'FamilyCarePlanModule'
  | 'FamilyNotificationsModule'
  | 'FamilySettingsModule'
  | 'FamilyAIAssistantModule'
  | 'IntelligenceSignalModule'
  | 'BrainProofModule'
  | 'CareTimelineModule';

interface VisibilityRule {
  role: ShowcaseRole;
  scenarios: string[];
  modules: ModuleName[];
}

const VISIBILITY_RULES: VisibilityRule[] = [
  {
    role: 'SENIOR',
    scenarios: ['self-managed', 'family-managed', 'direct-hire', 'agency-home', 'agency-facility'],
    modules: [
      'SeniorHealthInputsModule',
      'SeniorMedicationsModule',
      'SeniorAppointmentsModule',
      'SeniorDevicePairingModule',
      'SeniorMessagingModule',
      'SeniorSettingsModule',
      'IntelligenceSignalModule',
      'CareTimelineModule'
    ]
  },
  {
    role: 'FAMILY_VIEWER',
    scenarios: ['family-managed', 'direct-hire', 'agency-home', 'agency-facility'],
    modules: [
      'FamilyHealthMonitoringModule',
      'FamilyCarePlanModule',
      'FamilyNotificationsModule',
      'FamilySettingsModule',
      'FamilyAIAssistantModule',
      'IntelligenceSignalModule',
      'CareTimelineModule'
    ]
  },
  {
    role: 'FAMILY_ADMIN',
    scenarios: ['family-managed', 'direct-hire', 'agency-home', 'agency-facility'],
    modules: [
      'FamilyHealthMonitoringModule',
      'FamilyCarePlanModule',
      'FamilyNotificationsModule',
      'FamilySettingsModule',
      'FamilyAIAssistantModule',
      'IntelligenceSignalModule',
      'CareTimelineModule'
    ]
  },
  {
    role: 'CAREGIVER',
    scenarios: ['direct-hire', 'agency-home', 'agency-facility'],
    modules: [
      'TaskExecutionModule',
      'MedicationAdministrationModule',
      'VoiceDocumentationModule',
      'ResidentLookupModule',
      'IntelligenceSignalModule',
      'BrainProofModule',
      'CareTimelineModule'
    ]
  },
  {
    role: 'SUPERVISOR',
    scenarios: ['agency-home', 'agency-facility'],
    modules: [
      'SupervisorExceptionsModule',
      'SupervisorReviewModule',
      'SupervisorSchedulingModule',
      'ResidentLookupModule',
      'DepartmentsModule',
      'IntelligenceSignalModule',
      'BrainProofModule',
      'CareTimelineModule'
    ]
  },
  {
    role: 'AGENCY_ADMIN',
    scenarios: ['agency-home', 'agency-facility'],
    modules: [
      'AgencyComplianceModule',
      'AgencyBillingModule',
      'AgencyUsersModule',
      'AgencyPoliciesModule',
      'DepartmentsModule',
      'SupervisorSchedulingModule',
      'IntelligenceSignalModule',
      'CareTimelineModule'
    ]
  }
];

export function isModuleVisible(
  role: ShowcaseRole | null,
  scenarioId: string | null,
  moduleName: ModuleName
): boolean {
  if (!role || !scenarioId) return false;

  const rule = VISIBILITY_RULES.find(r => r.role === role);
  if (!rule) return false;

  if (!rule.scenarios.includes(scenarioId)) return false;

  return rule.modules.includes(moduleName);
}

export function isRoleActiveInScenario(role: ShowcaseRole | null, scenarioId: string | null): boolean {
  if (!role || !scenarioId) return false;

  const rule = VISIBILITY_RULES.find(r => r.role === role);
  if (!rule) return false;

  return rule.scenarios.includes(scenarioId);
}

export function getVisibleModulesForRole(role: ShowcaseRole | null, scenarioId: string | null): ModuleName[] {
  if (!role || !scenarioId) return [];

  const rule = VISIBILITY_RULES.find(r => r.role === role);
  if (!rule) return [];

  if (!rule.scenarios.includes(scenarioId)) return [];

  return rule.modules;
}
