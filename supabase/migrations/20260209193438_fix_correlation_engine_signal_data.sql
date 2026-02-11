/*
  # Fix Correlation Engine - Include signal_data in signal_contributions
*/

DROP FUNCTION IF EXISTS run_correlation_engine(uuid, integer);

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
  v_compound_event_id uuid;
  v_med_late_count integer;
  v_vitals_abnormal_count integer;
  v_family_urgent_count integer;
  v_reasoning_text text;
  v_reasoning_details jsonb;
  v_signal_ids uuid[];
  v_events_created integer := 0;
  v_results jsonb := '[]'::jsonb;
BEGIN
  SELECT agency_id INTO v_agency_id FROM residents WHERE id = p_resident_id;
  IF v_agency_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Resident not found');
  END IF;

  v_time_end := now();
  v_time_start := now() - (p_time_window_hours || ' hours')::interval;

  FOR v_rule IN 
    SELECT * FROM correlation_rules WHERE is_active = true
  LOOP
    v_med_late_count := 0;
    v_vitals_abnormal_count := 0;
    v_family_urgent_count := 0;
    v_signal_ids := ARRAY[]::uuid[];

    IF 'medication_admin' = ANY(v_rule.required_signal_types) THEN
      SELECT 
        COUNT(*),
        array_agg(source_id)
      INTO v_med_late_count, v_signal_ids
      FROM resident_signal_facts
      WHERE resident_id = p_resident_id
        AND signal_type = 'medication_admin'
        AND signal_timestamp >= v_time_start
        AND signal_timestamp <= v_time_end
        AND abnormality_flag = 'ABNORMAL';
    END IF;

    IF 'vital_sign' = ANY(v_rule.required_signal_types) THEN
      SELECT 
        COUNT(*),
        array_agg(source_id)
      INTO v_vitals_abnormal_count, v_signal_ids
      FROM resident_signal_facts
      WHERE resident_id = p_resident_id
        AND signal_type = 'vital_sign'
        AND signal_timestamp >= v_time_start
        AND signal_timestamp <= v_time_end
        AND abnormality_flag = 'ABNORMAL';
    END IF;

    IF 'family_observation' = ANY(v_rule.required_signal_types) THEN
      SELECT 
        COUNT(*),
        array_agg(source_id)
      INTO v_family_urgent_count, v_signal_ids
      FROM resident_signal_facts
      WHERE resident_id = p_resident_id
        AND signal_type = 'family_observation'
        AND signal_timestamp >= v_time_start
        AND signal_timestamp <= v_time_end
        AND abnormality_flag = 'ABNORMAL';
    END IF;

    IF v_rule.rule_name = 'medication_adherence_vitals_pattern' THEN
      IF v_med_late_count >= 2 AND v_vitals_abnormal_count >= 1 THEN
        v_reasoning_text := format(
          'Medication instability pattern detected: %s late/missed medications and %s abnormal vital sign readings in past %s hours. This correlation suggests medication non-adherence may be contributing to physiological instability.',
          v_med_late_count, v_vitals_abnormal_count, p_time_window_hours
        );
        
        SELECT array_agg(source_id) INTO v_signal_ids
        FROM resident_signal_facts
        WHERE resident_id = p_resident_id
          AND signal_type IN ('medication_admin', 'vital_sign')
          AND signal_timestamp >= v_time_start
          AND signal_timestamp <= v_time_end
          AND abnormality_flag = 'ABNORMAL';
        
        v_reasoning_details := jsonb_build_object(
          'rule_id', v_rule.id,
          'rule_name', v_rule.rule_name,
          'late_medications_count', v_med_late_count,
          'abnormal_vitals_count', v_vitals_abnormal_count,
          'time_window_hours', p_time_window_hours,
          'evaluation_timestamp', now(),
          'signal_ids', v_signal_ids
        );

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
          array_length(v_signal_ids, 1),
          true
        ) RETURNING id INTO v_compound_event_id;

        -- Include signal_data from view
        INSERT INTO signal_contributions (
          compound_event_id,
          signal_type,
          signal_source_table,
          signal_source_id,
          signal_timestamp,
          signal_data,
          contribution_weight
        )
        SELECT
          v_compound_event_id,
          rsf.signal_type,
          rsf.source_table,
          rsf.source_id,
          rsf.signal_timestamp,
          rsf.signal_data,
          CASE rsf.signal_type
            WHEN 'vital_sign' THEN 0.6
            WHEN 'medication_admin' THEN 0.4
            ELSE 0.3
          END
        FROM resident_signal_facts rsf
        WHERE rsf.resident_id = p_resident_id
          AND rsf.signal_type IN ('medication_admin', 'vital_sign')
          AND rsf.signal_timestamp >= v_time_start
          AND rsf.signal_timestamp <= v_time_end
          AND rsf.abnormality_flag = 'ABNORMAL';

        v_events_created := v_events_created + 1;
        v_results := v_results || jsonb_build_object(
          'event_id', v_compound_event_id,
          'rule_name', v_rule.rule_name,
          'severity', v_rule.severity_output,
          'signals_count', array_length(v_signal_ids, 1)
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

GRANT EXECUTE ON FUNCTION run_correlation_engine TO authenticated, anon;
