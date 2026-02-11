/*
  # WP4.2: Alert Usefulness Learning - Noise Reduction

  1. Purpose
    - Learn from supervisor feedback on alerts
    - Adjust thresholds to reduce low-value alerts
    - Never suppress alerts immediately after one feedback

  2. Functions
    - submit_alert_feedback: Records supervisor feedback
    - apply_alert_learning: Aggregates feedback and adjusts thresholds
    - get_learned_threshold: Returns adjusted threshold for alert type

  3. Truth Enforcement
    - Thresholds adjust only after multiple negative feedbacks
    - All adjustments are bounded (min/max constraints)
    - Changes are versioned and reversible
*/

-- Submit Alert Feedback (Supervisor Action)
CREATE OR REPLACE FUNCTION submit_alert_feedback(
  p_agency_id uuid,
  p_supervisor_id uuid,
  p_alert_id uuid,
  p_alert_type text,
  p_alert_severity text,
  p_feedback_type text,
  p_feedback_reason text DEFAULT NULL,
  p_alert_metadata jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_feedback_id uuid;
BEGIN
  -- Validate feedback type
  IF p_feedback_type NOT IN ('useful', 'not_useful', 'ignore', 'false_positive') THEN
    RAISE EXCEPTION 'Invalid feedback type: %', p_feedback_type;
  END IF;

  -- Record feedback
  INSERT INTO alert_feedback_log (
    agency_id, alert_id, alert_type, alert_severity,
    supervisor_id, feedback_type, feedback_reason,
    alert_metadata
  ) VALUES (
    p_agency_id, p_alert_id, p_alert_type, p_alert_severity,
    p_supervisor_id, p_feedback_type, p_feedback_reason,
    p_alert_metadata
  )
  RETURNING id INTO v_feedback_id;

  RETURN jsonb_build_object(
    'success', true,
    'feedback_id', v_feedback_id,
    'message', 'Alert feedback recorded - will contribute to learning'
  );
END;
$$;

-- Apply Alert Learning (System Action - Runs Periodically)
CREATE OR REPLACE FUNCTION apply_alert_learning(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_alert_stats record;
  v_threshold_adjustments int := 0;
  v_change_id uuid;
  v_current_threshold numeric;
  v_new_threshold numeric;
  v_min_threshold numeric := 0.3; -- Never suppress below 30% confidence
  v_max_threshold numeric := 0.95; -- Never require above 95% confidence
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

  -- Aggregate feedback by alert type
  -- Require at least 5 feedback instances before adjusting
  FOR v_alert_stats IN
    SELECT 
      alert_type,
      alert_severity,
      COUNT(*) as total_feedback,
      COUNT(*) FILTER (WHERE feedback_type = 'useful') as useful_count,
      COUNT(*) FILTER (WHERE feedback_type IN ('not_useful', 'false_positive')) as not_useful_count,
      (COUNT(*) FILTER (WHERE feedback_type = 'useful')::numeric / COUNT(*)::numeric) as usefulness_ratio
    FROM alert_feedback_log
    WHERE agency_id = p_agency_id
      AND contributed_to_learning = false
      AND created_at >= now() - interval '30 days'
    GROUP BY alert_type, alert_severity
    HAVING COUNT(*) >= 5 -- Minimum 5 feedback instances
  LOOP
    -- Get current threshold (default 0.7 if not set)
    SELECT 
      COALESCE(
        (new_value->>'threshold')::numeric,
        0.7
      )
    INTO v_current_threshold
    FROM learning_change_ledger
    WHERE agency_id = p_agency_id
      AND learning_domain = 'alert_threshold'
      AND target_entity_type = v_alert_stats.alert_type
      AND is_rolled_back = false
    ORDER BY applied_at DESC
    LIMIT 1;

    v_current_threshold := COALESCE(v_current_threshold, 0.7);

    -- Adjust threshold based on usefulness ratio
    -- If mostly "not useful" → increase threshold (show fewer alerts)
    -- If mostly "useful" → decrease threshold (show more alerts)
    IF v_alert_stats.usefulness_ratio < 0.3 THEN
      -- Too many false positives, increase threshold by 0.05
      v_new_threshold := LEAST(v_max_threshold, v_current_threshold + 0.05);
    ELSIF v_alert_stats.usefulness_ratio < 0.5 THEN
      -- Some false positives, increase threshold by 0.02
      v_new_threshold := LEAST(v_max_threshold, v_current_threshold + 0.02);
    ELSIF v_alert_stats.usefulness_ratio > 0.8 THEN
      -- Mostly useful, decrease threshold slightly to catch more
      v_new_threshold := GREATEST(v_min_threshold, v_current_threshold - 0.02);
    ELSE
      -- Good balance, no change
      v_new_threshold := v_current_threshold;
    END IF;

    -- Only apply if threshold actually changed
    IF v_new_threshold != v_current_threshold THEN
      -- Log learning change
      INSERT INTO learning_change_ledger (
        agency_id, learning_domain, change_type,
        target_entity_type,
        previous_value, new_value,
        change_reason, source_signals,
        confidence_delta, evidence_count
      ) VALUES (
        p_agency_id, 'alert_threshold', 'threshold_adjustment',
        v_alert_stats.alert_type,
        jsonb_build_object(
          'threshold', v_current_threshold,
          'severity', v_alert_stats.alert_severity
        ),
        jsonb_build_object(
          'threshold', v_new_threshold,
          'severity', v_alert_stats.alert_severity
        ),
        format('Adjusted threshold based on %s feedback instances (%.0f%% useful)',
          v_alert_stats.total_feedback,
          v_alert_stats.usefulness_ratio * 100
        ),
        jsonb_build_object(
          'total_feedback', v_alert_stats.total_feedback,
          'useful_count', v_alert_stats.useful_count,
          'not_useful_count', v_alert_stats.not_useful_count,
          'usefulness_ratio', v_alert_stats.usefulness_ratio
        ),
        ABS(v_new_threshold - v_current_threshold),
        v_alert_stats.total_feedback
      )
      RETURNING id INTO v_change_id;

      -- Mark feedback as contributed to learning
      UPDATE alert_feedback_log
      SET contributed_to_learning = true,
          learning_change_id = v_change_id
      WHERE agency_id = p_agency_id
        AND alert_type = v_alert_stats.alert_type
        AND alert_severity = v_alert_stats.alert_severity
        AND contributed_to_learning = false;

      v_threshold_adjustments := v_threshold_adjustments + 1;
    END IF;
  END LOOP;

  -- Update learning system state
  INSERT INTO learning_system_state (
    agency_id, total_learning_events, last_learning_event_at
  ) VALUES (
    p_agency_id, v_threshold_adjustments, now()
  )
  ON CONFLICT (agency_id)
  DO UPDATE SET
    total_learning_events = learning_system_state.total_learning_events + v_threshold_adjustments,
    last_learning_event_at = now(),
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'threshold_adjustments', v_threshold_adjustments,
    'message', 'Alert learning applied successfully'
  );
END;
$$;

-- Get Learned Threshold (Query Function)
CREATE OR REPLACE FUNCTION get_learned_alert_threshold(
  p_agency_id uuid,
  p_alert_type text,
  p_default_threshold numeric DEFAULT 0.7
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_learned_threshold numeric;
BEGIN
  -- Get most recent non-rolled-back threshold
  SELECT (new_value->>'threshold')::numeric
  INTO v_learned_threshold
  FROM learning_change_ledger
  WHERE agency_id = p_agency_id
    AND learning_domain = 'alert_threshold'
    AND target_entity_type = p_alert_type
    AND is_rolled_back = false
  ORDER BY applied_at DESC
  LIMIT 1;

  RETURN COALESCE(v_learned_threshold, p_default_threshold);
END;
$$;

-- Get Alert Learning Statistics
CREATE OR REPLACE FUNCTION get_alert_learning_stats(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_feedback int;
  v_threshold_adjustments int;
  v_alert_types_learned int;
  v_avg_usefulness numeric;
BEGIN
  SELECT COUNT(*)
  INTO v_total_feedback
  FROM alert_feedback_log
  WHERE agency_id = p_agency_id;

  SELECT COUNT(*)
  INTO v_threshold_adjustments
  FROM learning_change_ledger
  WHERE agency_id = p_agency_id
    AND learning_domain = 'alert_threshold'
    AND is_rolled_back = false;

  SELECT COUNT(DISTINCT target_entity_type)
  INTO v_alert_types_learned
  FROM learning_change_ledger
  WHERE agency_id = p_agency_id
    AND learning_domain = 'alert_threshold'
    AND is_rolled_back = false;

  SELECT AVG(
    CASE WHEN feedback_type = 'useful' THEN 1.0 ELSE 0.0 END
  )
  INTO v_avg_usefulness
  FROM alert_feedback_log
  WHERE agency_id = p_agency_id;

  RETURN jsonb_build_object(
    'total_feedback', COALESCE(v_total_feedback, 0),
    'threshold_adjustments', COALESCE(v_threshold_adjustments, 0),
    'alert_types_learned', COALESCE(v_alert_types_learned, 0),
    'average_usefulness', COALESCE(v_avg_usefulness, 0),
    'learning_active', v_threshold_adjustments > 0
  );
END;
$$;
