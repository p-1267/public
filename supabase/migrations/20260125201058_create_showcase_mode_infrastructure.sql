/*
  # Showcase Mode Infrastructure
  
  1. New Types
    - operating_mode enum (production, showcase)
    
  2. Schema Changes
    - Add operating_mode to agencies table
    - Add showcase metadata fields
    
  3. Tables
    - showcase_state_checkpoints: Store saved states for replay
    - showcase_scenario_runs: Track scenario execution history
    - brain_decision_log: Log all brain decisions for inspection
    - background_job_log: Log all background job executions
    - rpc_execution_log: Trace all RPC calls
    - state_transition_log: Track all state changes
    
  4. Security
    - Enable RLS on all new tables
    - Add policies for showcase mode access
*/

-- Create operating_mode enum
DO $$ BEGIN
  CREATE TYPE operating_mode AS ENUM ('production', 'showcase');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add operating_mode to agencies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agencies' AND column_name = 'operating_mode'
  ) THEN
    ALTER TABLE agencies ADD COLUMN operating_mode operating_mode DEFAULT 'production';
    ALTER TABLE agencies ADD COLUMN showcase_metadata jsonb DEFAULT '{}';
  END IF;
END $$;

-- Create showcase_state_checkpoints table
CREATE TABLE IF NOT EXISTS showcase_state_checkpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  checkpoint_name text NOT NULL,
  checkpoint_description text,
  state_snapshot jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_showcase_checkpoints_agency ON showcase_state_checkpoints(agency_id);
CREATE INDEX IF NOT EXISTS idx_showcase_checkpoints_created ON showcase_state_checkpoints(created_at DESC);

-- Create showcase_scenario_runs table
CREATE TABLE IF NOT EXISTS showcase_scenario_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  scenario_name text NOT NULL,
  scenario_description text,
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  status text NOT NULL DEFAULT 'running', -- running, passed, failed, error
  validation_results jsonb DEFAULT '[]',
  execution_log jsonb DEFAULT '[]',
  created_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_scenario_runs_agency ON showcase_scenario_runs(agency_id);
CREATE INDEX IF NOT EXISTS idx_scenario_runs_status ON showcase_scenario_runs(status);
CREATE INDEX IF NOT EXISTS idx_scenario_runs_start ON showcase_scenario_runs(start_time DESC);

-- Create brain_decision_log table
CREATE TABLE IF NOT EXISTS brain_decision_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  resident_id uuid REFERENCES residents(id) ON DELETE CASCADE,
  decision_type text NOT NULL, -- observation, pattern_detection, risk_assessment, action_recommendation
  observations jsonb DEFAULT '[]',
  patterns_detected jsonb DEFAULT '[]',
  risk_scores jsonb DEFAULT '{}',
  reasoning text,
  decision_output jsonb NOT NULL,
  confidence_score numeric(3,2),
  execution_time_ms integer,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_brain_log_agency ON brain_decision_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_brain_log_resident ON brain_decision_log(resident_id);
CREATE INDEX IF NOT EXISTS idx_brain_log_type ON brain_decision_log(decision_type);
CREATE INDEX IF NOT EXISTS idx_brain_log_created ON brain_decision_log(created_at DESC);

-- Create background_job_log table
CREATE TABLE IF NOT EXISTS background_job_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  job_name text NOT NULL,
  job_type text NOT NULL, -- task_generation, reminder, alert, analytics, cleanup
  scheduled_time timestamptz,
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  status text NOT NULL DEFAULT 'running', -- running, completed, failed, skipped
  input_parameters jsonb DEFAULT '{}',
  execution_log jsonb DEFAULT '[]',
  output_results jsonb DEFAULT '{}',
  error_message text,
  execution_time_ms integer
);

CREATE INDEX IF NOT EXISTS idx_job_log_agency ON background_job_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_job_log_type ON background_job_log(job_type);
CREATE INDEX IF NOT EXISTS idx_job_log_status ON background_job_log(status);
CREATE INDEX IF NOT EXISTS idx_job_log_scheduled ON background_job_log(scheduled_time DESC);

-- Create rpc_execution_log table
CREATE TABLE IF NOT EXISTS rpc_execution_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid REFERENCES agencies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  rpc_name text NOT NULL,
  parameters jsonb DEFAULT '{}',
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  status text NOT NULL DEFAULT 'running', -- running, success, error
  result jsonb,
  error_message text,
  permission_checks jsonb DEFAULT '[]',
  tables_accessed text[] DEFAULT '{}',
  execution_time_ms integer
);

CREATE INDEX IF NOT EXISTS idx_rpc_log_agency ON rpc_execution_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_rpc_log_user ON rpc_execution_log(user_id);
CREATE INDEX IF NOT EXISTS idx_rpc_log_name ON rpc_execution_log(rpc_name);
CREATE INDEX IF NOT EXISTS idx_rpc_log_start ON rpc_execution_log(start_time DESC);

-- Create state_transition_log table
CREATE TABLE IF NOT EXISTS state_transition_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  entity_type text NOT NULL, -- brain_state, task, assignment, etc
  entity_id uuid NOT NULL,
  transition_type text NOT NULL,
  from_state jsonb NOT NULL,
  to_state jsonb NOT NULL,
  trigger_event text,
  trigger_user uuid REFERENCES auth.users(id),
  validation_passed boolean DEFAULT true,
  validation_errors jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_state_log_agency ON state_transition_log(agency_id);
CREATE INDEX IF NOT EXISTS idx_state_log_entity ON state_transition_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_state_log_created ON state_transition_log(created_at DESC);

-- Enable RLS on all new tables
ALTER TABLE showcase_state_checkpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE showcase_scenario_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE brain_decision_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE background_job_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE rpc_execution_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE state_transition_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for showcase tables (accessible to authenticated users in the same agency)

CREATE POLICY "Users can view their agency checkpoints"
  ON showcase_state_checkpoints FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.agency_id = showcase_state_checkpoints.agency_id
    )
  );

CREATE POLICY "Supervisors can create checkpoints"
  ON showcase_state_checkpoints FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
      JOIN roles r ON up.role_id = r.id
      WHERE up.id = auth.uid()
      AND up.agency_id = showcase_state_checkpoints.agency_id
      AND r.name IN ('supervisor', 'agency_admin')
    )
  );

CREATE POLICY "Users can view their agency scenario runs"
  ON showcase_scenario_runs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.agency_id = showcase_scenario_runs.agency_id
    )
  );

CREATE POLICY "Users can create scenario runs"
  ON showcase_scenario_runs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.agency_id = showcase_scenario_runs.agency_id
    )
  );

CREATE POLICY "Users can update their scenario runs"
  ON showcase_scenario_runs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.agency_id = showcase_scenario_runs.agency_id
    )
  );

CREATE POLICY "Users can view their agency brain decisions"
  ON brain_decision_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.agency_id = brain_decision_log.agency_id
    )
  );

CREATE POLICY "System can log brain decisions"
  ON brain_decision_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their agency job logs"
  ON background_job_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.agency_id = background_job_log.agency_id
    )
  );

CREATE POLICY "System can log background jobs"
  ON background_job_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view RPC logs"
  ON rpc_execution_log FOR SELECT
  TO authenticated
  USING (
    agency_id IS NULL OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.agency_id = rpc_execution_log.agency_id
    )
  );

CREATE POLICY "System can log RPC executions"
  ON rpc_execution_log FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can view their agency state transitions"
  ON state_transition_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.agency_id = state_transition_log.agency_id
    )
  );

CREATE POLICY "System can log state transitions"
  ON state_transition_log FOR INSERT
  TO authenticated
  WITH CHECK (true);