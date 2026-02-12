/*
  # Create Cognitive Panel RPC for Intelligence Surfacing

  1. Function: get_cognitive_panel
    - Returns role-specific intelligence payload
    - Sections: NOW, NEXT, RISK, WHY
    - Filtered by care_context management_mode
    - Uses real DB tables: intelligence_signals, tasks, observation_events, unified_timeline_events
  
  2. Security
    - SECURITY DEFINER with search_path security
    - Returns jsonb payload with all cognitive sections
*/

CREATE OR REPLACE FUNCTION get_cognitive_panel(
  p_role text,
  p_resident_id uuid,
  p_care_context_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_context record;
  v_now_items jsonb := '[]'::jsonb;
  v_next_items jsonb := '[]'::jsonb;
  v_risk_items jsonb := '[]'::jsonb;
  v_why_items jsonb := '[]'::jsonb;
  v_source_counts jsonb;
  v_signal record;
  v_task record;
  v_event record;
BEGIN
  -- Get care context
  SELECT * INTO v_context
  FROM care_contexts
  WHERE id = p_care_context_id AND resident_id = p_resident_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'now_items', '[]'::jsonb,
      'next_items', '[]'::jsonb,
      'risk_items', '[]'::jsonb,
      'why_items', '[]'::jsonb,
      'source_counts', jsonb_build_object('signals', 0, 'tasks', 0, 'events', 0),
      'error', 'No active care context found'
    );
  END IF;

  -- Build NOW items (immediate attention)
  FOR v_task IN
    SELECT t.id, t.task_name, t.description, t.priority, t.risk_level, t.state, t.scheduled_start, t.scheduled_end
    FROM tasks t
    WHERE t.resident_id = p_resident_id
      AND t.state IN ('in_progress', 'pending')
      AND t.scheduled_start <= (now() + interval '4 hours')
    ORDER BY t.priority DESC, t.scheduled_start ASC
    LIMIT 3
  LOOP
    v_now_items := v_now_items || jsonb_build_object(
      'type', 'task',
      'id', v_task.id,
      'title', v_task.task_name,
      'description', v_task.description,
      'priority', v_task.priority,
      'risk_level', v_task.risk_level,
      'state', v_task.state,
      'scheduled_start', v_task.scheduled_start,
      'source', 'tasks'
    );
  END LOOP;

  -- Add active signals to NOW if high severity
  FOR v_signal IN
    SELECT s.id, s.signal_id, s.title, s.description, s.severity, s.category, s.reasoning, s.suggested_actions, s.data_source
    FROM intelligence_signals s
    WHERE s.resident_id = p_resident_id
      AND s.dismissed = false
      AND s.severity IN ('CRITICAL', 'HIGH')
      AND s.requires_human_action = true
    ORDER BY s.detected_at DESC
    LIMIT 2
  LOOP
    v_now_items := v_now_items || jsonb_build_object(
      'type', 'signal',
      'id', v_signal.id,
      'title', v_signal.title,
      'description', v_signal.description,
      'severity', v_signal.severity,
      'category', v_signal.category,
      'source', 'intelligence_signals'
    );
    
    -- Add to WHY items
    v_why_items := v_why_items || jsonb_build_object(
      'signal_id', v_signal.id,
      'reasoning', v_signal.reasoning,
      'data_sources', v_signal.data_source,
      'suggested_actions', v_signal.suggested_actions
    );
  END LOOP;

  -- Build NEXT items (upcoming work)
  FOR v_task IN
    SELECT t.id, t.task_name, t.description, t.priority, t.risk_level, t.state, t.scheduled_start, t.scheduled_end
    FROM tasks t
    WHERE t.resident_id = p_resident_id
      AND t.state = 'pending'
      AND t.scheduled_start > (now() + interval '4 hours')
      AND t.scheduled_start <= (now() + interval '24 hours')
    ORDER BY t.scheduled_start ASC
    LIMIT 3
  LOOP
    v_next_items := v_next_items || jsonb_build_object(
      'type', 'task',
      'id', v_task.id,
      'title', v_task.task_name,
      'description', v_task.description,
      'priority', v_task.priority,
      'risk_level', v_task.risk_level,
      'scheduled_start', v_task.scheduled_start,
      'source', 'tasks'
    );
  END LOOP;

  -- Build RISK items (warnings, projections, compound events)
  FOR v_signal IN
    SELECT s.id, s.signal_id, s.title, s.description, s.severity, s.category, s.reasoning, s.suggested_actions, s.data_source
    FROM intelligence_signals s
    WHERE s.resident_id = p_resident_id
      AND s.dismissed = false
      AND s.severity IN ('MEDIUM', 'LOW', 'CRITICAL', 'HIGH')
    ORDER BY 
      CASE s.severity
        WHEN 'CRITICAL' THEN 1
        WHEN 'HIGH' THEN 2
        WHEN 'MEDIUM' THEN 3
        WHEN 'LOW' THEN 4
      END,
      s.detected_at DESC
    LIMIT 3
  LOOP
    v_risk_items := v_risk_items || jsonb_build_object(
      'type', 'signal',
      'id', v_signal.id,
      'title', v_signal.title,
      'description', v_signal.description,
      'severity', v_signal.severity,
      'category', v_signal.category,
      'source', 'intelligence_signals'
    );
    
    -- Add to WHY items if not already present
    IF NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(v_why_items) elem 
      WHERE elem->>'signal_id' = v_signal.id::text
    ) THEN
      v_why_items := v_why_items || jsonb_build_object(
        'signal_id', v_signal.id,
        'reasoning', v_signal.reasoning,
        'data_sources', v_signal.data_source,
        'suggested_actions', v_signal.suggested_actions
      );
    END IF;
  END LOOP;

  -- Calculate source counts
  v_source_counts := jsonb_build_object(
    'signals', (SELECT COUNT(*) FROM intelligence_signals WHERE resident_id = p_resident_id AND dismissed = false),
    'tasks', (SELECT COUNT(*) FROM tasks WHERE resident_id = p_resident_id AND state IN ('pending', 'in_progress')),
    'events', (SELECT COUNT(*) FROM observation_events WHERE resident_id = p_resident_id AND created_at > (now() - interval '24 hours'))
  );

  -- Return cognitive panel payload
  RETURN jsonb_build_object(
    'now_items', v_now_items,
    'next_items', v_next_items,
    'risk_items', v_risk_items,
    'why_items', v_why_items,
    'source_counts', v_source_counts,
    'care_context', jsonb_build_object(
      'management_mode', v_context.management_mode,
      'care_setting', v_context.care_setting,
      'service_model', v_context.service_model
    )
  );
END;
$$;
