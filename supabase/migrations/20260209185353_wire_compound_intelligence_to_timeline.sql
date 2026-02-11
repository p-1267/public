/*
  # Wire Compound Intelligence to Unified Timeline

  1. Purpose
    - Auto-add compound intelligence events to unified timeline
    - Enable visibility across all roles
    - Provide explainability context

  2. Changes
    - Trigger on compound_intelligence_events INSERT
    - Create unified_timeline_events entry
*/

CREATE OR REPLACE FUNCTION trigger_compound_intelligence_to_timeline()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add to unified timeline
  INSERT INTO unified_timeline_events (
    resident_id,
    event_timestamp,
    actor_type,
    actor_id,
    actor_name,
    event_category,
    event_type,
    event_summary,
    event_details,
    source_table,
    source_id,
    requires_review
  ) VALUES (
    NEW.resident_id,
    NEW.created_at,
    'SYSTEM',
    NULL,
    'Intelligence System',
    'INTELLIGENCE',
    'COMPOUND_CORRELATION',
    format('[%s] %s', NEW.severity, NEW.reasoning_text),
    jsonb_build_object(
      'correlation_type', NEW.correlation_type,
      'severity', NEW.severity,
      'confidence_score', NEW.confidence_score,
      'reasoning_details', NEW.reasoning_details,
      'contributing_signals_count', NEW.contributing_signals_count,
      'requires_human_action', NEW.requires_human_action,
      'time_window_start', NEW.time_window_start,
      'time_window_end', NEW.time_window_end
    ),
    'compound_intelligence_events',
    NEW.id,
    NEW.requires_human_action
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_compound_intelligence_to_timeline ON compound_intelligence_events;
CREATE TRIGGER auto_compound_intelligence_to_timeline
  AFTER INSERT ON compound_intelligence_events
  FOR EACH ROW
  EXECUTE FUNCTION trigger_compound_intelligence_to_timeline();
