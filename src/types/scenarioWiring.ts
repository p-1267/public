export type BackendService =
  | 'brain_state'
  | 'users'
  | 'roles'
  | 'permissions'
  | 'residents'
  | 'assignments'
  | 'medications'
  | 'shifts'
  | 'attendance'
  | 'devices'
  | 'messaging'
  | 'audit_log'
  | 'ai_inputs'
  | 'notifications'
  | 'voice_docs'
  | 'reports'
  | 'compliance';

export type DataMode = 'REAL' | 'SIMULATED' | 'READ_ONLY';

export type BlockReason =
  | 'BRAIN_BLOCK'
  | 'PERMISSION_DENIED'
  | 'INSURANCE_EXPIRED'
  | 'ONBOARDING_INCOMPLETE'
  | 'SOP_VIOLATION'
  | 'EMERGENCY_ACTIVE';

export interface TabWiring {
  tabId: string;
  tabName: string;
  scenarios: string[];
  allowedRoles: string[];
  backendServices: BackendService[];
  dataMode: DataMode;
  purpose: string;
  status: 'FULLY_WIRED' | 'PARTIALLY_WIRED' | 'MISSING' | 'EXTRA';
  issues?: string[];
}

export interface ActionWiring {
  actionId: string;
  actionName: string;
  tabId: string;
  purpose: string;
  opensModal?: string;
  opensForm?: string;
  readsData: BackendService[];
  writesData: BackendService[];
  canBeBlocked: boolean;
  blockReasons?: BlockReason[];
  allowedRoles: string[];
  scenarios: string[];
  isSimulatedInShowcase: boolean;
  status: 'WIRED' | 'MISSING' | 'BROKEN';
  issues?: string[];
}

export interface FormWiring {
  formId: string;
  formName: string;
  purpose: string;
  requiredFields: string[];
  optionalFields: string[];
  validationRules: Record<string, string>;
  backendTarget: BackendService;
  scenarios: string[];
  allowedRoles: string[];
  missingFields?: string[];
  extraFields?: string[];
  status: 'COMPLETE' | 'INCOMPLETE' | 'MISCONFIGURED';
}

export interface ReportWiring {
  reportId: string;
  reportName: string;
  dataSource: BackendService[];
  filters: string[];
  scenarios: string[];
  allowedRoles: string[];
  exportEnabled: boolean;
  status: 'AVAILABLE' | 'MISSING' | 'MISCONFIGURED';
}

export interface LanguageWiring {
  supportedLanguages: string[];
  voiceInputLanguages: string[];
  outputLanguages: string[];
  translationMode: 'DETERMINISTIC' | 'AI_ASSISTED' | 'NONE';
  storageLocation: 'voice_documentation' | 'care_logs' | 'reports';
  scenarios: string[];
}

export interface ScenarioWiringValidation {
  scenarioId: string;
  scenarioName: string;
  tabs: TabWiring[];
  actions: ActionWiring[];
  forms: FormWiring[];
  reports: ReportWiring[];
  language: LanguageWiring;
  overallStatus: 'VALID' | 'NEEDS_REVIEW' | 'INCOMPLETE';
  gaps: string[];
  extras: string[];
  mismatches: string[];
}
