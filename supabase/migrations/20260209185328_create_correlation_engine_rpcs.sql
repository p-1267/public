/*
  # Correlation Engine RPCs

  1. run_correlation_engine(resident_id, time_window_hours)
     - Evaluates all active rules
     - Creates compound events
     - Links contributing signals
     - Returns explainable results

  2. run_correlation_engine_agency(agency_id)
     - Runs for all residents in agency

  3. supervisor_review_compound_event(event_id, supervisor_id, action, notes)
     - Supervisor reviews/dismisses compound intelligence
*/

-- ============================================================
-- RPC: run_correlation_engine (single resident)
-- ============================================================

CREATE OR REPLACE FUNCTION run_correlation_engine(
  p_resident_id uuid,
  p_time_window_hours integer DEFAULT 168
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
  v_rule RECORD;
  v_time_start timestamptz;
  v_time_end timestamptz;
  v_signals RECORD;
  v_compound_event_id uuid;
  v_med_late_count integer;
  v_vitals_abnormal_count integer;
  v_family_urgent_count integer;
  v_task_concern_count integer;
  v_reasoning_text text;
  v_reasoning_details jsonb;
  v_events_created integer := 0;
  v_results jsonb := '[]'::jsonb;
BEGIN
  -- Get agency
  SELECT agency_id INTO v_agency_id FROM residents WHERE id = p_resident_id;
  
  IF v_agency_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Resident not found');
  END IF;

  v_time_end := now();
  v_time_start := now() - (p_time_window_hours || ' hours')::interval;

  -- Loop through active rules
  FOR v_rule IN 
    SELECT * FROM correlation_rules WHERE is_active = true
  LOOP
    -- Reset counters
    v_med_late_count := 0;
    v_vitals_abnormal_count := 0;
    v_family_urgent_count := 0;
    v_task_concern_count := 0;

    -- Count medication issues (late/missed)
    IF 'medication_admin' = ANY(v_rule.required_signal_types) THEN
      SELECT COUNT(*) INTO v_med_late_count
      FROM medication_administration_log
      WHERE resident_id = p_resident_id
        AND administered_at >= v_time_start
        AND administered_at <= v_time_end
        AND status IN ('LATE', 'MISSED');
    END IF;

    -- Count abnormal vitals
    IF 'vital_sign' = ANY(v_rule.required_signal_types) THEN
      SELECT COUNT(*) INTO v_vitals_abnormal_count
      FROM health_metrics
      WHERE resident_id = p_resident_id
        AND recorded_at >= v_time_start
        AND recorded_at <= v_time_end
        AND metric_type IN ('blood_pressure_systolic', 'heart_rate')
        AND (
          (metric_type = 'blood_pressure_systolic' AND value_numeric > 140)
          OR (metric_type = 'heart_rate' AND (value_numeric < 60 OR value_numeric > 100))
        );
    END IF;

    -- Count urgent family observations
    IF 'family_observation' = ANY(v_rule.required_signal_types) THEN
      SELECT COUNT(*) INTO v_family_urgent_count
      FROM family_observations
      WHERE resident_id = p_resident_id
        AND submitted_at >= v_time_start
        AND submitted_at <= v_time_end
        AND concern_level IN ('MODERATE', 'URGENT');
    END IF;

    -- Count task concerns
    IF 'task_completion' = ANY(v_rule.required_signal_types) THEN
      SELECT COUNT(*) INTO v_task_concern_count
      FROM tasks
      WHERE resident_id = p_resident_id
        AND completed_at >= v_time_start
        AND completed_at <= v_time_end
        AND outcome = 'CONCERN';
    END IF;

    -- Evaluate rule: medication_adherence_vitals_pattern
    IF v_rule.rule_name = 'medication_adherence_vitals_pattern' THEN
      IF v_med_late_count >= 2 AND v_vitals_abnormal_count >= 1 THEN
        v_reasoning_text := format(
          'Medication instability pattern detected: %s late/missed medications and %s abnormal vital sign readings in past %s hours',
          v_med_late_count, v_vitals_abnormal_count, p_time_window_hours
        );
        
        v_reasoning_details := jsonb_build_object(
          'rule_id', v_rule.id,
          'rule_name', v_rule.rule_name,
          'late_medications_count', v_med_late_count,
          'abnormal_vitals_count', v_vitals_abnormal_count,
          'time_window_hours', p_time_window_hours,
          'evaluation_timestamp', now()
        );

        -- Create compound event
        INSERT INTO compound_intelligence_events (
          resident_id,
          agency_id,
          correlation_type,
          correlation_rule_id,
          severity,
          confidence_score,
          reasoning_text,
          reasoning_details,
          time_window_start,
          time_window_end,
          contributing_signals_count,
          requires_human_action
        ) VALUES (
          p_resident_id,
          v_agency_id,
          v_rule.correlation_type,
          v_rule.id,
          v_rule.severity_output,
          0.85,
          v_reasoning_text,
          v_reasoning_details,
          v_time_start,
          v_time_end,
          v_med_late_count + v_vitals_abnormal_count,
          v_rule.requires_human_action
        ) RETURNING id INTO v_compound_event_id;

        -- Link medication signals
        INSERT INTO signal_contributions (compound_event_id, signal_source_table, signal_source_id, signal_type, signal_timestamp, signal_data)
        SELECT v_compound_event_id, 'medication_administration_log', id, 'medication_admin', administered_at,
          jsonb_build_object('status', status, 'medication_id', medication_id)
        FROM medication_administration_log
        WHERE resident_id = p_resident_id
          AND administered_at >= v_time_start
          AND administered_at <= v_time_end
          AND status IN ('LATE', 'MISSED')
        LIMIT 10;

        -- Link vital signals
        INSERT INTO signal_contributions (compound_event_id, signal_source_table, signal_source_id, signal_type, signal_timestamp, signal_data)
        SELECT v_compound_event_id, 'health_metrics', id, 'vital_sign', recorded_at,
          jsonb_build_object('metric_type', metric_type, 'value', value_numeric, 'unit', unit)
        FROM health_metrics
        WHERE resident_id = p_resident_id
          AND recorded_at >= v_time_start
          AND recorded_at <= v_time_end
          AND metric_type IN ('blood_pressure_systolic', 'heart_rate')
        LIMIT 10;

        v_events_created := v_events_created + 1;
        v_results := v_results || jsonb_build_object(
          'rule_matched', v_rule.rule_name,
          'event_id', v_compound_event_id,
          'severity', v_rule.severity_output
        );
      END IF;
    END IF;

    -- Evaluate rule: family_concern_caregiver_observation
    IF v_rule.rule_name = 'family_concern_caregiver_observation' THEN
      IF v_family_urgent_count >= 1 AND v_task_concern_count >= 1 THEN
        v_reasoning_text := format(
          'Cross-observer validation: %s family concern(s) align with %s caregiver task concern(s)',
          v_family_urgent_count, v_task_concern_count
        );
        
        v_reasoning_details := jsonb_build_object(
          'rule_id', v_rule.id,
          'rule_name', v_rule.rule_name,
          'family_concerns_count', v_family_urgent_count,
          'task_concerns_count', v_task_concern_count,
          'time_window_hours', p_time_window_hours
        );

        INSERT INTO compound_intelligence_events (
          resident_id, agency_id, correlation_type, correlation_rule_id, severity,
          confidence_score, reasoning_text, reasoning_details,
          time_window_start, time_window_end, contributing_signals_count, requires_human_action
        ) VALUES (
          p_resident_id, v_agency_id, v_rule.correlation_type, v_rule.id, v_rule.severity_output,
          0.80, v_reasoning_text, v_reasoning_details,
          v_time_start, v_time_end, v_family_urgent_count + v_task_concern_count, v_rule.requires_human_action
        ) RETURNING id INTO v_compound_event_id;

        -- Link family observations
        INSERT INTO signal_contributions (compound_event_id, signal_source_table, signal_source_id, signal_type, signal_timestamp, signal_data)
        SELECT v_compound_event_id, 'family_observations', id, 'family_observation', submitted_at,
          jsonb_build_object('concern_level', concern_level, 'observation_text', left(observation_text, 100))
        FROM family_observations
        WHERE resident_id = p_resident_id AND submitted_at >= v_time_start AND concern_level IN ('MODERATE', 'URGENT')
        LIMIT 5;

        -- Link task outcomes
        INSERT INTO signal_contributions (compound_event_id, signal_source_table, signal_source_id, signal_type, signal_timestamp, signal_data)
        SELECT v_compound_event_id, 'tasks', id, 'task_completion', completed_at,
          jsonb_build_object('outcome', outcome, 'task_name', task_name)
        FROM tasks
        WHERE resident_id = p_resident_id AND completed_at >= v_time_start AND outcome = 'CONCERN'
        LIMIT 5;

        v_events_created := v_events_created + 1;
        v_results := v_results || jsonb_build_object(
          'rule_matched', v_rule.rule_name,
          'event_id', v_compound_event_id,
          'severity', v_rule.severity_output
        );
      END IF;
    END IF;

    -- Evaluate rule: multi_domain_instability
    IF v_rule.rule_name = 'multi_domain_instability' THEN
      IF v_med_late_count >= 2 AND v_vitals_abnormal_count >= 1 AND v_family_urgent_count >= 1 THEN
        v_reasoning_text := format(
          'CRITICAL: Multi-domain instability - %s medication issues, %s abnormal vitals, %s urgent family observations',
          v_med_late_count, v_vitals_abnormal_count, v_family_urgent_count
        );
        
        v_reasoning_details := jsonb_build_object(
          'rule_id', v_rule.id,
          'rule_name', v_rule.rule_name,
          'medication_issues', v_med_late_count,
          'abnormal_vitals', v_vitals_abnormal_count,
          'family_urgent', v_family_urgent_count,
          'domains_affected', 3
        );

        INSERT INTO compound_intelligence_events (
          resident_id, agency_id, correlation_type, correlation_rule_id, severity,
          confidence_score, reasoning_text, reasoning_details,
          time_window_start, time_window_end, contributing_signals_count, requires_human_action
        ) VALUES (
          p_resident_id, v_agency_id, v_rule.correlation_type, v_rule.id, v_rule.severity_output,
          0.95, v_reasoning_text, v_reasoning_details,
          v_time_start, v_time_end, v_med_late_count + v_vitals_abnormal_count + v_family_urgent_count, true
        ) RETURNING id INTO v_compound_event_id;

        -- Link all signals
        INSERT INTO signal_contributions (compound_event_id, signal_source_table, signal_source_id, signal_type, signal_timestamp, signal_data)
        SELECT v_compound_event_id, 'medication_administration_log', id, 'medication_admin', administered_at,
          jsonb_build_object('status', status)
        FROM medication_administration_log
        WHERE resident_id = p_resident_id AND administered_at >= v_time_start AND status IN ('LATE', 'MISSED')
        LIMIT 5;

        INSERT INTO signal_contributions (compound_event_id, signal_source_table, signal_source_id, signal_type, signal_timestamp, signal_data)
        SELECT v_compound_event_id, 'health_metrics', id, 'vital_sign', recorded_at,
          jsonb_build_object('metric_type', metric_type, 'value', value_numeric)
        FROM health_metrics
        WHERE resident_id = p_resident_id AND recorded_at >= v_time_start
        LIMIT 5;

        INSERT INTO signal_contributions (compound_event_id, signal_source_table, signal_source_id, signal_type, signal_timestamp, signal_data)
        SELECT v_compound_event_id, 'family_observations', id, 'family_observation', submitted_at,
          jsonb_build_object('concern_level', concern_level)
        FROM family_observations
        WHERE resident_id = p_resident_id AND submitted_at >= v_time_start
        LIMIT 5;

        v_events_created := v_events_created + 1;
        v_results := v_results || jsonb_build_object(
          'rule_matched', v_rule.rule_name,
          'event_id', v_compound_event_id,
          'severity', v_rule.severity_output
        );
      END IF;
    END IF;

  END LOOP;

  RETURN jsonb_build_object(
    'status', 'success',
    'resident_id', p_resident_id,
    'time_window_hours', p_time_window_hours,
    'events_created', v_events_created,
    'events', v_results
  );
END;
$$;

-- ============================================================
-- RPC: run_correlation_engine_agency
-- ============================================================

CREATE OR REPLACE FUNCTION run_correlation_engine_agency(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resident RECORD;
  v_result jsonb;
  v_total_events integer := 0;
  v_results jsonb := '[]'::jsonb;
BEGIN
  FOR v_resident IN SELECT id FROM residents WHERE agency_id = p_agency_id
  LOOP
    SELECT run_correlation_engine(v_resident.id, 168) INTO v_result;
    v_total_events := v_total_events + COALESCE((v_result->>'events_created')::integer, 0);
    v_results := v_results || v_result;
  END LOOP;

  RETURN jsonb_build_object(
    'status', 'success',
    'agency_id', p_agency_id,
    'total_events_created', v_total_events,
    'residents_processed', jsonb_array_length(v_results),
    'details', v_results
  );
END;
$$;

-- ============================================================
-- RPC: supervisor_review_compound_event
-- ============================================================

CREATE OR REPLACE FUNCTION supervisor_review_compound_event(
  p_event_id uuid,
  p_supervisor_id uuid,
  p_action text,
  p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE compound_intelligence_events
  SET
    reviewed_by = p_supervisor_id,
    reviewed_at = now(),
    supervisor_action = p_action,
    supervisor_notes = p_notes
  WHERE id = p_event_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Event not found');
  END IF;

  -- Audit
  INSERT INTO audit_log (action_type, actor_id, target_type, target_id, new_state, metadata)
  VALUES (
    'compound_intelligence_reviewed',
    p_supervisor_id,
    'compound_intelligence_events',
    p_event_id,
    jsonb_build_object('action', p_action),
    jsonb_build_object('notes', p_notes)
  );

  RETURN jsonb_build_object('success', true, 'event_id', p_event_id);
END;
$$;

GRANT EXECUTE ON FUNCTION run_correlation_engine TO authenticated, anon;
GRANT EXECUTE ON FUNCTION run_correlation_engine_agency TO authenticated, anon;
GRANT EXECUTE ON FUNCTION supervisor_review_compound_event TO authenticated, anon;
