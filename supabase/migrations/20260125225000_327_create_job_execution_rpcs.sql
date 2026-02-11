/*
  # WP7: Job Execution and Management RPCs
  
  Creates RPC functions for:
  1. Job execution lifecycle (start, complete, fail, retry)
  2. Job logging
  3. Job scheduling
  4. Monitoring and observability
*/

-- Function: Start a job execution
CREATE OR REPLACE FUNCTION start_job_execution(
  p_job_id uuid,
  p_input_params jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_execution_id uuid;
  v_agency_id uuid;
BEGIN
  -- Get agency_id from job definition
  SELECT agency_id INTO v_agency_id
  FROM job_definitions
  WHERE id = p_job_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job definition not found: %', p_job_id;
  END IF;
  
  -- Create execution record
  INSERT INTO job_executions (
    job_id,
    agency_id,
    status,
    started_at,
    input_params
  ) VALUES (
    p_job_id,
    v_agency_id,
    'running',
    now(),
    p_input_params
  )
  RETURNING id INTO v_execution_id;
  
  -- Update job definition last_run_at
  UPDATE job_definitions
  SET last_run_at = now()
  WHERE id = p_job_id;
  
  -- Log start
  INSERT INTO job_logs (execution_id, agency_id, log_level, message)
  VALUES (v_execution_id, v_agency_id, 'info', 'Job execution started');
  
  RETURN v_execution_id;
END;
$$;

-- Function: Complete a job execution successfully
CREATE OR REPLACE FUNCTION complete_job_execution(
  p_execution_id uuid,
  p_output_result jsonb DEFAULT '{}'::jsonb
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_started_at timestamptz;
  v_duration_ms int;
  v_agency_id uuid;
BEGIN
  -- Get execution details
  SELECT started_at, agency_id
  INTO v_started_at, v_agency_id
  FROM job_executions
  WHERE id = p_execution_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job execution not found: %', p_execution_id;
  END IF;
  
  -- Calculate duration
  v_duration_ms := EXTRACT(EPOCH FROM (now() - v_started_at)) * 1000;
  
  -- Update execution
  UPDATE job_executions
  SET 
    status = 'completed',
    completed_at = now(),
    duration_ms = v_duration_ms,
    output_result = p_output_result
  WHERE id = p_execution_id;
  
  -- Log completion
  INSERT INTO job_logs (execution_id, agency_id, log_level, message, metadata)
  VALUES (
    p_execution_id,
    v_agency_id,
    'info',
    'Job execution completed successfully',
    jsonb_build_object('duration_ms', v_duration_ms)
  );
  
  RETURN true;
END;
$$;

-- Function: Fail a job execution with retry logic
CREATE OR REPLACE FUNCTION fail_job_execution(
  p_execution_id uuid,
  p_error_message text,
  p_should_retry boolean DEFAULT true
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id uuid;
  v_agency_id uuid;
  v_job_type text;
  v_retry_count int;
  v_max_retries int;
  v_input_params jsonb;
  v_new_status text;
BEGIN
  -- Get execution details
  SELECT 
    je.job_id,
    je.agency_id,
    je.retry_count,
    je.max_retries,
    je.input_params,
    jd.job_type
  INTO 
    v_job_id,
    v_agency_id,
    v_retry_count,
    v_max_retries,
    v_input_params,
    v_job_type
  FROM job_executions je
  JOIN job_definitions jd ON jd.id = je.job_id
  WHERE je.id = p_execution_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job execution not found: %', p_execution_id;
  END IF;
  
  -- Determine new status
  IF p_should_retry AND v_retry_count < v_max_retries THEN
    v_new_status := 'retrying';
  ELSE
    v_new_status := 'failed';
  END IF;
  
  -- Update execution
  UPDATE job_executions
  SET 
    status = v_new_status,
    completed_at = now(),
    error_message = p_error_message,
    retry_count = retry_count + 1
  WHERE id = p_execution_id;
  
  -- Log failure
  INSERT INTO job_logs (execution_id, agency_id, log_level, message, metadata)
  VALUES (
    p_execution_id,
    v_agency_id,
    'error',
    'Job execution failed: ' || p_error_message,
    jsonb_build_object('retry_count', v_retry_count + 1, 'max_retries', v_max_retries)
  );
  
  -- Add to dead letter queue if max retries exceeded
  IF v_new_status = 'failed' THEN
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
    ) VALUES (
      v_job_id,
      p_execution_id,
      v_agency_id,
      v_job_type,
      p_error_message,
      v_input_params,
      v_retry_count + 1,
      now(),
      now()
    );
  END IF;
  
  RETURN true;
END;
$$;

-- Function: Log a message during job execution
CREATE OR REPLACE FUNCTION log_job_message(
  p_execution_id uuid,
  p_log_level text,
  p_message text,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
  v_agency_id uuid;
BEGIN
  -- Get agency_id from execution
  SELECT agency_id INTO v_agency_id
  FROM job_executions
  WHERE id = p_execution_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job execution not found: %', p_execution_id;
  END IF;
  
  -- Insert log
  INSERT INTO job_logs (
    execution_id,
    agency_id,
    log_level,
    message,
    metadata,
    logged_at
  ) VALUES (
    p_execution_id,
    v_agency_id,
    p_log_level,
    p_message,
    p_metadata,
    now()
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Function: Register or update a job definition
CREATE OR REPLACE FUNCTION register_job(
  p_agency_id uuid,
  p_job_name text,
  p_job_type text,
  p_schedule_cron text,
  p_config jsonb DEFAULT '{}'::jsonb,
  p_enabled boolean DEFAULT true
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job_id uuid;
BEGIN
  -- Upsert job definition
  INSERT INTO job_definitions (
    agency_id,
    job_name,
    job_type,
    schedule_cron,
    config,
    enabled,
    created_by
  ) VALUES (
    p_agency_id,
    p_job_name,
    p_job_type,
    p_schedule_cron,
    p_config,
    p_enabled,
    auth.uid()
  )
  ON CONFLICT (agency_id, job_name)
  DO UPDATE SET
    job_type = EXCLUDED.job_type,
    schedule_cron = EXCLUDED.schedule_cron,
    config = EXCLUDED.config,
    enabled = EXCLUDED.enabled
  RETURNING id INTO v_job_id;
  
  RETURN v_job_id;
END;
$$;

-- Function: Get pending jobs that need to run
CREATE OR REPLACE FUNCTION get_pending_jobs(
  p_limit int DEFAULT 10
) RETURNS TABLE (
  job_id uuid,
  agency_id uuid,
  job_name text,
  job_type text,
  config jsonb,
  next_run_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    jd.agency_id,
    jd.job_name,
    jd.job_type,
    jd.config,
    jd.next_run_at
  FROM job_definitions jd
  WHERE 
    jd.enabled = true
    AND (jd.next_run_at IS NULL OR jd.next_run_at <= now())
    AND NOT EXISTS (
      SELECT 1 FROM job_executions je
      WHERE je.job_id = jd.id
      AND je.status IN ('pending', 'running')
    )
  ORDER BY jd.next_run_at NULLS FIRST
  LIMIT p_limit;
END;
$$;

-- Function: Update job next run time (for scheduler)
CREATE OR REPLACE FUNCTION update_job_schedule(
  p_job_id uuid,
  p_next_run_at timestamptz
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE job_definitions
  SET next_run_at = p_next_run_at
  WHERE id = p_job_id;
  
  RETURN FOUND;
END;
$$;

-- Function: Get job execution history
CREATE OR REPLACE FUNCTION get_job_execution_history(
  p_agency_id uuid,
  p_job_id uuid DEFAULT NULL,
  p_limit int DEFAULT 50
) RETURNS TABLE (
  execution_id uuid,
  job_name text,
  job_type text,
  status text,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms int,
  error_message text,
  retry_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    je.id,
    jd.job_name,
    jd.job_type,
    je.status,
    je.started_at,
    je.completed_at,
    je.duration_ms,
    je.error_message,
    je.retry_count
  FROM job_executions je
  JOIN job_definitions jd ON jd.id = je.job_id
  WHERE 
    je.agency_id = p_agency_id
    AND (p_job_id IS NULL OR je.job_id = p_job_id)
  ORDER BY je.started_at DESC
  LIMIT p_limit;
END;
$$;

-- Function: Get job logs
CREATE OR REPLACE FUNCTION get_job_logs(
  p_execution_id uuid,
  p_log_level text DEFAULT NULL
) RETURNS TABLE (
  log_id uuid,
  log_level text,
  message text,
  metadata jsonb,
  logged_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    jl.log_level,
    jl.message,
    jl.metadata,
    jl.logged_at
  FROM job_logs jl
  WHERE 
    jl.execution_id = p_execution_id
    AND (p_log_level IS NULL OR jl.log_level = p_log_level)
  ORDER BY jl.logged_at ASC;
END;
$$;

-- Function: Get dead letter queue entries
CREATE OR REPLACE FUNCTION get_dead_letter_queue(
  p_agency_id uuid,
  p_resolved boolean DEFAULT false
) RETURNS TABLE (
  dlq_id uuid,
  job_type text,
  failure_reason text,
  retry_attempts int,
  first_failed_at timestamptz,
  last_failed_at timestamptz,
  resolved boolean,
  resolved_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id,
    dlq.job_type,
    dlq.failure_reason,
    dlq.retry_attempts,
    dlq.first_failed_at,
    dlq.last_failed_at,
    dlq.resolved,
    dlq.resolved_at
  FROM dead_letter_queue dlq
  WHERE 
    dlq.agency_id = p_agency_id
    AND dlq.resolved = p_resolved
  ORDER BY dlq.last_failed_at DESC;
END;
$$;

-- Function: Resolve dead letter queue entry
CREATE OR REPLACE FUNCTION resolve_dead_letter_item(
  p_dlq_id uuid,
  p_resolution_notes text
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE dead_letter_queue
  SET 
    resolved = true,
    resolved_at = now(),
    resolved_by = auth.uid(),
    resolution_notes = p_resolution_notes
  WHERE id = p_dlq_id;
  
  RETURN FOUND;
END;
$$;
