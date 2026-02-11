/*
  # Phase 5: Simulation Data Reset Function

  ## Purpose
  One-click reset/cleanup of all simulation data
  
  ## Safety Requirements
  - Admin-only (SUPER_ADMIN role required)
  - Clears is_simulation=true data across all tables
  - Preserves production data (is_simulation=false)
  - Returns count of deleted records
  - Audit logged
  
  ## Use Cases
  - Reset showcase to clean state
  - Clear test data after demonstrations
  - Prepare for new simulation scenarios
*/

-- ============================================================================
-- Create Simulation Data Reset Function
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_simulation_data(
  p_agency_id uuid DEFAULT NULL,
  p_dry_run boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_super_admin boolean;
  v_deleted_counts jsonb := '{}';
  v_total_deleted integer := 0;
  v_count integer;
BEGIN
  -- Security: Only SUPER_ADMIN can reset simulation data
  SELECT auth.uid() INTO v_user_id;
  
  SELECT EXISTS (
    SELECT 1 FROM user_profiles up
    JOIN roles r ON r.id = up.role_id
    WHERE up.id = v_user_id
      AND r.name = 'SUPER_ADMIN'
  ) INTO v_is_super_admin;
  
  IF NOT v_is_super_admin THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: Only SUPER_ADMIN can reset simulation data';
  END IF;

  -- If dry run, just count without deleting
  IF p_dry_run THEN
    SELECT jsonb_build_object(
      'tasks', (SELECT COUNT(*) FROM tasks WHERE is_simulation AND (p_agency_id IS NULL OR agency_id = p_agency_id)),
      'task_evidence', (SELECT COUNT(*) FROM task_evidence WHERE is_simulation),
      'vital_signs', (SELECT COUNT(*) FROM vital_signs WHERE is_simulation),
      'medication_administration_log', (SELECT COUNT(*) FROM medication_administration_log WHERE is_simulation),
      'intelligence_signals', (SELECT COUNT(*) FROM intelligence_signals WHERE is_simulation),
      'observation_events', (SELECT COUNT(*) FROM observation_events WHERE is_simulation),
      'anomaly_detections', (SELECT COUNT(*) FROM anomaly_detections WHERE is_simulation),
      'risk_scores', (SELECT COUNT(*) FROM risk_scores WHERE is_simulation),
      'ai_learning_inputs', (SELECT COUNT(*) FROM ai_learning_inputs WHERE is_simulation AND (p_agency_id IS NULL OR agency_id = p_agency_id)),
      'notification_log', (SELECT COUNT(*) FROM notification_log WHERE is_simulation AND (p_agency_id IS NULL OR agency_id = p_agency_id)),
      'audit_log', (SELECT COUNT(*) FROM audit_log WHERE is_simulation),
      'supervisor_reviews', (SELECT COUNT(*) FROM supervisor_reviews WHERE is_simulation),
      'voice_transcription_jobs', (SELECT COUNT(*) FROM voice_transcription_jobs WHERE is_simulation AND (p_agency_id IS NULL OR agency_id = p_agency_id)),
      'health_metric_trends', (SELECT COUNT(*) FROM health_metric_trends WHERE is_simulation),
      'integration_requests', (SELECT COUNT(*) FROM integration_requests WHERE is_simulation)
    ) INTO v_deleted_counts;
    
    RETURN jsonb_build_object(
      'dry_run', true,
      'would_delete', v_deleted_counts,
      'agency_id', p_agency_id,
      'timestamp', now()
    );
  END IF;

  -- Actual deletion starts here
  
  -- Tasks
  DELETE FROM tasks 
  WHERE is_simulation 
    AND (p_agency_id IS NULL OR agency_id = p_agency_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('tasks', v_count);
  v_total_deleted := v_total_deleted + v_count;
  
  -- Task evidence (cascade should handle this, but explicit for clarity)
  DELETE FROM task_evidence 
  WHERE is_simulation;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('task_evidence', v_count);
  v_total_deleted := v_total_deleted + v_count;
  
  -- Vital signs
  DELETE FROM vital_signs 
  WHERE is_simulation;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('vital_signs', v_count);
  v_total_deleted := v_total_deleted + v_count;
  
  -- Medication administration log
  DELETE FROM medication_administration_log 
  WHERE is_simulation;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('medication_administration_log', v_count);
  v_total_deleted := v_total_deleted + v_count;
  
  -- Intelligence signals
  DELETE FROM intelligence_signals 
  WHERE is_simulation;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('intelligence_signals', v_count);
  v_total_deleted := v_total_deleted + v_count;
  
  -- Observation events
  DELETE FROM observation_events 
  WHERE is_simulation;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('observation_events', v_count);
  v_total_deleted := v_total_deleted + v_count;
  
  -- Anomaly detections
  DELETE FROM anomaly_detections 
  WHERE is_simulation;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('anomaly_detections', v_count);
  v_total_deleted := v_total_deleted + v_count;
  
  -- Risk scores
  DELETE FROM risk_scores 
  WHERE is_simulation;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('risk_scores', v_count);
  v_total_deleted := v_total_deleted + v_count;
  
  -- AI learning inputs
  DELETE FROM ai_learning_inputs 
  WHERE is_simulation 
    AND (p_agency_id IS NULL OR agency_id = p_agency_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('ai_learning_inputs', v_count);
  v_total_deleted := v_total_deleted + v_count;
  
  -- Notification log
  DELETE FROM notification_log 
  WHERE is_simulation 
    AND (p_agency_id IS NULL OR agency_id = p_agency_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('notification_log', v_count);
  v_total_deleted := v_total_deleted + v_count;
  
  -- Audit log (simulation entries only)
  DELETE FROM audit_log 
  WHERE is_simulation;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('audit_log', v_count);
  v_total_deleted := v_total_deleted + v_count;
  
  -- Supervisor reviews
  DELETE FROM supervisor_reviews 
  WHERE is_simulation;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('supervisor_reviews', v_count);
  v_total_deleted := v_total_deleted + v_count;
  
  -- Voice transcription jobs
  DELETE FROM voice_transcription_jobs 
  WHERE is_simulation 
    AND (p_agency_id IS NULL OR agency_id = p_agency_id);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('voice_transcription_jobs', v_count);
  v_total_deleted := v_total_deleted + v_count;
  
  -- Health metric trends
  DELETE FROM health_metric_trends 
  WHERE is_simulation;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('health_metric_trends', v_count);
  v_total_deleted := v_total_deleted + v_count;
  
  -- Integration requests
  DELETE FROM integration_requests 
  WHERE is_simulation;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  v_deleted_counts := v_deleted_counts || jsonb_build_object('integration_requests', v_count);
  v_total_deleted := v_total_deleted + v_count;

  -- Log the reset action
  INSERT INTO audit_log (
    action_type,
    action_description,
    user_id,
    metadata,
    created_at,
    is_simulation
  ) VALUES (
    'SIMULATION_RESET',
    'Simulation data reset performed',
    v_user_id,
    jsonb_build_object(
      'agency_id', p_agency_id,
      'total_deleted', v_total_deleted,
      'deleted_counts', v_deleted_counts
    ),
    now(),
    false  -- This audit entry is production
  );

  RETURN jsonb_build_object(
    'success', true,
    'total_deleted', v_total_deleted,
    'deleted_counts', v_deleted_counts,
    'agency_id', p_agency_id,
    'timestamp', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION reset_simulation_data TO authenticated;

-- ============================================================================
-- Create Helper: Get Simulation Data Summary
-- ============================================================================

CREATE OR REPLACE FUNCTION get_simulation_data_summary(
  p_agency_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_summary jsonb;
BEGIN
  SELECT jsonb_build_object(
    'tasks', (SELECT COUNT(*) FROM tasks WHERE is_simulation AND (p_agency_id IS NULL OR agency_id = p_agency_id)),
    'task_evidence', (SELECT COUNT(*) FROM task_evidence WHERE is_simulation),
    'vital_signs', (SELECT COUNT(*) FROM vital_signs WHERE is_simulation),
    'medication_logs', (SELECT COUNT(*) FROM medication_administration_log WHERE is_simulation),
    'intelligence_signals', (SELECT COUNT(*) FROM intelligence_signals WHERE is_simulation),
    'observations', (SELECT COUNT(*) FROM observation_events WHERE is_simulation),
    'anomalies', (SELECT COUNT(*) FROM anomaly_detections WHERE is_simulation),
    'risk_scores', (SELECT COUNT(*) FROM risk_scores WHERE is_simulation),
    'ai_inputs', (SELECT COUNT(*) FROM ai_learning_inputs WHERE is_simulation AND (p_agency_id IS NULL OR agency_id = p_agency_id)),
    'notifications', (SELECT COUNT(*) FROM notification_log WHERE is_simulation AND (p_agency_id IS NULL OR agency_id = p_agency_id)),
    'audit_entries', (SELECT COUNT(*) FROM audit_log WHERE is_simulation),
    'reviews', (SELECT COUNT(*) FROM supervisor_reviews WHERE is_simulation),
    'voice_jobs', (SELECT COUNT(*) FROM voice_transcription_jobs WHERE is_simulation AND (p_agency_id IS NULL OR agency_id = p_agency_id)),
    'health_trends', (SELECT COUNT(*) FROM health_metric_trends WHERE is_simulation),
    'integration_requests', (SELECT COUNT(*) FROM integration_requests WHERE is_simulation),
    'agency_id', p_agency_id,
    'timestamp', now()
  ) INTO v_summary;

  RETURN v_summary;
END;
$$;

GRANT EXECUTE ON FUNCTION get_simulation_data_summary TO authenticated;

-- ============================================================================
-- Documentation
-- ============================================================================

COMMENT ON FUNCTION reset_simulation_data IS 
'Admin-only function to reset all simulation data. Use p_dry_run=true to preview deletions without executing.';

COMMENT ON FUNCTION get_simulation_data_summary IS 
'Returns count of simulation data records across all tables for monitoring/reporting.';
