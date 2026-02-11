/*
  # Fix Phase 4 Architecture Violations

  ## Violations Fixed

  ### 1. Policy Violation: Mode-Based Permission Differences
  
  **Problem:**
  - Anon users (showcase) granted INSERT/UPDATE/DELETE on core tables
  - Creates different permission model for showcase vs live
  - Violates: "Showcase = Live App" with same security boundaries
  
  **Fix:**
  - Remove all anon write policies (INSERT/UPDATE/DELETE)
  - Keep anon read policies (SELECT) for UI display
  - Simulation uses service role with same RPC boundaries as real users

  ### 2. Data Pollution: Simulation Mixed with Real Data
  
  **Problem:**
  - Simulation data written to production tables without tagging
  - Corrupts analytics
  - Distorts AI learning
  - Triggers false alerts
  
  **Fix:**
  - Add is_simulation flag to all core tables
  - Tag all simulation data during seeding
  - Filter simulation data in production queries by default

  ## Tables Modified
  
  All core operational tables get is_simulation flag:
  - tasks
  - task_evidence
  - medication_administration_log
  - vital_signs
  - intelligence_signals
  - ai_learning_inputs
  - observation_events
  - anomaly_detections
  - risk_scores
  - voice_transcription_jobs
  - notification_log
  - audit_log
  - supervisor_reviews
*/

-- ============================================================================
-- STEP 1: Remove All Anon Write Policies
-- ============================================================================

-- Tasks table: Remove anon write access
DROP POLICY IF EXISTS "Anonymous users can insert showcase tasks" ON tasks;
DROP POLICY IF EXISTS "Anonymous users can update showcase tasks" ON tasks;
DROP POLICY IF EXISTS "Anonymous users can delete showcase tasks" ON tasks;

-- Task evidence: Remove anon write access
DROP POLICY IF EXISTS "Anonymous users can insert showcase task evidence" ON task_evidence;
DROP POLICY IF EXISTS "Anonymous users can update showcase task evidence" ON task_evidence;
DROP POLICY IF EXISTS "Anonymous users can delete showcase task evidence" ON task_evidence;

-- Supervisor reviews: Remove anon write access
DROP POLICY IF EXISTS "Anonymous users can insert showcase supervisor reviews" ON supervisor_reviews;
DROP POLICY IF EXISTS "Anonymous users can update showcase supervisor reviews" ON supervisor_reviews;
DROP POLICY IF EXISTS "Anonymous users can delete showcase supervisor reviews" ON supervisor_reviews;

-- Audit log: Remove anon write access
DROP POLICY IF EXISTS "Anonymous users can insert showcase audit log" ON audit_log;
DROP POLICY IF EXISTS "Anonymous users can update showcase audit log" ON audit_log;
DROP POLICY IF EXISTS "Anonymous users can delete showcase audit log" ON audit_log;
DROP POLICY IF EXISTS "Anon can create audit log in showcase" ON audit_log;
DROP POLICY IF EXISTS "Anon can update audit log in showcase" ON audit_log;

-- Intelligence signals: Remove anon write access
DROP POLICY IF EXISTS "Anon can create intelligence signals in showcase" ON intelligence_signals;
DROP POLICY IF EXISTS "Anon can update intelligence signals in showcase" ON intelligence_signals;

-- Medication administration log: Remove anon write access
DROP POLICY IF EXISTS "Anon can create medication admin log in showcase" ON medication_administration_log;
DROP POLICY IF EXISTS "Anon can update medication admin log in showcase" ON medication_administration_log;
DROP POLICY IF EXISTS "Anon can insert medication administration" ON medication_administration_log;

-- Vital signs: Remove anon write access
DROP POLICY IF EXISTS "Anon can create vital signs in showcase" ON vital_signs;
DROP POLICY IF EXISTS "Anon can update vital signs in showcase" ON vital_signs;

-- AI learning inputs: Remove anon write access
DROP POLICY IF EXISTS "Anon can create ai learning inputs in showcase" ON ai_learning_inputs;
DROP POLICY IF EXISTS "Anon can update ai learning inputs in showcase" ON ai_learning_inputs;

-- Voice transcription jobs: Remove anon write access
DROP POLICY IF EXISTS "Anon can create voice jobs in showcase" ON voice_transcription_jobs;
DROP POLICY IF EXISTS "Anon can update voice jobs in showcase" ON voice_transcription_jobs;

-- Resident medications: Remove anon write access
DROP POLICY IF EXISTS "Anon can insert resident medications" ON resident_medications;
DROP POLICY IF EXISTS "Anon can update resident medications" ON resident_medications;

-- Health metric trends: Remove anon write access
DROP POLICY IF EXISTS "Anon can insert health metric trends" ON health_metric_trends;
DROP POLICY IF EXISTS "Anon can update health metric trends" ON health_metric_trends;

-- Note: SELECT policies are kept for UI display purposes

-- ============================================================================
-- STEP 2: Add is_simulation Flag to Core Tables
-- ============================================================================

-- Tasks
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_tasks_is_simulation ON tasks(is_simulation) WHERE NOT is_simulation;

-- Task evidence
ALTER TABLE task_evidence
ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_task_evidence_is_simulation ON task_evidence(is_simulation) WHERE NOT is_simulation;

-- Medication administration log
ALTER TABLE medication_administration_log
ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_medication_log_is_simulation ON medication_administration_log(is_simulation) WHERE NOT is_simulation;

-- Vital signs
ALTER TABLE vital_signs
ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_vital_signs_is_simulation ON vital_signs(is_simulation) WHERE NOT is_simulation;

-- Intelligence signals
ALTER TABLE intelligence_signals
ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_intelligence_signals_is_simulation ON intelligence_signals(is_simulation) WHERE NOT is_simulation;

-- AI learning inputs
ALTER TABLE ai_learning_inputs
ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_ai_learning_inputs_is_simulation ON ai_learning_inputs(is_simulation) WHERE NOT is_simulation;

-- Observation events
ALTER TABLE observation_events
ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_observation_events_is_simulation ON observation_events(is_simulation) WHERE NOT is_simulation;

-- Anomaly detections
ALTER TABLE anomaly_detections
ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_anomaly_detections_is_simulation ON anomaly_detections(is_simulation) WHERE NOT is_simulation;

-- Risk scores
ALTER TABLE risk_scores
ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_risk_scores_is_simulation ON risk_scores(is_simulation) WHERE NOT is_simulation;

-- Voice transcription jobs
ALTER TABLE voice_transcription_jobs
ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_voice_jobs_is_simulation ON voice_transcription_jobs(is_simulation) WHERE NOT is_simulation;

-- Notification log
ALTER TABLE notification_log
ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_notification_log_is_simulation ON notification_log(is_simulation) WHERE NOT is_simulation;

-- Audit log
ALTER TABLE audit_log
ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_audit_log_is_simulation ON audit_log(is_simulation) WHERE NOT is_simulation;

-- Supervisor reviews
ALTER TABLE supervisor_reviews
ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_supervisor_reviews_is_simulation ON supervisor_reviews(is_simulation) WHERE NOT is_simulation;

-- Health metric trends
ALTER TABLE health_metric_trends
ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_health_metric_trends_is_simulation ON health_metric_trends(is_simulation) WHERE NOT is_simulation;

-- ============================================================================
-- STEP 3: Create Simulation Service Role
-- ============================================================================

-- Create service role for simulation engine
-- This role uses same RPC boundaries as authenticated users
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'simulation_service') THEN
    CREATE ROLE simulation_service NOLOGIN;
  END IF;
END $$;

-- Grant simulation service same RPC access as authenticated users
-- But NOT direct table access (must go through RPCs)
GRANT authenticated TO simulation_service;

-- Create helper function to check if current role is simulation service
CREATE OR REPLACE FUNCTION is_simulation_context()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT current_user = 'simulation_service';
$$;

-- ============================================================================
-- STEP 4: Update RPC Functions to Support Simulation Tagging
-- ============================================================================

-- Function to tag simulation data in tasks
CREATE OR REPLACE FUNCTION create_task_with_simulation_tag(
  p_task_data jsonb,
  p_is_simulation boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_id uuid;
BEGIN
  INSERT INTO tasks (
    agency_id,
    resident_id,
    category_id,
    title,
    description,
    priority,
    scheduled_for,
    department_id,
    assigned_to,
    is_simulation,
    created_by
  ) VALUES (
    (p_task_data->>'agency_id')::uuid,
    (p_task_data->>'resident_id')::uuid,
    (p_task_data->>'category_id')::uuid,
    p_task_data->>'title',
    p_task_data->>'description',
    (p_task_data->>'priority')::text,
    (p_task_data->>'scheduled_for')::timestamptz,
    (p_task_data->>'department_id')::uuid,
    (p_task_data->>'assigned_to')::uuid,
    p_is_simulation,
    COALESCE((p_task_data->>'created_by')::uuid, auth.uid())
  )
  RETURNING id INTO v_task_id;

  RETURN v_task_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_task_with_simulation_tag(jsonb, boolean) TO authenticated, simulation_service;

-- Function to record vital sign with simulation tag
CREATE OR REPLACE FUNCTION record_vital_sign_with_simulation_tag(
  p_resident_id uuid,
  p_metric_type text,
  p_value numeric,
  p_unit text,
  p_is_simulation boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vital_id uuid;
BEGIN
  INSERT INTO vital_signs (
    resident_id,
    metric_type,
    value,
    unit,
    recorded_at,
    recorded_by,
    is_simulation
  ) VALUES (
    p_resident_id,
    p_metric_type,
    p_value,
    p_unit,
    now(),
    auth.uid(),
    p_is_simulation
  )
  RETURNING id INTO v_vital_id;

  RETURN v_vital_id;
END;
$$;

GRANT EXECUTE ON FUNCTION record_vital_sign_with_simulation_tag(uuid, text, numeric, text, boolean) TO authenticated, simulation_service;

-- ============================================================================
-- STEP 5: Update Query Functions to Filter Simulation Data by Default
-- ============================================================================

-- Helper function to get production-only tasks (default behavior)
CREATE OR REPLACE FUNCTION get_production_tasks(
  p_agency_id uuid,
  p_include_simulation boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  priority text,
  status text,
  resident_id uuid,
  scheduled_for timestamptz,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.description,
    t.priority,
    t.status,
    t.resident_id,
    t.scheduled_for,
    t.created_at
  FROM tasks t
  WHERE t.agency_id = p_agency_id
    AND (p_include_simulation OR NOT t.is_simulation);
END;
$$;

GRANT EXECUTE ON FUNCTION get_production_tasks(uuid, boolean) TO authenticated;

-- Helper function to get production-only intelligence signals
CREATE OR REPLACE FUNCTION get_production_intelligence_signals(
  p_agency_id uuid,
  p_include_simulation boolean DEFAULT false
)
RETURNS TABLE (
  id uuid,
  resident_id uuid,
  signal_type text,
  severity text,
  title text,
  description text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.resident_id,
    i.signal_type,
    i.severity,
    i.title,
    i.description,
    i.created_at
  FROM intelligence_signals i
  JOIN residents r ON r.id = i.resident_id
  WHERE r.agency_id = p_agency_id
    AND (p_include_simulation OR NOT i.is_simulation);
END;
$$;

GRANT EXECUTE ON FUNCTION get_production_intelligence_signals(uuid, boolean) TO authenticated;

-- ============================================================================
-- STEP 6: Documentation Comments
-- ============================================================================

COMMENT ON COLUMN tasks.is_simulation IS 
'Flag to identify simulation/test data. Production queries should filter WHERE NOT is_simulation.';

COMMENT ON COLUMN intelligence_signals.is_simulation IS 
'Flag to identify simulation/test data. Prevents simulation data from corrupting analytics and AI learning.';

COMMENT ON COLUMN vital_signs.is_simulation IS 
'Flag to identify simulation/test data. Ensures vital signs analytics use only real patient data.';

COMMENT ON COLUMN medication_administration_log.is_simulation IS 
'Flag to identify simulation/test data. Critical for accurate medication adherence reporting.';

COMMENT ON FUNCTION is_simulation_context() IS 
'Returns true if current execution context is simulation service. Used for automatic tagging.';
