import { supabase } from '../lib/supabase';

export interface JobDefinition {
  id: string;
  agency_id: string;
  job_name: string;
  job_type: 'recurring_tasks' | 'reminders' | 'aggregation' | 'reports';
  schedule_cron: string;
  enabled: boolean;
  config: Record<string, any>;
  last_run_at: string | null;
  next_run_at: string | null;
}

export interface JobExecution {
  id: string;
  job_id: string;
  agency_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'retrying';
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  input_params: Record<string, any>;
  output_result: Record<string, any> | null;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
}

export interface JobLog {
  id: string;
  execution_id: string;
  log_level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  metadata: Record<string, any>;
  logged_at: string;
}

export interface DeadLetterItem {
  id: string;
  job_type: string;
  failure_reason: string;
  retry_attempts: number;
  first_failed_at: string;
  last_failed_at: string;
  resolved: boolean;
  resolved_at: string | null;
}

export class JobRunner {
  private agencyId: string;
  private isRunning: boolean = false;
  private pollInterval: number = 10000; // 10 seconds
  private pollTimer: NodeJS.Timeout | null = null;

  constructor(agencyId: string) {
    this.agencyId = agencyId;
  }

  async registerJob(
    jobName: string,
    jobType: 'recurring_tasks' | 'reminders' | 'aggregation' | 'reports',
    scheduleCron: string,
    config: Record<string, any> = {},
    enabled: boolean = true
  ): Promise<string> {
    const { data, error } = await supabase.rpc('register_job', {
      p_agency_id: this.agencyId,
      p_job_name: jobName,
      p_job_type: jobType,
      p_schedule_cron: scheduleCron,
      p_config: config,
      p_enabled: enabled
    });

    if (error) throw error;
    return data;
  }

  async executeJob(jobId: string): Promise<{ success: boolean; execution_id: string; result?: any; error?: string }> {
    const { data, error } = await supabase.rpc('execute_job', {
      p_job_id: jobId
    });

    if (error) throw error;
    return data;
  }

  async getPendingJobs(limit: number = 10): Promise<JobDefinition[]> {
    const { data, error } = await supabase.rpc('get_pending_jobs', {
      p_limit: limit
    });

    if (error) throw error;
    return data || [];
  }

  async getExecutionHistory(jobId?: string, limit: number = 50): Promise<JobExecution[]> {
    const { data, error } = await supabase.rpc('get_job_execution_history', {
      p_agency_id: this.agencyId,
      p_job_id: jobId || null,
      p_limit: limit
    });

    if (error) throw error;
    return data || [];
  }

  async getJobLogs(executionId: string, logLevel?: string): Promise<JobLog[]> {
    const { data, error } = await supabase.rpc('get_job_logs', {
      p_execution_id: executionId,
      p_log_level: logLevel || null
    });

    if (error) throw error;
    return data || [];
  }

  async getDeadLetterQueue(resolved: boolean = false): Promise<DeadLetterItem[]> {
    const { data, error } = await supabase.rpc('get_dead_letter_queue', {
      p_agency_id: this.agencyId,
      p_resolved: resolved
    });

    if (error) throw error;
    return data || [];
  }

  async resolveDeadLetterItem(dlqId: string, resolutionNotes: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('resolve_dead_letter_item', {
      p_dlq_id: dlqId,
      p_resolution_notes: resolutionNotes
    });

    if (error) throw error;
    return data;
  }

  async runPendingJobs(): Promise<{ executed: number; failed: number }> {
    const pending = await this.getPendingJobs(5);
    let executed = 0;
    let failed = 0;

    for (const job of pending) {
      try {
        const result = await this.executeJob(job.id);
        if (result.success) {
          executed++;
          console.log(`[JobRunner] Executed job: ${job.job_name}`, result);
        } else {
          failed++;
          console.error(`[JobRunner] Job failed: ${job.job_name}`, result.error);
        }
      } catch (error) {
        failed++;
        console.error(`[JobRunner] Error executing job: ${job.job_name}`, error);
      }
    }

    return { executed, failed };
  }

  start(): void {
    if (this.isRunning) {
      console.warn('[JobRunner] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[JobRunner] Started with poll interval:', this.pollInterval);

    const poll = async () => {
      if (!this.isRunning) return;

      try {
        const result = await this.runPendingJobs();
        if (result.executed > 0 || result.failed > 0) {
          console.log(`[JobRunner] Poll complete - executed: ${result.executed}, failed: ${result.failed}`);
        }
      } catch (error) {
        console.error('[JobRunner] Poll error:', error);
      }

      if (this.isRunning) {
        this.pollTimer = setTimeout(poll, this.pollInterval);
      }
    };

    poll();
  }

  stop(): void {
    this.isRunning = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    console.log('[JobRunner] Stopped');
  }

  setPollInterval(milliseconds: number): void {
    this.pollInterval = milliseconds;
    if (this.isRunning) {
      this.stop();
      this.start();
    }
  }
}

export const createJobRunner = (agencyId: string): JobRunner => {
  return new JobRunner(agencyId);
};
