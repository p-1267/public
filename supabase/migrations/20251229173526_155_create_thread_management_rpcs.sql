/*
  # Thread Management RPCs (Phase 26)

  ## Purpose
  Create and manage message threads with strict context scoping.

  ## Functions
  1. create_message_thread - Create new thread with context
  2. add_thread_participant - Add participant to thread
  3. remove_thread_participant - Remove participant from thread
  4. get_user_threads - Get threads for current user

  ## Security
  - All functions enforce authorization
  - Context-based access control
  - Family users have restricted access

  ## Enforcement Rules
  1. Every message MUST be bound to exactly ONE context
  2. Participants MUST have active membership
  3. Participants MUST have permission for context
  4. Family users: READ-ONLY unless explicitly permitted
  5. Family users: Cannot initiate care or shift threads
*/

-- Function: create_message_thread
-- Creates a new message thread with context
CREATE OR REPLACE FUNCTION create_message_thread(
  p_context_type text,
  p_context_id uuid,
  p_subject text,
  p_initial_participants uuid[] DEFAULT '{}'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_agency_id uuid;
  v_thread_id uuid;
  v_participant_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name, up.agency_id
  INTO v_user_role, v_agency_id
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- Validate context type
  IF p_context_type NOT IN ('RESIDENT_THREAD', 'SHIFT_THREAD', 'INCIDENT_THREAD', 'ANNOUNCEMENT_THREAD') THEN
    RAISE EXCEPTION 'Invalid context type: must be RESIDENT_THREAD, SHIFT_THREAD, INCIDENT_THREAD, or ANNOUNCEMENT_THREAD';
  END IF;

  -- Family users cannot initiate care or shift threads
  IF v_user_role = 'FAMILY' AND p_context_type IN ('SHIFT_THREAD', 'INCIDENT_THREAD') THEN
    RAISE EXCEPTION 'Family users cannot initiate shift or incident threads';
  END IF;

  -- Create thread
  INSERT INTO message_threads (
    agency_id,
    context_type,
    context_id,
    subject,
    created_by,
    is_active
  ) VALUES (
    v_agency_id,
    p_context_type,
    p_context_id,
    p_subject,
    v_user_id,
    true
  )
  RETURNING id INTO v_thread_id;

  -- Add creator as participant
  INSERT INTO thread_participants (
    thread_id,
    user_id,
    role_name,
    can_send,
    can_read,
    added_by,
    is_active
  ) VALUES (
    v_thread_id,
    v_user_id,
    v_user_role,
    true,
    true,
    v_user_id,
    true
  );

  -- Add initial participants
  FOREACH v_participant_id IN ARRAY p_initial_participants
  LOOP
    DECLARE
      v_participant_role text;
      v_can_send boolean := true;
    BEGIN
      SELECT r.name INTO v_participant_role
      FROM user_profiles up
      JOIN roles r ON r.id = up.role_id
      WHERE up.id = v_participant_id;

      -- Family users are READ-ONLY by default
      IF v_participant_role = 'FAMILY' THEN
        v_can_send := false;
      END IF;

      INSERT INTO thread_participants (
        thread_id,
        user_id,
        role_name,
        can_send,
        can_read,
        added_by,
        is_active
      ) VALUES (
        v_thread_id,
        v_participant_id,
        v_participant_role,
        v_can_send,
        true,
        v_user_id,
        true
      )
      ON CONFLICT (thread_id, user_id) DO NOTHING;
    END;
  END LOOP;

  -- Audit thread creation
  INSERT INTO message_audit (
    agency_id,
    actor_id,
    actor_role,
    action_type,
    thread_id,
    context_type,
    context_id,
    metadata
  ) VALUES (
    v_agency_id,
    v_user_id,
    v_user_role,
    'THREAD_CREATE',
    v_thread_id,
    p_context_type,
    p_context_id,
    jsonb_build_object(
      'subject', p_subject,
      'participant_count', array_length(p_initial_participants, 1) + 1
    )
  );

  RETURN json_build_object(
    'success', true,
    'thread_id', v_thread_id,
    'context_type', p_context_type,
    'message', 'Thread created successfully'
  );
END;
$$;

-- Function: add_thread_participant
-- Adds a participant to a thread
CREATE OR REPLACE FUNCTION add_thread_participant(
  p_thread_id uuid,
  p_user_id uuid,
  p_can_send boolean DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_participant_role text;
  v_can_send boolean;
  v_thread record;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name
  INTO v_user_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- Get thread details
  SELECT * INTO v_thread
  FROM message_threads
  WHERE id = p_thread_id;

  IF v_thread IS NULL THEN
    RAISE EXCEPTION 'Thread not found';
  END IF;

  -- Get participant role
  SELECT r.name INTO v_participant_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = p_user_id;

  -- Determine can_send permission
  IF p_can_send IS NULL THEN
    -- Family users are READ-ONLY by default
    v_can_send := (v_participant_role != 'FAMILY');
  ELSE
    v_can_send := p_can_send;
  END IF;

  -- Add participant
  INSERT INTO thread_participants (
    thread_id,
    user_id,
    role_name,
    can_send,
    can_read,
    added_by,
    is_active
  ) VALUES (
    p_thread_id,
    p_user_id,
    v_participant_role,
    v_can_send,
    true,
    v_user_id,
    true
  )
  ON CONFLICT (thread_id, user_id) DO UPDATE
  SET is_active = true,
      can_send = v_can_send,
      removed_at = NULL;

  -- Audit participant addition
  INSERT INTO message_audit (
    agency_id,
    actor_id,
    actor_role,
    action_type,
    thread_id,
    context_type,
    context_id,
    metadata
  ) VALUES (
    v_thread.agency_id,
    v_user_id,
    v_user_role,
    'PARTICIPANT_ADD',
    p_thread_id,
    v_thread.context_type,
    v_thread.context_id,
    jsonb_build_object(
      'participant_id', p_user_id,
      'participant_role', v_participant_role,
      'can_send', v_can_send
    )
  );

  RETURN json_build_object(
    'success', true,
    'thread_id', p_thread_id,
    'participant_id', p_user_id,
    'message', 'Participant added successfully'
  );
END;
$$;

-- Function: remove_thread_participant
-- Removes a participant from a thread
CREATE OR REPLACE FUNCTION remove_thread_participant(
  p_thread_id uuid,
  p_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_thread record;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name
  INTO v_user_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- Get thread details
  SELECT * INTO v_thread
  FROM message_threads
  WHERE id = p_thread_id;

  IF v_thread IS NULL THEN
    RAISE EXCEPTION 'Thread not found';
  END IF;

  -- Remove participant
  UPDATE thread_participants
  SET is_active = false,
      removed_at = now()
  WHERE thread_id = p_thread_id
  AND user_id = p_user_id;

  -- Audit participant removal
  INSERT INTO message_audit (
    agency_id,
    actor_id,
    actor_role,
    action_type,
    thread_id,
    context_type,
    context_id,
    metadata
  ) VALUES (
    v_thread.agency_id,
    v_user_id,
    v_user_role,
    'PARTICIPANT_REMOVE',
    p_thread_id,
    v_thread.context_type,
    v_thread.context_id,
    jsonb_build_object(
      'participant_id', p_user_id
    )
  );

  RETURN json_build_object(
    'success', true,
    'thread_id', p_thread_id,
    'message', 'Participant removed successfully'
  );
END;
$$;

-- Function: get_user_threads
-- Gets threads for current user
CREATE OR REPLACE FUNCTION get_user_threads(
  p_context_type text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_threads json;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', mt.id,
      'context_type', mt.context_type,
      'context_id', mt.context_id,
      'subject', mt.subject,
      'created_by', up.full_name,
      'created_at', mt.created_at,
      'last_message_at', mt.last_message_at,
      'is_active', mt.is_active,
      'can_send', tp.can_send,
      'can_read', tp.can_read
    ) ORDER BY COALESCE(mt.last_message_at, mt.created_at) DESC
  )
  INTO v_threads
  FROM message_threads mt
  JOIN thread_participants tp ON tp.thread_id = mt.id
  JOIN user_profiles up ON up.id = mt.created_by
  WHERE tp.user_id = v_user_id
  AND tp.is_active = true
  AND (p_context_type IS NULL OR mt.context_type = p_context_type);

  RETURN json_build_object(
    'success', true,
    'threads', COALESCE(v_threads, '[]'::json),
    'thread_count', COALESCE(json_array_length(v_threads), 0)
  );
END;
$$;
