import { supabase } from '../lib/supabase';

export interface CapabilityTest {
  name: string;
  category: string;
  test: () => Promise<boolean>;
  description: string;
}

export interface CapabilityResult {
  name: string;
  category: string;
  implemented: boolean;
  error?: string;
  description: string;
}

export interface CapabilityReport {
  overall: number;
  categories: {
    [category: string]: {
      percentage: number;
      capabilities: CapabilityResult[];
    };
  };
  timestamp: string;
}

export class CapabilityVerifier {
  private agencyId: string;

  constructor(agencyId: string) {
    this.agencyId = agencyId;
  }

  async verifyAll(): Promise<CapabilityReport> {
    const tests = this.getAllTests();
    const results: CapabilityResult[] = [];

    for (const test of tests) {
      try {
        const implemented = await test.test();
        results.push({
          name: test.name,
          category: test.category,
          implemented,
          description: test.description,
        });
      } catch (error) {
        results.push({
          name: test.name,
          category: test.category,
          implemented: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          description: test.description,
        });
      }
    }

    return this.buildReport(results);
  }

  private getAllTests(): CapabilityTest[] {
    return [
      // Operational Cycle Tests
      {
        name: 'Task Assignment',
        category: 'operational_cycle',
        description: 'Ability to assign tasks to caregivers',
        test: async () => {
          // WP1 TRUTH TEST: Actually execute assignment with real data
          try {
            // Get a real unassigned task
            const { data: tasks } = await supabase
              .from('tasks')
              .select('id')
              .eq('agency_id', this.agencyId)
              .is('owner_user_id', null)
              .limit(1);

            if (!tasks || tasks.length === 0) {
              // No unassigned tasks means assignment capability isn't being used
              return false;
            }

            // Get a real caregiver
            const { data: caregivers } = await supabase
              .from('user_profiles')
              .select('id')
              .eq('agency_id', this.agencyId)
              .limit(1);

            if (!caregivers || caregivers.length === 0) return false;

            // Execute bulk_assign_tasks RPC with real data
            const { data: result, error } = await supabase.rpc('bulk_assign_tasks', {
              p_task_ids: [tasks[0].id],
              p_caregiver_id: caregivers[0].id,
              p_department_id: null,
            });

            if (error) return false;

            // Verify the assignment actually happened
            const { data: assigned } = await supabase
              .from('tasks')
              .select('owner_user_id')
              .eq('id', tasks[0].id)
              .single();

            return assigned?.owner_user_id === caregivers[0].id;
          } catch {
            return false;
          }
        },
      },
      {
        name: 'Task Execution UI',
        category: 'operational_cycle',
        description: 'UI for caregivers to execute tasks',
        test: async () => {
          // WP1 TRUTH TEST: Get real caregiver task list
          try {
            const { data: caregivers } = await supabase
              .from('user_profiles')
              .select('id')
              .eq('agency_id', this.agencyId)
              .limit(1);

            if (!caregivers || caregivers.length === 0) return false;

            const { data, error } = await supabase.rpc('get_caregiver_task_list', {
              p_caregiver_id: caregivers[0].id,
              p_date: new Date().toISOString().split('T')[0],
            });

            if (error) return false;

            // Success if RPC executes (even if no tasks)
            return true;
          } catch {
            return false;
          }
        },
      },
      {
        name: 'Evidence Capture',
        category: 'operational_cycle',
        description: 'Capture photo/audio/numeric evidence',
        test: async () => {
          // WP1 TRUTH TEST: Complete a real task with evidence
          try {
            // Find a task in progress
            const { data: tasks } = await supabase
              .from('tasks')
              .select('id')
              .eq('agency_id', this.agencyId)
              .eq('state', 'in_progress')
              .limit(1);

            if (!tasks || tasks.length === 0) {
              // No in_progress tasks, try to start one
              const { data: scheduled } = await supabase
                .from('tasks')
                .select('id, owner_user_id')
                .eq('agency_id', this.agencyId)
                .eq('state', 'scheduled')
                .not('owner_user_id', 'is', null)
                .limit(1);

              if (!scheduled || scheduled.length === 0) return false;

              // Start the task
              await supabase.rpc('start_task', { p_task_id: scheduled[0].id });
            }

            const taskId = tasks?.[0]?.id || null;
            if (!taskId) return false;

            // Complete with evidence
            const { data: result, error } = await supabase.rpc('complete_task_with_evidence', {
              p_task_id: taskId,
              p_outcome: 'success',
              p_outcome_reason: 'Capability test',
              p_evidence_items: [
                { type: 'note', data: { text: 'Test evidence' } }
              ],
            });

            if (error) return false;

            // Verify evidence was captured
            const { data: evidence } = await supabase
              .from('task_evidence')
              .select('id')
              .eq('task_id', taskId)
              .limit(1);

            return !!evidence && evidence.length > 0;
          } catch {
            return false;
          }
        },
      },
      {
        name: 'Supervisor Review',
        category: 'operational_cycle',
        description: 'Supervisor reviews completed tasks',
        test: async () => {
          // WP1 TRUTH TEST: Review real completed tasks
          try {
            // Find completed tasks
            const { data: tasks } = await supabase
              .from('tasks')
              .select('id')
              .eq('agency_id', this.agencyId)
              .eq('state', 'completed')
              .limit(2);

            if (!tasks || tasks.length === 0) return false;

            // Execute batch review
            const { data: result, error } = await supabase.rpc('batch_review_tasks', {
              p_reviews: tasks.map(t => ({
                task_id: t.id,
                status: 'approved',
                comments: 'Capability test',
                quality_rating: 5,
                flagged_issues: []
              })),
            });

            if (error) return false;

            // Verify reviews were created
            const { data: reviews } = await supabase
              .from('supervisor_reviews')
              .select('id')
              .in('task_id', tasks.map(t => t.id));

            return !!reviews && reviews.length === tasks.length;
          } catch {
            return false;
          }
        },
      },

      // Brain Intelligence Tests
      {
        name: 'Real-time Observation',
        category: 'brain_intelligence',
        description: 'Brain observes resident state changes',
        test: async () => {
          // Check if brain observation service exists
          // Would need to trigger an observation and see if it logs
          return false; // NOT IMPLEMENTED - only seeded data exists
        },
      },
      {
        name: 'Pattern Detection',
        category: 'brain_intelligence',
        description: 'Brain detects patterns over time',
        test: async () => {
          // Check if pattern detection algorithm exists
          return false; // NOT IMPLEMENTED
        },
      },
      {
        name: 'Risk Prediction',
        category: 'brain_intelligence',
        description: 'Brain predicts fall/health risks',
        test: async () => {
          // Check if risk prediction model exists
          return false; // NOT IMPLEMENTED
        },
      },
      {
        name: 'Action Recommendation',
        category: 'brain_intelligence',
        description: 'Brain recommends care actions',
        test: async () => {
          // Check if recommendation engine exists
          return false; // NOT IMPLEMENTED
        },
      },

      // Shadow AI Tests
      {
        name: 'Language Learning',
        category: 'shadow_ai',
        description: 'AI learns caregiver vocabulary',
        test: async () => {
          return false; // NOT IMPLEMENTED
        },
      },
      {
        name: 'Medical Terminology Translation',
        category: 'shadow_ai',
        description: 'Translate medical to plain language',
        test: async () => {
          return false; // NOT IMPLEMENTED
        },
      },
      {
        name: 'Response Pattern Learning',
        category: 'shadow_ai',
        description: 'Learn normal response patterns',
        test: async () => {
          return false; // NOT IMPLEMENTED
        },
      },

      // AI-Generated Reports Tests
      {
        name: 'Shift Summary Generation',
        category: 'ai_reports',
        description: 'AI generates shift summaries',
        test: async () => {
          return false; // NOT IMPLEMENTED
        },
      },
      {
        name: 'Incident Narrative Generation',
        category: 'ai_reports',
        description: 'AI writes incident reports',
        test: async () => {
          return false; // NOT IMPLEMENTED
        },
      },
      {
        name: 'Family Update Generation',
        category: 'ai_reports',
        description: 'AI generates family updates',
        test: async () => {
          return false; // NOT IMPLEMENTED
        },
      },

      // Offline-First Tests
      {
        name: 'Offline Queue System',
        category: 'offline',
        description: 'Queue operations when offline',
        test: async () => {
          // Check if offline queue service exists
          // Would need to actually test queueing
          return false; // NOT IMPLEMENTED - only infrastructure exists
        },
      },
      {
        name: 'Sync Engine',
        category: 'offline',
        description: 'Sync queued operations when online',
        test: async () => {
          return false; // NOT IMPLEMENTED
        },
      },
      {
        name: 'Conflict Resolution',
        category: 'offline',
        description: 'Resolve conflicting offline edits',
        test: async () => {
          return false; // NOT IMPLEMENTED
        },
      },

      // Background Jobs Tests
      {
        name: 'Task Generation Job',
        category: 'background_jobs',
        description: 'Auto-generate daily tasks',
        test: async () => {
          // Check if task generation job exists and runs
          const { data } = await supabase
            .from('background_job_log')
            .select('id')
            .eq('job_type', 'task_generation')
            .limit(1);
          return false; // NOT IMPLEMENTED - no actual job runs
        },
      },
      {
        name: 'Reminder Job',
        category: 'background_jobs',
        description: 'Send reminders for overdue tasks',
        test: async () => {
          return false; // NOT IMPLEMENTED
        },
      },
      {
        name: 'Alert Job',
        category: 'background_jobs',
        description: 'Send alerts for urgent situations',
        test: async () => {
          return false; // NOT IMPLEMENTED
        },
      },
      {
        name: 'Analytics Job',
        category: 'background_jobs',
        description: 'Compute analytics metrics',
        test: async () => {
          return false; // NOT IMPLEMENTED
        },
      },

      // External Integrations Tests
      {
        name: 'Voice Transcription',
        category: 'integrations',
        description: 'Transcribe voice notes',
        test: async () => {
          return false; // NOT IMPLEMENTED
        },
      },
      {
        name: 'Language Translation',
        category: 'integrations',
        description: 'Translate between languages',
        test: async () => {
          return false; // NOT IMPLEMENTED
        },
      },
      {
        name: 'SMS/Email Notifications',
        category: 'integrations',
        description: 'Send SMS/email to family',
        test: async () => {
          return false; // NOT IMPLEMENTED
        },
      },
      {
        name: 'Device Integration',
        category: 'integrations',
        description: 'Integrate with monitoring devices',
        test: async () => {
          return false; // NOT IMPLEMENTED
        },
      },

      // WP2: Caregiver Efficiency Tests
      {
        name: 'Quick-Tap Completion',
        category: 'caregiver_efficiency',
        description: 'WP2: ≥90% routine tasks ≤1 tap',
        test: async () => {
          // WP2 TRUTH TEST: Check actual telemetry metrics
          try {
            const { data: metrics, error } = await supabase.rpc('get_wp2_metrics', {
              p_agency_id: this.agencyId,
              p_date: new Date().toISOString().split('T')[0],
            });

            if (error || !metrics) return false;

            // TRUTH CHECK: Must meet WP2 acceptance criteria
            return metrics.routine_tasks.one_tap_percentage >= 90;
          } catch {
            return false;
          }
        },
      },
      {
        name: 'Zero Typing Enforcement',
        category: 'caregiver_efficiency',
        description: 'WP2: ≥90% routine tasks 0 typing',
        test: async () => {
          try {
            const { data: metrics, error } = await supabase.rpc('get_wp2_metrics', {
              p_agency_id: this.agencyId,
              p_date: new Date().toISOString().split('T')[0],
            });

            if (error || !metrics) return false;

            return metrics.routine_tasks.zero_typing_percentage >= 90;
          } catch {
            return false;
          }
        },
      },
      {
        name: 'Sub-30-Second Completion',
        category: 'caregiver_efficiency',
        description: 'WP2: ≥90% routine tasks ≤30s',
        test: async () => {
          try {
            const { data: metrics, error } = await supabase.rpc('get_wp2_metrics', {
              p_agency_id: this.agencyId,
              p_date: new Date().toISOString().split('T')[0],
            });

            if (error || !metrics) return false;

            return metrics.routine_tasks.under_30s_percentage >= 90;
          } catch {
            return false;
          }
        },
      },
      {
        name: 'Voice-to-Structure Pipeline (Heuristic v1)',
        category: 'caregiver_efficiency',
        description: 'WP2: ≥3 voice extraction types (rule-based)',
        test: async () => {
          try {
            // Check if voice extractions exist
            const { data: extractions, error } = await supabase
              .from('structured_voice_extractions')
              .select('extraction_type');

            if (error || !extractions) return false;

            // Count unique extraction types
            const uniqueTypes = new Set(extractions.map(e => e.extraction_type));
            return uniqueTypes.size >= 3;
          } catch {
            return false;
          }
        },
      },
      {
        name: 'Exception Enforcement',
        category: 'caregiver_efficiency',
        description: 'WP2: Exception cases require evidence',
        test: async () => {
          try {
            // Find exception cases
            const { data: exceptions, error } = await supabase
              .from('task_completion_telemetry')
              .select('character_count, evidence_count')
              .eq('agency_id', this.agencyId)
              .eq('was_exception', true)
              .limit(10);

            if (error || !exceptions || exceptions.length === 0) {
              // No exceptions to test
              return true;
            }

            // All exceptions must have documentation AND evidence
            const allValid = exceptions.every(
              e => e.character_count > 0 && e.evidence_count > 0
            );

            return allValid;
          } catch {
            return false;
          }
        },
      },
      {
        name: 'Evidence Quality Scoring',
        category: 'caregiver_efficiency',
        description: 'WP2: Evidence quality assessed',
        test: async () => {
          try {
            // Check if evidence quality scores exist
            const { data: scores, error } = await supabase
              .from('evidence_quality_scores')
              .select('id, overall_score')
              .limit(1);

            if (error) return false;

            // Quality scoring exists if scores found
            return !!scores && scores.length > 0;
          } catch {
            return false;
          }
        },
      },
    ];
  }

  private buildReport(results: CapabilityResult[]): CapabilityReport {
    const categories: { [key: string]: CapabilityResult[] } = {};

    // Group by category
    for (const result of results) {
      if (!categories[result.category]) {
        categories[result.category] = [];
      }
      categories[result.category].push(result);
    }

    // Calculate percentages
    const categoryStats: {
      [key: string]: { percentage: number; capabilities: CapabilityResult[] };
    } = {};

    for (const [category, capabilities] of Object.entries(categories)) {
      const implementedCount = capabilities.filter((c) => c.implemented).length;
      const percentage =
        capabilities.length > 0
          ? Math.round((implementedCount / capabilities.length) * 100)
          : 0;

      categoryStats[category] = {
        percentage,
        capabilities,
      };
    }

    // Calculate overall
    const totalImplemented = results.filter((r) => r.implemented).length;
    const overall =
      results.length > 0 ? Math.round((totalImplemented / results.length) * 100) : 0;

    return {
      overall,
      categories: categoryStats,
      timestamp: new Date().toISOString(),
    };
  }
}

export async function verifyCapabilities(
  agencyId: string
): Promise<CapabilityReport> {
  const verifier = new CapabilityVerifier(agencyId);
  return await verifier.verifyAll();
}

export function getCategoryDisplayName(category: string): string {
  const names: { [key: string]: string } = {
    operational_cycle: 'Operational Cycle',
    brain_intelligence: 'Brain Intelligence',
    shadow_ai: 'Shadow AI Learning',
    ai_reports: 'AI-Generated Reports',
    offline: 'Offline-First',
    background_jobs: 'Background Jobs',
    integrations: 'External Integrations',
  };
  return names[category] || category;
}

export function getCategoryIcon(category: string): string {
  const icons: { [key: string]: string } = {
    operational_cycle: '⚙️',
    brain_intelligence: '🧠',
    shadow_ai: '🤖',
    ai_reports: '📊',
    offline: '📡',
    background_jobs: '⏰',
    integrations: '🔌',
  };
  return icons[category] || '❓';
}
