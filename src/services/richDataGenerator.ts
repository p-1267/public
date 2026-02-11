export interface RichResident {
  id: string;
  name: string;
  room: string;
  acuity: 'HIGH' | 'MEDIUM' | 'LOW';
  age: number;
  conditions: string[];
  medications: Array<{
    name: string;
    scheduled_time: string;
    route: 'ORAL' | 'INJECTABLE' | 'TOPICAL';
    requires_license: boolean;
  }>;
  vital_history: Array<{
    date: string;
    food_intake_percent: number;
    mobility_score: number;
    alertness_score: number;
    blood_pressure?: string;
    notes?: string;
  }>;
  medication_history: Array<{
    date: string;
    medication: string;
    scheduled: string;
    actual: string;
    minutes_late: number;
  }>;
  tasks_today: Array<{
    id: string;
    name: string;
    status: 'completed' | 'pending' | 'overdue';
    due_time: string;
    category: string;
    requires_license: boolean;
  }>;
  risk_factors: string[];
}

export interface RichCaregiver {
  id: string;
  name: string;
  role: 'RN' | 'LPN' | 'CNA' | 'HOUSEKEEPING' | 'AGENCY_FLOAT';
  has_rn_license: boolean;
  has_lpn_license: boolean;
  can_give_injectable_meds: boolean;
  can_give_oral_meds: boolean;
  can_perform_wound_care: boolean;
  can_perform_clinical_assessment: boolean;
  max_resident_ratio: number;
  current_assigned_count: number;
  shift: 'DAY' | 'EVENING' | 'NIGHT';
  credentials_verified: boolean;
  last_training_date: string;
  violations: Array<{
    date: string;
    type: string;
    severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
    description: string;
  }>;
}

export class RichDataGenerator {
  public static generateResidents(): RichResident[] {
    return [
      {
        id: 'r001',
        name: 'Margaret Thompson',
        room: '308',
        acuity: 'HIGH',
        age: 84,
        conditions: ['CHF', 'Diabetes Type 2', 'Hypertension', 'Early Dementia'],
        medications: [
          { name: 'Insulin (Humalog)', scheduled_time: '08:00', route: 'INJECTABLE', requires_license: true },
          { name: 'Furosemide 40mg', scheduled_time: '09:00', route: 'ORAL', requires_license: false },
          { name: 'Metformin 500mg', scheduled_time: '09:00', route: 'ORAL', requires_license: false },
        ],
        vital_history: [
          { date: '2026-01-01', food_intake_percent: 85, mobility_score: 5, alertness_score: 5 },
          { date: '2026-01-02', food_intake_percent: 80, mobility_score: 5, alertness_score: 5 },
          { date: '2026-01-03', food_intake_percent: 65, mobility_score: 4, alertness_score: 4, notes: 'Less responsive' },
          { date: '2026-01-04', food_intake_percent: 50, mobility_score: 3, alertness_score: 3, notes: 'Significant decline' },
          { date: '2026-01-05', food_intake_percent: 45, mobility_score: 3, alertness_score: 3, notes: 'Continued deterioration' },
          { date: '2026-01-06', food_intake_percent: 40, mobility_score: 2, alertness_score: 2, notes: 'CRITICAL - physician notified' },
        ],
        medication_history: [
          { date: '2026-01-04', medication: 'Insulin', scheduled: '08:00', actual: '08:05', minutes_late: 5 },
          { date: '2026-01-05', medication: 'Insulin', scheduled: '08:00', actual: '08:03', minutes_late: 3 },
        ],
        tasks_today: [
          { id: 't001', name: 'Morning insulin injection', status: 'pending', due_time: '08:00', category: 'Medication', requires_license: true },
          { id: 't002', name: 'Vital signs check', status: 'overdue', due_time: '06:00', category: 'Vitals', requires_license: false },
          { id: 't003', name: 'Breakfast assistance', status: 'pending', due_time: '08:30', category: 'Nutrition', requires_license: false },
        ],
        risk_factors: ['Multi-system deterioration over 6 days', 'Food intake declined 45% from baseline', 'Mobility declined 3 points', 'Possible infection/metabolic crisis']
      },
      {
        id: 'r002',
        name: 'Maria Rodriguez',
        room: '204',
        acuity: 'MEDIUM',
        age: 78,
        conditions: ['Hypertension', 'Osteoarthritis', 'GERD'],
        medications: [
          { name: 'Lisinopril 10mg', scheduled_time: '09:00', route: 'ORAL', requires_license: false },
          { name: 'Omeprazole 20mg', scheduled_time: '09:00', route: 'ORAL', requires_license: false },
        ],
        vital_history: [
          { date: '2026-01-06', food_intake_percent: 90, mobility_score: 5, alertness_score: 5, blood_pressure: '142/88' },
        ],
        medication_history: [
          { date: '2026-01-01', medication: 'Lisinopril', scheduled: '09:00', actual: '09:32', minutes_late: 32 },
          { date: '2026-01-03', medication: 'Lisinopril', scheduled: '09:00', actual: '09:28', minutes_late: 28 },
          { date: '2026-01-05', medication: 'Lisinopril', scheduled: '09:00', actual: '09:45', minutes_late: 45 },
          { date: '2026-01-06', medication: 'Lisinopril', scheduled: '09:00', actual: '09:38', minutes_late: 38 },
        ],
        tasks_today: [
          { id: 't010', name: 'Morning medication', status: 'overdue', due_time: '09:00', category: 'Medication', requires_license: false },
          { id: 't011', name: 'Blood pressure check', status: 'pending', due_time: '09:15', category: 'Vitals', requires_license: false },
        ],
        risk_factors: ['Medication timing compliance <70%', 'Pattern: 4 late administrations in 6 days', 'Blood pressure control may be compromised']
      },
      {
        id: 'r003',
        name: 'John Smith',
        room: '108',
        acuity: 'HIGH',
        age: 72,
        conditions: ['Diabetes Type 1', 'Peripheral Neuropathy', 'Stage 3 Pressure Ulcer'],
        medications: [
          { name: 'Insulin Novolog', scheduled_time: '07:30', route: 'INJECTABLE', requires_license: true },
          { name: 'Gabapentin 300mg', scheduled_time: '08:00', route: 'ORAL', requires_license: false },
        ],
        vital_history: [
          { date: '2026-01-06', food_intake_percent: 85, mobility_score: 4, alertness_score: 5 },
        ],
        medication_history: [],
        tasks_today: [
          { id: 't020', name: 'Insulin injection', status: 'pending', due_time: '07:30', category: 'Medication', requires_license: true },
          { id: 't021', name: 'Wound care (stage 3 ulcer)', status: 'pending', due_time: '10:00', category: 'Wound Care', requires_license: true },
        ],
        risk_factors: ['High-acuity resident requiring licensed care', 'Complex wound requiring RN/LPN', 'Insulin-dependent diabetes']
      },
      {
        id: 'r004',
        name: 'David Martinez',
        room: '210',
        acuity: 'MEDIUM',
        age: 81,
        conditions: ['Diabetes Type 2', 'Mild Cognitive Impairment'],
        medications: [
          { name: 'Metformin 1000mg', scheduled_time: '12:30', route: 'ORAL', requires_license: false },
        ],
        vital_history: [
          { date: '2026-01-06', food_intake_percent: 90, mobility_score: 5, alertness_score: 5 },
        ],
        medication_history: [],
        tasks_today: [
          { id: 't030', name: 'Post-meal medication', status: 'pending', due_time: '12:30', category: 'Medication', requires_license: false },
          { id: 't031', name: 'Room cleaning', status: 'pending', due_time: '12:30', category: 'Housekeeping', requires_license: false },
        ],
        risk_factors: ['Scheduling conflict: medication window overlaps housekeeping']
      },
      {
        id: 'r005',
        name: 'Patricia Wilson',
        room: '156',
        acuity: 'LOW',
        age: 76,
        conditions: ['Osteoporosis', 'Mild Anxiety'],
        medications: [
          { name: 'Calcium + Vitamin D', scheduled_time: '09:00', route: 'ORAL', requires_license: false },
        ],
        vital_history: [
          { date: '2026-01-06', food_intake_percent: 95, mobility_score: 5, alertness_score: 5 },
        ],
        medication_history: [],
        tasks_today: [
          { id: 't040', name: 'Morning medication', status: 'completed', due_time: '09:00', category: 'Medication', requires_license: false },
          { id: 't041', name: 'ADL assistance', status: 'completed', due_time: '08:00', category: 'ADL', requires_license: false },
        ],
        risk_factors: []
      },
      {
        id: 'r006',
        name: 'Robert Chen',
        room: '315',
        acuity: 'MEDIUM',
        age: 79,
        conditions: ['COPD', 'Hypertension'],
        medications: [
          { name: 'Albuterol inhaler', scheduled_time: '08:00', route: 'ORAL', requires_license: false },
          { name: 'Amlodipine 5mg', scheduled_time: '09:00', route: 'ORAL', requires_license: false },
        ],
        vital_history: [
          { date: '2026-01-06', food_intake_percent: 80, mobility_score: 4, alertness_score: 5 },
        ],
        medication_history: [],
        tasks_today: [
          { id: 't050', name: 'Respiratory therapy', status: 'pending', due_time: '10:00', category: 'Therapy', requires_license: false },
        ],
        risk_factors: []
      },
      {
        id: 'r007',
        name: 'Linda Johnson',
        room: '412',
        acuity: 'HIGH',
        age: 88,
        conditions: ['Advanced Dementia', 'Frequent Falls', 'Aspiration Risk'],
        medications: [
          { name: 'Memantine 10mg', scheduled_time: '09:00', route: 'ORAL', requires_license: false },
        ],
        vital_history: [
          { date: '2026-01-04', food_intake_percent: 70, mobility_score: 3, alertness_score: 2 },
          { date: '2026-01-05', food_intake_percent: 65, mobility_score: 3, alertness_score: 2 },
          { date: '2026-01-06', food_intake_percent: 60, mobility_score: 2, alertness_score: 2, notes: 'Increased confusion' },
        ],
        medication_history: [],
        tasks_today: [
          { id: 't060', name: 'Thickened liquids monitoring', status: 'pending', due_time: '08:30', category: 'Nutrition', requires_license: false },
          { id: 't061', name: 'Fall risk assessment', status: 'overdue', due_time: '07:00', category: 'Assessment', requires_license: true },
        ],
        risk_factors: ['Fall risk increasing', 'Aspiration precautions required', 'Declining food intake']
      },
      {
        id: 'r008',
        name: 'James Wilson',
        room: '103',
        acuity: 'LOW',
        age: 74,
        conditions: ['Benign Prostatic Hyperplasia'],
        medications: [
          { name: 'Tamsulosin 0.4mg', scheduled_time: '21:00', route: 'ORAL', requires_license: false },
        ],
        vital_history: [
          { date: '2026-01-06', food_intake_percent: 100, mobility_score: 5, alertness_score: 5 },
        ],
        medication_history: [],
        tasks_today: [],
        risk_factors: []
      },
      {
        id: 'r009',
        name: 'Susan Anderson',
        room: '207',
        acuity: 'MEDIUM',
        age: 83,
        conditions: ['Atrial Fibrillation', 'History of Stroke'],
        medications: [
          { name: 'Warfarin 5mg', scheduled_time: '17:00', route: 'ORAL', requires_license: false },
          { name: 'Metoprolol 50mg', scheduled_time: '09:00', route: 'ORAL', requires_license: false },
        ],
        vital_history: [
          { date: '2026-01-06', food_intake_percent: 85, mobility_score: 4, alertness_score: 5 },
        ],
        medication_history: [],
        tasks_today: [
          { id: 't070', name: 'INR check (due)', status: 'overdue', due_time: '08:00', category: 'Lab', requires_license: true },
        ],
        risk_factors: ['Overdue INR check for warfarin management', 'Bleeding risk if INR not monitored']
      },
      {
        id: 'r010',
        name: 'Thomas Brown',
        room: '501',
        acuity: 'HIGH',
        age: 86,
        conditions: ['End-stage Renal Disease', 'Anemia', 'Fluid Overload'],
        medications: [
          { name: 'Epoetin injection', scheduled_time: '10:00', route: 'INJECTABLE', requires_license: true },
        ],
        vital_history: [
          { date: '2026-01-05', food_intake_percent: 60, mobility_score: 3, alertness_score: 4 },
          { date: '2026-01-06', food_intake_percent: 55, mobility_score: 3, alertness_score: 3, notes: 'Increased edema' },
        ],
        medication_history: [],
        tasks_today: [
          { id: 't080', name: 'Epoetin injection', status: 'pending', due_time: '10:00', category: 'Medication', requires_license: true },
          { id: 't081', name: 'Fluid restriction monitoring', status: 'pending', due_time: '12:00', category: 'Monitoring', requires_license: false },
        ],
        risk_factors: ['Renal failure progression', 'Fluid overload', 'Requires RN for injection']
      },
      {
        id: 'r011',
        name: 'Mary Garcia',
        room: '118',
        acuity: 'LOW',
        age: 71,
        conditions: ['Hypothyroidism', 'Mild Depression'],
        medications: [
          { name: 'Levothyroxine 75mcg', scheduled_time: '07:00', route: 'ORAL', requires_license: false },
        ],
        vital_history: [
          { date: '2026-01-06', food_intake_percent: 90, mobility_score: 5, alertness_score: 5 },
        ],
        medication_history: [],
        tasks_today: [
          { id: 't090', name: 'Morning medication', status: 'completed', due_time: '07:00', category: 'Medication', requires_license: false },
        ],
        risk_factors: []
      },
      {
        id: 'r012',
        name: 'Charles Davis',
        room: '225',
        acuity: 'MEDIUM',
        age: 80,
        conditions: ['Parkinsons Disease', 'Dysphagia'],
        medications: [
          { name: 'Carbidopa-Levodopa', scheduled_time: '08:00', route: 'ORAL', requires_license: false },
        ],
        vital_history: [
          { date: '2026-01-06', food_intake_percent: 70, mobility_score: 3, alertness_score: 4 },
        ],
        medication_history: [
          { date: '2026-01-05', medication: 'Carbidopa-Levodopa', scheduled: '08:00', actual: '08:40', minutes_late: 40 },
        ],
        tasks_today: [
          { id: 't100', name: 'Parkinsons medication', status: 'overdue', due_time: '08:00', category: 'Medication', requires_license: false },
          { id: 't101', name: 'Swallow assessment', status: 'pending', due_time: '10:00', category: 'Assessment', requires_license: true },
        ],
        risk_factors: ['Medication timing critical for Parkinsons', 'Dysphagia requires monitoring']
      },
      {
        id: 'r013',
        name: 'Barbara Miller',
        room: '309',
        acuity: 'HIGH',
        age: 85,
        conditions: ['Post-Hip Fracture', 'Pain Management', 'DVT Risk'],
        medications: [
          { name: 'Enoxaparin injection', scheduled_time: '08:00', route: 'INJECTABLE', requires_license: true },
          { name: 'Oxycodone 5mg', scheduled_time: '09:00', route: 'ORAL', requires_license: false },
        ],
        vital_history: [
          { date: '2026-01-06', food_intake_percent: 75, mobility_score: 2, alertness_score: 4 },
        ],
        medication_history: [],
        tasks_today: [
          { id: 't110', name: 'DVT prophylaxis injection', status: 'pending', due_time: '08:00', category: 'Medication', requires_license: true },
          { id: 't111', name: 'Pain assessment', status: 'pending', due_time: '09:00', category: 'Assessment', requires_license: true },
          { id: 't112', name: 'Physical therapy', status: 'pending', due_time: '14:00', category: 'Therapy', requires_license: false },
        ],
        risk_factors: ['Post-surgical requiring RN care', 'DVT risk if injection missed', 'Limited mobility']
      },
      {
        id: 'r014',
        name: 'Richard Taylor',
        room: '405',
        acuity: 'LOW',
        age: 73,
        conditions: ['Benign Essential Tremor'],
        medications: [
          { name: 'Propranolol 40mg', scheduled_time: '09:00', route: 'ORAL', requires_license: false },
        ],
        vital_history: [
          { date: '2026-01-06', food_intake_percent: 95, mobility_score: 5, alertness_score: 5 },
        ],
        medication_history: [],
        tasks_today: [],
        risk_factors: []
      },
      {
        id: 'r015',
        name: 'Jennifer White',
        room: '512',
        acuity: 'MEDIUM',
        age: 77,
        conditions: ['Type 2 Diabetes', 'Chronic Kidney Disease Stage 3'],
        medications: [
          { name: 'Glipizide 5mg', scheduled_time: '08:00', route: 'ORAL', requires_license: false },
        ],
        vital_history: [
          { date: '2026-01-06', food_intake_percent: 80, mobility_score: 4, alertness_score: 5 },
        ],
        medication_history: [],
        tasks_today: [
          { id: 't120', name: 'Blood glucose check', status: 'pending', due_time: '07:30', category: 'Vitals', requires_license: false },
        ],
        risk_factors: []
      },
      {
        id: 'r016',
        name: 'Michael Lewis',
        room: '221',
        acuity: 'HIGH',
        age: 82,
        conditions: ['COPD Exacerbation', 'Oxygen Dependent', 'CHF'],
        medications: [
          { name: 'Prednisone 20mg', scheduled_time: '09:00', route: 'ORAL', requires_license: false },
          { name: 'Furosemide 40mg', scheduled_time: '09:00', route: 'ORAL', requires_license: false },
        ],
        vital_history: [
          { date: '2026-01-04', food_intake_percent: 70, mobility_score: 3, alertness_score: 4 },
          { date: '2026-01-05', food_intake_percent: 65, mobility_score: 3, alertness_score: 3, notes: 'Increased SOB' },
          { date: '2026-01-06', food_intake_percent: 60, mobility_score: 2, alertness_score: 3, notes: 'O2 sat 88% on 3L' },
        ],
        medication_history: [],
        tasks_today: [
          { id: 't130', name: 'Oxygen saturation monitoring', status: 'overdue', due_time: '06:00', category: 'Vitals', requires_license: false },
          { id: 't131', name: 'Respiratory assessment', status: 'overdue', due_time: '08:00', category: 'Assessment', requires_license: true },
        ],
        risk_factors: ['Respiratory status declining', 'O2 saturation borderline', 'CHF exacerbation possible']
      },
      {
        id: 'r017',
        name: 'Nancy Clark',
        room: '114',
        acuity: 'LOW',
        age: 75,
        conditions: ['Osteoarthritis'],
        medications: [
          { name: 'Ibuprofen 400mg', scheduled_time: '08:00', route: 'ORAL', requires_license: false },
        ],
        vital_history: [
          { date: '2026-01-06', food_intake_percent: 90, mobility_score: 5, alertness_score: 5 },
        ],
        medication_history: [],
        tasks_today: [],
        risk_factors: []
      },
      {
        id: 'r018',
        name: 'Paul Martinez',
        room: '318',
        acuity: 'MEDIUM',
        age: 81,
        conditions: ['Glaucoma', 'Hypertension'],
        medications: [
          { name: 'Latanoprost eye drops', scheduled_time: '21:00', route: 'TOPICAL', requires_license: false },
          { name: 'Losartan 50mg', scheduled_time: '09:00', route: 'ORAL', requires_license: false },
        ],
        vital_history: [
          { date: '2026-01-06', food_intake_percent: 85, mobility_score: 5, alertness_score: 5 },
        ],
        medication_history: [],
        tasks_today: [],
        risk_factors: []
      },
      {
        id: 'r019',
        name: 'Sandra Robinson',
        room: '206',
        acuity: 'HIGH',
        age: 87,
        conditions: ['Stroke Recovery', 'Left-side Paralysis', 'Dysphagia'],
        medications: [
          { name: 'Aspirin 81mg', scheduled_time: '09:00', route: 'ORAL', requires_license: false },
          { name: 'Clopidogrel 75mg', scheduled_time: '09:00', route: 'ORAL', requires_license: false },
        ],
        vital_history: [
          { date: '2026-01-06', food_intake_percent: 60, mobility_score: 2, alertness_score: 4 },
        ],
        medication_history: [],
        tasks_today: [
          { id: 't140', name: 'Neurological assessment', status: 'pending', due_time: '08:00', category: 'Assessment', requires_license: true },
          { id: 't141', name: 'Modified diet supervision', status: 'pending', due_time: '08:30', category: 'Nutrition', requires_license: false },
          { id: 't142', name: 'Position change', status: 'overdue', due_time: '06:00', category: 'Repositioning', requires_license: false },
        ],
        risk_factors: ['Pressure ulcer risk due to immobility', 'Aspiration risk', 'Requires licensed assessment']
      },
      {
        id: 'r020',
        name: 'George Harris',
        room: '411',
        acuity: 'LOW',
        age: 76,
        conditions: ['Benign Prostate', 'Mild Arthritis'],
        medications: [
          { name: 'Finasteride 5mg', scheduled_time: '09:00', route: 'ORAL', requires_license: false },
        ],
        vital_history: [
          { date: '2026-01-06', food_intake_percent: 100, mobility_score: 5, alertness_score: 5 },
        ],
        medication_history: [],
        tasks_today: [],
        risk_factors: []
      }
    ];
  }

  public static generateCaregivers(): RichCaregiver[] {
    return [
      {
        id: 'c001',
        name: 'Sarah Williams',
        role: 'RN',
        has_rn_license: true,
        has_lpn_license: false,
        can_give_injectable_meds: true,
        can_give_oral_meds: true,
        can_perform_wound_care: true,
        can_perform_clinical_assessment: true,
        max_resident_ratio: 6,
        current_assigned_count: 4,
        shift: 'DAY',
        credentials_verified: true,
        last_training_date: '2025-11-15',
        violations: []
      },
      {
        id: 'c002',
        name: 'Alice Johnson',
        role: 'CNA',
        has_rn_license: false,
        has_lpn_license: false,
        can_give_injectable_meds: false,
        can_give_oral_meds: true,
        can_perform_wound_care: false,
        can_perform_clinical_assessment: false,
        max_resident_ratio: 8,
        current_assigned_count: 6,
        shift: 'DAY',
        credentials_verified: true,
        last_training_date: '2025-12-01',
        violations: []
      },
      {
        id: 'c003',
        name: 'Robert Chen',
        role: 'CNA',
        has_rn_license: false,
        has_lpn_license: false,
        can_give_injectable_meds: false,
        can_give_oral_meds: true,
        can_perform_wound_care: false,
        can_perform_clinical_assessment: false,
        max_resident_ratio: 8,
        current_assigned_count: 8,
        shift: 'DAY',
        credentials_verified: true,
        last_training_date: '2025-10-20',
        violations: [
          {
            date: '2025-12-15',
            type: 'Scope violation',
            severity: 'MAJOR',
            description: 'Attempted to administer insulin without RN supervision'
          }
        ]
      },
      {
        id: 'c004',
        name: 'Jennifer Lopez',
        role: 'LPN',
        has_rn_license: false,
        has_lpn_license: true,
        can_give_injectable_meds: true,
        can_give_oral_meds: true,
        can_perform_wound_care: true,
        can_perform_clinical_assessment: false,
        max_resident_ratio: 6,
        current_assigned_count: 5,
        shift: 'DAY',
        credentials_verified: true,
        last_training_date: '2025-11-30',
        violations: []
      },
      {
        id: 'c005',
        name: 'Michael Torres',
        role: 'CNA',
        has_rn_license: false,
        has_lpn_license: false,
        can_give_injectable_meds: false,
        can_give_oral_meds: true,
        can_perform_wound_care: false,
        can_perform_clinical_assessment: false,
        max_resident_ratio: 8,
        current_assigned_count: 7,
        shift: 'EVENING',
        credentials_verified: true,
        last_training_date: '2025-12-10',
        violations: []
      },
      {
        id: 'c006',
        name: 'Emily Davis',
        role: 'RN',
        has_rn_license: true,
        has_lpn_license: false,
        can_give_injectable_meds: true,
        can_give_oral_meds: true,
        can_perform_wound_care: true,
        can_perform_clinical_assessment: true,
        max_resident_ratio: 6,
        current_assigned_count: 3,
        shift: 'EVENING',
        credentials_verified: true,
        last_training_date: '2025-12-05',
        violations: []
      },
      {
        id: 'c007',
        name: 'David Kim',
        role: 'CNA',
        has_rn_license: false,
        has_lpn_license: false,
        can_give_injectable_meds: false,
        can_give_oral_meds: true,
        can_perform_wound_care: false,
        can_perform_clinical_assessment: false,
        max_resident_ratio: 8,
        current_assigned_count: 6,
        shift: 'NIGHT',
        credentials_verified: true,
        last_training_date: '2025-11-01',
        violations: []
      },
      {
        id: 'c008',
        name: 'Jessica Brown',
        role: 'LPN',
        has_rn_license: false,
        has_lpn_license: true,
        can_give_injectable_meds: true,
        can_give_oral_meds: true,
        can_perform_wound_care: true,
        can_perform_clinical_assessment: false,
        max_resident_ratio: 6,
        current_assigned_count: 4,
        shift: 'NIGHT',
        credentials_verified: true,
        last_training_date: '2025-12-01',
        violations: []
      },
      {
        id: 'c009',
        name: 'Carlos Rodriguez',
        role: 'HOUSEKEEPING',
        has_rn_license: false,
        has_lpn_license: false,
        can_give_injectable_meds: false,
        can_give_oral_meds: false,
        can_perform_wound_care: false,
        can_perform_clinical_assessment: false,
        max_resident_ratio: 0,
        current_assigned_count: 0,
        shift: 'DAY',
        credentials_verified: true,
        last_training_date: '2025-10-15',
        violations: []
      },
      {
        id: 'c010',
        name: 'Amanda Wilson',
        role: 'AGENCY_FLOAT',
        has_rn_license: true,
        has_lpn_license: false,
        can_give_injectable_meds: true,
        can_give_oral_meds: true,
        can_perform_wound_care: true,
        can_perform_clinical_assessment: true,
        max_resident_ratio: 6,
        current_assigned_count: 2,
        shift: 'DAY',
        credentials_verified: false,
        last_training_date: '2025-09-10',
        violations: [
          {
            date: '2025-12-20',
            type: 'Credentials not verified',
            severity: 'CRITICAL',
            description: 'Agency RN license not yet verified by facility'
          }
        ]
      },
      {
        id: 'c011',
        name: 'Kevin Martinez',
        role: 'CNA',
        has_rn_license: false,
        has_lpn_license: false,
        can_give_injectable_meds: false,
        can_give_oral_meds: true,
        can_perform_wound_care: false,
        can_perform_clinical_assessment: false,
        max_resident_ratio: 8,
        current_assigned_count: 9,
        shift: 'DAY',
        credentials_verified: true,
        last_training_date: '2025-11-20',
        violations: [
          {
            date: '2026-01-06',
            type: 'Ratio violation',
            severity: 'MAJOR',
            description: 'Assigned 9 residents, exceeds maximum of 8'
          }
        ]
      },
      {
        id: 'c012',
        name: 'Lisa Anderson',
        role: 'LPN',
        has_rn_license: false,
        has_lpn_license: true,
        can_give_injectable_meds: true,
        can_give_oral_meds: true,
        can_perform_wound_care: true,
        can_perform_clinical_assessment: false,
        max_resident_ratio: 6,
        current_assigned_count: 6,
        shift: 'EVENING',
        credentials_verified: true,
        last_training_date: '2025-12-08',
        violations: []
      },
      {
        id: 'c013',
        name: 'James Taylor',
        role: 'CNA',
        has_rn_license: false,
        has_lpn_license: false,
        can_give_injectable_meds: false,
        can_give_oral_meds: true,
        can_perform_wound_care: false,
        can_perform_clinical_assessment: false,
        max_resident_ratio: 8,
        current_assigned_count: 5,
        shift: 'EVENING',
        credentials_verified: true,
        last_training_date: '2025-11-15',
        violations: []
      },
      {
        id: 'c014',
        name: 'Michelle Lee',
        role: 'RN',
        has_rn_license: true,
        has_lpn_license: false,
        can_give_injectable_meds: true,
        can_give_oral_meds: true,
        can_perform_wound_care: true,
        can_perform_clinical_assessment: true,
        max_resident_ratio: 6,
        current_assigned_count: 5,
        shift: 'NIGHT',
        credentials_verified: true,
        last_training_date: '2025-12-12',
        violations: []
      },
      {
        id: 'c015',
        name: 'Daniel White',
        role: 'CNA',
        has_rn_license: false,
        has_lpn_license: false,
        can_give_injectable_meds: false,
        can_give_oral_meds: true,
        can_perform_wound_care: false,
        can_perform_clinical_assessment: false,
        max_resident_ratio: 8,
        current_assigned_count: 7,
        shift: 'NIGHT',
        credentials_verified: true,
        last_training_date: '2025-10-30',
        violations: []
      },
      {
        id: 'c016',
        name: 'Rachel Garcia',
        role: 'HOUSEKEEPING',
        has_rn_license: false,
        has_lpn_license: false,
        can_give_injectable_meds: false,
        can_give_oral_meds: false,
        can_perform_wound_care: false,
        can_perform_clinical_assessment: false,
        max_resident_ratio: 0,
        current_assigned_count: 0,
        shift: 'EVENING',
        credentials_verified: true,
        last_training_date: '2025-11-05',
        violations: []
      },
      {
        id: 'c017',
        name: 'Brian Thompson',
        role: 'CNA',
        has_rn_license: false,
        has_lpn_license: false,
        can_give_injectable_meds: false,
        can_give_oral_meds: true,
        can_perform_wound_care: false,
        can_perform_clinical_assessment: false,
        max_resident_ratio: 8,
        current_assigned_count: 8,
        shift: 'DAY',
        credentials_verified: true,
        last_training_date: '2025-09-20',
        violations: [
          {
            date: '2025-11-10',
            type: 'Documentation error',
            severity: 'MINOR',
            description: 'Failed to document ADL assistance for 2 residents'
          }
        ]
      },
      {
        id: 'c018',
        name: 'Nicole Harris',
        role: 'AGENCY_FLOAT',
        has_rn_license: false,
        has_lpn_license: true,
        can_give_injectable_meds: true,
        can_give_oral_meds: true,
        can_perform_wound_care: true,
        can_perform_clinical_assessment: false,
        max_resident_ratio: 6,
        current_assigned_count: 3,
        shift: 'EVENING',
        credentials_verified: true,
        last_training_date: '2025-10-01',
        violations: []
      }
    ];
  }
}
