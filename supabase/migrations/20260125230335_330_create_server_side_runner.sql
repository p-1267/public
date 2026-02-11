/*
  # WP7: Server-Side Job Runner
  
  Creates the main server-side job runner that pg_cron calls.
  This runs WITHOUT any user session - pure system execution.
  
  Key features:
  - Runs as system/service (no auth.uid() required)
  - Acquires locks before execution
  - Handles backoff
  - Checks idempotency
  - Releases locks after completion
  - Records runner_identity as 'pg_cron'
*/

-- Function: Server-side job runner (called by pg_cron)
CREATE OR REPLACE FUNCTION run_scheduled_jobs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job record;
  v_execution_id uuid;
  v_lock_acquired boolean;
  v_result jsonb;
  v_jobs_run int := 0;
  v_jobs_skipped int := 0;
  v_jobs_failed int := 0;
  v_error_message text;
  v_results jsonb[] := ARRAY[]::jsonb[];
BEGIN
  -- Get pending jobs (not locked, not in backoff)
  FOR v_job IN
    SELECT 
      jd.id,
      jd.agency_id,
      jd.job_name,
      jd.job_type,
      jd.config
    FROM job_definitions jd
    WHERE 
      jd.enabled = true
      AND (jd.next_run_at IS NULL OR jd.next_run_at <= now())
      AND NOT EXISTS (
        SELECT 1 FROM job_executions je
        WHERE je.job_id = jd.id
        AND je.status IN ('pending', 'running')
        AND (je.backoff_until IS NULL OR je.backoff_until <= now())
      )
      AND NOT EXISTS (
        SELECT 1 FROM job_locks jl
        WHERE jl.job_id = jd.id
        AND jl.lock_expires_at > now()
      )
    ORDER BY jd.next_run_at NULLS FIRST
    LIMIT 10
  LOOP
    BEGIN
      -- Try to acquire lock
      v_execution_id := gen_random_uuid();
      v_lock_acquired := acquire_job_lock(v_job.id, v_execution_id, interval '5 minutes');
      
      IF NOT v_lock_acquired THEN
        v_jobs_skipped := v_jobs_skipped + 1;
        v_results := v_results || jsonb_build_object(
          'job_id', v_job.id,
          'job_name', v_job.job_name,
          'status', 'skipped',
          'reason', 'lock_acquisition_failed'
        );
        CONTINUE;
      END IF;
      
      -- Create execution record with system identity
      INSERT INTO job_executions (
        id,
        job_id,
        agency_id,
        status,
        started_at,
        input_params,
        runner_identity
      ) VALUES (
        v_execution_id,
        v_job.id,
        v_job.agency_id,
        'running',
        now(),
        v_job.config,
        'pg_cron'
      );
      
      -- Update job last_run_at
      UPDATE job_definitions
      SET last_run_at = now()
      WHERE id = v_job.id;
      
      -- Execute job based on type
      CASE v_job.job_type
        WHEN 'recurring_tasks' THEN
          v_result := execute_recurring_task_generation(v_execution_id, v_job.agency_id);
        WHEN 'reminders' THEN
          v_result := execute_reminder_escalation(v_execution_id, v_job.agency_id);
        WHEN 'aggregation' THEN
          v_result := execute_aggregation_job(v_execution_id, v_job.agency_id);
        WHEN 'reports' THEN
          v_result := execute_report_scheduling(v_execution_id, v_job.agency_id);
        ELSE
          RAISE EXCEPTION 'Unknown job type: %', v_job.job_type;
      END CASE;
      
      -- Complete execution
      UPDATE job_executions
      SET 
        status = 'completed',
        completed_at = now(),
        duration_ms = EXTRACT(EPOCH FROM (now() - started_at)) * 1000,
        output_result = v_result
      WHERE id = v_execution_id;
      
      -- Release lock
      PERFORM release_job_lock(v_job.id);
      
      v_jobs_run := v_jobs_run + 1;
      v_results := v_results || jsonb_build_object(
        'job_id', v_job.id,
        'job_name', v_job.job_name,
        'status', 'completed',
        'execution_id', v_execution_id
      );
      
    EXCEPTION WHEN OTHERS THEN
      -- Handle failure
      v_error_message := SQLERRM;
      v_jobs_failed := v_jobs_failed + 1;
      
      -- Update execution as failed
      UPDATE job_executions
      SET 
        status = 'failed',
        completed_at = now(),
        error_message = v_error_message,
        retry_count = retry_count + 1
      WHERE id = v_execution_id;
      
      -- Calculate backoff (exponential: 2^retry_count minutes, max 60 minutes)
      UPDATE job_executions
      SET backoff_until = now() + (LEAST(POWER(2, retry_count), 60) || ' minutes')::interval
      WHERE id = v_execution_id;
      
      -- Add to dead letter queue if max retries exceeded
      INSERT INTO dead_letter_queue (
        job_id,
        execution_id,
        agency_id,
        job_type,
        failure_reason,
        input_params,
        retry_attempts,
        first_failed_at,
        last_failed_at
      )
      SELECT 
        je.job_id,
        je.id,
        je.agency_id,
        jd.job_type,
        je.error_message,
        je.input_params,
        je.retry_count,
        now(),
        now()
      FROM job_executions je
      JOIN job_definitions jd ON jd.id = je.job_id
      WHERE je.id = v_execution_id
        AND je.retry_count >= je.max_retries
      ON CONFLICT DO NOTHING;
      
      -- Release lock
      PERFORM release_job_lock(v_job.id);
      
      v_results := v_results || jsonb_build_object(
        'job_id', v_job.id,
        'job_name', v_job.job_name,
        'status', 'failed',
        'error', v_error_message,
        'execution_id', v_execution_id
      );
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'timestamp', now(),
    'runner', 'pg_cron',
    'jobs_run', v_jobs_run,
    'jobs_skipped', v_jobs_skipped,
    'jobs_failed', v_jobs_failed,
    'results', v_results
  );
END;
$$;

-- Function: Trigger job runner manually (for testing)
CREATE OR REPLACE FUNCTION trigger_job_runner()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN run_scheduled_jobs();
END;
$$;
