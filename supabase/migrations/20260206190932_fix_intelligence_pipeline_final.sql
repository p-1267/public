/*
  # Final Intelligence Pipeline Fix

  ## Changes
  - Fix verify function to handle NULL cases
  - Simplify linkage logic
*/

DROP FUNCTION IF EXISTS verify_intelligence_pipeline();

CREATE OR REPLACE FUNCTION verify_intelligence_pipeline()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resident_id uuid := 'b0000000-0000-0000-0000-000000000001'::uuid;
  v_signals_count int;
  v_notifications_count int;
  v_ai_inputs_count int;
  v_signal_id uuid;
  v_notification_id uuid;
  v_ai_input_id uuid;
  v_signal_data jsonb;
  v_notification_data jsonb;
  v_ai_input_data jsonb;
BEGIN
  SELECT COUNT(*) INTO v_signals_count
  FROM intelligence_signals
  WHERE resident_id = v_resident_id AND is_simulation = true;

  SELECT COUNT(*) INTO v_notifications_count
  FROM notification_log
  WHERE resident_id = v_resident_id AND is_simulation = true;

  SELECT COUNT(*) INTO v_ai_inputs_count
  FROM ai_learning_inputs
  WHERE is_simulation = true
    AND input_data->>'resident_id' = v_resident_id::text;

  -- Get most recent signal
  SELECT id, category, severity, title INTO v_signal_id, v_signal_data
  FROM intelligence_signals
  WHERE resident_id = v_resident_id AND is_simulation = true
  ORDER BY detected_at DESC
  LIMIT 1;

  IF v_signal_id IS NOT NULL THEN
    v_signal_data := jsonb_build_object(
      'id', v_signal_id,
      'category', (SELECT category FROM intelligence_signals WHERE id = v_signal_id),
      'severity', (SELECT severity FROM intelligence_signals WHERE id = v_signal_id),
      'title', (SELECT title FROM intelligence_signals WHERE id = v_signal_id)
    );

    -- Find linked notification
    SELECT id, notification_type, message INTO v_notification_id, v_notification_data
    FROM notification_log
    WHERE resident_id = v_resident_id
      AND is_simulation = true
      AND message LIKE '%' || v_signal_id::text || '%'
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_notification_id IS NOT NULL THEN
      v_notification_data := jsonb_build_object(
        'id', v_notification_id,
        'type', (SELECT notification_type FROM notification_log WHERE id = v_notification_id),
        'status', 'SIMULATION_BLOCKED',
        'message', LEFT((SELECT message FROM notification_log WHERE id = v_notification_id), 100)
      );

      -- Find linked AI input
      SELECT id, input_type, input_data INTO v_ai_input_id, v_ai_input_data
      FROM ai_learning_inputs
      WHERE is_simulation = true
        AND (input_data->>'signal_id')::uuid = v_signal_id
      ORDER BY created_at DESC
      LIMIT 1;

      IF v_ai_input_id IS NOT NULL THEN
        v_ai_input_data := jsonb_build_object(
          'id', v_ai_input_id,
          'type', (SELECT input_type FROM ai_learning_inputs WHERE id = v_ai_input_id),
          'was_useful', (SELECT input_data->>'was_useful' FROM ai_learning_inputs WHERE id = v_ai_input_id)
        );
      END IF;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'status', 'SUCCESS',
    'pipeline_health', jsonb_build_object(
      'intelligence_signals', v_signals_count,
      'notifications', v_notifications_count,
      'ai_learning_inputs', v_ai_inputs_count,
      'all_tables_populated', (v_signals_count > 0 AND v_notifications_count > 0 AND v_ai_inputs_count > 0)
    ),
    'pipeline_linkage', jsonb_build_object(
      'signal_found', v_signal_id IS NOT NULL,
      'notification_linked', v_notification_id IS NOT NULL,
      'ai_input_linked', v_ai_input_id IS NOT NULL,
      'end_to_end_complete', (v_signal_id IS NOT NULL AND v_notification_id IS NOT NULL AND v_ai_input_id IS NOT NULL)
    ),
    'sample_signal', v_signal_data,
    'sample_notification', v_notification_data,
    'sample_ai_input', v_ai_input_data
  );
END;
$$;

GRANT EXECUTE ON FUNCTION verify_intelligence_pipeline() TO authenticated, anon;
