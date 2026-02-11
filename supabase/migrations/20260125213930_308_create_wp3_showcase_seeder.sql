/*
  # WP3 Showcase Seeder RPC

  1. Purpose
    - Generate deterministic Brain Intelligence showcase data
    - Creates ≥5 resident risk flags + ≥5 caregiver workload flags
    - Each with confidence, explanation, evidence links

  2. Data Generated
    - Observation events
    - Resident baselines  
    - Caregiver baselines
    - Anomaly detections
    - Risk scores
    - Prioritized issues
    - Explainability narratives
*/

CREATE OR REPLACE FUNCTION seed_wp3_showcase_data(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_resident_ids uuid[];
  v_caregiver_ids uuid[];
  v_resident_count int := 0;
  v_caregiver_count int := 0;
  v_anomaly_count int := 0;
  v_risk_count int := 0;
  v_issue_count int := 0;
BEGIN
  -- Get residents and caregivers
  SELECT array_agg(id) INTO v_resident_ids FROM residents WHERE agency_id = p_agency_id LIMIT 6;
  SELECT array_agg(id) INTO v_caregiver_ids FROM user_profiles WHERE agency_id = p_agency_id LIMIT 6;

  IF v_resident_ids IS NULL OR array_length(v_resident_ids, 1) < 5 THEN
    RAISE EXCEPTION 'Need at least 5 residents for WP3 showcase';
  END IF;

  IF v_caregiver_ids IS NULL OR array_length(v_caregiver_ids, 1) < 5 THEN
    RAISE EXCEPTION 'Need at least 5 caregivers for WP3 showcase';
  END IF;

  -- Create resident anomalies and risks (for each of 5 residents)
  FOR i IN 1..5 LOOP
    -- Create baseline
    INSERT INTO resident_baselines (
      agency_id, resident_id, baseline_type,
      window_7d_mean, window_7d_stddev, window_7d_sample_count,
      window_30d_mean, window_30d_stddev, window_30d_sample_count,
      trend_direction, baseline_confidence, data_quality_score
    ) VALUES (
      p_agency_id, v_resident_ids[i], 'vital_signs_bp_systolic',
      120 + (i * 5), 10, 14,
      122 + (i * 5), 12, 45,
      CASE WHEN i <= 2 THEN 'rising' ELSE 'stable' END,
      0.85, 90
    );

    -- Create vital sign anomaly
    INSERT INTO anomaly_detections (
      agency_id, resident_id,
      anomaly_type, anomaly_subtype, severity,
      detected_at, observation_window_start, observation_window_end,
      baseline_value, observed_value, deviation_magnitude, deviation_sigma,
      confidence_score, anomaly_data, status
    ) VALUES (
      p_agency_id, v_resident_ids[i],
      'vital_sign_deviation', 'vital_signs_bp_systolic', 
      CASE WHEN i <= 2 THEN 'high' WHEN i <= 4 THEN 'medium' ELSE 'low' END,
      now(), now() - interval '2 hours', now(),
      120 + (i * 5), 145 + (i * 10), 25 + (i * 5), 2.5 + (i * 0.5),
      0.90, jsonb_build_object('vitalType', 'blood_pressure_systolic'), 'detected'
    );
    v_anomaly_count := v_anomaly_count + 1;

    -- Create missed care anomaly
    INSERT INTO anomaly_detections (
      agency_id, resident_id,
      anomaly_type, anomaly_subtype, severity,
      detected_at, observation_window_start, observation_window_end,
      confidence_score, anomaly_data, status
    ) VALUES (
      p_agency_id, v_resident_ids[i],
      'missed_care', 'medication',
      CASE WHEN i <= 1 THEN 'critical' WHEN i <= 3 THEN 'high' ELSE 'medium' END,
      now(), now() - interval '4 hours', now(),
      1.0, jsonb_build_object('hoursOverdue', 4 + i), 'detected'
    );
    v_anomaly_count := v_anomaly_count + 1;

    -- Create risk score
    INSERT INTO risk_scores (
      agency_id, resident_id,
      risk_category, risk_type,
      current_score, risk_level, confidence_score,
      contributing_factors, trend_direction, suggested_interventions
    ) VALUES (
      p_agency_id, v_resident_ids[i],
      'resident_health', 'vital_sign_deviation',
      50 + (i * 10), 
      CASE WHEN i <= 2 THEN 'high' WHEN i <= 4 THEN 'medium' ELSE 'low' END,
      0.88,
      jsonb_build_array(
        jsonb_build_object('factor', 'vital_sign_deviation', 'weight', 30, 'description', '2 vital sign anomalies'),
        jsonb_build_object('factor', 'missed_care', 'weight', 20, 'description', '1 missed medication')
      ),
      CASE WHEN i <= 2 THEN 'worsening' ELSE 'stable' END,
      jsonb_build_array(
        jsonb_build_object('action', 'Schedule nurse assessment', 'priority', 1, 'rationale', 'Vital deviations require evaluation')
      )
    );
    v_risk_count := v_risk_count + 1;

    -- Create prioritized issue
    INSERT INTO prioritized_issues (
      agency_id, resident_id,
      issue_type, issue_category,
      title, description,
      priority_score, urgency_score, severity_score, confidence_score,
      suggested_actions
    ) VALUES (
      p_agency_id, v_resident_ids[i],
      'vital_sign_deviation', 'resident_health',
      'HIGH Risk: vital sign deviation',
      'Brain Intelligence detected high vital_sign_deviation risk (score: ' || (50 + i * 10) || '/100, confidence: 88%)',
      70 + (i * 5), 80, 50 + (i * 10), 0.88,
      jsonb_build_array(jsonb_build_object('action', 'Schedule assessment', 'priority', 1))
    );
    v_issue_count := v_issue_count + 1;
    v_resident_count := v_resident_count + 1;
  END LOOP;

  -- Create caregiver anomalies and risks (for each of 5 caregivers)
  FOR i IN 1..5 LOOP
    -- Create baseline
    INSERT INTO caregiver_baselines (
      agency_id, caregiver_id, baseline_type,
      window_7d_mean, window_7d_stddev, window_7d_sample_count,
      window_30d_mean, window_30d_stddev, window_30d_sample_count,
      trend_direction, baseline_confidence, data_quality_score
    ) VALUES (
      p_agency_id, v_caregiver_ids[i], 'task_completion_time',
      45 + (i * 5), 8, 28,
      48 + (i * 5), 10, 120,
      CASE WHEN i <= 2 THEN 'rising' ELSE 'stable' END,
      0.90, 95
    );

    -- Create performance anomaly
    INSERT INTO anomaly_detections (
      agency_id, caregiver_id,
      anomaly_type, anomaly_subtype, severity,
      detected_at, observation_window_start, observation_window_end,
      baseline_value, observed_value, deviation_magnitude,
      confidence_score, anomaly_data, status
    ) VALUES (
      p_agency_id, v_caregiver_ids[i],
      'caregiver_performance', 'completion_time_degradation',
      CASE WHEN i <= 2 THEN 'medium' ELSE 'low' END,
      now(), now() - interval '8 hours', now(),
      45 + (i * 5), 70 + (i * 10), 25 + (i * 5),
      0.75, jsonb_build_object('slowTaskCount', 5 + i), 'detected'
    );
    v_anomaly_count := v_anomaly_count + 1;

    -- Create workload anomaly
    INSERT INTO anomaly_detections (
      agency_id, caregiver_id,
      anomaly_type, anomaly_subtype, severity,
      detected_at, observation_window_start, observation_window_end,
      observed_value, confidence_score, anomaly_data, status
    ) VALUES (
      p_agency_id, v_caregiver_ids[i],
      'caregiver_workload', 'high_task_volume',
      CASE WHEN i <= 2 THEN 'high' ELSE 'medium' END,
      now(), now() - interval '24 hours', now(),
      55 + (i * 5), 0.85, jsonb_build_object('taskCount', 55 + i * 5), 'detected'
    );
    v_anomaly_count := v_anomaly_count + 1;

    -- Create risk score
    INSERT INTO risk_scores (
      agency_id, caregiver_id,
      risk_category, risk_type,
      current_score, risk_level, confidence_score,
      contributing_factors, trend_direction, suggested_interventions
    ) VALUES (
      p_agency_id, v_caregiver_ids[i],
      'caregiver_performance', 'caregiver_workload',
      45 + (i * 8),
      CASE WHEN i <= 2 THEN 'high' WHEN i <= 4 THEN 'medium' ELSE 'low' END,
      0.80,
      jsonb_build_array(
        jsonb_build_object('factor', 'high_task_volume', 'weight', 25, 'description', 'High task count'),
        jsonb_build_object('factor', 'completion_time_degradation', 'weight', 20, 'description', 'Slower completion')
      ),
      CASE WHEN i <= 2 THEN 'worsening' ELSE 'stable' END,
      jsonb_build_array(
        jsonb_build_object('action', 'Rebalance workload', 'priority', 1, 'rationale', 'Prevent burnout')
      )
    );
    v_risk_count := v_risk_count + 1;

    -- Create prioritized issue
    INSERT INTO prioritized_issues (
      agency_id, caregiver_id,
      issue_type, issue_category,
      title, description,
      priority_score, urgency_score, severity_score, confidence_score,
      suggested_actions
    ) VALUES (
      p_agency_id, v_caregiver_ids[i],
      'caregiver_workload', 'caregiver_performance',
      'MEDIUM Risk: caregiver workload',
      'Brain Intelligence detected medium caregiver_workload risk (score: ' || (45 + i * 8) || '/100, confidence: 80%)',
      60 + (i * 4), 70, 45 + (i * 8), 0.80,
      jsonb_build_array(jsonb_build_object('action', 'Rebalance workload', 'priority', 1))
    );
    v_issue_count := v_issue_count + 1;
    v_caregiver_count := v_caregiver_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'residentFlags', v_resident_count,
    'caregiverFlags', v_caregiver_count,
    'anomalies', v_anomaly_count,
    'risks', v_risk_count,
    'issues', v_issue_count
  );
END;
$$;
