import {
  OperatingMode,
  OPERATING_MODE_CONFIGS,
  StaffMember,
  TaskCompletion,
  HousekeepingReport,
  KitchenReport,
  NursingHandoffReport,
  Department,
  StaffRole
} from '../types/operationalModel';

export interface OperationalResident {
  id: string;
  name: string;
  room: string;
  age: number;
  acuity: 'HIGH' | 'MEDIUM' | 'LOW';
  conditions: string[];
  allergies: string[];
  diet: string;
  meal_plan?: {
    calories_target: number;
    protein_g: number;
    restrictions: string[];
  };
}

export class OperationalDataGenerator {
  public static generateStaff(mode: OperatingMode): StaffMember[] {
    const config = OPERATING_MODE_CONFIGS[mode];
    const staff: StaffMember[] = [];

    if (mode === 'AGENCY') {
      staff.push(
        { id: 'n001', name: 'Sarah Williams', department: 'NURSING', role: 'RN', credentials_verified: true, license_number: 'RN-12345', can_supervise: true, shift: 'DAY', current_assigned_count: 5, max_resident_ratio: 6 },
        { id: 'n002', name: 'Emily Davis', department: 'NURSING', role: 'RN', credentials_verified: true, license_number: 'RN-12346', can_supervise: true, shift: 'EVENING', current_assigned_count: 4, max_resident_ratio: 6 },
        { id: 'n003', name: 'Michelle Lee', department: 'NURSING', role: 'RN', credentials_verified: true, license_number: 'RN-12347', can_supervise: true, shift: 'NIGHT', current_assigned_count: 4, max_resident_ratio: 6 },
        { id: 'n004', name: 'Jennifer Lopez', department: 'NURSING', role: 'LPN', credentials_verified: true, license_number: 'LPN-54321', can_supervise: false, supervisor_id: 'n001', shift: 'DAY', current_assigned_count: 6, max_resident_ratio: 6 },
        { id: 'n005', name: 'Lisa Anderson', department: 'NURSING', role: 'LPN', credentials_verified: true, license_number: 'LPN-54322', can_supervise: false, supervisor_id: 'n002', shift: 'EVENING', current_assigned_count: 5, max_resident_ratio: 6 },
        { id: 'n006', name: 'Jessica Brown', department: 'NURSING', role: 'LPN', credentials_verified: true, license_number: 'LPN-54323', can_supervise: false, supervisor_id: 'n003', shift: 'NIGHT', current_assigned_count: 4, max_resident_ratio: 6 },
        { id: 'n007', name: 'Alice Johnson', department: 'NURSING', role: 'CNA', credentials_verified: true, can_supervise: false, supervisor_id: 'n001', shift: 'DAY', current_assigned_count: 8, max_resident_ratio: 8 },
        { id: 'n008', name: 'Robert Chen', department: 'NURSING', role: 'CNA', credentials_verified: true, can_supervise: false, supervisor_id: 'n001', shift: 'DAY', current_assigned_count: 8, max_resident_ratio: 8 },
        { id: 'n009', name: 'Michael Torres', department: 'NURSING', role: 'CNA', credentials_verified: true, can_supervise: false, supervisor_id: 'n002', shift: 'EVENING', current_assigned_count: 7, max_resident_ratio: 8 },
        { id: 'n010', name: 'David Kim', department: 'NURSING', role: 'CNA', credentials_verified: true, can_supervise: false, supervisor_id: 'n003', shift: 'NIGHT', current_assigned_count: 6, max_resident_ratio: 8 },
        { id: 'n011', name: 'Kevin Martinez', department: 'NURSING', role: 'CNA', credentials_verified: true, can_supervise: false, supervisor_id: 'n001', shift: 'DAY', current_assigned_count: 9, max_resident_ratio: 8 },
        { id: 'n012', name: 'Daniel White', department: 'NURSING', role: 'CNA', credentials_verified: true, can_supervise: false, supervisor_id: 'n003', shift: 'NIGHT', current_assigned_count: 7, max_resident_ratio: 8 },

        { id: 'h001', name: 'Maria Gonzalez', department: 'HOUSEKEEPING', role: 'HOUSEKEEPING_SUPERVISOR', credentials_verified: true, can_supervise: true, shift: 'DAY', current_assigned_count: 0 },
        { id: 'h002', name: 'Carlos Rodriguez', department: 'HOUSEKEEPING', role: 'HOUSEKEEPER', credentials_verified: true, can_supervise: false, supervisor_id: 'h001', shift: 'DAY', current_assigned_count: 0 },
        { id: 'h003', name: 'Rachel Garcia', department: 'HOUSEKEEPING', role: 'HOUSEKEEPER', credentials_verified: true, can_supervise: false, supervisor_id: 'h001', shift: 'EVENING', current_assigned_count: 0 },
        { id: 'h004', name: 'James Wilson', department: 'HOUSEKEEPING', role: 'HOUSEKEEPER', credentials_verified: true, can_supervise: false, supervisor_id: 'h001', shift: 'DAY', current_assigned_count: 0 },
        { id: 'h005', name: 'Linda Martinez', department: 'HOUSEKEEPING', role: 'LAUNDRY_SPECIALIST', credentials_verified: true, can_supervise: false, supervisor_id: 'h001', shift: 'DAY', current_assigned_count: 0 },

        { id: 'k001', name: 'Robert Thompson', department: 'KITCHEN', role: 'KITCHEN_SUPERVISOR', credentials_verified: true, can_supervise: true, shift: 'DAY', current_assigned_count: 0 },
        { id: 'k002', name: 'Angela Chen', department: 'KITCHEN', role: 'COOK', credentials_verified: true, can_supervise: false, supervisor_id: 'k001', shift: 'DAY', current_assigned_count: 0 },
        { id: 'k003', name: 'Patricia Lee', department: 'KITCHEN', role: 'DIETARY_AIDE', credentials_verified: true, can_supervise: false, supervisor_id: 'k001', shift: 'DAY', current_assigned_count: 0 },
        { id: 'k004', name: 'Thomas Brown', department: 'KITCHEN', role: 'MEAL_DELIVERY', credentials_verified: true, can_supervise: false, supervisor_id: 'k001', shift: 'DAY', current_assigned_count: 0 },

        { id: 'a001', name: 'Dr. Jennifer Adams', department: 'ADMIN', role: 'DON', credentials_verified: true, license_number: 'RN-99999', can_supervise: true, shift: 'DAY', current_assigned_count: 0 },
        { id: 'a002', name: 'Mark Davis', department: 'ADMIN', role: 'NURSING_SUPERVISOR', credentials_verified: true, license_number: 'RN-88888', can_supervise: true, shift: 'DAY', current_assigned_count: 0 },
        { id: 'a003', name: 'Susan Miller', department: 'ADMIN', role: 'FACILITY_ADMIN', credentials_verified: true, can_supervise: true, shift: 'DAY', current_assigned_count: 0 }
      );
    } else if (mode === 'HYBRID') {
      staff.push(
        { id: 'n001', name: 'Sarah Williams', department: 'NURSING', role: 'RN', credentials_verified: true, license_number: 'RN-12345', can_supervise: true, shift: 'DAY', current_assigned_count: 8, max_resident_ratio: 10 },
        { id: 'n002', name: 'Emily Davis', department: 'NURSING', role: 'LPN', credentials_verified: true, license_number: 'LPN-54321', can_supervise: false, supervisor_id: 'n001', shift: 'DAY', current_assigned_count: 7, max_resident_ratio: 8 },
        { id: 'n003', name: 'Alice Johnson', department: 'NURSING', role: 'CNA', credentials_verified: true, can_supervise: false, supervisor_id: 'n001', shift: 'DAY', current_assigned_count: 10, max_resident_ratio: 12 },
        { id: 'n004', name: 'Robert Chen', department: 'NURSING', role: 'CNA', credentials_verified: true, can_supervise: false, supervisor_id: 'n001', shift: 'EVENING', current_assigned_count: 8, max_resident_ratio: 12 },
        { id: 'n005', name: 'Michelle Lee', department: 'NURSING', role: 'RN', credentials_verified: true, license_number: 'RN-12346', can_supervise: true, shift: 'EVENING', current_assigned_count: 5, max_resident_ratio: 10 },
        { id: 'n006', name: 'David Kim', department: 'NURSING', role: 'CNA', credentials_verified: true, can_supervise: false, supervisor_id: 'n005', shift: 'NIGHT', current_assigned_count: 6, max_resident_ratio: 12 },

        { id: 'h001', name: 'Maria Gonzalez', department: 'HOUSEKEEPING', role: 'HOUSEKEEPING_SUPERVISOR', credentials_verified: true, can_supervise: true, shift: 'DAY', current_assigned_count: 0, secondary_roles: ['MEAL_DELIVERY'] },
        { id: 'h002', name: 'Carlos Rodriguez', department: 'HOUSEKEEPING', role: 'HOUSEKEEPER', credentials_verified: true, can_supervise: false, supervisor_id: 'h001', shift: 'DAY', current_assigned_count: 0, secondary_roles: ['LAUNDRY_SPECIALIST'] },

        { id: 'k001', name: 'Angela Chen', department: 'KITCHEN', role: 'COOK', credentials_verified: true, can_supervise: true, shift: 'DAY', current_assigned_count: 0, secondary_roles: ['DIETARY_AIDE'] },
        { id: 'k002', name: 'Thomas Brown', department: 'KITCHEN', role: 'MEAL_DELIVERY', credentials_verified: true, can_supervise: false, supervisor_id: 'k001', shift: 'DAY', current_assigned_count: 0 },

        { id: 'a001', name: 'Dr. Jennifer Adams', department: 'ADMIN', role: 'DON', credentials_verified: true, license_number: 'RN-99999', can_supervise: true, shift: 'DAY', current_assigned_count: 0 },
        { id: 'a002', name: 'Mark Davis', department: 'ADMIN', role: 'NURSING_SUPERVISOR', credentials_verified: true, license_number: 'RN-88888', can_supervise: true, shift: 'DAY', current_assigned_count: 0 }
      );
    } else {
      staff.push(
        { id: 'n001', name: 'Sarah Williams', department: 'NURSING', role: 'RN', credentials_verified: true, license_number: 'RN-12345', can_supervise: true, shift: 'DAY', current_assigned_count: 4, max_resident_ratio: 6 },
        { id: 'n002', name: 'Alice Johnson', department: 'NURSING', role: 'CNA', credentials_verified: true, can_supervise: false, supervisor_id: 'n001', shift: 'DAY', current_assigned_count: 4, max_resident_ratio: 6 },
        { id: 'n003', name: 'Robert Chen', department: 'NURSING', role: 'CNA', credentials_verified: true, can_supervise: false, supervisor_id: 'n001', shift: 'EVENING', current_assigned_count: 2, max_resident_ratio: 6 },

        { id: 'h001', name: 'Maria Gonzalez', department: 'HOUSEKEEPING', role: 'HOUSEKEEPER', credentials_verified: true, can_supervise: false, supervisor_id: 'n001', shift: 'DAY', current_assigned_count: 0, secondary_roles: ['COOK', 'MEAL_DELIVERY', 'LAUNDRY_SPECIALIST'] },

        { id: 'k001', name: 'Maria Gonzalez', department: 'KITCHEN', role: 'COOK', credentials_verified: true, can_supervise: false, supervisor_id: 'n001', shift: 'DAY', current_assigned_count: 0, secondary_roles: ['HOUSEKEEPER', 'MEAL_DELIVERY'] },

        { id: 'a001', name: 'Sarah Williams', department: 'ADMIN', role: 'DON', credentials_verified: true, license_number: 'RN-12345', can_supervise: true, shift: 'DAY', current_assigned_count: 0 }
      );
    }

    return staff;
  }

  public static generateResidents(mode: OperatingMode): OperationalResident[] {
    const config = OPERATING_MODE_CONFIGS[mode];
    const residents: OperationalResident[] = [];
    const count = config.resident_count;

    const names = [
      'Margaret Thompson', 'Maria Rodriguez', 'John Smith', 'David Martinez', 'Patricia Wilson',
      'Robert Chen', 'Linda Johnson', 'James Wilson', 'Susan Anderson', 'Thomas Brown',
      'Mary Garcia', 'Charles Davis', 'Barbara Miller', 'Richard Taylor', 'Jennifer White',
      'Michael Lewis', 'Nancy Clark', 'Paul Martinez', 'Sandra Robinson', 'George Harris',
      'Dorothy Lopez', 'Kenneth Young', 'Betty King', 'Steven Wright', 'Helen Scott',
      'Donald Green', 'Carol Baker', 'Ronald Adams', 'Sharon Nelson', 'Gary Hill',
      'Ruth Moore', 'Frank Hall', 'Deborah Allen', 'Larry Torres', 'Donna Campbell',
      'Jerry Mitchell', 'Michelle Carter', 'Dennis Roberts', 'Karen Phillips', 'Walter Evans'
    ];

    const conditions = [
      ['CHF', 'Diabetes Type 2', 'Hypertension'],
      ['COPD', 'Hypertension'],
      ['Diabetes Type 1', 'Peripheral Neuropathy'],
      ['Advanced Dementia', 'Fall Risk'],
      ['Stroke Recovery', 'Left-side Paralysis'],
      ['Parkinsons Disease', 'Dysphagia'],
      ['Atrial Fibrillation', 'History of Stroke'],
      ['End-stage Renal Disease', 'Anemia'],
      ['Osteoarthritis'],
      ['Post-Hip Fracture', 'Pain Management']
    ];

    const allergies = [
      ['Penicillin'],
      ['Sulfa drugs'],
      ['Latex'],
      [],
      ['Shellfish', 'Peanuts'],
      ['Dairy'],
      [],
      ['Eggs'],
      [],
      ['Aspirin']
    ];

    const diets = ['Regular', 'Diabetic', 'Low Sodium', 'Pureed', 'Mechanical Soft', 'Renal', 'Cardiac', 'Gluten-Free'];

    for (let i = 0; i < count; i++) {
      const room = 100 + i + 1;
      const acuity: 'HIGH' | 'MEDIUM' | 'LOW' = i < count * 0.3 ? 'HIGH' : i < count * 0.7 ? 'MEDIUM' : 'LOW';
      const conditionSet = conditions[i % conditions.length];
      const allergySet = allergies[i % allergies.length];
      const diet = diets[i % diets.length];

      residents.push({
        id: `r${String(i + 1).padStart(3, '0')}`,
        name: names[i % names.length] + (i >= names.length ? ` ${Math.floor(i / names.length) + 1}` : ''),
        room: String(room),
        age: 70 + (i % 20),
        acuity,
        conditions: conditionSet,
        allergies: allergySet,
        diet,
        meal_plan: diet === 'Diabetic' || diet === 'Renal' || diet === 'Cardiac' ? {
          calories_target: 1800 + (i % 400),
          protein_g: 60 + (i % 30),
          restrictions: diet === 'Diabetic' ? ['Low sugar', 'Complex carbs'] : diet === 'Renal' ? ['Low potassium', 'Low phosphorus'] : ['Low sodium', 'Low fat']
        } : undefined
      });
    }

    return residents;
  }

  public static generateHousekeepingReports(residents: OperationalResident[], staff: StaffMember[]): HousekeepingReport[] {
    const housekeepers = staff.filter(s => s.department === 'HOUSEKEEPING' && (s.role === 'HOUSEKEEPER' || s.role === 'HOUSEKEEPING_SUPERVISOR'));
    const supervisor = staff.find(s => s.department === 'HOUSEKEEPING' && s.can_supervise);
    const reports: HousekeepingReport[] = [];

    const sampleRooms = residents.slice(0, 15);

    sampleRooms.forEach((resident, idx) => {
      const housekeeper = housekeepers[idx % housekeepers.length];
      const status = idx < 8 ? 'COMPLETED' : idx < 12 ? 'IN_PROGRESS' : 'BLOCKED';
      const ackStatus = idx < 6 ? 'ACKNOWLEDGED' : idx < 8 ? 'APPROVED' : 'PENDING';

      reports.push({
        id: `hr${String(idx + 1).padStart(3, '0')}`,
        room_number: resident.room,
        resident_id: resident.id,
        reported_by_id: housekeeper.id,
        reported_by_name: housekeeper.name,
        reported_at: new Date(Date.now() - (idx * 3600000)).toISOString(),
        voice_transcript: idx % 3 === 0 ? `Habitación ${resident.room} limpiada, sábanas cambiadas, todo listo.` : undefined,
        voice_language: idx % 3 === 0 ? 'es' : 'en',
        translation_confidence: idx % 3 === 0 ? 0.94 : undefined,
        tasks_completed: ['Room cleaning', 'Linen change', 'Surface sanitization', 'Waste disposal'],
        issues_found: idx === 12 ? ['Spill near bed area', 'Call button not working'] : idx === 13 ? ['Bathroom faucet leaking'] : [],
        maintenance_required: idx >= 12,
        maintenance_notes: idx === 12 ? 'Call button needs repair' : idx === 13 ? 'Plumber needed for faucet' : undefined,
        supervisor_acknowledgement: {
          status: ackStatus,
          acknowledged_by_id: ackStatus !== 'PENDING' ? supervisor?.id : undefined,
          acknowledged_by_name: ackStatus !== 'PENDING' ? supervisor?.name : undefined,
          acknowledged_at: ackStatus !== 'PENDING' ? new Date(Date.now() - (idx * 3600000) + 1800000).toISOString() : undefined,
          voice_response: idx === 0 ? 'Good work, continue to next room' : undefined,
          comments: idx === 5 ? 'Approved. Maintenance notified for call button.' : undefined
        },
        status
      });
    });

    return reports;
  }

  public static generateKitchenReports(residents: OperationalResident[], staff: StaffMember[]): KitchenReport[] {
    const cooks = staff.filter(s => s.department === 'KITCHEN' && (s.role === 'COOK' || s.role === 'KITCHEN_SUPERVISOR'));
    const deliveryStaff = staff.filter(s => s.department === 'KITCHEN' && s.role === 'MEAL_DELIVERY');
    const reports: KitchenReport[] = [];

    const mealTypes: Array<'BREAKFAST' | 'LUNCH' | 'DINNER'> = ['BREAKFAST', 'LUNCH', 'DINNER'];

    mealTypes.forEach((mealType, mealIdx) => {
      const cook = cooks[mealIdx % cooks.length];
      const delivery = deliveryStaff[mealIdx % (deliveryStaff.length || 1)];

      reports.push({
        id: `kr${String(mealIdx + 1).padStart(3, '0')}`,
        meal_type: mealType,
        meal_time: mealType === 'BREAKFAST' ? '08:00' : mealType === 'LUNCH' ? '12:00' : '17:00',
        prepared_by_id: cook.id,
        prepared_by_name: cook.name,
        prepared_at: new Date(Date.now() - (24 - mealIdx * 5) * 3600000).toISOString(),
        delivered_by_id: delivery?.id || cook.id,
        delivered_by_name: delivery?.name || cook.name,
        delivered_at: new Date(Date.now() - (24 - mealIdx * 5) * 3600000 + 1800000).toISOString(),
        residents: residents.slice(0, 10).map((resident, idx) => ({
          resident_id: resident.id,
          resident_name: resident.name,
          room_number: resident.room,
          meal_plan: resident.meal_plan ? resident.diet : undefined,
          calories: resident.meal_plan?.calories_target ? Math.floor(resident.meal_plan.calories_target / 3) : undefined,
          macros: resident.meal_plan ? {
            protein: Math.floor(resident.meal_plan.protein_g / 3),
            carbs: 50 + idx,
            fat: 20 + idx
          } : undefined,
          special_diet: resident.diet !== 'Regular' ? resident.diet : undefined,
          allergies: resident.allergies,
          intake_percent: idx < 7 ? 80 + idx * 2 : 50 + idx * 5,
          intake_logged_by_id: `n00${(idx % 3) + 1}`,
          intake_logged_by_name: `Caregiver ${idx % 3 + 1}`,
          intake_logged_at: new Date(Date.now() - (24 - mealIdx * 5) * 3600000 + 3600000).toISOString(),
          concerns: idx === 8 ? 'Food intake declining' : idx === 9 ? 'Refused meal' : undefined
        }))
      });
    });

    return reports;
  }

  public static generateTaskCompletions(residents: OperationalResident[], staff: StaffMember[]): TaskCompletion[] {
    const completions: TaskCompletion[] = [];
    const nursingStaff = staff.filter(s => s.department === 'NURSING');
    const housekeepingStaff = staff.filter(s => s.department === 'HOUSEKEEPING');
    const kitchenStaff = staff.filter(s => s.department === 'KITCHEN');

    residents.slice(0, 20).forEach((resident, idx) => {
      const nurse = nursingStaff[idx % nursingStaff.length];
      const housekeeper = housekeepingStaff[idx % housekeepingStaff.length];
      const kitchenPerson = kitchenStaff[idx % kitchenStaff.length];

      completions.push(
        {
          id: `tc${String(completions.length + 1).padStart(4, '0')}`,
          task_id: `task_${idx}_vitals`,
          task_name: 'Morning vitals check',
          task_category: 'Vitals',
          resident_id: resident.id,
          resident_name: resident.name,
          resident_room: resident.room,
          completed_at: new Date(Date.now() - idx * 3600000).toISOString(),
          completed_by_id: nurse.id,
          completed_by_name: nurse.name,
          completed_by_role: nurse.role as StaffRole,
          completed_by_department: 'NURSING',
          credential_status: 'VERIFIED',
          duration_minutes: 8,
          evidence_type: 'SIGNATURE',
          supervisor_acknowledgement: {
            status: idx < 15 ? 'ACKNOWLEDGED' : 'PENDING',
            acknowledged_by_id: idx < 15 ? 'a002' : undefined,
            acknowledged_by_name: idx < 15 ? 'Mark Davis' : undefined,
            acknowledged_at: idx < 15 ? new Date(Date.now() - idx * 3600000 + 1800000).toISOString() : undefined
          }
        },
        {
          id: `tc${String(completions.length + 2).padStart(4, '0')}`,
          task_id: `task_${idx}_room`,
          task_name: 'Room cleaning',
          task_category: 'Room Cleaning',
          resident_id: resident.id,
          resident_name: resident.name,
          resident_room: resident.room,
          completed_at: new Date(Date.now() - idx * 3600000 - 7200000).toISOString(),
          completed_by_id: housekeeper.id,
          completed_by_name: housekeeper.name,
          completed_by_role: housekeeper.role as StaffRole,
          completed_by_department: 'HOUSEKEEPING',
          credential_status: 'VERIFIED',
          duration_minutes: 25,
          supervisor_acknowledgement: {
            status: idx < 12 ? 'APPROVED' : 'PENDING',
            acknowledged_by_id: idx < 12 ? 'h001' : undefined,
            acknowledged_by_name: idx < 12 ? 'Maria Gonzalez' : undefined,
            acknowledged_at: idx < 12 ? new Date(Date.now() - idx * 3600000 - 5400000).toISOString() : undefined
          }
        }
      );
    });

    return completions;
  }
}
