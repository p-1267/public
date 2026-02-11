/*
  # WP7: Enable pg_cron and Job Locking
  
  1. Enable pg_cron extension
    - Allows server-side scheduled job execution
    - Jobs run without any browser/user session
  
  2. Create job_locks table
    - Prevents concurrent execution of same job
    - Tracks lock holder and acquisition time
    - Automatic cleanup of stale locks
  
  3. Create idempotency tracking
    - job_executions gets idempotency_key
    - Prevents duplicate execution
    - Enables safe retries
  
  4. Add backoff tracking
    - Records backoff strategy
    - Enables exponential backoff
*/

-- Enable pg_cron extension for server-side scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create job_locks table for concurrency control
CREATE TABLE IF NOT EXISTS job_locks (
  job_id uuid PRIMARY KEY REFERENCES job_definitions(id) ON DELETE CASCADE,
  locked_at timestamptz NOT NULL DEFAULT now(),
  locked_by text NOT NULL DEFAULT 'system',
  lock_expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  execution_id uuid REFERENCES job_executions(id)
);

CREATE INDEX IF NOT EXISTS idx_job_locks_expires ON job_locks(lock_expires_at);

-- Add idempotency and backoff tracking to job_executions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'job_executions' AND column_name = 'idempotency_key'
  ) THEN
    ALTER TABLE job_executions ADD COLUMN idempotency_key text;
    CREATE INDEX idx_job_executions_idempotency ON job_executions(idempotency_key) WHERE idempotency_key IS NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'job_executions' AND column_name = 'backoff_until'
  ) THEN
    ALTER TABLE job_executions ADD COLUMN backoff_until timestamptz;
    CREATE INDEX idx_job_executions_backoff ON job_executions(backoff_until) WHERE backoff_until IS NOT NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'job_executions' AND column_name = 'runner_identity'
  ) THEN
    ALTER TABLE job_executions ADD COLUMN runner_identity text DEFAULT 'system';
  END IF;
END $$;

-- Function: Acquire job lock (returns true if acquired, false if already locked)
CREATE OR REPLACE FUNCTION acquire_job_lock(
  p_job_id uuid,
  p_execution_id uuid,
  p_lock_duration interval DEFAULT interval '5 minutes'
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_acquired boolean := false;
BEGIN
  -- Clean up expired locks first
  DELETE FROM job_locks
  WHERE lock_expires_at < now();
  
  -- Try to acquire lock
  INSERT INTO job_locks (
    job_id,
    locked_at,
    locked_by,
    lock_expires_at,
    execution_id
  ) VALUES (
    p_job_id,
    now(),
    'system',
    now() + p_lock_duration,
    p_execution_id
  )
  ON CONFLICT (job_id) DO NOTHING
  RETURNING TRUE INTO v_acquired;
  
  RETURN COALESCE(v_acquired, false);
END;
$$;

-- Function: Release job lock
CREATE OR REPLACE FUNCTION release_job_lock(
  p_job_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM job_locks
  WHERE job_id = p_job_id;
  
  RETURN FOUND;
END;
$$;

-- Function: Check if job is locked
CREATE OR REPLACE FUNCTION is_job_locked(
  p_job_id uuid
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_locked boolean;
BEGIN
  -- Clean expired locks
  DELETE FROM job_locks
  WHERE lock_expires_at < now();
  
  -- Check if lock exists
  SELECT EXISTS(
    SELECT 1 FROM job_locks
    WHERE job_id = p_job_id
  ) INTO v_locked;
  
  RETURN v_locked;
END;
$$;

-- Enable RLS on job_locks
ALTER TABLE job_locks ENABLE ROW LEVEL SECURITY;

-- RLS Policy for job_locks (system can manage, users can view)
CREATE POLICY "System can manage job locks"
  ON job_locks FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
