import { supabase } from '../lib/supabase';

export interface ScenarioStep {
  name: string;
  action: () => Promise<any>;
  validation: (result: any) => Promise<boolean>;
  errorMessage?: string;
}

export interface ScenarioResult {
  scenarioName: string;
  passed: boolean;
  steps: {
    name: string;
    passed: boolean;
    error?: string;
    result?: any;
  }[];
  totalTime: number;
}

export class ScenarioRunner {
  private agencyId: string;
  private runId: string | null = null;

  constructor(agencyId: string) {
    this.agencyId = agencyId;
  }

  async runScenario(
    scenarioName: string,
    scenarioDescription: string,
    steps: ScenarioStep[]
  ): Promise<ScenarioResult> {
    const startTime = Date.now();

    const { data: runId, error: runError } = await supabase.rpc(
      'execute_scenario',
      {
        p_agency_id: this.agencyId,
        p_scenario_name: scenarioName,
        p_scenario_description: scenarioDescription,
      }
    );

    if (runError) {
      throw new Error(`Failed to start scenario: ${runError.message}`);
    }

    this.runId = runId;

    const result: ScenarioResult = {
      scenarioName,
      passed: true,
      steps: [],
      totalTime: 0,
    };

    for (const step of steps) {
      const stepStartTime = Date.now();
      let stepPassed = false;
      let stepError: string | undefined;
      let stepResult: any;

      try {
        stepResult = await step.action();
        stepPassed = await step.validation(stepResult);

        if (!stepPassed && step.errorMessage) {
          stepError = step.errorMessage;
        }
      } catch (error) {
        stepPassed = false;
        stepError = error instanceof Error ? error.message : 'Unknown error';
      }

      result.steps.push({
        name: step.name,
        passed: stepPassed,
        error: stepError,
        result: stepResult,
      });

      if (!stepPassed) {
        result.passed = false;
        break;
      }
    }

    result.totalTime = Date.now() - startTime;

    await this.completeScenario(result);

    return result;
  }

  private async completeScenario(result: ScenarioResult) {
    if (!this.runId) return;

    const validationResults = result.steps.map((step) => ({
      step: step.name,
      passed: step.passed,
      error: step.error,
    }));

    await supabase.rpc('complete_scenario', {
      p_run_id: this.runId,
      p_status: result.passed ? 'passed' : 'failed',
      p_validation_results: validationResults,
      p_execution_log: result.steps.map((step) => ({
        step: step.name,
        result: step.result,
      })),
    });
  }
}

export async function runADayWorkflow(
  agencyId: string
): Promise<ScenarioResult> {
  const runner = new ScenarioRunner(agencyId);

  let testTaskId: string | null = null;
  let testCaregiverId: string | null = null;
  let testSupervisorId: string | null = null;

  const steps: ScenarioStep[] = [
    {
      name: 'Step 1: Supervisor assigns tasks via bulk_assign_tasks',
      action: async () => {
        // Get unassigned tasks
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id')
          .eq('agency_id', agencyId)
          .is('owner_user_id', null)
          .limit(1);

        if (!tasks || tasks.length === 0) {
          throw new Error('No unassigned tasks available');
        }

        // Get a caregiver
        const { data: caregivers } = await supabase
          .from('user_profiles')
          .select('id, role_id')
          .eq('agency_id', agencyId)
          .limit(5);

        if (!caregivers || caregivers.length === 0) {
          throw new Error('No caregivers available');
        }

        // Get role IDs
        const { data: roles } = await supabase
          .from('roles')
          .select('id, name')
          .in('name', ['CAREGIVER', 'SUPERVISOR']);

        const caregiverRole = roles?.find(r => r.name === 'CAREGIVER');
        const supervisorRole = roles?.find(r => r.name === 'SUPERVISOR');

        // Find caregiver and supervisor
        testCaregiverId = caregivers.find(u => u.role_id === caregiverRole?.id)?.id || caregivers[0].id;

        // Get supervisor separately if not in caregivers list
        if (!testSupervisorId) {
          const { data: supervisors } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('agency_id', agencyId)
            .eq('role_id', supervisorRole?.id!)
            .limit(1);
          testSupervisorId = supervisors?.[0]?.id || testCaregiverId;
        }

        testTaskId = tasks[0].id;

        // Execute bulk assignment
        const { data, error } = await supabase.rpc('bulk_assign_tasks', {
          p_task_ids: [testTaskId],
          p_caregiver_id: testCaregiverId,
          p_department_id: null,
        });

        if (error) throw error;
        return data;
      },
      validation: async (result) => {
        // Verify task was assigned
        const { data } = await supabase
          .from('tasks')
          .select('owner_user_id')
          .eq('id', testTaskId!)
          .single();

        return data?.owner_user_id === testCaregiverId;
      },
      errorMessage: 'WP1 FAILED: Task assignment did not execute correctly',
    },
    {
      name: 'Step 2: Caregiver retrieves task list via get_caregiver_task_list',
      action: async () => {
        const { data, error } = await supabase.rpc('get_caregiver_task_list', {
          p_caregiver_id: testCaregiverId!,
          p_date: new Date().toISOString().split('T')[0],
        });

        if (error) throw error;
        return data;
      },
      validation: async (result) => {
        // Verify task appears in caregiver's list
        return Array.isArray(result) && result.some(t => t.task_id === testTaskId);
      },
      errorMessage: 'WP1 FAILED: Caregiver task list retrieval failed',
    },
    {
      name: 'Step 3: Caregiver starts task via start_task',
      action: async () => {
        const { data, error } = await supabase.rpc('start_task', {
          p_task_id: testTaskId!,
        });

        if (error) throw error;
        return data;
      },
      validation: async (result) => {
        // Verify task state changed to in_progress
        const { data } = await supabase
          .from('tasks')
          .select('state')
          .eq('id', testTaskId!)
          .single();

        return data?.state === 'in_progress';
      },
      errorMessage: 'WP1 FAILED: Task start did not execute correctly',
    },
    {
      name: 'Step 4: Caregiver completes task with evidence via complete_task_with_evidence',
      action: async () => {
        const { data, error } = await supabase.rpc('complete_task_with_evidence', {
          p_task_id: testTaskId!,
          p_outcome: 'success',
          p_outcome_reason: 'WP1 acceptance test',
          p_evidence_items: [
            { type: 'note', data: { text: 'Acceptance test evidence' } },
            { type: 'metric', data: { metric_name: 'test_metric', metric_value: '100' } },
          ],
          p_user_id: testCaregiverId!,
        });

        if (error) throw error;
        return data;
      },
      validation: async (result) => {
        // Verify task is completed
        const { data: task } = await supabase
          .from('tasks')
          .select('state, evidence_submitted')
          .eq('id', testTaskId!)
          .single();

        if (task?.state !== 'completed' || !task?.evidence_submitted) {
          return false;
        }

        // Verify evidence was captured
        const { data: evidence } = await supabase
          .from('task_evidence')
          .select('id')
          .eq('task_id', testTaskId!);

        return evidence && evidence.length === 2;
      },
      errorMessage: 'WP1 FAILED: Task completion with evidence failed',
    },
    {
      name: 'Step 5: Supervisor retrieves review queue via get_pending_review_queue',
      action: async () => {
        const { data, error } = await supabase.rpc('get_pending_review_queue', {
          p_agency_id: agencyId,
          p_department_id: null,
          p_limit: 50,
        });

        if (error) throw error;
        return data;
      },
      validation: async (result) => {
        // Verify completed task appears in review queue
        return Array.isArray(result) && result.some(t => t.task_id === testTaskId);
      },
      errorMessage: 'WP1 FAILED: Review queue retrieval failed',
    },
    {
      name: 'Step 6: Supervisor reviews task via batch_review_tasks',
      action: async () => {
        const { data, error } = await supabase.rpc('batch_review_tasks', {
          p_reviews: [
            {
              task_id: testTaskId!,
              status: 'approved',
              comments: 'WP1 acceptance test review',
              quality_rating: 5,
              flagged_issues: [],
            },
          ],
          p_reviewer_id: testSupervisorId!,
        });

        if (error) throw error;
        return data;
      },
      validation: async (result) => {
        // Verify review was created
        const { data } = await supabase
          .from('supervisor_reviews')
          .select('id, review_status, quality_rating')
          .eq('task_id', testTaskId!)
          .single();

        return data?.review_status === 'approved' && data?.quality_rating === 5;
      },
      errorMessage: 'WP1 FAILED: Task review failed',
    },
    {
      name: 'Step 7: Manager retrieves dashboard via get_manager_dashboard_data',
      action: async () => {
        const { data, error } = await supabase.rpc('get_manager_dashboard_data', {
          p_agency_id: agencyId,
          p_date: new Date().toISOString().split('T')[0],
        });

        if (error) throw error;
        return data;
      },
      validation: async (result) => {
        // Verify dashboard data has required structure
        return (
          result &&
          result.summary &&
          typeof result.summary.total_tasks === 'number' &&
          typeof result.summary.completed === 'number' &&
          Array.isArray(result.departments)
        );
      },
      errorMessage: 'WP1 FAILED: Manager dashboard data retrieval failed',
    },
    {
      name: 'Step 8: Verify audit trail exists for all actions',
      action: async () => {
        // Check for audit entries related to our test task
        const { data } = await supabase
          .from('tasks')
          .select('id, owner_user_id, state, supervisor_acknowledged, supervisor_acknowledged_by')
          .eq('id', testTaskId!)
          .single();

        return data;
      },
      validation: async (result) => {
        // Verify audit fields are populated
        return (
          result &&
          result.owner_user_id === testCaregiverId &&
          result.state === 'completed' &&
          result.supervisor_acknowledged === true &&
          result.supervisor_acknowledged_by !== null
        );
      },
      errorMessage: 'WP1 FAILED: Audit trail incomplete',
    },
  ];

  return runner.runScenario(
    'WP1: Run a Day - Complete Operational Cycle',
    'End-to-end test of supervisor assignment → caregiver execution with evidence → supervisor review → manager oversight',
    steps
  );
}

export async function runMorningMedicationRound(
  agencyId: string
): Promise<ScenarioResult> {
  const runner = new ScenarioRunner(agencyId);

  const steps: ScenarioStep[] = [
    {
      name: 'Check task execution UI exists',
      action: async () => {
        // This would check if the task execution UI component exists
        // For now, we know it doesn't
        return null;
      },
      validation: async (result) => false,
      errorMessage: 'WP1 NOT IMPLEMENTED: Task execution UI does not exist',
    },
    {
      name: 'Check evidence capture system exists',
      action: async () => {
        // Check if photo/audio/numeric evidence capture works
        const { data } = await supabase
          .from('task_evidence')
          .select('id')
          .limit(1);
        // Table exists but no actual capture mechanism
        return data;
      },
      validation: async (result) => false,
      errorMessage: 'WP2 NOT IMPLEMENTED: Evidence capture system does not work',
    },
    {
      name: 'Check supervisor review workflow exists',
      action: async () => {
        // Check if review workflow exists
        return null;
      },
      validation: async (result) => false,
      errorMessage: 'WP1 NOT IMPLEMENTED: Supervisor review workflow does not exist',
    },
  ];

  return await runner.runScenario(
    'Morning Medication Round',
    'Tests full task workflow from assignment to review. EXPECTED TO FAIL until WP1 & WP2 are implemented.',
    steps
  );
}

export async function runFallRiskDetection(
  agencyId: string
): Promise<ScenarioResult> {
  const runner = new ScenarioRunner(agencyId);

  const steps: ScenarioStep[] = [
    {
      name: 'Check real-time observation service',
      action: async () => {
        // Try to trigger an observation
        // No service exists
        return null;
      },
      validation: async (result) => false,
      errorMessage: 'WP3 NOT IMPLEMENTED: Brain observation service does not exist',
    },
    {
      name: 'Check pattern detection algorithm',
      action: async () => {
        // Try to run pattern detection
        // No algorithm exists
        return null;
      },
      validation: async (result) => false,
      errorMessage: 'WP3 NOT IMPLEMENTED: Pattern detection algorithm does not exist',
    },
    {
      name: 'Check risk prediction model',
      action: async () => {
        // Try to run risk prediction
        // No model exists
        return null;
      },
      validation: async (result) => false,
      errorMessage: 'WP3 NOT IMPLEMENTED: Risk prediction model does not exist',
    },
    {
      name: 'Check alert generation system',
      action: async () => {
        // Try to generate an alert
        // No system exists
        return null;
      },
      validation: async (result) => false,
      errorMessage: 'WP7 NOT IMPLEMENTED: Alert generation system does not exist',
    },
  ];

  return await runner.runScenario(
    'Fall Risk Detection',
    'Tests Brain intelligence from observation to alert. EXPECTED TO FAIL until WP3 & WP7 are implemented.',
    steps
  );
}

export async function runOfflineCareDelivery(
  agencyId: string
): Promise<ScenarioResult> {
  const runner = new ScenarioRunner(agencyId);

  const steps: ScenarioStep[] = [
    {
      name: 'Check offline queue mechanism',
      action: async () => {
        // Try to queue an operation offline
        // Infrastructure exists but not functional
        return null;
      },
      validation: async (result) => false,
      errorMessage: 'WP6 NOT IMPLEMENTED: Offline queue does not function',
    },
    {
      name: 'Check sync engine',
      action: async () => {
        // Try to sync queued operations
        // No sync engine exists
        return null;
      },
      validation: async (result) => false,
      errorMessage: 'WP6 NOT IMPLEMENTED: Sync engine does not exist',
    },
    {
      name: 'Check conflict resolution',
      action: async () => {
        // Try to resolve a conflict
        // No conflict resolution exists
        return null;
      },
      validation: async (result) => false,
      errorMessage: 'WP6 NOT IMPLEMENTED: Conflict resolution does not exist',
    },
  ];

  return await runner.runScenario(
    'Offline Care Delivery',
    'Tests offline-first capability. EXPECTED TO FAIL until WP6 is implemented.',
    steps
  );
}

export async function runEmergencyResponse(
  agencyId: string
): Promise<ScenarioResult> {
  const runner = new ScenarioRunner(agencyId);

  const steps: ScenarioStep[] = [
    {
      name: 'Check brain blocking mechanism',
      action: async () => {
        // Try to trigger brain blocking
        // Mechanism exists but not functional
        return null;
      },
      validation: async (result) => false,
      errorMessage: 'WP3 NOT IMPLEMENTED: Brain blocking mechanism does not function',
    },
    {
      name: 'Check emergency state transitions',
      action: async () => {
        // Try to transition to emergency state
        // State machine exists but not complete
        return null;
      },
      validation: async (result) => false,
      errorMessage: 'WP1 NOT IMPLEMENTED: Emergency state transitions not complete',
    },
    {
      name: 'Check emergency notification system',
      action: async () => {
        // Try to send emergency notifications
        // No notification system exists
        return null;
      },
      validation: async (result) => false,
      errorMessage: 'WP8 NOT IMPLEMENTED: Emergency notification system does not exist',
    },
  ];

  return await runner.runScenario(
    'Emergency Response',
    'Tests emergency handling end-to-end. EXPECTED TO FAIL until WP1, WP3, WP8 are implemented.',
    steps
  );
}
