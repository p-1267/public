/*
  # WP4: Learning Governance & Reversibility

  1. Purpose
    - Rollback learning changes
    - Freeze learning temporarily
    - Inspect learning history

  2. Functions
    - rollback_learning: Reverts last N learning changes
    - freeze_learning: Stops learning temporarily
    - unfreeze_learning: Resumes learning
    - inspect_learning_changes: Views learning history

  3. Truth Enforcement
    - Rollback restores exact prior behavior
    - All changes are audit-logged
    - No permanent deletions
*/

-- Rollback Learning (Admin Action)
CREATE OR REPLACE FUNCTION rollback_learning(
  p_agency_id uuid,
  p_rollback_count int DEFAULT 1,
  p_rollback_domain text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_change record;
  v_rolled_back int := 0;
  v_changes_to_rollback uuid[];
BEGIN
  -- Get changes to rollback (most recent first)
  IF p_rollback_domain IS NOT NULL THEN
    SELECT array_agg(id ORDER BY applied_at DESC)
    INTO v_changes_to_rollback
    FROM (
      SELECT id
      FROM learning_change_ledger
      WHERE agency_id = p_agency_id
        AND learning_domain = p_rollback_domain
        AND is_rolled_back = false
      ORDER BY applied_at DESC
      LIMIT p_rollback_count
    ) sub;
  ELSE
    SELECT array_agg(id ORDER BY applied_at DESC)
    INTO v_changes_to_rollback
    FROM (
      SELECT id
      FROM learning_change_ledger
      WHERE agency_id = p_agency_id
        AND is_rolled_back = false
      ORDER BY applied_at DESC
      LIMIT p_rollback_count
    ) sub;
  END IF;

  IF v_changes_to_rollback IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No learning changes found to rollback'
    );
  END IF;

  -- Rollback each change
  FOR v_change IN
    SELECT *
    FROM learning_change_ledger
    WHERE id = ANY(v_changes_to_rollback)
    ORDER BY applied_at DESC
  LOOP
    -- Mark as rolled back
    UPDATE learning_change_ledger
    SET is_rolled_back = true,
        rolled_back_at = now()
    WHERE id = v_change.id;

    -- Restore previous values based on domain
    CASE v_change.learning_domain
      WHEN 'voice_extraction' THEN
        -- Restore previous confidence
        UPDATE voice_correction_memory
        SET confidence_improvement = (v_change.previous_value->>'confidence')::numeric,
            updated_at = now()
        WHERE id = v_change.target_entity_id;

      WHEN 'alert_threshold' THEN
        -- Previous threshold will be picked up by get_learned_alert_threshold
        -- (it queries non-rolled-back changes)
        NULL; -- No direct table update needed

      WHEN 'baseline_drift' THEN
        -- Revert baseline adjustment
        IF v_change.target_entity_type LIKE '%resident%' THEN
          UPDATE resident_baselines
          SET window_30d_mean = (v_change.previous_value->>'baseline')::numeric,
              updated_at = now()
          WHERE agency_id = p_agency_id
            AND resident_id = v_change.target_entity_id
            AND baseline_type = v_change.target_entity_type;
        ELSE
          UPDATE caregiver_baselines
          SET window_30d_mean = (v_change.previous_value->>'baseline')::numeric,
              updated_at = now()
          WHERE agency_id = p_agency_id
            AND caregiver_id = v_change.target_entity_id
            AND baseline_type = v_change.target_entity_type;
        END IF;

      WHEN 'prediction_calibration' THEN
        -- Previous weight will be picked up by get_calibrated_confidence
        -- (it queries non-rolled-back changes)
        NULL; -- No direct table update needed

      ELSE
        NULL;
    END CASE;

    v_rolled_back := v_rolled_back + 1;
  END LOOP;

  -- Update system state
  UPDATE learning_system_state
  SET rollback_count = rollback_count + v_rolled_back,
      last_rollback_at = now(),
      updated_at = now()
  WHERE agency_id = p_agency_id;

  RETURN jsonb_build_object(
    'success', true,
    'changes_rolled_back', v_rolled_back,
    'message', format('Rolled back %s learning changes', v_rolled_back)
  );
END;
$$;

-- Freeze Learning (Admin Action)
CREATE OR REPLACE FUNCTION freeze_learning(
  p_agency_id uuid,
  p_freeze_duration_hours int DEFAULT 24,
  p_freeze_reason text DEFAULT 'Manual freeze'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO learning_system_state (
    agency_id, learning_enabled, frozen_until, frozen_reason
  ) VALUES (
    p_agency_id, false, now() + (p_freeze_duration_hours || ' hours')::interval, p_freeze_reason
  )
  ON CONFLICT (agency_id)
  DO UPDATE SET
    learning_enabled = false,
    frozen_until = now() + (p_freeze_duration_hours || ' hours')::interval,
    frozen_reason = p_freeze_reason,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'frozen_until', now() + (p_freeze_duration_hours || ' hours')::interval,
    'message', format('Learning frozen for %s hours', p_freeze_duration_hours)
  );
END;
$$;

-- Unfreeze Learning (Admin Action)
CREATE OR REPLACE FUNCTION unfreeze_learning(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE learning_system_state
  SET learning_enabled = true,
      frozen_until = NULL,
      frozen_reason = NULL,
      updated_at = now()
  WHERE agency_id = p_agency_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Learning unfrozen and enabled'
  );
END;
$$;

-- Inspect Learning Changes (Query Function)
CREATE OR REPLACE FUNCTION inspect_learning_changes(
  p_agency_id uuid,
  p_learning_domain text DEFAULT NULL,
  p_limit int DEFAULT 50
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_changes jsonb;
BEGIN
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', id,
      'learning_domain', learning_domain,
      'change_type', change_type,
      'target_entity_type', target_entity_type,
      'previous_value', previous_value,
      'new_value', new_value,
      'change_reason', change_reason,
      'confidence_delta', confidence_delta,
      'evidence_count', evidence_count,
      'applied_at', applied_at,
      'is_rolled_back', is_rolled_back,
      'rolled_back_at', rolled_back_at
    ) ORDER BY applied_at DESC
  )
  INTO v_changes
  FROM (
    SELECT *
    FROM learning_change_ledger
    WHERE agency_id = p_agency_id
      AND (p_learning_domain IS NULL OR learning_domain = p_learning_domain)
    ORDER BY applied_at DESC
    LIMIT p_limit
  ) sub;

  RETURN COALESCE(v_changes, '[]'::jsonb);
END;
$$;

-- Get Learning System Status (Query Function)
CREATE OR REPLACE FUNCTION get_learning_system_status(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_state record;
  v_stats jsonb;
BEGIN
  SELECT * INTO v_state
  FROM learning_system_state
  WHERE agency_id = p_agency_id;

  IF v_state.id IS NULL THEN
    -- Initialize if doesn't exist
    INSERT INTO learning_system_state (agency_id)
    VALUES (p_agency_id)
    RETURNING * INTO v_state;
  END IF;

  -- Get stats by domain
  SELECT jsonb_object_agg(
    learning_domain,
    jsonb_build_object(
      'total_changes', count,
      'active_changes', active_count,
      'rolled_back_changes', rolled_back_count
    )
  )
  INTO v_stats
  FROM (
    SELECT 
      learning_domain,
      COUNT(*) as count,
      COUNT(*) FILTER (WHERE is_rolled_back = false) as active_count,
      COUNT(*) FILTER (WHERE is_rolled_back = true) as rolled_back_count
    FROM learning_change_ledger
    WHERE agency_id = p_agency_id
    GROUP BY learning_domain
  ) sub;

  RETURN jsonb_build_object(
    'learning_enabled', v_state.learning_enabled,
    'is_frozen', v_state.frozen_until IS NOT NULL AND v_state.frozen_until > now(),
    'frozen_until', v_state.frozen_until,
    'frozen_reason', v_state.frozen_reason,
    'total_learning_events', v_state.total_learning_events,
    'last_learning_event_at', v_state.last_learning_event_at,
    'rollback_count', v_state.rollback_count,
    'last_rollback_at', v_state.last_rollback_at,
    'stats_by_domain', COALESCE(v_stats, '{}'::jsonb)
  );
END;
$$;

-- Run All Learning (Convenience Function for Showcase)
CREATE OR REPLACE FUNCTION run_all_learning(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_language_result jsonb;
  v_alert_result jsonb;
  v_baseline_result jsonb;
  v_outcome_result jsonb;
BEGIN
  -- Run all learning loops
  SELECT apply_language_learning(p_agency_id) INTO v_language_result;
  SELECT apply_alert_learning(p_agency_id) INTO v_alert_result;
  SELECT detect_baseline_drift(p_agency_id) INTO v_baseline_result;
  SELECT apply_baseline_drift(p_agency_id, true) INTO v_baseline_result;
  SELECT apply_outcome_learning(p_agency_id) INTO v_outcome_result;

  RETURN jsonb_build_object(
    'success', true,
    'language_learning', v_language_result,
    'alert_learning', v_alert_result,
    'baseline_learning', v_baseline_result,
    'outcome_learning', v_outcome_result,
    'message', 'All learning loops executed'
  );
END;
$$;
