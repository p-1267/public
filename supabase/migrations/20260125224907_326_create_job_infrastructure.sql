/*
  # WP7: Background Jobs & Automation Infrastructure
  
  1. New Tables
    - `job_definitions` - Job configuration and metadata
      - `id` (uuid, primary key)
      - `agency_id` (uuid, references agencies)
      - `job_name` (text, unique per agency)
      - `job_type` (text: 'recurring_tasks', 'reminders', 'aggregation', 'reports')
      - `schedule_cron` (text, cron expression)
      - `enabled` (boolean, default true)
      - `config` (jsonb, job-specific configuration)
      - `last_run_at` (timestamptz)
      - `next_run_at` (timestamptz)
      - `created_at` (timestamptz)
      - `created_by` (uuid, references auth.users)
    
    - `job_executions` - Job execution history
      - `id` (uuid, primary key)
      - `job_id` (uuid, references job_definitions)
      - `agency_id` (uuid, references agencies)
      - `status` (text: 'pending', 'running', 'completed', 'failed', 'retrying')
      - `started_at` (timestamptz)
      - `completed_at` (timestamptz)
      - `duration_ms` (int)
      - `input_params` (jsonb)
      - `output_result` (jsonb)
      - `error_message` (text)
      - `retry_count` (int, default 0)
      - `max_retries` (int, default 3)
    
    - `job_logs` - Detailed job execution logs
      - `id` (uuid, primary key)
      - `execution_id` (uuid, references job_executions)
      - `agency_id` (uuid, references agencies)
      - `log_level` (text: 'debug', 'info', 'warn', 'error')
      - `message` (text)
      - `metadata` (jsonb)
      - `logged_at` (timestamptz)
    
    - `dead_letter_queue` - Failed jobs requiring manual intervention
      - `id` (uuid, primary key)
      - `job_id` (uuid, references job_definitions)
      - `execution_id` (uuid, references job_executions)
      - `agency_id` (uuid, references agencies)
      - `job_type` (text)
      - `failure_reason` (text)
      - `input_params` (jsonb)
      - `retry_attempts` (int)
      - `first_failed_at` (timestamptz)
      - `last_failed_at` (timestamptz)
      - `resolved` (boolean, default false)
      - `resolved_at` (timestamptz)
      - `resolved_by` (uuid, references auth.users)
      - `resolution_notes` (text)
    
    - `job_aggregations` - Computed aggregations from jobs
      - `id` (uuid, primary key)
      - `agency_id` (uuid, references agencies)
      - `aggregation_type` (text: 'task_completion', 'staffing_hours', 'quality_score')
      - `period_start` (timestamptz)
      - `period_end` (timestamptz)
      - `metrics` (jsonb)
      - `computed_at` (timestamptz)
      - `computed_by_job_id` (uuid, references job_definitions)
  
  2. Security
    - Enable RLS on all tables
    - Users can view jobs for their agency
    - System jobs can insert/update executions
    - Only admins can modify job definitions
  
  3. Indexes
    - job_definitions: (agency_id, enabled, next_run_at)
    - job_executions: (job_id, status, started_at)
    - job_logs: (execution_id, logged_at)
    - dead_letter_queue: (agency_id, resolved, last_failed_at)
*/

-- Create job_definitions table
CREATE TABLE IF NOT EXISTS job_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  job_name text NOT NULL,
  job_type text NOT NULL CHECK (job_type IN ('recurring_tasks', 'reminders', 'aggregation', 'reports')),
  schedule_cron text,
  enabled boolean NOT NULL DEFAULT true,
  config jsonb DEFAULT '{}'::jsonb,
  last_run_at timestamptz,
  next_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(agency_id, job_name)
);

CREATE INDEX IF NOT EXISTS idx_job_definitions_agency_enabled ON job_definitions(agency_id, enabled, next_run_at);
CREATE INDEX IF NOT EXISTS idx_job_definitions_next_run ON job_definitions(next_run_at) WHERE enabled = true;

-- Create job_executions table
CREATE TABLE IF NOT EXISTS job_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES job_definitions(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'retrying')),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  duration_ms int,
  input_params jsonb DEFAULT '{}'::jsonb,
  output_result jsonb,
  error_message text,
  retry_count int NOT NULL DEFAULT 0,
  max_retries int NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_executions_job_status ON job_executions(job_id, status, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_executions_agency ON job_executions(agency_id, started_at DESC);

-- Create job_logs table
CREATE TABLE IF NOT EXISTS job_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES job_executions(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  log_level text NOT NULL CHECK (log_level IN ('debug', 'info', 'warn', 'error')),
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  logged_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_job_logs_execution ON job_logs(execution_id, logged_at);
CREATE INDEX IF NOT EXISTS idx_job_logs_level ON job_logs(log_level, logged_at) WHERE log_level IN ('error', 'warn');

-- Create dead_letter_queue table
CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES job_definitions(id) ON DELETE SET NULL,
  execution_id uuid REFERENCES job_executions(id) ON DELETE SET NULL,
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  job_type text NOT NULL,
  failure_reason text NOT NULL,
  input_params jsonb DEFAULT '{}'::jsonb,
  retry_attempts int NOT NULL DEFAULT 0,
  first_failed_at timestamptz NOT NULL DEFAULT now(),
  last_failed_at timestamptz NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  resolution_notes text
);

CREATE INDEX IF NOT EXISTS idx_dead_letter_queue_unresolved ON dead_letter_queue(agency_id, resolved, last_failed_at DESC);

-- Create job_aggregations table
CREATE TABLE IF NOT EXISTS job_aggregations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  aggregation_type text NOT NULL CHECK (aggregation_type IN ('task_completion', 'staffing_hours', 'quality_score')),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now(),
  computed_by_job_id uuid REFERENCES job_definitions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_job_aggregations_type_period ON job_aggregations(agency_id, aggregation_type, period_start DESC);

-- Enable RLS
ALTER TABLE job_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dead_letter_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_aggregations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_definitions
CREATE POLICY "Users can view their agency's job definitions"
  ON job_definitions FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage job definitions"
  ON job_definitions FOR ALL
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE name = 'admin')
    )
  );

-- RLS Policies for job_executions
CREATE POLICY "Users can view their agency's job executions"
  ON job_executions FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can manage job executions"
  ON job_executions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- RLS Policies for job_logs
CREATE POLICY "Users can view their agency's job logs"
  ON job_logs FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert job logs"
  ON job_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for dead_letter_queue
CREATE POLICY "Users can view their agency's dead letter queue"
  ON dead_letter_queue FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can resolve dead letter items"
  ON dead_letter_queue FOR UPDATE
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles 
      WHERE id = auth.uid() 
      AND role_id IN (SELECT id FROM roles WHERE name = 'admin')
    )
  );

-- RLS Policies for job_aggregations
CREATE POLICY "Users can view their agency's aggregations"
  ON job_aggregations FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert aggregations"
  ON job_aggregations FOR INSERT
  TO authenticated
  WITH CHECK (true);
