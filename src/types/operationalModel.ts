export type Department = 'NURSING' | 'HOUSEKEEPING' | 'KITCHEN' | 'ADMIN';

export type NursingRole = 'RN' | 'LPN' | 'CNA' | 'MED_AIDE';
export type HousekeepingRole = 'HOUSEKEEPING_SUPERVISOR' | 'HOUSEKEEPER' | 'LAUNDRY_SPECIALIST';
export type KitchenRole = 'KITCHEN_SUPERVISOR' | 'COOK' | 'DIETARY_AIDE' | 'MEAL_DELIVERY';
export type AdminRole = 'FACILITY_ADMIN' | 'NURSING_SUPERVISOR' | 'DON';

export type StaffRole = NursingRole | HousekeepingRole | KitchenRole | AdminRole;

export type OperatingMode = 'AGENCY' | 'HYBRID' | 'FAMILY_HOME';

export interface OperatingModeConfig {
  mode: OperatingMode;
  resident_count: number;
  description: string;
  departments: Department[];
  nursing_staff_count: number;
  housekeeping_staff_count: number;
  kitchen_staff_count: number;
  admin_staff_count: number;
  multi_role_allowed: boolean;
}

export interface StaffMember {
  id: string;
  name: string;
  department: Department;
  role: StaffRole;
  credentials_verified: boolean;
  license_number?: string;
  can_supervise: boolean;
  supervisor_id?: string;
  shift: 'DAY' | 'EVENING' | 'NIGHT';
  secondary_roles?: StaffRole[];
  max_resident_ratio?: number;
  current_assigned_count: number;
}

export interface TaskCompletion {
  id: string;
  task_id: string;
  task_name: string;
  task_category: string;
  resident_id: string;
  resident_name: string;
  resident_room: string;
  completed_at: string;
  completed_by_id: string;
  completed_by_name: string;
  completed_by_role: StaffRole;
  completed_by_department: Department;
  credential_status: 'VERIFIED' | 'UNVERIFIED' | 'EXPIRED';
  duration_minutes?: number;
  evidence_type?: 'PHOTO' | 'VOICE' | 'SIGNATURE' | 'BIOMETRIC';
  evidence_id?: string;
  supervisor_acknowledgement?: {
    status: 'PENDING' | 'ACKNOWLEDGED' | 'APPROVED' | 'REJECTED';
    acknowledged_by_id?: string;
    acknowledged_by_name?: string;
    acknowledged_at?: string;
    comments?: string;
  };
  notes?: string;
}

export interface HousekeepingReport {
  id: string;
  room_number: string;
  resident_id?: string;
  reported_by_id: string;
  reported_by_name: string;
  reported_at: string;
  voice_transcript?: string;
  voice_language?: string;
  translation_confidence?: number;
  tasks_completed: string[];
  issues_found: string[];
  maintenance_required: boolean;
  maintenance_notes?: string;
  supervisor_acknowledgement: {
    status: 'PENDING' | 'ACKNOWLEDGED' | 'REJECTED';
    acknowledged_by_id?: string;
    acknowledged_by_name?: string;
    acknowledged_at?: string;
    voice_response?: string;
    comments?: string;
  };
  status: 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
}

export interface KitchenReport {
  id: string;
  meal_type: 'BREAKFAST' | 'LUNCH' | 'DINNER' | 'SNACK';
  meal_time: string;
  prepared_by_id: string;
  prepared_by_name: string;
  prepared_at: string;
  delivered_by_id?: string;
  delivered_by_name?: string;
  delivered_at?: string;
  residents: Array<{
    resident_id: string;
    resident_name: string;
    room_number: string;
    meal_plan?: string;
    calories?: number;
    macros?: {
      protein: number;
      carbs: number;
      fat: number;
    };
    special_diet?: string;
    allergies?: string[];
    intake_percent?: number;
    intake_logged_by_id?: string;
    intake_logged_by_name?: string;
    intake_logged_at?: string;
    concerns?: string;
  }>;
}

export interface NursingHandoffReport {
  id: string;
  shift: 'DAY' | 'EVENING' | 'NIGHT';
  reported_by_id: string;
  reported_by_name: string;
  reported_by_role: NursingRole;
  reported_at: string;
  voice_transcript?: string;
  residents_reported: Array<{
    resident_id: string;
    resident_name: string;
    room_number: string;
    status: 'STABLE' | 'DECLINING' | 'CRITICAL' | 'IMPROVED';
    vitals_concerns?: string[];
    medication_concerns?: string[];
    incident_flags?: string[];
    handoff_notes: string;
  }>;
  supervisor_acknowledgement: {
    status: 'PENDING' | 'ACKNOWLEDGED' | 'APPROVED';
    acknowledged_by_id?: string;
    acknowledged_by_name?: string;
    acknowledged_at?: string;
    comments?: string;
  };
}

export const OPERATING_MODE_CONFIGS: Record<OperatingMode, OperatingModeConfig> = {
  AGENCY: {
    mode: 'AGENCY',
    resident_count: 40,
    description: 'Large facility (50-200 residents) with dedicated departments and specialized staff',
    departments: ['NURSING', 'HOUSEKEEPING', 'KITCHEN', 'ADMIN'],
    nursing_staff_count: 12,
    housekeeping_staff_count: 5,
    kitchen_staff_count: 4,
    admin_staff_count: 3,
    multi_role_allowed: false
  },
  HYBRID: {
    mode: 'HYBRID',
    resident_count: 15,
    description: 'Mid-size facility (10-30 residents) with some shared roles (non-clinical only)',
    departments: ['NURSING', 'HOUSEKEEPING', 'KITCHEN', 'ADMIN'],
    nursing_staff_count: 6,
    housekeeping_staff_count: 2,
    kitchen_staff_count: 2,
    admin_staff_count: 2,
    multi_role_allowed: true
  },
  FAMILY_HOME: {
    mode: 'FAMILY_HOME',
    resident_count: 4,
    description: 'Small family home (1-6 residents) where staff may handle multiple non-clinical roles',
    departments: ['NURSING', 'HOUSEKEEPING', 'KITCHEN', 'ADMIN'],
    nursing_staff_count: 3,
    housekeeping_staff_count: 1,
    kitchen_staff_count: 1,
    admin_staff_count: 1,
    multi_role_allowed: true
  }
};

export interface DepartmentScopeOfPractice {
  department: Department;
  allowed_task_categories: string[];
  requires_license: boolean;
  can_administer_medication: boolean;
  can_perform_clinical_assessment: boolean;
  can_document_clinical: boolean;
  can_access_resident_rooms: boolean;
}

export const DEPARTMENT_SCOPES: Record<Department, DepartmentScopeOfPractice> = {
  NURSING: {
    department: 'NURSING',
    allowed_task_categories: ['Medication', 'Vitals', 'Assessment', 'Wound Care', 'ADL', 'Repositioning', 'Monitoring', 'Documentation'],
    requires_license: true,
    can_administer_medication: true,
    can_perform_clinical_assessment: true,
    can_document_clinical: true,
    can_access_resident_rooms: true
  },
  HOUSEKEEPING: {
    department: 'HOUSEKEEPING',
    allowed_task_categories: ['Room Cleaning', 'Linen Change', 'Laundry', 'Waste Disposal', 'Surface Sanitization', 'Supply Restocking'],
    requires_license: false,
    can_administer_medication: false,
    can_perform_clinical_assessment: false,
    can_document_clinical: false,
    can_access_resident_rooms: true
  },
  KITCHEN: {
    department: 'KITCHEN',
    allowed_task_categories: ['Meal Preparation', 'Meal Delivery', 'Intake Logging', 'Nutrition Monitoring', 'Diet Planning'],
    requires_license: false,
    can_administer_medication: false,
    can_perform_clinical_assessment: false,
    can_document_clinical: false,
    can_access_resident_rooms: true
  },
  ADMIN: {
    department: 'ADMIN',
    allowed_task_categories: ['Approval', 'Audit', 'Staffing', 'Compliance', 'Oversight'],
    requires_license: false,
    can_administer_medication: false,
    can_perform_clinical_assessment: false,
    can_document_clinical: true,
    can_access_resident_rooms: true
  }
};
