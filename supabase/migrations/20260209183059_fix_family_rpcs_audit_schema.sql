/*
  # Fix Family RPCs to Use Correct Audit Schema

  1. Issue
    - RPCs use old audit_log schema (action, table_name, record_id)
    - Actual schema uses (action_type, target_type, target_id)

  2. Fix
    - Update all audit_log INSERT statements
    - Use correct column names
*/

CREATE OR REPLACE FUNCTION submit_family_observation(
  p_resident_id uuid,
  p_family_user_id uuid,
  p_observation_text text,
  p_concern_level text,
  p_observation_category text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_observation_id uuid;
  v_agency_id uuid;
  v_severity text;
  v_family_name text;
BEGIN
  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_observation_id
    FROM family_observations
    WHERE idempotency_key = p_idempotency_key;
    
    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'observation_id', v_observation_id,
        'message', 'Duplicate request (idempotency)'
      );
    END IF;
  END IF;

  -- Get agency_id and family name
  SELECT r.agency_id, up.display_name
  INTO v_agency_id, v_family_name
  FROM residents r
  LEFT JOIN user_profiles up ON up.id = p_family_user_id
  WHERE r.id = p_resident_id;

  IF v_agency_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resident not found');
  END IF;

  -- Insert observation
  INSERT INTO family_observations (
    resident_id,
    family_user_id,
    observation_text,
    concern_level,
    observation_category,
    idempotency_key,
    submitted_at
  ) VALUES (
    p_resident_id,
    p_family_user_id,
    p_observation_text,
    p_concern_level,
    p_observation_category,
    p_idempotency_key,
    now()
  ) RETURNING id INTO v_observation_id;

  -- Determine severity for supervisor queue
  v_severity := CASE p_concern_level
    WHEN 'URGENT' THEN 'CRITICAL'
    WHEN 'MODERATE' THEN 'HIGH'
    WHEN 'MINOR' THEN 'MODERATE'
    ELSE 'LOW'
  END;

  -- Add to supervisor exception queue
  INSERT INTO supervisor_exception_queue (
    resident_id,
    agency_id,
    exception_type,
    severity,
    source_table,
    source_id,
    summary,
    context_data
  ) VALUES (
    p_resident_id,
    v_agency_id,
    'FAMILY_OBSERVATION',
    v_severity,
    'family_observations',
    v_observation_id,
    format('Family Observation (%s): %s', p_concern_level, left(p_observation_text, 100)),
    jsonb_build_object(
      'concern_level', p_concern_level,
      'category', p_observation_category,
      'observation_text', p_observation_text
    )
  );

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
    p_resident_id,
    now(),
    'FAMILY',
    p_family_user_id,
    COALESCE(v_family_name, 'Family Member'),
    'FAMILY_INPUT',
    'OBSERVATION',
    format('%s observation: %s', p_concern_level, left(p_observation_text, 80)),
    jsonb_build_object(
      'concern_level', p_concern_level,
      'category', p_observation_category,
      'full_text', p_observation_text
    ),
    'family_observations',
    v_observation_id,
    p_concern_level IN ('MODERATE', 'URGENT')
  );

  -- Audit log (using correct schema)
  INSERT INTO audit_log (
    action_type,
    actor_id,
    target_type,
    target_id,
    new_state,
    metadata
  ) VALUES (
    'family_observation_submitted',
    p_family_user_id,
    'family_observations',
    v_observation_id,
    jsonb_build_object(
      'concern_level', p_concern_level,
      'resident_id', p_resident_id
    ),
    jsonb_build_object('idempotency_key', p_idempotency_key)
  );

  RETURN jsonb_build_object(
    'success', true,
    'observation_id', v_observation_id,
    'message', 'Observation submitted successfully'
  );
END;
$$;

CREATE OR REPLACE FUNCTION submit_family_action_request(
  p_resident_id uuid,
  p_family_user_id uuid,
  p_request_type text,
  p_request_text text,
  p_urgency text,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id uuid;
  v_agency_id uuid;
  v_severity text;
  v_family_name text;
BEGIN
  -- Check idempotency
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_request_id
    FROM family_action_requests
    WHERE idempotency_key = p_idempotency_key;
    
    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'request_id', v_request_id,
        'message', 'Duplicate request (idempotency)'
      );
    END IF;
  END IF;

  -- Get agency_id and family name
  SELECT r.agency_id, up.display_name
  INTO v_agency_id, v_family_name
  FROM residents r
  LEFT JOIN user_profiles up ON up.id = p_family_user_id
  WHERE r.id = p_resident_id;

  IF v_agency_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Resident not found');
  END IF;

  -- Insert request
  INSERT INTO family_action_requests (
    resident_id,
    family_user_id,
    request_type,
    request_text,
    urgency,
    idempotency_key,
    submitted_at
  ) VALUES (
    p_resident_id,
    p_family_user_id,
    p_request_type,
    p_request_text,
    p_urgency,
    p_idempotency_key,
    now()
  ) RETURNING id INTO v_request_id;

  -- Determine severity
  v_severity := CASE p_urgency
    WHEN 'URGENT' THEN 'CRITICAL'
    WHEN 'SOON' THEN 'HIGH'
    ELSE 'MODERATE'
  END;

  -- Add to supervisor exception queue
  INSERT INTO supervisor_exception_queue (
    resident_id,
    agency_id,
    exception_type,
    severity,
    source_table,
    source_id,
    summary,
    context_data
  ) VALUES (
    p_resident_id,
    v_agency_id,
    'FAMILY_REQUEST',
    v_severity,
    'family_action_requests',
    v_request_id,
    format('Family Request (%s): %s', p_request_type, left(p_request_text, 100)),
    jsonb_build_object(
      'request_type', p_request_type,
      'urgency', p_urgency,
      'request_text', p_request_text
    )
  );

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
    p_resident_id,
    now(),
    'FAMILY',
    p_family_user_id,
    COALESCE(v_family_name, 'Family Member'),
    'FAMILY_INPUT',
    'ACTION_REQUEST',
    format('%s request (%s): %s', p_urgency, p_request_type, left(p_request_text, 60)),
    jsonb_build_object(
      'request_type', p_request_type,
      'urgency', p_urgency,
      'full_text', p_request_text
    ),
    'family_action_requests',
    v_request_id,
    true
  );

  -- Audit log (using correct schema)
  INSERT INTO audit_log (
    action_type,
    actor_id,
    target_type,
    target_id,
    new_state,
    metadata
  ) VALUES (
    'family_action_request_submitted',
    p_family_user_id,
    'family_action_requests',
    v_request_id,
    jsonb_build_object(
      'request_type', p_request_type,
      'urgency', p_urgency,
      'resident_id', p_resident_id
    ),
    jsonb_build_object('idempotency_key', p_idempotency_key)
  );

  RETURN jsonb_build_object(
    'success', true,
    'request_id', v_request_id,
    'message', 'Request submitted successfully'
  );
END;
$$;

CREATE OR REPLACE FUNCTION supervisor_process_family_observation(
  p_observation_id uuid,
  p_supervisor_id uuid,
  p_action text,
  p_notes text DEFAULT NULL,
  p_create_task boolean DEFAULT false,
  p_task_name text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resident_id uuid;
  v_task_id uuid;
BEGIN
  -- Update observation
  UPDATE family_observations
  SET
    processed_by_supervisor = p_supervisor_id,
    supervisor_action = p_action,
    supervisor_notes = p_notes,
    processed_at = now()
  WHERE id = p_observation_id
  RETURNING resident_id INTO v_resident_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Observation not found');
  END IF;

  -- Resolve supervisor queue item
  UPDATE supervisor_exception_queue
  SET
    resolved_by = p_supervisor_id,
    resolved_at = now(),
    resolution_action = p_action,
    resolution_notes = p_notes
  WHERE source_table = 'family_observations'
    AND source_id = p_observation_id;

  -- Optionally create task
  IF p_create_task AND p_task_name IS NOT NULL THEN
    INSERT INTO tasks (
      resident_id,
      task_name,
      category, 
      priority,
      state,
      created_by,
      notes
    ) VALUES (
      v_resident_id,
      p_task_name,
      'HEALTH',
      'medium',
      'pending',
      p_supervisor_id,
      format('Created from family observation. Supervisor notes: %s', p_notes)
    ) RETURNING id INTO v_task_id;
  END IF;

  -- Audit (using correct schema)
  INSERT INTO audit_log (
    action_type,
    actor_id,
    target_type,
    target_id,
    new_state,
    metadata
  ) VALUES (
    'family_observation_processed',
    p_supervisor_id,
    'family_observations',
    p_observation_id,
    jsonb_build_object(
      'action', p_action,
      'task_created', p_create_task,
      'task_id', v_task_id
    ),
    jsonb_build_object('notes', p_notes)
  );

  RETURN jsonb_build_object(
    'success', true,
    'observation_id', p_observation_id,
    'task_id', v_task_id,
    'message', 'Observation processed'
  );
END;
$$;

CREATE OR REPLACE FUNCTION supervisor_route_family_request(
  p_request_id uuid,
  p_supervisor_id uuid,
  p_caregiver_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_resident_id uuid;
BEGIN
  -- Update request
  UPDATE family_action_requests
  SET
    routed_to_caregiver = p_caregiver_id,
    routed_by_supervisor = p_supervisor_id,
    routed_at = now()
  WHERE id = p_request_id
  RETURNING resident_id INTO v_resident_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Request not found');
  END IF;

  -- Resolve supervisor queue item
  UPDATE supervisor_exception_queue
  SET
    assigned_to = p_caregiver_id,
    assigned_at = now(),
    resolved_by = p_supervisor_id,
    resolved_at = now(),
    resolution_action = 'ROUTED_TO_CAREGIVER'
  WHERE source_table = 'family_action_requests'
    AND source_id = p_request_id;

  -- Add timeline event
  INSERT INTO unified_timeline_events (
    resident_id,
    event_timestamp,
    actor_type,
    actor_id,
    event_category,
    event_type,
    event_summary,
    event_details,
    source_table,
    source_id
  ) VALUES (
    v_resident_id,
    now(),
    'SUPERVISOR',
    p_supervisor_id,
    'WORKFLOW',
    'REQUEST_ROUTED',
    'Family request routed to caregiver',
    jsonb_build_object(
      'request_id', p_request_id,
      'routed_to', p_caregiver_id
    ),
    'family_action_requests',
    p_request_id
  );

  -- Audit (using correct schema)
  INSERT INTO audit_log (
    action_type,
    actor_id,
    target_type,
    target_id,
    new_state,
    metadata
  ) VALUES (
    'family_request_routed',
    p_supervisor_id,
    'family_action_requests',
    p_request_id,
    jsonb_build_object('routed_to', p_caregiver_id),
    jsonb_build_object('resident_id', v_resident_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'message', 'Request routed to caregiver'
  );
END;
$$;
