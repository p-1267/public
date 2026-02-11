import { supabase } from '../lib/supabase';

interface TaskSeedConfig {
  agencyId: string;
  residentIds: string[];
  caregiverIds: string[];
  supervisorId: string;
  operatingMode: 'AGENCY' | 'HYBRID' | 'FAMILY_HOME';
}

const DEPARTMENT_TASK_TEMPLATES = [
  {
    department: 'NURSING',
    categoryType: 'clinical',
    tasks: [
      { name: 'Morning Medication', duration: 15, priority: 'high', requiresEvidence: true },
      { name: 'Vital Signs Check', duration: 10, priority: 'medium', requiresEvidence: true },
      { name: 'Wound Care', duration: 20, priority: 'high', requiresEvidence: true },
      { name: 'Blood Pressure Monitor', duration: 5, priority: 'medium', requiresEvidence: true },
      { name: 'Evening Medication', duration: 15, priority: 'high', requiresEvidence: true },
    ]
  },
  {
    department: 'HOUSEKEEPING',
    categoryType: 'housekeeping',
    tasks: [
      { name: 'Room Cleaning', duration: 30, priority: 'medium', requiresEvidence: false },
      { name: 'Bed Linen Change', duration: 15, priority: 'medium', requiresEvidence: false },
      { name: 'Bathroom Sanitization', duration: 20, priority: 'high', requiresEvidence: true },
      { name: 'Floor Mopping', duration: 15, priority: 'low', requiresEvidence: false },
    ]
  },
  {
    department: 'KITCHEN',
    categoryType: 'cooking',
    tasks: [
      { name: 'Breakfast Delivery', duration: 10, priority: 'high', requiresEvidence: false },
      { name: 'Lunch Delivery', duration: 10, priority: 'high', requiresEvidence: false },
      { name: 'Dinner Delivery', duration: 10, priority: 'high', requiresEvidence: false },
      { name: 'Meal Intake Tracking', duration: 5, priority: 'medium', requiresEvidence: true },
    ]
  },
  {
    department: 'HYGIENE',
    categoryType: 'hygiene',
    tasks: [
      { name: 'Morning Hygiene Assistance', duration: 25, priority: 'high', requiresEvidence: true },
      { name: 'Oral Care', duration: 10, priority: 'medium', requiresEvidence: true },
      { name: 'Shower Assistance', duration: 30, priority: 'high', requiresEvidence: true },
      { name: 'Evening Hygiene', duration: 20, priority: 'medium', requiresEvidence: true },
    ]
  },
  {
    department: 'MOBILITY',
    categoryType: 'clinical',
    tasks: [
      { name: 'Morning Walk', duration: 20, priority: 'medium', requiresEvidence: false },
      { name: 'Physical Therapy', duration: 30, priority: 'high', requiresEvidence: true },
      { name: 'Transfer Assistance', duration: 10, priority: 'high', requiresEvidence: false },
    ]
  },
  {
    department: 'NUTRITION',
    categoryType: 'nutrition',
    tasks: [
      { name: 'Dietary Assessment', duration: 15, priority: 'medium', requiresEvidence: true },
      { name: 'Snack Delivery', duration: 5, priority: 'low', requiresEvidence: false },
      { name: 'Hydration Check', duration: 5, priority: 'medium', requiresEvidence: true },
    ]
  },
  {
    department: 'MONITORING',
    categoryType: 'monitoring',
    tasks: [
      { name: 'Hourly Wellness Check', duration: 5, priority: 'medium', requiresEvidence: false },
      { name: 'Fall Risk Assessment', duration: 10, priority: 'high', requiresEvidence: true },
      { name: 'Behavior Observation', duration: 10, priority: 'medium', requiresEvidence: true },
    ]
  }
];

const TASK_SCHEDULE = {
  NURSING: [
    { task: 'Morning Medication', time: '08:00' },
    { task: 'Vital Signs Check', time: '09:00' },
    { task: 'Blood Pressure Monitor', time: '14:00' },
    { task: 'Evening Medication', time: '18:00' },
  ],
  HOUSEKEEPING: [
    { task: 'Room Cleaning', time: '10:00' },
    { task: 'Bathroom Sanitization', time: '11:00' },
    { task: 'Bed Linen Change', time: '15:00' },
  ],
  KITCHEN: [
    { task: 'Breakfast Delivery', time: '07:30' },
    { task: 'Lunch Delivery', time: '12:00' },
    { task: 'Dinner Delivery', time: '17:30' },
    { task: 'Meal Intake Tracking', time: '18:30' },
  ],
  HYGIENE: [
    { task: 'Morning Hygiene Assistance', time: '07:00' },
    { task: 'Oral Care', time: '08:30' },
    { task: 'Evening Hygiene', time: '19:00' },
  ],
  MOBILITY: [
    { task: 'Morning Walk', time: '09:30' },
    { task: 'Transfer Assistance', time: '11:30' },
  ],
  NUTRITION: [
    { task: 'Hydration Check', time: '10:30' },
    { task: 'Snack Delivery', time: '15:30' },
  ],
  MONITORING: [
    { task: 'Hourly Wellness Check', time: '10:00' },
    { task: 'Fall Risk Assessment', time: '13:00' },
  ]
};

export class ShowcaseTaskSeeder {
  private config: TaskSeedConfig;
  private categoryIds: Map<string, string> = new Map();
  private templateIds: Map<string, string> = new Map();

  constructor(config: TaskSeedConfig) {
    this.config = config;
  }

  async seedAll(): Promise<void> {
    console.log('[ShowcaseTaskSeeder] Starting seed process...');

    try {
      await this.cleanExistingData();
      await this.createCategories();
      await this.createTemplates();
      await this.createTodaysTasks();
      await this.createSomeCompletedTasks();

      console.log('[ShowcaseTaskSeeder] Seed complete!');
    } catch (error) {
      console.error('[ShowcaseTaskSeeder] Seed failed:', error);
      throw error;
    }
  }

  private async cleanExistingData(): Promise<void> {
    const { error: tasksError } = await supabase
      .from('tasks')
      .delete()
      .eq('agency_id', this.config.agencyId);

    const { error: templatesError } = await supabase
      .from('task_templates')
      .delete()
      .eq('agency_id', this.config.agencyId);

    const { error: categoriesError } = await supabase
      .from('task_categories')
      .delete()
      .eq('agency_id', this.config.agencyId);

    if (tasksError) console.warn('Clean tasks error:', tasksError);
    if (templatesError) console.warn('Clean templates error:', templatesError);
    if (categoriesError) console.warn('Clean categories error:', categoriesError);
  }

  private async createCategories(): Promise<void> {
    for (const dept of DEPARTMENT_TASK_TEMPLATES) {
      const { data, error } = await supabase.rpc('seed_showcase_task_category', {
        p_agency_id: this.config.agencyId,
        p_name: dept.department,
        p_category_type: dept.categoryType,
        p_description: `${dept.department} department tasks`,
        p_default_priority: 'MEDIUM',
        p_requires_evidence: true,
        p_allows_skip: true
      });

      if (error) {
        console.warn(`Category ${dept.department} error:`, error);
      } else if (data?.category_id) {
        this.categoryIds.set(dept.department, data.category_id);
      }
    }

    console.log(`[ShowcaseTaskSeeder] Created ${this.categoryIds.size} categories`);
  }

  private async createTemplates(): Promise<void> {
    for (const dept of DEPARTMENT_TASK_TEMPLATES) {
      const categoryId = this.categoryIds.get(dept.department);
      if (!categoryId) continue;

      for (const task of dept.tasks) {
        const { data, error } = await supabase.rpc('seed_showcase_task_template', {
          p_agency_id: this.config.agencyId,
          p_category_id: categoryId,
          p_name: task.name,
          p_description: `Standard ${task.name.toLowerCase()} procedure`,
          p_department: dept.department,
          p_default_priority: task.priority.toUpperCase(),
          p_estimated_duration_minutes: task.duration
        });

        if (error) {
          console.warn(`Template ${task.name} error:`, error);
        } else if (data?.template_id) {
          this.templateIds.set(task.name, data.template_id);
        }
      }
    }

    console.log(`[ShowcaseTaskSeeder] Created ${this.templateIds.size} templates`);
  }

  private async createTodaysTasks(): Promise<void> {
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    let taskCount = 0;

    for (const [dept, schedule] of Object.entries(TASK_SCHEDULE)) {
      for (const residentId of this.config.residentIds) {
        for (const { task, time } of schedule) {
          const templateId = this.templateIds.get(task);
          if (!templateId) continue;

          const template = DEPARTMENT_TASK_TEMPLATES
            .flatMap(d => d.tasks)
            .find(t => t.name === task);

          if (!template) continue;

          const scheduledStart = new Date(`${dateStr}T${time}:00`);
          const scheduledEnd = new Date(scheduledStart.getTime() + template.duration * 60000);
          const now = new Date();

          let state = 'scheduled';
          if (scheduledStart < now && scheduledEnd > now) {
            state = 'due';
          } else if (scheduledEnd < now) {
            state = Math.random() > 0.3 ? 'due' : 'overdue';
          }

          const caregiverId = this.config.caregiverIds[
            Math.floor(Math.random() * this.config.caregiverIds.length)
          ];

          const categoryId = this.categoryIds.get(dept);

          const { error } = await supabase.rpc('seed_showcase_task', {
            p_agency_id: this.config.agencyId,
            p_resident_id: residentId,
            p_task_name: task,
            p_department: dept,
            p_priority: template.priority.toUpperCase(),
            p_scheduled_start: scheduledStart.toISOString(),
            p_scheduled_end: scheduledEnd.toISOString(),
            p_state: state,
            p_category_id: categoryId || null,
            p_template_id: templateId,
            p_owner_user_id: caregiverId,
            p_responsibility_role: 'CAREGIVER',
            p_requires_evidence: template.requiresEvidence
          });

          if (error) {
            console.warn(`Task ${task} error:`, error);
          } else {
            taskCount++;
          }
        }
      }
    }

    console.log(`[ShowcaseTaskSeeder] Created ${taskCount} tasks for today`);
  }

  private async createSomeCompletedTasks(): Promise<void> {
    const { data: dueTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, requires_evidence')
      .eq('agency_id', this.config.agencyId)
      .in('state', ['due', 'overdue'])
      .limit(5);

    if (fetchError || !dueTasks) return;

    for (const task of dueTasks) {
      const actualEnd = new Date(Date.now() - Math.random() * 3600000);
      const actualStart = new Date(actualEnd.getTime() - 15 * 60000);

      const { error: updateError } = await supabase
        .from('tasks')
        .update({
          state: 'completed',
          actual_start: actualStart.toISOString(),
          actual_end: actualEnd.toISOString(),
          outcome: 'success',
          evidence_submitted: task.requires_evidence,
          supervisor_acknowledged: false
        })
        .eq('id', task.id);

      if (updateError) console.warn('Update task error:', updateError);
    }

    console.log(`[ShowcaseTaskSeeder] Marked ${dueTasks.length} tasks as completed`);
  }
}

export async function seedShowcaseTasks(config: TaskSeedConfig): Promise<void> {
  const seeder = new ShowcaseTaskSeeder(config);
  await seeder.seedAll();
}
