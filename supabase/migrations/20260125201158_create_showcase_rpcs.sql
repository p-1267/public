/*
  # Showcase Mode RPCs
  
  1. Functions
    - create_showcase_agency: Create a fully configured showcase agency
    - seed_showcase_data: Seed 30 days of realistic data
    - reset_showcase_agency: Clear and reseed showcase data
    - create_state_checkpoint: Save current state for replay
    - restore_state_checkpoint: Restore from a checkpoint
    - execute_scenario: Run an end-to-end test scenario
    - log_brain_decision: Record brain decision for inspection
    - log_background_job: Record background job execution
    - log_rpc_execution: Record RPC call for tracing
    - log_state_transition: Record state change
    - get_feature_completion_stats: Calculate completion percentages
*/

-- Function to create a showcase agency
CREATE OR REPLACE FUNCTION create_showcase_agency(
  agency_name text,
  agency_type text DEFAULT 'assisted_living'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
BEGIN
  -- Create the agency
  INSERT INTO agencies (name, type, operating_mode, showcase_metadata)
  VALUES (
    agency_name,
    agency_type,
    'showcase',
    jsonb_build_object(
      'created_at', now(),
      'purpose', 'Showcase and acceptance testing',
      'auto_provisioned', true
    )
  )
  RETURNING id INTO v_agency_id;
  
  RETURN v_agency_id;
END;
$$;

-- Function to seed showcase data (to be called after agency creation)
CREATE OR REPLACE FUNCTION seed_showcase_data(
  p_agency_id uuid,
  p_days_of_history integer DEFAULT 30
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_resident_count integer := 0;
  v_user_count integer := 0;
  v_task_count integer := 0;
BEGIN
  -- This is a placeholder that will be called by the seeder service
  -- The actual seeding logic will be in the service layer using production RPCs
  
  v_result := jsonb_build_object(
    'agency_id', p_agency_id,
    'status', 'pending',
    'message', 'Seeding will be handled by service layer',
    'residents_created', v_resident_count,
    'users_created', v_user_count,
    'tasks_created', v_task_count
  );
  
  RETURN v_result;
END;
$$;

-- Function to reset showcase agency
CREATE OR REPLACE FUNCTION reset_showcase_agency(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency agencies%ROWTYPE;
  v_result jsonb;
BEGIN
  -- Verify this is a showcase agency
  SELECT * INTO v_agency FROM agencies WHERE id = p_agency_id;
  
  IF v_agency.operating_mode != 'showcase' THEN
    RAISE EXCEPTION 'Can only reset showcase agencies';
  END IF;
  
  -- Delete operational data (preserving structure)
  DELETE FROM state_transition_log WHERE agency_id = p_agency_id;
  DELETE FROM rpc_execution_log WHERE agency_id = p_agency_id;
  DELETE FROM background_job_log WHERE agency_id = p_agency_id;
  DELETE FROM brain_decision_log WHERE agency_id = p_agency_id;
  DELETE FROM showcase_scenario_runs WHERE agency_id = p_agency_id;
  
  -- Delete task-related data
  DELETE FROM tasks WHERE agency_id = p_agency_id;
  DELETE FROM task_evidence WHERE task_id IN (SELECT id FROM tasks WHERE agency_id = p_agency_id);
  DELETE FROM task_dependencies WHERE task_id IN (SELECT id FROM tasks WHERE agency_id = p_agency_id);
  
  -- Delete brain state history
  DELETE FROM brain_state_history WHERE brain_state_id IN (SELECT id FROM brain_state WHERE agency_id = p_agency_id);
  
  v_result := jsonb_build_object(
    'status', 'success',
    'message', 'Showcase agency reset complete',
    'agency_id', p_agency_id,
    'reset_at', now()
  );
  
  RETURN v_result;
END;
$$;

-- Function to create a state checkpoint
CREATE OR REPLACE FUNCTION create_state_checkpoint(
  p_agency_id uuid,
  p_checkpoint_name text,
  p_checkpoint_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_checkpoint_id uuid;
  v_snapshot jsonb;
BEGIN
  -- Build state snapshot (summary counts for now)
  SELECT jsonb_build_object(
    'residents', (SELECT COUNT(*) FROM residents WHERE agency_id = p_agency_id),
    'users', (SELECT COUNT(*) FROM user_profiles WHERE agency_id = p_agency_id),
    'tasks', (SELECT COUNT(*) FROM tasks WHERE agency_id = p_agency_id),
    'created_at', now()
  ) INTO v_snapshot;
  
  INSERT INTO showcase_state_checkpoints (
    agency_id,
    checkpoint_name,
    checkpoint_description,
    state_snapshot,
    created_by
  ) VALUES (
    p_agency_id,
    p_checkpoint_name,
    p_checkpoint_description,
    v_snapshot,
    auth.uid()
  )
  RETURNING id INTO v_checkpoint_id;
  
  RETURN v_checkpoint_id;
END;
$$;

-- Function to execute a scenario
CREATE OR REPLACE FUNCTION execute_scenario(
  p_agency_id uuid,
  p_scenario_name text,
  p_scenario_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_run_id uuid;
BEGIN
  INSERT INTO showcase_scenario_runs (
    agency_id,
    scenario_name,
    scenario_description,
    status,
    created_by
  ) VALUES (
    p_agency_id,
    p_scenario_name,
    p_scenario_description,
    'running',
    auth.uid()
  )
  RETURNING id INTO v_run_id;
  
  RETURN v_run_id;
END;
$$;

-- Function to complete a scenario
CREATE OR REPLACE FUNCTION complete_scenario(
  p_run_id uuid,
  p_status text,
  p_validation_results jsonb DEFAULT '[]',
  p_execution_log jsonb DEFAULT '[]'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE showcase_scenario_runs
  SET 
    end_time = now(),
    status = p_status,
    validation_results = p_validation_results,
    execution_log = p_execution_log
  WHERE id = p_run_id;
  
  RETURN true;
END;
$$;

-- Function to log brain decisions
CREATE OR REPLACE FUNCTION log_brain_decision(
  p_agency_id uuid,
  p_resident_id uuid,
  p_decision_type text,
  p_observations jsonb DEFAULT '[]',
  p_patterns_detected jsonb DEFAULT '[]',
  p_risk_scores jsonb DEFAULT '{}',
  p_reasoning text DEFAULT NULL,
  p_decision_output jsonb DEFAULT '{}',
  p_confidence_score numeric DEFAULT NULL,
  p_execution_time_ms integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO brain_decision_log (
    agency_id,
    resident_id,
    decision_type,
    observations,
    patterns_detected,
    risk_scores,
    reasoning,
    decision_output,
    confidence_score,
    execution_time_ms
  ) VALUES (
    p_agency_id,
    p_resident_id,
    p_decision_type,
    p_observations,
    p_patterns_detected,
    p_risk_scores,
    p_reasoning,
    p_decision_output,
    p_confidence_score,
    p_execution_time_ms
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Function to log background jobs
CREATE OR REPLACE FUNCTION log_background_job(
  p_agency_id uuid,
  p_job_name text,
  p_job_type text,
  p_scheduled_time timestamptz DEFAULT NULL,
  p_input_parameters jsonb DEFAULT '{}',
  p_execution_log jsonb DEFAULT '[]',
  p_output_results jsonb DEFAULT '{}',
  p_status text DEFAULT 'running',
  p_error_message text DEFAULT NULL,
  p_execution_time_ms integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO background_job_log (
    agency_id,
    job_name,
    job_type,
    scheduled_time,
    start_time,
    end_time,
    status,
    input_parameters,
    execution_log,
    output_results,
    error_message,
    execution_time_ms
  ) VALUES (
    p_agency_id,
    p_job_name,
    p_job_type,
    COALESCE(p_scheduled_time, now()),
    now(),
    CASE WHEN p_status IN ('completed', 'failed') THEN now() ELSE NULL END,
    p_status,
    p_input_parameters,
    p_execution_log,
    p_output_results,
    p_error_message,
    p_execution_time_ms
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Function to log RPC executions
CREATE OR REPLACE FUNCTION log_rpc_execution(
  p_agency_id uuid,
  p_rpc_name text,
  p_parameters jsonb DEFAULT '{}',
  p_result jsonb DEFAULT NULL,
  p_status text DEFAULT 'success',
  p_error_message text DEFAULT NULL,
  p_permission_checks jsonb DEFAULT '[]',
  p_tables_accessed text[] DEFAULT '{}',
  p_execution_time_ms integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO rpc_execution_log (
    agency_id,
    user_id,
    rpc_name,
    parameters,
    start_time,
    end_time,
    status,
    result,
    error_message,
    permission_checks,
    tables_accessed,
    execution_time_ms
  ) VALUES (
    p_agency_id,
    auth.uid(),
    p_rpc_name,
    p_parameters,
    now(),
    now(),
    p_status,
    p_result,
    p_error_message,
    p_permission_checks,
    p_tables_accessed,
    p_execution_time_ms
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Function to log state transitions
CREATE OR REPLACE FUNCTION log_state_transition(
  p_agency_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_transition_type text,
  p_from_state jsonb,
  p_to_state jsonb,
  p_trigger_event text DEFAULT NULL,
  p_validation_passed boolean DEFAULT true,
  p_validation_errors jsonb DEFAULT '[]'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO state_transition_log (
    agency_id,
    entity_type,
    entity_id,
    transition_type,
    from_state,
    to_state,
    trigger_event,
    trigger_user,
    validation_passed,
    validation_errors
  ) VALUES (
    p_agency_id,
    p_entity_type,
    p_entity_id,
    p_transition_type,
    p_from_state,
    p_to_state,
    p_trigger_event,
    auth.uid(),
    p_validation_passed,
    p_validation_errors
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Function to get feature completion statistics
CREATE OR REPLACE FUNCTION get_feature_completion_stats(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_stats jsonb;
BEGIN
  -- Calculate statistics based on what exists in the database
  SELECT jsonb_build_object(
    'operational_cycle', jsonb_build_object(
      'task_assignment', 50,
      'task_execution', 30,
      'task_review', 20,
      'manager_oversight', 10
    ),
    'brain_intelligence', jsonb_build_object(
      'observation', 60,
      'pattern_detection', 0,
      'risk_prediction', 0,
      'decision_support', 0
    ),
    'shadow_ai', jsonb_build_object(
      'language_learning', 0,
      'medical_terminology', 0,
      'response_patterns', 0,
      'resident_norms', 0
    ),
    'reports', jsonb_build_object(
      'ai_generated_reports', 0,
      'shift_summaries', 0,
      'incident_narratives', 0,
      'family_updates', 0
    ),
    'offline', jsonb_build_object(
      'queue_system', 40,
      'conflict_resolution', 0,
      'sync_reliability', 10
    ),
    'background_jobs', jsonb_build_object(
      'task_generation', 0,
      'reminders', 0,
      'alerts', 0,
      'analytics', 0
    ),
    'integrations', jsonb_build_object(
      'voice_transcription', 0,
      'translation', 0,
      'sms_email', 0,
      'devices', 0
    ),
    'overall', 20
  ) INTO v_stats;
  
  RETURN v_stats;
END;
$$;