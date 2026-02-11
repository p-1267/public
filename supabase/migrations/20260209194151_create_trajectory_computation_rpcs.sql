/*
  # Trajectory Computation RPCs
  
  Deterministic projection engine with no ML/LLM
*/

-- Helper: Compute velocity from time series data
CREATE OR REPLACE FUNCTION compute_time_series_velocity(
  p_data_points jsonb, -- array of {timestamp, value}
  p_lookback_hours integer DEFAULT 168
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_first_value numeric;
  v_last_value numeric;
  v_first_time timestamptz;
  v_last_time timestamptz;
  v_time_diff_hours numeric;
  v_velocity numeric;
  v_consistency numeric;
BEGIN
  v_count := jsonb_array_length(p_data_points);
  
  IF v_count < 2 THEN
    RETURN jsonb_build_object(
      'status', 'INSUFFICIENT_DATA',
      'velocity', 0,
      'consistency', 0,
      'data_points', v_count
    );
  END IF;
  
  v_first_value := (p_data_points->0->>'value')::numeric;
  v_last_value := (p_data_points->(v_count-1)->>'value')::numeric;
  v_first_time := (p_data_points->0->>'timestamp')::timestamptz;
  v_last_time := (p_data_points->(v_count-1)->>'timestamp')::timestamptz;
  
  v_time_diff_hours := EXTRACT(EPOCH FROM (v_last_time - v_first_time)) / 3600;
  
  IF v_time_diff_hours = 0 THEN
    v_velocity := 0;
  ELSE
    v_velocity := (v_last_value - v_first_value) / v_time_diff_hours;
  END IF;
  
  -- Simple consistency: coefficient of variation (stddev/mean)
  -- For now, simplified to 0.8 if we have enough points
  v_consistency := CASE 
    WHEN v_count >= 5 THEN 0.8
    WHEN v_count >= 3 THEN 0.6
    ELSE 0.4
  END;
  
  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'velocity', v_velocity,
    'velocity_per_day', v_velocity * 24,
    'consistency', v_consistency,
    'data_points', v_count,
    'first_value', v_first_value,
    'last_value', v_last_value,
    'time_span_hours', v_time_diff_hours
  );
END;
$$;

-- Main trajectory computation for VITAL_INSTABILITY risk type
CREATE OR REPLACE FUNCTION compute_risk_trajectory(
  p_resident_id uuid,
  p_risk_type text DEFAULT 'VITAL_INSTABILITY'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_start_time timestamptz;
  v_agency_id uuid;
  v_rule_version record;
  v_data_points jsonb;
  v_velocity_result jsonb;
  v_current_risk_level text;
  v_persistence_hours integer;
  v_escalation_horizon integer;
  v_projected_next_level text;
  v_confidence numeric;
  v_assumptions text;
  v_projection_id uuid;
  v_log_id uuid;
  v_source_ids uuid[];
BEGIN
  v_start_time := clock_timestamp();
  
  SELECT agency_id INTO v_agency_id FROM residents WHERE id = p_resident_id;
  IF v_agency_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Resident not found');
  END IF;
  
  -- Get active rule version
  SELECT * INTO v_rule_version 
  FROM projection_rule_versions 
  WHERE effective_until IS NULL OR effective_until > now()
  ORDER BY version_number DESC 
  LIMIT 1;
  
  IF v_rule_version IS NULL THEN
    RETURN jsonb_build_object('error', 'No active rule version');
  END IF;
  
  -- Collect vital signs data (BP systolic as example)
  IF p_risk_type = 'VITAL_INSTABILITY' THEN
    SELECT 
      jsonb_agg(
        jsonb_build_object(
          'timestamp', vs.recorded_at,
          'value', vs.systolic,
          'id', vs.id
        ) ORDER BY vs.recorded_at
      ),
      array_agg(vs.id ORDER BY vs.recorded_at)
    INTO v_data_points, v_source_ids
    FROM vital_signs vs
    WHERE vs.resident_id = p_resident_id
      AND vs.vital_type = 'blood_pressure'
      AND vs.systolic IS NOT NULL
      AND vs.recorded_at >= now() - (v_rule_version.rule_set->>'lookback_window_hours')::integer * interval '1 hour'
    HAVING COUNT(*) >= (v_rule_version.rule_set->>'minimum_data_points')::integer;
    
    IF v_data_points IS NULL THEN
      -- Log insufficient data
      INSERT INTO trajectory_computation_log (
        resident_id, agency_id, computation_type, trigger_source,
        input_data_snapshot, computation_status, rule_version_id,
        computation_duration_ms
      ) VALUES (
        p_resident_id, v_agency_id, 'SINGLE_RESIDENT', 'MANUAL',
        jsonb_build_object('risk_type', p_risk_type, 'data_points_found', 0),
        'INSUFFICIENT_DATA', v_rule_version.id,
        EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::integer
      ) RETURNING id INTO v_log_id;
      
      RETURN jsonb_build_object(
        'status', 'INSUFFICIENT_DATA',
        'resident_id', p_resident_id,
        'risk_type', p_risk_type,
        'message', format('Need at least %s data points in %s hours', 
          v_rule_version.rule_set->>'minimum_data_points',
          v_rule_version.rule_set->>'lookback_window_hours'
        ),
        'log_id', v_log_id
      );
    END IF;
    
    -- Compute velocity
    v_velocity_result := compute_time_series_velocity(
      v_data_points, 
      (v_rule_version.rule_set->>'lookback_window_hours')::integer
    );
    
    -- Determine current risk level based on latest value
    DECLARE
      v_latest_value numeric;
    BEGIN
      v_latest_value := (v_data_points->-1->>'value')::numeric;
      
      IF v_latest_value >= 180 OR v_latest_value < 80 THEN
        v_current_risk_level := 'CRITICAL';
      ELSIF v_latest_value >= 160 OR v_latest_value < 90 THEN
        v_current_risk_level := 'HIGH';
      ELSIF v_latest_value >= 140 OR v_latest_value < 100 THEN
        v_current_risk_level := 'MEDIUM';
      ELSE
        v_current_risk_level := 'LOW';
      END IF;
    END;
    
    -- Calculate persistence duration (how long abnormal)
    DECLARE
      v_abnormal_count integer;
      v_first_abnormal_time timestamptz;
    BEGIN
      SELECT 
        COUNT(*),
        MIN(recorded_at)
      INTO v_abnormal_count, v_first_abnormal_time
      FROM vital_signs vs
      WHERE vs.resident_id = p_resident_id
        AND vs.vital_type = 'blood_pressure'
        AND vs.systolic IS NOT NULL
        AND (vs.systolic >= 140 OR vs.systolic < 100)
        AND vs.recorded_at >= now() - (v_rule_version.rule_set->>'lookback_window_hours')::integer * interval '1 hour';
      
      IF v_abnormal_count > 0 AND v_first_abnormal_time IS NOT NULL THEN
        v_persistence_hours := EXTRACT(EPOCH FROM (now() - v_first_abnormal_time)) / 3600;
      ELSE
        v_persistence_hours := 0;
      END IF;
    END;
    
    -- Calculate escalation horizon (time to next severity level)
    DECLARE
      v_velocity_per_day numeric;
      v_current_value numeric;
      v_next_threshold numeric;
    BEGIN
      v_velocity_per_day := (v_velocity_result->>'velocity_per_day')::numeric;
      v_current_value := (v_data_points->-1->>'value')::numeric;
      
      v_escalation_horizon := NULL;
      v_projected_next_level := NULL;
      
      IF v_velocity_per_day > 0 THEN -- Rising
        IF v_current_risk_level = 'LOW' THEN
          v_next_threshold := 140;
          v_projected_next_level := 'MEDIUM';
        ELSIF v_current_risk_level = 'MEDIUM' THEN
          v_next_threshold := 160;
          v_projected_next_level := 'HIGH';
        ELSIF v_current_risk_level = 'HIGH' THEN
          v_next_threshold := 180;
          v_projected_next_level := 'CRITICAL';
        END IF;
        
        IF v_next_threshold IS NOT NULL AND v_velocity_per_day > 0 THEN
          v_escalation_horizon := ((v_next_threshold - v_current_value) / v_velocity_per_day * 24)::integer;
          IF v_escalation_horizon < 0 THEN v_escalation_horizon := 0; END IF;
        END IF;
      ELSIF v_velocity_per_day < 0 THEN -- Falling (hypotension risk)
        IF v_current_risk_level = 'LOW' THEN
          v_next_threshold := 80;
          v_projected_next_level := 'CRITICAL';
        ELSIF v_current_risk_level = 'MEDIUM' THEN
          v_next_threshold := 90;
          v_projected_next_level := 'HIGH';
        END IF;
        
        IF v_next_threshold IS NOT NULL AND v_velocity_per_day < 0 THEN
          v_escalation_horizon := ((v_current_value - v_next_threshold) / ABS(v_velocity_per_day) * 24)::integer;
          IF v_escalation_horizon < 0 THEN v_escalation_horizon := 0; END IF;
        END IF;
      END IF;
    END;
    
    -- Calculate projection confidence
    DECLARE
      v_data_points_factor numeric;
      v_consistency_factor numeric;
      v_recency_factor numeric;
    BEGIN
      v_data_points_factor := LEAST(1.0, jsonb_array_length(v_data_points)::numeric / 10.0);
      v_consistency_factor := (v_velocity_result->>'consistency')::numeric;
      v_recency_factor := 0.9; -- High if latest data is recent
      
      v_confidence := (
        v_data_points_factor * 0.4 +
        v_consistency_factor * 0.3 +
        v_recency_factor * 0.3
      );
    END;
    
    -- Build assumptions text
    v_assumptions := format(
      'Assuming no intervention; same medication adherence; stable activity level. Based on %s data points over %s hours. Velocity: %s mmHg/day.',
      jsonb_array_length(v_data_points),
      (v_velocity_result->>'time_span_hours')::numeric,
      ROUND((v_velocity_result->>'velocity_per_day')::numeric, 2)
    );
    
    -- Insert projection
    INSERT INTO risk_trajectory_projections (
      resident_id, agency_id, risk_type, current_risk_level,
      trend_velocity, persistence_duration_hours, escalation_horizon_hours, projected_next_level,
      projection_confidence, data_sufficiency, data_points_used, lookback_window_hours, assumptions,
      rule_version_id, source_data_ids, velocity_calculation_details
    ) VALUES (
      p_resident_id, v_agency_id, p_risk_type, v_current_risk_level,
      (v_velocity_result->>'velocity')::numeric, v_persistence_hours, v_escalation_horizon, v_projected_next_level,
      v_confidence, 'SUFFICIENT', jsonb_array_length(v_data_points),
      (v_rule_version.rule_set->>'lookback_window_hours')::integer, v_assumptions,
      v_rule_version.id, v_source_ids, v_velocity_result
    ) RETURNING id INTO v_projection_id;
    
    -- Log computation
    INSERT INTO trajectory_computation_log (
      resident_id, agency_id, computation_type, trigger_source,
      input_data_snapshot, output_projection_id, computation_status,
      rule_version_id, computation_duration_ms
    ) VALUES (
      p_resident_id, v_agency_id, 'SINGLE_RESIDENT', 'MANUAL',
      jsonb_build_object(
        'risk_type', p_risk_type,
        'data_points_count', jsonb_array_length(v_data_points),
        'velocity_result', v_velocity_result
      ),
      v_projection_id, 'SUCCESS', v_rule_version.id,
      EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::integer
    );
    
    RETURN jsonb_build_object(
      'status', 'SUCCESS',
      'projection_id', v_projection_id,
      'resident_id', p_resident_id,
      'risk_type', p_risk_type,
      'current_risk_level', v_current_risk_level,
      'trend_velocity', (v_velocity_result->>'velocity_per_day')::numeric,
      'persistence_hours', v_persistence_hours,
      'escalation_horizon_hours', v_escalation_horizon,
      'projected_next_level', v_projected_next_level,
      'projection_confidence', v_confidence,
      'data_points_used', jsonb_array_length(v_data_points),
      'assumptions', v_assumptions
    );
  END IF;
  
  RETURN jsonb_build_object('error', 'Unsupported risk type: ' || p_risk_type);
END;
$$;

-- Get latest trajectory for a resident
CREATE OR REPLACE FUNCTION get_latest_trajectory(p_resident_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'projection_id', rtp.id,
      'risk_type', rtp.risk_type,
      'current_risk_level', rtp.current_risk_level,
      'trend_velocity', rtp.trend_velocity,
      'persistence_duration_hours', rtp.persistence_duration_hours,
      'escalation_horizon_hours', rtp.escalation_horizon_hours,
      'projected_next_level', rtp.projected_next_level,
      'projection_confidence', rtp.projection_confidence,
      'data_sufficiency', rtp.data_sufficiency,
      'assumptions', rtp.assumptions,
      'computation_timestamp', rtp.computation_timestamp
    )
  )
  INTO v_result
  FROM (
    SELECT DISTINCT ON (risk_type) *
    FROM risk_trajectory_projections
    WHERE resident_id = p_resident_id
    ORDER BY risk_type, computation_timestamp DESC
  ) rtp;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;

-- Batch compute all trajectories for agency
CREATE OR REPLACE FUNCTION compute_all_trajectories(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resident record;
  v_result jsonb;
  v_success_count integer := 0;
  v_insufficient_count integer := 0;
  v_error_count integer := 0;
BEGIN
  FOR v_resident IN 
    SELECT id FROM residents WHERE agency_id = p_agency_id
  LOOP
    BEGIN
      v_result := compute_risk_trajectory(v_resident.id, 'VITAL_INSTABILITY');
      
      IF v_result->>'status' = 'SUCCESS' THEN
        v_success_count := v_success_count + 1;
      ELSIF v_result->>'status' = 'INSUFFICIENT_DATA' THEN
        v_insufficient_count := v_insufficient_count + 1;
      ELSE
        v_error_count := v_error_count + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_error_count := v_error_count + 1;
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'status', 'COMPLETED',
    'agency_id', p_agency_id,
    'success_count', v_success_count,
    'insufficient_data_count', v_insufficient_count,
    'error_count', v_error_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION compute_time_series_velocity TO authenticated, anon;
GRANT EXECUTE ON FUNCTION compute_risk_trajectory TO authenticated, anon;
GRANT EXECUTE ON FUNCTION get_latest_trajectory TO authenticated, anon;
GRANT EXECUTE ON FUNCTION compute_all_trajectories TO authenticated, anon;
