/*
  # Fix Correlation Engine Task Column References

  1. Issue
    - Engine references completed_at but tasks uses actual_end
    - Engine references outcome but need to check if column exists

  2. Fix
    - Use actual_end instead of completed_at
    - Use state = 'completed' instead of outcome check
*/

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

    -- Count task concerns (use notes containing concern keywords)
    IF 'task_completion' = ANY(v_rule.required_signal_types) THEN
      SELECT COUNT(*) INTO v_task_concern_count
      FROM tasks
      WHERE resident_id = p_resident_id
        AND actual_end >= v_time_start
        AND actual_end <= v_time_end
        AND state = 'completed'
        AND (notes ILIKE '%concern%' OR notes ILIKE '%issue%' OR notes ILIKE '%problem%');
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
        SELECT v_compound_event_id, 'tasks', id, 'task_completion', actual_end,
          jsonb_build_object('state', state, 'task_name', task_name, 'notes', left(notes, 100))
        FROM tasks
        WHERE resident_id = p_resident_id AND actual_end >= v_time_start AND state = 'completed'
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
