import { supabase } from '../lib/supabase';

export interface ShowcaseSeederOptions {
  agencyId: string;
  daysOfHistory: number;
  residentCount: number;
  caregiverCount: number;
}

export interface SeedingResult {
  success: boolean;
  agencyId: string;
  residents: string[];
  users: string[];
  departments: string[];
  tasks: string[];
  brainDecisions: string[];
  error?: string;
}

export class ShowcaseSeeder {
  private agencyId: string;
  private options: ShowcaseSeederOptions;

  constructor(options: ShowcaseSeederOptions) {
    this.agencyId = options.agencyId;
    this.options = options;
  }

  async seedAll(): Promise<SeedingResult> {
    const result: SeedingResult = {
      success: false,
      agencyId: this.agencyId,
      residents: [],
      users: [],
      departments: [],
      tasks: [],
      brainDecisions: [],
    };

    try {
      console.log('Starting comprehensive showcase seeding...');

      result.departments = await this.seedDepartments();
      console.log(`Created ${result.departments.length} departments`);

      result.users = await this.seedUsers();
      console.log(`Created ${result.users.length} users`);

      result.residents = await this.seedResidents();
      console.log(`Created ${result.residents.length} residents`);

      await this.seedResidentBaselines(result.residents);
      console.log('Created resident baselines');

      result.tasks = await this.seedTasks(result.residents);
      console.log(`Created ${result.tasks.length} tasks`);

      await this.seedHistoricalData(result.residents, result.tasks);
      console.log('Seeded historical data');

      result.brainDecisions = await this.seedBrainDecisions(result.residents);
      console.log(`Created ${result.brainDecisions.length} brain decisions`);

      result.success = true;
      return result;
    } catch (error) {
      console.error('Seeding error:', error);
      result.error = error instanceof Error ? error.message : 'Unknown error';
      return result;
    }
  }

  private async seedDepartments(): Promise<string[]> {
    const departments = [
      { name: 'Nursing', type: 'clinical', head_count: 8 },
      { name: 'Housekeeping', type: 'support', head_count: 4 },
      { name: 'Kitchen', type: 'support', head_count: 3 },
      { name: 'Activities', type: 'support', head_count: 2 },
    ];

    const departmentIds: string[] = [];

    for (const dept of departments) {
      const { data, error } = await supabase
        .from('departments')
        .insert({
          agency_id: this.agencyId,
          name: dept.name,
          department_type: dept.type,
          head_count: dept.head_count,
          is_active: true,
        })
        .select('id')
        .single();

      if (error) throw error;
      if (data) departmentIds.push(data.id);
    }

    return departmentIds;
  }

  private async seedUsers(): Promise<string[]> {
    const roles = await this.getRoles();
    const departments = await this.getDepartments();

    const users = [
      {
        email: 'supervisor@showcase.care',
        display_name: 'Sarah Johnson',
        role: 'supervisor',
        department: 'Nursing',
      },
      {
        email: 'caregiver1@showcase.care',
        display_name: 'Michael Chen',
        role: 'caregiver',
        department: 'Nursing',
      },
      {
        email: 'caregiver2@showcase.care',
        display_name: 'Emily Rodriguez',
        role: 'caregiver',
        department: 'Nursing',
      },
      {
        email: 'caregiver3@showcase.care',
        display_name: 'David Thompson',
        role: 'caregiver',
        department: 'Nursing',
      },
      {
        email: 'housekeeper@showcase.care',
        display_name: 'Maria Garcia',
        role: 'caregiver',
        department: 'Housekeeping',
      },
      {
        email: 'kitchen@showcase.care',
        display_name: 'Robert Lee',
        role: 'caregiver',
        department: 'Kitchen',
      },
    ];

    const userIds: string[] = [];

    for (const user of users) {
      const roleId = roles.find((r) => r.name === user.role)?.id;
      const deptId = departments.find((d) => d.name === user.department)?.id;

      if (!roleId) continue;

      const authUser = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'Showcase2026!',
        email_confirm: true,
      });

      if (authUser.error) {
        console.error('Error creating auth user:', authUser.error);
        continue;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          id: authUser.data.user!.id,
          agency_id: this.agencyId,
          role_id: roleId,
          display_name: user.display_name,
          is_active: true,
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error creating user profile:', error);
        continue;
      }

      if (deptId && data) {
        await supabase.from('department_personnel').insert({
          department_id: deptId,
          user_id: data.id,
          is_supervisor: user.role === 'supervisor',
        });
      }

      if (data) userIds.push(data.id);
    }

    return userIds;
  }

  private async seedResidents(): Promise<string[]> {
    const residents = [
      {
        first_name: 'Margaret',
        last_name: 'Thompson',
        date_of_birth: '1938-03-15',
        room_number: '101',
        acuity_level: 'medium',
      },
      {
        first_name: 'Robert',
        last_name: 'Williams',
        date_of_birth: '1942-07-22',
        room_number: '102',
        acuity_level: 'high',
      },
      {
        first_name: 'Dorothy',
        last_name: 'Anderson',
        date_of_birth: '1935-11-08',
        room_number: '103',
        acuity_level: 'low',
      },
      {
        first_name: 'James',
        last_name: 'Martinez',
        date_of_birth: '1940-05-30',
        room_number: '104',
        acuity_level: 'medium',
      },
      {
        first_name: 'Patricia',
        last_name: 'Davis',
        date_of_birth: '1943-09-12',
        room_number: '105',
        acuity_level: 'high',
      },
      {
        first_name: 'John',
        last_name: 'Miller',
        date_of_birth: '1937-01-25',
        room_number: '106',
        acuity_level: 'medium',
      },
      {
        first_name: 'Barbara',
        last_name: 'Wilson',
        date_of_birth: '1941-06-18',
        room_number: '107',
        acuity_level: 'low',
      },
      {
        first_name: 'Richard',
        last_name: 'Moore',
        date_of_birth: '1939-10-03',
        room_number: '108',
        acuity_level: 'high',
      },
      {
        first_name: 'Susan',
        last_name: 'Taylor',
        date_of_birth: '1944-02-14',
        room_number: '109',
        acuity_level: 'medium',
      },
      {
        first_name: 'Charles',
        last_name: 'Brown',
        date_of_birth: '1936-12-09',
        room_number: '110',
        acuity_level: 'low',
      },
    ];

    const residentIds: string[] = [];

    for (const resident of residents) {
      const { data, error } = await supabase
        .from('residents')
        .insert({
          agency_id: this.agencyId,
          first_name: resident.first_name,
          last_name: resident.last_name,
          date_of_birth: resident.date_of_birth,
          room_number: resident.room_number,
          admission_date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'active',
          care_level: resident.acuity_level,
        })
        .select('id')
        .single();

      if (error) throw error;
      if (data) residentIds.push(data.id);
    }

    return residentIds;
  }

  private async seedResidentBaselines(residentIds: string[]): Promise<void> {
    for (const residentId of residentIds) {
      const { error: baselineError } = await supabase
        .from('resident_baselines')
        .insert({
          resident_id: residentId,
          mobility_level: this.randomChoice([
            'independent',
            'assisted',
            'wheelchair',
            'bedbound',
          ]),
          cognitive_status: this.randomChoice(['alert', 'confused', 'impaired']),
          dietary_restrictions: this.randomChoice([
            'None',
            'Diabetic',
            'Low sodium',
            'Pureed',
          ]),
          fall_risk: this.randomChoice(['low', 'medium', 'high']),
          vital_signs_baseline: {
            bp_systolic: this.randomRange(110, 140),
            bp_diastolic: this.randomRange(60, 90),
            heart_rate: this.randomRange(60, 90),
            respiratory_rate: this.randomRange(12, 20),
            temperature: this.randomRange(97, 99),
            oxygen_saturation: this.randomRange(95, 100),
          },
          last_updated: new Date().toISOString(),
        });

      if (baselineError) console.error('Baseline error:', baselineError);

      const medications = [
        {
          medication_name: 'Metformin',
          dosage: '500mg',
          frequency: 'twice daily',
        },
        {
          medication_name: 'Lisinopril',
          dosage: '10mg',
          frequency: 'once daily',
        },
        {
          medication_name: 'Aspirin',
          dosage: '81mg',
          frequency: 'once daily',
        },
      ];

      const selectedMeds = medications.slice(0, this.randomRange(1, 3));

      for (const med of selectedMeds) {
        await supabase.from('resident_medications').insert({
          resident_id: residentId,
          medication_name: med.medication_name,
          dosage: med.dosage,
          frequency: med.frequency,
          prescribing_physician: 'Dr. Smith',
          start_date: new Date(
            Date.now() - 90 * 24 * 60 * 60 * 1000
          ).toISOString(),
          is_active: true,
        });
      }
    }
  }

  private async seedTasks(residentIds: string[]): Promise<string[]> {
    const taskCategories = await this.getTaskCategories();
    const departments = await this.getDepartments();
    const users = await this.getUsers();

    const taskIds: string[] = [];
    const now = new Date();

    for (const residentId of residentIds) {
      const tasksToCreate = [
        {
          category: 'medication_administration',
          title: 'Morning Medications',
          scheduled_time: new Date(now.setHours(8, 0, 0, 0)),
          department: 'Nursing',
        },
        {
          category: 'medication_administration',
          title: 'Evening Medications',
          scheduled_time: new Date(now.setHours(20, 0, 0, 0)),
          department: 'Nursing',
        },
        {
          category: 'vital_signs',
          title: 'Morning Vital Signs',
          scheduled_time: new Date(now.setHours(7, 0, 0, 0)),
          department: 'Nursing',
        },
        {
          category: 'adl_assistance',
          title: 'Breakfast Assistance',
          scheduled_time: new Date(now.setHours(8, 30, 0, 0)),
          department: 'Nursing',
        },
        {
          category: 'housekeeping',
          title: 'Room Cleaning',
          scheduled_time: new Date(now.setHours(10, 0, 0, 0)),
          department: 'Housekeeping',
        },
      ];

      for (const task of tasksToCreate) {
        const category = taskCategories.find((c) => c.slug === task.category);
        const dept = departments.find((d) => d.name === task.department);
        const assignee = users.find((u) => u.department_id === dept?.id);

        if (!category || !dept) continue;

        const randomState = this.randomChoice([
          'scheduled',
          'scheduled',
          'scheduled',
          'in_progress',
        ]);

        const { data: adminUser } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('agency_id', this.agencyId)
          .limit(1)
          .single();

        const { data, error } = await supabase
          .from('tasks')
          .insert({
            agency_id: this.agencyId,
            resident_id: residentId,
            category_id: category.id,
            department_id: dept.id,
            owner_user_id: randomState === 'scheduled' ? null : (assignee?.id || null),
            title: task.title,
            priority: this.randomChoice(['low', 'medium', 'high']),
            state: randomState,
            scheduled_start: task.scheduled_time.toISOString(),
            created_by: adminUser?.id || assignee?.id,
          })
          .select('id')
          .single();

        if (error) console.error('Task creation error:', error);
        if (data) taskIds.push(data.id);
      }
    }

    return taskIds;
  }

  private async seedHistoricalData(
    residentIds: string[],
    taskIds: string[]
  ): Promise<void> {
    const daysBack = this.options.daysOfHistory;

    for (let day = 0; day < daysBack; day++) {
      const date = new Date();
      date.setDate(date.getDate() - day);

      for (const residentId of residentIds) {
        if (Math.random() > 0.7) {
          await supabase.from('vital_signs').insert({
            resident_id: residentId,
            recorded_at: date.toISOString(),
            blood_pressure_systolic: this.randomRange(110, 150),
            blood_pressure_diastolic: this.randomRange(60, 95),
            heart_rate: this.randomRange(60, 100),
            respiratory_rate: this.randomRange(12, 24),
            temperature: this.randomRange(97, 100),
            oxygen_saturation: this.randomRange(92, 100),
          });
        }
      }
    }
  }

  private async seedBrainDecisions(residentIds: string[]): Promise<string[]> {
    const decisionIds: string[] = [];

    for (const residentId of residentIds) {
      for (let i = 0; i < 5; i++) {
        const { data, error } = await supabase
          .from('brain_decision_log')
          .insert({
            agency_id: this.agencyId,
            resident_id: residentId,
            decision_type: this.randomChoice([
              'observation',
              'pattern_detection',
              'risk_assessment',
            ]),
            observations: [
              {
                type: 'vital_signs',
                value: 'BP elevated',
                timestamp: new Date().toISOString(),
              },
            ],
            risk_scores: {
              fall_risk: this.randomRange(0, 100) / 100,
              health_decline: this.randomRange(0, 100) / 100,
            },
            reasoning: 'Detected pattern in vital signs over past 3 days',
            decision_output: {
              action: 'monitor',
              confidence: this.randomRange(70, 95) / 100,
            },
            confidence_score: this.randomRange(70, 95) / 100,
            execution_time_ms: this.randomRange(50, 200),
          })
          .select('id')
          .single();

        if (error) console.error('Brain decision error:', error);
        if (data) decisionIds.push(data.id);
      }
    }

    return decisionIds;
  }

  private async getRoles() {
    const { data } = await supabase.from('roles').select('id, name');
    return data || [];
  }

  private async getDepartments() {
    const { data } = await supabase
      .from('departments')
      .select('id, name')
      .eq('agency_id', this.agencyId);
    return data || [];
  }

  private async getTaskCategories() {
    const { data } = await supabase.from('task_categories').select('id, name, slug');
    return data || [];
  }

  private async getUsers() {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, display_name, department_id:department_personnel(department_id)')
      .eq('agency_id', this.agencyId);
    return (
      data?.map((u) => ({
        id: u.id,
        display_name: u.display_name,
        department_id: u.department_id?.[0]?.department_id || null,
      })) || []
    );
  }

  private randomChoice<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private randomRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

export async function createAndSeedShowcaseAgency(
  name: string = 'Showcase Care Facility'
): Promise<SeedingResult> {
  try {
    const { data: agencyData, error: agencyError } = await supabase.rpc(
      'create_showcase_agency',
      {
        agency_name: name,
        agency_type: 'assisted_living',
      }
    );

    if (agencyError) throw agencyError;

    const seeder = new ShowcaseSeeder({
      agencyId: agencyData,
      daysOfHistory: 30,
      residentCount: 10,
      caregiverCount: 8,
    });

    return await seeder.seedAll();
  } catch (error) {
    return {
      success: false,
      agencyId: '',
      residents: [],
      users: [],
      departments: [],
      tasks: [],
      brainDecisions: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function resetShowcaseAgency(agencyId: string): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('reset_showcase_agency', {
      p_agency_id: agencyId,
    });

    if (error) throw error;

    const seeder = new ShowcaseSeeder({
      agencyId,
      daysOfHistory: 30,
      residentCount: 10,
      caregiverCount: 8,
    });

    const result = await seeder.seedAll();
    return result.success;
  } catch (error) {
    console.error('Reset error:', error);
    return false;
  }
}
