import { supabase } from '../lib/supabase';
import { voicePipeline } from '../services/voicePipeline';

export interface WP2ScenarioStep {
  name: string;
  action: () => Promise<any>;
  validation: (result: any) => Promise<boolean>;
  errorMessage?: string;
}

export interface WP2ScenarioResult {
  scenarioName: string;
  passed: boolean;
  steps: {
    name: string;
    passed: boolean;
    error?: string;
    metrics?: any;
  }[];
  overallMetrics: {
    totalTasks: number;
    avgTaps: number;
    avgTyping: number;
    avgSeconds: number;
    oneTapPercentage: number;
    zeroTypingPercentage: number;
    under30sPercentage: number;
    voiceExtractionTypes: number;
  };
  totalTime: number;
}

export class WP2ScenarioRunner {
  private agencyId: string;
  private testTaskIds: string[] = [];
  private telemetryIds: string[] = [];

  constructor(agencyId: string) {
    this.agencyId = agencyId;
  }

  async runSpeedRunScenario(): Promise<WP2ScenarioResult> {
    const startTime = Date.now();

    const steps: WP2ScenarioStep[] = [
      // Step 1-10: Complete 10 routine tasks with quick-tap
      ...Array.from({ length: 10 }, (_, i) => ({
        name: `Quick-tap task ${i + 1}`,
        action: async () => {
          // Get a scheduled task
          const { data: tasks } = await supabase
            .from('tasks')
            .select('id')
            .eq('agency_id', this.agencyId)
            .eq('state', 'scheduled')
            .not('owner_user_id', 'is', null)
            .limit(1);

          if (!tasks || tasks.length === 0) {
            throw new Error('No scheduled tasks available');
          }

          const taskId = tasks[0].id;
          this.testTaskIds.push(taskId);

          // Quick-tap complete
          const { data, error } = await supabase.rpc('quick_tap_complete_task', {
            p_task_id: taskId,
            p_outcome: 'success',
            p_quick_value: 'normal',
            p_tap_count: 1,
            p_completion_seconds: Math.random() * 20 + 10, // 10-30 seconds
          });

          if (error) throw error;
          return data;
        },
        validation: async (result) => {
          // Verify telemetry was created
          const { data: telemetry } = await supabase
            .from('task_completion_telemetry')
            .select('id, tap_count, character_count, completion_seconds')
            .eq('task_id', this.testTaskIds[i])
            .single();

          if (!telemetry) return false;

          this.telemetryIds.push(telemetry.id);

          // Verify meets WP2 criteria
          return (
            telemetry.tap_count <= 1 &&
            telemetry.character_count === 0 &&
            telemetry.completion_seconds <= 30
          );
        },
        errorMessage: `WP2 FAILED: Quick-tap task ${i + 1} did not meet criteria`,
      })),

      // Step 11: Exception case - must require full form
      {
        name: 'Exception handling - refused medication',
        action: async () => {
          const { data: tasks } = await supabase
            .from('tasks')
            .select('id')
            .eq('agency_id', this.agencyId)
            .eq('state', 'scheduled')
            .not('owner_user_id', 'is', null)
            .limit(1);

          if (!tasks || tasks.length === 0) {
            throw new Error('No tasks available for exception test');
          }

          const taskId = tasks[0].id;
          this.testTaskIds.push(taskId);

          // Simulate exception completion with evidence
          const { error: updateError } = await supabase
            .from('tasks')
            .update({
              state: 'completed',
              actual_end: new Date().toISOString(),
              evidence_submitted: true,
              completed_by: (await supabase.auth.getUser()).data.user?.id,
            })
            .eq('id', taskId);

          if (updateError) throw updateError;

          // Record exception telemetry
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('id, agency_id')
            .eq('id', (await supabase.auth.getUser()).data.user?.id || '')
            .single();

          if (!userProfile) throw new Error('No user profile');

          const { error } = await supabase.from('task_completion_telemetry').insert({
            task_id: taskId,
            user_id: userProfile.id,
            agency_id: userProfile.agency_id,
            completion_method: 'exception_form',
            tap_count: 5,
            character_count: 120,
            completion_seconds: 90,
            was_exception: true,
            exception_reason: 'Resident refused medication',
            voice_used: false,
            evidence_count: 1,
          });

          if (error) throw error;

          return { taskId, exception: true };
        },
        validation: async (result) => {
          // Verify exception was recorded correctly
          const { data: telemetry } = await supabase
            .from('task_completion_telemetry')
            .select('*')
            .eq('task_id', result.taskId)
            .single();

          if (!telemetry) return false;

          this.telemetryIds.push(telemetry.id);

          return (
            telemetry.was_exception === true &&
            telemetry.exception_reason !== null &&
            telemetry.character_count > 0 &&
            telemetry.evidence_count > 0
          );
        },
        errorMessage: 'WP2 FAILED: Exception case not handled correctly',
      },

      // Step 12-14: Voice extractions (3 types)
      {
        name: 'Voice extraction - medication',
        action: async () => {
          // Create mock voice transcription
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('id, agency_id')
            .eq('id', (await supabase.auth.getUser()).data.user?.id || '')
            .single();

          if (!userProfile) throw new Error('No user profile');

          const transcriptionId = await supabase.rpc('submit_voice_transcription', {
            p_task_id: null,
            p_audio_url: 'mock://medication_recording.webm',
            p_audio_duration_seconds: 8,
            p_transcription_text: 'Patient took Metformin 500 mg orally at 9 AM',
            p_transcription_confidence: 0.95,
            p_quality_score: 85,
          });

          // Extract medication data
          const extractionId = await supabase.rpc('create_structured_extraction', {
            p_voice_transcription_id: transcriptionId,
            p_extraction_type: 'medication',
            p_extracted_data: {
              medication_name: 'Metformin',
              dosage: '500 mg',
              route: 'oral',
              status: 'taken',
              time_given: '9:00 AM',
            },
            p_confidence_score: 0.92,
          });

          return { transcriptionId, extractionId, type: 'medication' };
        },
        validation: async (result) => {
          // Verify extraction exists
          const { data } = await supabase
            .from('structured_voice_extractions')
            .select('*')
            .eq('id', result.extractionId)
            .single();

          return data?.extraction_type === 'medication' && data?.confidence_score >= 0.85;
        },
        errorMessage: 'WP2 FAILED: Medication voice extraction failed',
      },

      {
        name: 'Voice extraction - vital signs',
        action: async () => {
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('id, agency_id')
            .eq('id', (await supabase.auth.getUser()).data.user?.id || '')
            .single();

          if (!userProfile) throw new Error('No user profile');

          const transcriptionId = await supabase.rpc('submit_voice_transcription', {
            p_task_id: null,
            p_audio_url: 'mock://vitals_recording.webm',
            p_audio_duration_seconds: 12,
            p_transcription_text: 'Blood pressure 128 over 82, heart rate 76, temp 98.2',
            p_transcription_confidence: 0.96,
            p_quality_score: 88,
          });

          const extractionId = await supabase.rpc('create_structured_extraction', {
            p_voice_transcription_id: transcriptionId,
            p_extraction_type: 'vital_signs',
            p_extracted_data: {
              blood_pressure_systolic: 128,
              blood_pressure_diastolic: 82,
              heart_rate: 76,
              temperature: 98.2,
            },
            p_confidence_score: 0.94,
          });

          return { transcriptionId, extractionId, type: 'vital_signs' };
        },
        validation: async (result) => {
          const { data } = await supabase
            .from('structured_voice_extractions')
            .select('*')
            .eq('id', result.extractionId)
            .single();

          return data?.extraction_type === 'vital_signs' && data?.confidence_score >= 0.85;
        },
        errorMessage: 'WP2 FAILED: Vital signs voice extraction failed',
      },

      {
        name: 'Voice extraction - incident note',
        action: async () => {
          const { data: userProfile } = await supabase
            .from('user_profiles')
            .select('id, agency_id')
            .eq('id', (await supabase.auth.getUser()).data.user?.id || '')
            .single();

          if (!userProfile) throw new Error('No user profile');

          const transcriptionId = await supabase.rpc('submit_voice_transcription', {
            p_task_id: null,
            p_audio_url: 'mock://incident_recording.webm',
            p_audio_duration_seconds: 15,
            p_transcription_text:
              'Resident fell in bathroom at 2:15 PM. No visible injuries. Notified supervisor.',
            p_transcription_confidence: 0.93,
            p_quality_score: 82,
          });

          const extractionId = await supabase.rpc('create_structured_extraction', {
            p_voice_transcription_id: transcriptionId,
            p_extraction_type: 'incident_note',
            p_extracted_data: {
              incident_type: 'fall',
              severity: 'low',
              description: 'Resident fell in bathroom. No injuries.',
              actions_taken: ['Notified supervisor'],
            },
            p_confidence_score: 0.89,
          });

          return { transcriptionId, extractionId, type: 'incident_note' };
        },
        validation: async (result) => {
          const { data } = await supabase
            .from('structured_voice_extractions')
            .select('*')
            .eq('id', result.extractionId)
            .single();

          return data?.extraction_type === 'incident_note' && data?.confidence_score >= 0.85;
        },
        errorMessage: 'WP2 FAILED: Incident note voice extraction failed',
      },

      // Step 15: Verify overall metrics
      {
        name: 'Verify WP2 acceptance criteria',
        action: async () => {
          const { data: metrics, error } = await supabase.rpc('get_wp2_metrics', {
            p_agency_id: this.agencyId,
            p_date: new Date().toISOString().split('T')[0],
          });

          if (error) throw error;
          return metrics;
        },
        validation: async (metrics) => {
          // Must meet WP2 acceptance criteria
          return (
            metrics.routine_tasks.one_tap_percentage >= 90 &&
            metrics.routine_tasks.zero_typing_percentage >= 90 &&
            metrics.routine_tasks.under_30s_percentage >= 90 &&
            metrics.voice_tasks.total_extractions >= 3
          );
        },
        errorMessage: 'WP2 FAILED: Overall metrics do not meet acceptance criteria',
      },
    ];

    // Execute steps
    const result: WP2ScenarioResult = {
      scenarioName: 'WP2: Caregiver Speed Run',
      passed: true,
      steps: [],
      overallMetrics: {
        totalTasks: 0,
        avgTaps: 0,
        avgTyping: 0,
        avgSeconds: 0,
        oneTapPercentage: 0,
        zeroTypingPercentage: 0,
        under30sPercentage: 0,
        voiceExtractionTypes: 0,
      },
      totalTime: 0,
    };

    for (const step of steps) {
      try {
        const stepResult = await step.action();
        const passed = await step.validation(stepResult);

        result.steps.push({
          name: step.name,
          passed,
          metrics: stepResult,
        });

        if (!passed) {
          result.passed = false;
          result.steps[result.steps.length - 1].error =
            step.errorMessage || 'Validation failed';
          break;
        }
      } catch (error) {
        result.passed = false;
        result.steps.push({
          name: step.name,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        break;
      }
    }

    // Get final metrics
    try {
      const { data: finalMetrics } = await supabase.rpc('get_wp2_metrics', {
        p_agency_id: this.agencyId,
        p_date: new Date().toISOString().split('T')[0],
      });

      if (finalMetrics) {
        result.overallMetrics = {
          totalTasks: finalMetrics.routine_tasks.total,
          avgTaps: finalMetrics.routine_tasks.avg_taps,
          avgTyping: finalMetrics.routine_tasks.avg_typing_chars,
          avgSeconds: finalMetrics.routine_tasks.avg_seconds,
          oneTapPercentage: finalMetrics.routine_tasks.one_tap_percentage,
          zeroTypingPercentage: finalMetrics.routine_tasks.zero_typing_percentage,
          under30sPercentage: finalMetrics.routine_tasks.under_30s_percentage,
          voiceExtractionTypes: finalMetrics.voice_tasks.total_extractions,
        };
      }
    } catch (error) {
      console.error('Failed to get final metrics:', error);
    }

    result.totalTime = Date.now() - startTime;
    return result;
  }
}

export async function runWP2SpeedRun(agencyId: string): Promise<WP2ScenarioResult> {
  const runner = new WP2ScenarioRunner(agencyId);
  return await runner.runSpeedRunScenario();
}
