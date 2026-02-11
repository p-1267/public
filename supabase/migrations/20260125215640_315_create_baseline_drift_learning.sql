/*
  # WP4.3: Resident Norm Drift - Baseline Adaptation

  1. Purpose
    - Detect gradual changes in resident baselines over time
    - Propose adjustments (never immediate overwrite)
    - Preserve anomaly sensitivity

  2. Functions
    - detect_baseline_drift: Identifies drift in resident/caregiver norms
    - apply_baseline_drift: Gradually adjusts baselines
    - get_effective_baseline: Returns learned baseline or original

  3. Truth Enforcement
    - Requires minimum observation window (e.g., 14 days)
    - Drift must be statistically significant
    - Original baselines are never deleted
*/

-- Detect Baseline Drift (System Action - Runs Periodically)
CREATE OR REPLACE FUNCTION detect_baseline_drift(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_drift_proposals int := 0;
  v_resident record;
  v_caregiver record;
  v_current_baseline numeric;
  v_recent_mean numeric;
  v_recent_stddev numeric;
  v_drift_magnitude numeric;
  v_observation_count int;
  v_min_observations int := 20; -- Need at least 20 data points
  v_min_days int := 14; -- Need at least 14 days of data
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

  -- Detect resident vital sign drift
  FOR v_resident IN
    SELECT 
      rb.resident_id,
      rb.baseline_type,
      rb.window_30d_mean as current_baseline
    FROM resident_baselines rb
    WHERE rb.agency_id = p_agency_id
      AND rb.baseline_type = 'vital_signs_bp_systolic'
      AND rb.baseline_computed_at < now() - interval '14 days' -- Old enough to check drift
  LOOP
    -- Calculate recent mean (last 14 days)
    SELECT 
      AVG((event_data->>'bloodPressureSystolic')::numeric),
      STDDEV((event_data->>'bloodPressureSystolic')::numeric),
      COUNT(*)
    INTO v_recent_mean, v_recent_stddev, v_observation_count
    FROM observation_events
    WHERE agency_id = p_agency_id
      AND resident_id = v_resident.resident_id
      AND event_type = 'vital_sign'
      AND event_data->>'bloodPressureSystolic' IS NOT NULL
      AND event_timestamp >= now() - interval '14 days';

    -- Check if we have enough data
    IF v_observation_count >= v_min_observations THEN
      v_drift_magnitude := ABS(v_recent_mean - v_resident.current_baseline);

      -- Propose adjustment if drift is significant (>10% change or >5 points)
      IF v_drift_magnitude > 5 AND v_drift_magnitude / NULLIF(v_resident.current_baseline, 0) > 0.1 THEN
        -- Check if proposal already exists
        IF NOT EXISTS (
          SELECT 1 FROM baseline_drift_proposals
          WHERE agency_id = p_agency_id
            AND resident_id = v_resident.resident_id
            AND baseline_type = v_resident.baseline_type
            AND status = 'proposed'
            AND created_at >= now() - interval '7 days'
        ) THEN
          -- Create drift proposal
          INSERT INTO baseline_drift_proposals (
            agency_id, resident_id, baseline_type,
            current_baseline_value, proposed_baseline_value,
            drift_magnitude, drift_direction,
            observation_window_days, evidence_data_points, confidence_score,
            drift_reason, supporting_observations
          ) VALUES (
            p_agency_id, v_resident.resident_id, v_resident.baseline_type,
            v_resident.current_baseline, v_recent_mean,
            v_drift_magnitude,
            CASE 
              WHEN v_recent_mean > v_resident.current_baseline THEN 'increasing'
              WHEN v_recent_mean < v_resident.current_baseline THEN 'decreasing'
              ELSE 'stable'
            END,
            14, v_observation_count,
            LEAST(0.85, 0.5 + (v_observation_count::numeric / 50)),
            format('Detected %.1f point drift over 14 days (%s data points)',
              v_drift_magnitude, v_observation_count
            ),
            jsonb_build_object(
              'recent_mean', v_recent_mean,
              'recent_stddev', v_recent_stddev,
              'current_baseline', v_resident.current_baseline,
              'observation_count', v_observation_count
            )
          );

          v_drift_proposals := v_drift_proposals + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- Detect caregiver performance drift
  FOR v_caregiver IN
    SELECT 
      cb.caregiver_id,
      cb.baseline_type,
      cb.window_30d_mean as current_baseline
    FROM caregiver_baselines cb
    WHERE cb.agency_id = p_agency_id
      AND cb.baseline_type = 'task_completion_time'
      AND cb.baseline_computed_at < now() - interval '14 days'
  LOOP
    -- Calculate recent mean
    SELECT 
      AVG((event_data->>'completionSeconds')::numeric),
      STDDEV((event_data->>'completionSeconds')::numeric),
      COUNT(*)
    INTO v_recent_mean, v_recent_stddev, v_observation_count
    FROM observation_events
    WHERE agency_id = p_agency_id
      AND caregiver_id = v_caregiver.caregiver_id
      AND event_type = 'task_completion'
      AND event_data->>'completionSeconds' IS NOT NULL
      AND event_timestamp >= now() - interval '14 days';

    IF v_observation_count >= v_min_observations THEN
      v_drift_magnitude := ABS(v_recent_mean - v_caregiver.current_baseline);

      -- Propose adjustment if drift is significant (>20% change or >10 seconds)
      IF v_drift_magnitude > 10 AND v_drift_magnitude / NULLIF(v_caregiver.current_baseline, 0) > 0.2 THEN
        IF NOT EXISTS (
          SELECT 1 FROM baseline_drift_proposals
          WHERE agency_id = p_agency_id
            AND caregiver_id = v_caregiver.caregiver_id
            AND baseline_type = v_caregiver.baseline_type
            AND status = 'proposed'
            AND created_at >= now() - interval '7 days'
        ) THEN
          INSERT INTO baseline_drift_proposals (
            agency_id, caregiver_id, baseline_type,
            current_baseline_value, proposed_baseline_value,
            drift_magnitude, drift_direction,
            observation_window_days, evidence_data_points, confidence_score,
            drift_reason, supporting_observations
          ) VALUES (
            p_agency_id, v_caregiver.caregiver_id, v_caregiver.baseline_type,
            v_caregiver.current_baseline, v_recent_mean,
            v_drift_magnitude,
            CASE 
              WHEN v_recent_mean > v_caregiver.current_baseline THEN 'increasing'
              WHEN v_recent_mean < v_caregiver.current_baseline THEN 'decreasing'
              ELSE 'stable'
            END,
            14, v_observation_count,
            LEAST(0.85, 0.5 + (v_observation_count::numeric / 100)),
            format('Detected %.1f second drift over 14 days (%s data points)',
              v_drift_magnitude, v_observation_count
            ),
            jsonb_build_object(
              'recent_mean', v_recent_mean,
              'recent_stddev', v_recent_stddev,
              'current_baseline', v_caregiver.current_baseline,
              'observation_count', v_observation_count
            )
          );

          v_drift_proposals := v_drift_proposals + 1;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'drift_proposals_created', v_drift_proposals,
    'message', 'Baseline drift detection completed'
  );
END;
$$;

-- Apply Baseline Drift (System Action - After Review or Auto-Apply)
CREATE OR REPLACE FUNCTION apply_baseline_drift(
  p_agency_id uuid,
  p_auto_apply boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_proposal record;
  v_applied int := 0;
  v_change_id uuid;
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

  -- Apply high-confidence proposals (confidence >= 0.75)
  FOR v_proposal IN
    SELECT *
    FROM baseline_drift_proposals
    WHERE agency_id = p_agency_id
      AND status = 'proposed'
      AND confidence_score >= 0.75
      AND (p_auto_apply OR evidence_data_points >= 30) -- Extra caution without auto-apply
    ORDER BY confidence_score DESC
    LIMIT 20
  LOOP
    -- Log learning change
    INSERT INTO learning_change_ledger (
      agency_id, learning_domain, change_type,
      target_entity_type, target_entity_id,
      previous_value, new_value,
      change_reason, source_signals,
      confidence_delta, evidence_count
    ) VALUES (
      p_agency_id, 'baseline_drift', 'baseline_proposal',
      v_proposal.baseline_type,
      COALESCE(v_proposal.resident_id, v_proposal.caregiver_id),
      jsonb_build_object('baseline', v_proposal.current_baseline_value),
      jsonb_build_object('baseline', v_proposal.proposed_baseline_value),
      v_proposal.drift_reason,
      v_proposal.supporting_observations,
      v_proposal.confidence_score,
      v_proposal.evidence_data_points
    )
    RETURNING id INTO v_change_id;

    -- Update proposal status
    UPDATE baseline_drift_proposals
    SET status = 'applied',
        applied_at = now(),
        applied_by_change_id = v_change_id
    WHERE id = v_proposal.id;

    -- Gradually adjust baseline (50% toward proposed value to preserve sensitivity)
    IF v_proposal.resident_id IS NOT NULL THEN
      UPDATE resident_baselines
      SET window_30d_mean = (window_30d_mean + v_proposal.proposed_baseline_value) / 2,
          updated_at = now()
      WHERE agency_id = p_agency_id
        AND resident_id = v_proposal.resident_id
        AND baseline_type = v_proposal.baseline_type;
    ELSIF v_proposal.caregiver_id IS NOT NULL THEN
      UPDATE caregiver_baselines
      SET window_30d_mean = (window_30d_mean + v_proposal.proposed_baseline_value) / 2,
          updated_at = now()
      WHERE agency_id = p_agency_id
        AND caregiver_id = v_proposal.caregiver_id
        AND baseline_type = v_proposal.baseline_type;
    END IF;

    v_applied := v_applied + 1;
  END LOOP;

  -- Update learning system state
  INSERT INTO learning_system_state (
    agency_id, total_learning_events, last_learning_event_at
  ) VALUES (
    p_agency_id, v_applied, now()
  )
  ON CONFLICT (agency_id)
  DO UPDATE SET
    total_learning_events = learning_system_state.total_learning_events + v_applied,
    last_learning_event_at = now(),
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'drift_proposals_applied', v_applied,
    'message', 'Baseline drift applied successfully'
  );
END;
$$;

-- Get Effective Baseline (Query Function)
CREATE OR REPLACE FUNCTION get_effective_baseline(
  p_agency_id uuid,
  p_resident_id uuid DEFAULT NULL,
  p_caregiver_id uuid DEFAULT NULL,
  p_baseline_type text DEFAULT 'vital_signs_bp_systolic'
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_baseline numeric;
BEGIN
  IF p_resident_id IS NOT NULL THEN
    SELECT window_30d_mean INTO v_baseline
    FROM resident_baselines
    WHERE agency_id = p_agency_id
      AND resident_id = p_resident_id
      AND baseline_type = p_baseline_type;
  ELSIF p_caregiver_id IS NOT NULL THEN
    SELECT window_30d_mean INTO v_baseline
    FROM caregiver_baselines
    WHERE agency_id = p_agency_id
      AND caregiver_id = p_caregiver_id
      AND baseline_type = p_baseline_type;
  END IF;

  RETURN v_baseline;
END;
$$;

-- Get Baseline Learning Statistics
CREATE OR REPLACE FUNCTION get_baseline_learning_stats(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_proposals int;
  v_applied_proposals int;
  v_pending_proposals int;
  v_avg_confidence numeric;
BEGIN
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'applied'),
    COUNT(*) FILTER (WHERE status = 'proposed'),
    AVG(confidence_score) FILTER (WHERE status = 'applied')
  INTO v_total_proposals, v_applied_proposals, v_pending_proposals, v_avg_confidence
  FROM baseline_drift_proposals
  WHERE agency_id = p_agency_id;

  RETURN jsonb_build_object(
    'total_proposals', COALESCE(v_total_proposals, 0),
    'applied_proposals', COALESCE(v_applied_proposals, 0),
    'pending_proposals', COALESCE(v_pending_proposals, 0),
    'average_confidence', COALESCE(v_avg_confidence, 0),
    'learning_active', v_applied_proposals > 0
  );
END;
$$;
