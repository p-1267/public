/*
  # WP4.4: Outcome Feedback Loop - Prediction Calibration

  1. Purpose
    - Learn from prediction outcomes (did risk lead to incident?)
    - Calibrate confidence weights over time
    - Improve future prioritization accuracy

  2. Functions
    - submit_outcome_feedback: Records prediction outcome
    - apply_outcome_learning: Calibrates confidence based on accuracy
    - get_calibrated_confidence: Returns adjusted confidence for risk type

  3. Truth Enforcement
    - Never modifies past predictions
    - Only adjusts future confidence weights
    - Requires sufficient sample size before adjusting
*/

-- Submit Outcome Feedback (Supervisor Action)
CREATE OR REPLACE FUNCTION submit_outcome_feedback(
  p_agency_id uuid,
  p_supervisor_id uuid,
  p_prediction_id uuid,
  p_prediction_type text,
  p_predicted_severity text,
  p_predicted_confidence numeric,
  p_actual_outcome text,
  p_outcome_severity text DEFAULT NULL,
  p_outcome_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_feedback_id uuid;
  v_prediction_accuracy numeric;
  v_confidence_appropriate boolean;
BEGIN
  -- Validate actual outcome
  IF p_actual_outcome NOT IN ('incident_occurred', 'incident_prevented', 'false_alarm', 'no_incident') THEN
    RAISE EXCEPTION 'Invalid actual outcome: %', p_actual_outcome;
  END IF;

  -- Calculate prediction accuracy
  v_prediction_accuracy := CASE
    WHEN p_actual_outcome = 'incident_occurred' THEN
      -- Predicted risk and incident happened = accurate prediction
      CASE 
        WHEN p_predicted_severity = p_outcome_severity THEN 1.0
        WHEN p_predicted_severity IN ('high', 'critical') AND p_outcome_severity IN ('high', 'critical') THEN 0.8
        ELSE 0.5
      END
    WHEN p_actual_outcome = 'incident_prevented' THEN
      -- Predicted risk, intervention worked = partially accurate (risk was real)
      0.7
    WHEN p_actual_outcome = 'false_alarm' THEN
      -- Predicted risk but nothing happened = inaccurate
      0.0
    WHEN p_actual_outcome = 'no_incident' THEN
      -- Low predicted risk and no incident = accurate
      CASE
        WHEN p_predicted_severity IN ('low', 'medium') THEN 1.0
        ELSE 0.3
      END
    ELSE 0.5
  END;

  -- Check if confidence was appropriate
  -- High confidence should mean high accuracy
  v_confidence_appropriate := CASE
    WHEN p_predicted_confidence >= 0.8 AND v_prediction_accuracy >= 0.7 THEN true
    WHEN p_predicted_confidence <= 0.6 AND v_prediction_accuracy <= 0.5 THEN true
    WHEN p_predicted_confidence BETWEEN 0.6 AND 0.8 THEN true
    ELSE false
  END;

  -- Record outcome feedback
  INSERT INTO outcome_feedback_log (
    agency_id, prediction_id, prediction_type,
    predicted_severity, predicted_confidence,
    actual_outcome, outcome_severity,
    outcome_recorded_by, outcome_notes,
    prediction_accuracy, confidence_was_appropriate
  ) VALUES (
    p_agency_id, p_prediction_id, p_prediction_type,
    p_predicted_severity, p_predicted_confidence,
    p_actual_outcome, p_outcome_severity,
    p_supervisor_id, p_outcome_notes,
    v_prediction_accuracy, v_confidence_appropriate
  )
  RETURNING id INTO v_feedback_id;

  RETURN jsonb_build_object(
    'success', true,
    'feedback_id', v_feedback_id,
    'prediction_accuracy', v_prediction_accuracy,
    'confidence_appropriate', v_confidence_appropriate,
    'message', 'Outcome feedback recorded - will contribute to calibration'
  );
END;
$$;

-- Apply Outcome Learning (System Action - Runs Periodically)
CREATE OR REPLACE FUNCTION apply_outcome_learning(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_outcome_stats record;
  v_calibrations int := 0;
  v_change_id uuid;
  v_current_confidence_weight numeric;
  v_new_confidence_weight numeric;
  v_min_weight numeric := 0.5; -- Never go below 50% confidence
  v_max_weight numeric := 1.0; -- Never boost above 100%
BEGIN
  -- Check if learning is enabled
  IF NOT EXISTS (
    SELECT 1 FROM learning_system_state
    WHERE agency_id = p_agency_id
      AND learning_enabled = true
      AND (frozen_until IS NULL OR frozen_until < now())
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Learning is disabled or frozen for this agency'
    );
  END IF;

  -- Aggregate outcomes by prediction type and severity
  -- Require at least 10 outcomes before calibrating
  FOR v_outcome_stats IN
    SELECT 
      prediction_type,
      predicted_severity,
      COUNT(*) as total_outcomes,
      AVG(prediction_accuracy) as avg_accuracy,
      AVG(CASE WHEN confidence_was_appropriate THEN 1.0 ELSE 0.0 END) as confidence_appropriateness,
      AVG(predicted_confidence) as avg_predicted_confidence
    FROM outcome_feedback_log
    WHERE agency_id = p_agency_id
      AND contributed_to_learning = false
      AND created_at >= now() - interval '30 days'
    GROUP BY prediction_type, predicted_severity
    HAVING COUNT(*) >= 10 -- Minimum 10 outcomes for statistical significance
  LOOP
    -- Get current confidence weight (default 1.0 if not set)
    SELECT 
      COALESCE(
        (new_value->>'confidence_weight')::numeric,
        1.0
      )
    INTO v_current_confidence_weight
    FROM learning_change_ledger
    WHERE agency_id = p_agency_id
      AND learning_domain = 'prediction_calibration'
      AND target_entity_type = v_outcome_stats.prediction_type
      AND (new_value->>'severity') = v_outcome_stats.predicted_severity
      AND is_rolled_back = false
    ORDER BY applied_at DESC
    LIMIT 1;

    v_current_confidence_weight := COALESCE(v_current_confidence_weight, 1.0);

    -- Calibrate confidence weight based on accuracy
    -- If accuracy is low → decrease confidence weight (be more cautious)
    -- If accuracy is high → increase confidence weight (be more assertive)
    IF v_outcome_stats.avg_accuracy < 0.5 THEN
      -- Low accuracy, reduce confidence by 0.1
      v_new_confidence_weight := GREATEST(v_min_weight, v_current_confidence_weight - 0.1);
    ELSIF v_outcome_stats.avg_accuracy < 0.7 THEN
      -- Medium accuracy, reduce confidence by 0.05
      v_new_confidence_weight := GREATEST(v_min_weight, v_current_confidence_weight - 0.05);
    ELSIF v_outcome_stats.avg_accuracy > 0.85 THEN
      -- High accuracy, increase confidence by 0.05
      v_new_confidence_weight := LEAST(v_max_weight, v_current_confidence_weight + 0.05);
    ELSE
      -- Good accuracy, no change
      v_new_confidence_weight := v_current_confidence_weight;
    END IF;

    -- Only apply if weight actually changed
    IF v_new_confidence_weight != v_current_confidence_weight THEN
      -- Log learning change
      INSERT INTO learning_change_ledger (
        agency_id, learning_domain, change_type,
        target_entity_type,
        previous_value, new_value,
        change_reason, source_signals,
        confidence_delta, evidence_count
      ) VALUES (
        p_agency_id, 'prediction_calibration', 'confidence_recalibration',
        v_outcome_stats.prediction_type,
        jsonb_build_object(
          'confidence_weight', v_current_confidence_weight,
          'severity', v_outcome_stats.predicted_severity
        ),
        jsonb_build_object(
          'confidence_weight', v_new_confidence_weight,
          'severity', v_outcome_stats.predicted_severity
        ),
        format('Calibrated confidence based on %s outcomes (%.0f%% accuracy)',
          v_outcome_stats.total_outcomes,
          v_outcome_stats.avg_accuracy * 100
        ),
        jsonb_build_object(
          'total_outcomes', v_outcome_stats.total_outcomes,
          'avg_accuracy', v_outcome_stats.avg_accuracy,
          'confidence_appropriateness', v_outcome_stats.confidence_appropriateness,
          'avg_predicted_confidence', v_outcome_stats.avg_predicted_confidence
        ),
        ABS(v_new_confidence_weight - v_current_confidence_weight),
        v_outcome_stats.total_outcomes
      )
      RETURNING id INTO v_change_id;

      -- Mark feedback as contributed to learning
      UPDATE outcome_feedback_log
      SET contributed_to_learning = true,
          learning_change_id = v_change_id
      WHERE agency_id = p_agency_id
        AND prediction_type = v_outcome_stats.prediction_type
        AND predicted_severity = v_outcome_stats.predicted_severity
        AND contributed_to_learning = false;

      v_calibrations := v_calibrations + 1;
    END IF;
  END LOOP;

  -- Update learning system state
  INSERT INTO learning_system_state (
    agency_id, total_learning_events, last_learning_event_at
  ) VALUES (
    p_agency_id, v_calibrations, now()
  )
  ON CONFLICT (agency_id)
  DO UPDATE SET
    total_learning_events = learning_system_state.total_learning_events + v_calibrations,
    last_learning_event_at = now(),
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'calibrations_applied', v_calibrations,
    'message', 'Outcome learning applied successfully'
  );
END;
$$;

-- Get Calibrated Confidence (Query Function)
CREATE OR REPLACE FUNCTION get_calibrated_confidence(
  p_agency_id uuid,
  p_prediction_type text,
  p_severity text,
  p_base_confidence numeric
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_confidence_weight numeric;
  v_calibrated_confidence numeric;
BEGIN
  -- Get most recent confidence weight
  SELECT (new_value->>'confidence_weight')::numeric
  INTO v_confidence_weight
  FROM learning_change_ledger
  WHERE agency_id = p_agency_id
    AND learning_domain = 'prediction_calibration'
    AND target_entity_type = p_prediction_type
    AND (new_value->>'severity') = p_severity
    AND is_rolled_back = false
  ORDER BY applied_at DESC
  LIMIT 1;

  v_confidence_weight := COALESCE(v_confidence_weight, 1.0);

  -- Apply weight to base confidence
  v_calibrated_confidence := p_base_confidence * v_confidence_weight;

  -- Ensure within bounds [0.3, 0.95]
  v_calibrated_confidence := GREATEST(0.3, LEAST(0.95, v_calibrated_confidence));

  RETURN v_calibrated_confidence;
END;
$$;

-- Get Outcome Learning Statistics
CREATE OR REPLACE FUNCTION get_outcome_learning_stats(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_outcomes int;
  v_calibrations int;
  v_avg_accuracy numeric;
  v_prediction_types_learned int;
BEGIN
  SELECT COUNT(*)
  INTO v_total_outcomes
  FROM outcome_feedback_log
  WHERE agency_id = p_agency_id;

  SELECT COUNT(*)
  INTO v_calibrations
  FROM learning_change_ledger
  WHERE agency_id = p_agency_id
    AND learning_domain = 'prediction_calibration'
    AND is_rolled_back = false;

  SELECT AVG(prediction_accuracy)
  INTO v_avg_accuracy
  FROM outcome_feedback_log
  WHERE agency_id = p_agency_id;

  SELECT COUNT(DISTINCT target_entity_type)
  INTO v_prediction_types_learned
  FROM learning_change_ledger
  WHERE agency_id = p_agency_id
    AND learning_domain = 'prediction_calibration'
    AND is_rolled_back = false;

  RETURN jsonb_build_object(
    'total_outcomes', COALESCE(v_total_outcomes, 0),
    'calibrations', COALESCE(v_calibrations, 0),
    'average_accuracy', COALESCE(v_avg_accuracy, 0),
    'prediction_types_learned', COALESCE(v_prediction_types_learned, 0),
    'learning_active', v_calibrations > 0
  );
END;
$$;
