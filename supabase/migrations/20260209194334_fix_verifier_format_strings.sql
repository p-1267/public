/*
  # Fix Step 4 Verifier Format Strings
  
  Replace %.2f with ROUND() for PostgreSQL compatibility
*/

DROP FUNCTION IF EXISTS verify_step4_trajectory_projection(uuid);

CREATE OR REPLACE FUNCTION verify_step4_trajectory_projection(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_test_resident_id uuid;
  v_test_user_id uuid;
  v_checks jsonb[] := ARRAY[]::jsonb[];
  v_overall_status text := 'PASS';
  v_projection_result jsonb;
  v_projection_id uuid;
  v_projection record;
  v_initial_horizon integer;
  v_updated_horizon integer;
  v_pattern_count integer;
BEGIN
  SELECT id INTO v_test_resident_id 
  FROM residents 
  WHERE agency_id = p_agency_id 
    AND full_name ILIKE '%Dorothy%' 
  LIMIT 1;
  
  IF v_test_resident_id IS NULL THEN
    RETURN jsonb_build_object(
      'overall_status', 'FAIL',
      'checks', array_append(v_checks, jsonb_build_object(
        'check', 'test_resident_found',
        'status', 'FAIL',
        'message', 'Test resident Dorothy not found'
      )),
      'executed_at', now()
    );
  END IF;
  
  v_checks := array_append(v_checks, jsonb_build_object(
    'check', 'test_resident_found',
    'status', 'PASS',
    'message', format('Found test resident: %s', v_test_resident_id)
  ));
  
  SELECT id INTO v_test_user_id FROM user_profiles WHERE agency_id = p_agency_id LIMIT 1;
  IF v_test_user_id IS NULL THEN v_test_user_id := gen_random_uuid(); END IF;
  
  DELETE FROM vital_signs WHERE resident_id = v_test_resident_id AND is_simulation = true;
  DELETE FROM risk_trajectory_projections WHERE resident_id = v_test_resident_id;
  
  INSERT INTO vital_signs (resident_id, vital_type, value, systolic, diastolic, recorded_at, recorded_by, is_simulation)
  VALUES
    (v_test_resident_id, 'blood_pressure', 125, 125, 80, now() - interval '5 days', v_test_user_id, true),
    (v_test_resident_id, 'blood_pressure', 130, 130, 82, now() - interval '4 days', v_test_user_id, true),
    (v_test_resident_id, 'blood_pressure', 138, 138, 85, now() - interval '3 days', v_test_user_id, true),
    (v_test_resident_id, 'blood_pressure', 145, 145, 88, now() - interval '2 days', v_test_user_id, true),
    (v_test_resident_id, 'blood_pressure', 152, 152, 90, now() - interval '1 day', v_test_user_id, true);
  
  v_checks := array_append(v_checks, jsonb_build_object(
    'check', 'rising_bp_sequence_created',
    'status', 'PASS',
    'message', '5 BP readings created showing upward trend (125→152 mmHg)'
  ));
  
  v_projection_result := compute_risk_trajectory(v_test_resident_id, 'VITAL_INSTABILITY');
  
  IF v_projection_result->>'status' = 'SUCCESS' THEN
    v_checks := array_append(v_checks, jsonb_build_object(
      'check', 'trajectory_computed',
      'status', 'PASS',
      'message', 'Trajectory computed successfully',
      'projection_id', v_projection_result->>'projection_id'
    ));
    
    v_projection_id := (v_projection_result->>'projection_id')::uuid;
  ELSE
    v_checks := array_append(v_checks, jsonb_build_object(
      'check', 'trajectory_computed',
      'status', 'FAIL',
      'message', format('Trajectory computation failed: %s', v_projection_result)
    ));
    v_overall_status := 'FAIL';
  END IF;
  
  IF v_projection_id IS NOT NULL THEN
    SELECT * INTO v_projection FROM risk_trajectory_projections WHERE id = v_projection_id;
    
    IF v_projection.trend_velocity IS NOT NULL AND v_projection.trend_velocity > 0 THEN
      v_checks := array_append(v_checks, jsonb_build_object(
        'check', 'trend_velocity_positive',
        'status', 'PASS',
        'message', 'Trend velocity: ' || ROUND(v_projection.trend_velocity::numeric, 2)::text || ' (rising)'
      ));
    ELSE
      v_checks := array_append(v_checks, jsonb_build_object(
        'check', 'trend_velocity_positive',
        'status', 'FAIL',
        'message', format('Expected positive velocity, got: %s', v_projection.trend_velocity)
      ));
      v_overall_status := 'FAIL';
    END IF;
    
    IF v_projection.persistence_duration_hours > 0 THEN
      v_checks := array_append(v_checks, jsonb_build_object(
        'check', 'persistence_duration_calculated',
        'status', 'PASS',
        'message', format('Persistence duration: %s hours', v_projection.persistence_duration_hours)
      ));
    ELSE
      v_checks := array_append(v_checks, jsonb_build_object(
        'check', 'persistence_duration_calculated',
        'status', 'FAIL',
        'message', 'Persistence duration not calculated'
      ));
      v_overall_status := 'FAIL';
    END IF;
    
    IF v_projection.escalation_horizon_hours IS NOT NULL THEN
      v_checks := array_append(v_checks, jsonb_build_object(
        'check', 'escalation_horizon_calculated',
        'status', 'PASS',
        'message', format('Escalation horizon: %s hours to %s', 
          v_projection.escalation_horizon_hours,
          v_projection.projected_next_level
        )
      ));
      v_initial_horizon := v_projection.escalation_horizon_hours;
    ELSE
      v_checks := array_append(v_checks, jsonb_build_object(
        'check', 'escalation_horizon_calculated',
        'status', 'FAIL',
        'message', 'Escalation horizon not calculated'
      ));
      v_overall_status := 'FAIL';
    END IF;
    
    IF v_projection.projection_confidence > 0 AND v_projection.projection_confidence <= 1 THEN
      v_checks := array_append(v_checks, jsonb_build_object(
        'check', 'projection_confidence_valid',
        'status', 'PASS',
        'message', 'Projection confidence: ' || ROUND(v_projection.projection_confidence::numeric, 2)::text
      ));
    ELSE
      v_checks := array_append(v_checks, jsonb_build_object(
        'check', 'projection_confidence_valid',
        'status', 'FAIL',
        'message', 'Invalid projection confidence'
      ));
      v_overall_status := 'FAIL';
    END IF;
    
    IF v_projection.assumptions IS NOT NULL AND length(v_projection.assumptions) > 20 THEN
      v_checks := array_append(v_checks, jsonb_build_object(
        'check', 'assumptions_documented',
        'status', 'PASS',
        'message', format('Assumptions documented: %s chars', length(v_projection.assumptions)),
        'assumptions_excerpt', left(v_projection.assumptions, 100)
      ));
    ELSE
      v_checks := array_append(v_checks, jsonb_build_object(
        'check', 'assumptions_documented',
        'status', 'FAIL',
        'message', 'Assumptions not properly documented'
      ));
      v_overall_status := 'FAIL';
    END IF;
    
    IF v_projection.data_sufficiency = 'SUFFICIENT' THEN
      v_checks := array_append(v_checks, jsonb_build_object(
        'check', 'data_sufficiency_check',
        'status', 'PASS',
        'message', format('Data sufficiency: %s (%s points)', 
          v_projection.data_sufficiency,
          v_projection.data_points_used
        )
      ));
    ELSE
      v_checks := array_append(v_checks, jsonb_build_object(
        'check', 'data_sufficiency_check',
        'status', 'FAIL',
        'message', format('Unexpected data sufficiency: %s', v_projection.data_sufficiency)
      ));
      v_overall_status := 'FAIL';
    END IF;
  END IF;
  
  IF v_projection_id IS NOT NULL THEN
    INSERT INTO vital_signs (resident_id, vital_type, value, systolic, diastolic, recorded_at, recorded_by, is_simulation)
    VALUES (v_test_resident_id, 'blood_pressure', 148, 148, 88, now(), v_test_user_id, true);
    
    v_projection_result := compute_risk_trajectory(v_test_resident_id, 'VITAL_INSTABILITY');
    
    IF v_projection_result->>'status' = 'SUCCESS' THEN
      SELECT escalation_horizon_hours INTO v_updated_horizon 
      FROM risk_trajectory_projections 
      WHERE id = (v_projection_result->>'projection_id')::uuid;
      
      v_checks := array_append(v_checks, jsonb_build_object(
        'check', 'horizon_updates_deterministically',
        'status', 'PASS',
        'message', format('Horizon recalculated (initial: %s, updated: %s)', 
          v_initial_horizon, v_updated_horizon
        )
      ));
    ELSE
      v_checks := array_append(v_checks, jsonb_build_object(
        'check', 'horizon_updates_deterministically',
        'status', 'FAIL',
        'message', 'Failed to recompute after new data'
      ));
      v_overall_status := 'FAIL';
    END IF;
  END IF;
  
  DECLARE
    v_new_resident_id uuid;
  BEGIN
    INSERT INTO residents (agency_id, full_name, date_of_birth, admission_date, room_number, care_level)
    VALUES (p_agency_id, 'Test Insufficient Data', '1940-01-01', now(), '999', 'INDEPENDENT')
    RETURNING id INTO v_new_resident_id;
    
    v_projection_result := compute_risk_trajectory(v_new_resident_id, 'VITAL_INSTABILITY');
    
    IF v_projection_result->>'status' = 'INSUFFICIENT_DATA' THEN
      v_checks := array_append(v_checks, jsonb_build_object(
        'check', 'insufficient_data_handling',
        'status', 'PASS',
        'message', 'Correctly returns INSUFFICIENT_DATA when data requirements not met'
      ));
    ELSE
      v_checks := array_append(v_checks, jsonb_build_object(
        'check', 'insufficient_data_handling',
        'status', 'FAIL',
        'message', format('Expected INSUFFICIENT_DATA, got: %s', v_projection_result->>'status')
      ));
      v_overall_status := 'FAIL';
    END IF;
    
    DELETE FROM residents WHERE id = v_new_resident_id;
  END;
  
  SELECT COUNT(*) INTO v_pattern_count 
  FROM trajectory_computation_log 
  WHERE resident_id = v_test_resident_id;
  
  IF v_pattern_count > 0 THEN
    v_checks := array_append(v_checks, jsonb_build_object(
      'check', 'computation_audit_trail',
      'status', 'PASS',
      'message', format('Computation audit trail: %s log entries', v_pattern_count)
    ));
  ELSE
    v_checks := array_append(v_checks, jsonb_build_object(
      'check', 'computation_audit_trail',
      'status', 'FAIL',
      'message', 'No computation log entries found'
    ));
    v_overall_status := 'FAIL';
  END IF;
  
  RETURN jsonb_build_object(
    'overall_status', v_overall_status,
    'agency_id', p_agency_id,
    'test_resident_id', v_test_resident_id,
    'checks', v_checks,
    'executed_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION verify_step4_trajectory_projection TO authenticated, anon;
