/*
  # Forensic Replay RPCs (Phase 3)

  1. Purpose
    - Generate forensic timelines
    - Create decision point snapshots
    - Manage replay sessions

  2. Functions
    - `generate_forensic_timeline` - Create timeline from audit logs
    - `add_decision_point` - Add decision point to timeline
    - `seal_forensic_timeline` - Make timeline immutable
    - `create_replay_session` - Start new replay session
*/

CREATE OR REPLACE FUNCTION generate_forensic_timeline(
  p_timeline_type text,
  p_resident_id uuid,
  p_start_timestamp timestamptz,
  p_end_timestamp timestamptz,
  p_generated_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_timeline_id uuid;
  v_audit_logs jsonb;
  v_event_count integer;
  v_participant_ids uuid[];
  v_result jsonb;
BEGIN
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'timestamp', timestamp,
        'action', action,
        'actor_id', actor_id,
        'table_name', table_name,
        'old_data', old_data,
        'new_data', new_data
      ) ORDER BY timestamp
    ),
    COUNT(*),
    ARRAY_AGG(DISTINCT actor_id) FILTER (WHERE actor_id IS NOT NULL)
  INTO v_audit_logs, v_event_count, v_participant_ids
  FROM audit_log
  WHERE timestamp BETWEEN p_start_timestamp AND p_end_timestamp
    AND (p_resident_id IS NULL OR 
         (new_data->>'resident_id')::uuid = p_resident_id OR 
         (old_data->>'resident_id')::uuid = p_resident_id);

  INSERT INTO forensic_timelines (
    timeline_type,
    resident_id,
    start_timestamp,
    end_timestamp,
    timeline_snapshot,
    event_count,
    decision_point_count,
    sop_enforcement_count,
    participant_user_ids,
    generated_by
  ) VALUES (
    p_timeline_type,
    p_resident_id,
    p_start_timestamp,
    p_end_timestamp,
    jsonb_build_object(
      'events', COALESCE(v_audit_logs, '[]'::jsonb),
      'metadata', jsonb_build_object(
        'generated_at', now(),
        'generated_by', p_generated_by
      )
    ),
    COALESCE(v_event_count, 0),
    0,
    0,
    COALESCE(v_participant_ids, ARRAY[]::uuid[]),
    p_generated_by
  )
  RETURNING id INTO v_timeline_id;

  SELECT jsonb_build_object(
    'timeline_id', v_timeline_id,
    'type', p_timeline_type,
    'event_count', COALESCE(v_event_count, 0),
    'start', p_start_timestamp,
    'end', p_end_timestamp
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION add_decision_point(
  p_timeline_id uuid,
  p_decision_timestamp timestamptz,
  p_decision_type text,
  p_decision_actor text,
  p_decision_context jsonb,
  p_decision_input jsonb,
  p_decision_output jsonb,
  p_was_blocked boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_decision_id uuid;
  v_result jsonb;
BEGIN
  INSERT INTO forensic_decision_points (
    timeline_id,
    decision_timestamp,
    decision_type,
    decision_actor,
    decision_context,
    decision_input,
    decision_output,
    was_blocked
  ) VALUES (
    p_timeline_id,
    p_decision_timestamp,
    p_decision_type,
    p_decision_actor,
    p_decision_context,
    p_decision_input,
    p_decision_output,
    p_was_blocked
  )
  RETURNING id INTO v_decision_id;

  UPDATE forensic_timelines
  SET decision_point_count = decision_point_count + 1
  WHERE id = p_timeline_id;

  SELECT jsonb_build_object(
    'decision_id', v_decision_id,
    'timeline_id', p_timeline_id,
    'type', p_decision_type,
    'blocked', p_was_blocked
  ) INTO v_result;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION seal_forensic_timeline(
  p_timeline_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  UPDATE forensic_timelines
  SET 
    is_sealed = true,
    sealed_at = now()
  WHERE id = p_timeline_id
    AND is_sealed = false
  RETURNING jsonb_build_object(
    'timeline_id', id,
    'sealed', is_sealed,
    'sealed_at', sealed_at
  ) INTO v_result;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'Timeline not found or already sealed';
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION create_replay_session(
  p_timeline_id uuid,
  p_session_purpose text,
  p_requested_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session_id uuid;
  v_result jsonb;
BEGIN
  INSERT INTO forensic_replay_sessions (
    timeline_id,
    session_purpose,
    requested_by,
    playback_speed
  ) VALUES (
    p_timeline_id,
    p_session_purpose,
    p_requested_by,
    1.0
  )
  RETURNING id INTO v_session_id;

  SELECT jsonb_build_object(
    'session_id', v_session_id,
    'timeline_id', p_timeline_id,
    'purpose', p_session_purpose,
    'started_at', now()
  ) INTO v_result;

  RETURN v_result;
END;
$$;
