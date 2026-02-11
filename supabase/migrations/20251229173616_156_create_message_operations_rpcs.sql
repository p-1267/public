/*
  # Message Operations RPCs (Phase 26)

  ## Purpose
  Send, read, and manage messages within threads.

  ## Functions
  1. send_message - Send message in thread
  2. mark_message_read - Mark message as read
  3. mark_message_acknowledged - Mark message as acknowledged
  4. get_thread_messages - Get messages in thread
  5. redact_message - Redact message (creates tombstone)

  ## Security
  - All functions enforce authorization
  - Sender must be active participant with can_send=true
  - Complete audit trail

  ## Enforcement Rules
  1. Sender must be active participant with can_send=true
  2. SYSTEM_NOTICE is Brain-generated only
  3. Users CANNOT delete messages unilaterally
  4. Redaction creates visible tombstone
  5. Offline messages marked appropriately
*/

-- Function: send_message
-- Sends a message in a thread
CREATE OR REPLACE FUNCTION send_message(
  p_thread_id uuid,
  p_content text,
  p_message_type text DEFAULT 'TEXT',
  p_is_offline_queued boolean DEFAULT false,
  p_device_fingerprint text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_message_id uuid;
  v_thread record;
  v_participant record;
  v_recipient record;
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

  -- Validate message type
  IF p_message_type NOT IN ('TEXT', 'ATTACHMENT', 'ACKNOWLEDGMENT') THEN
    RAISE EXCEPTION 'Invalid message type: must be TEXT, ATTACHMENT, or ACKNOWLEDGMENT';
  END IF;

  -- SYSTEM_NOTICE can only be created by system
  IF p_message_type = 'SYSTEM_NOTICE' THEN
    RAISE EXCEPTION 'SYSTEM_NOTICE can only be created by the system';
  END IF;

  -- Get thread
  SELECT * INTO v_thread
  FROM message_threads
  WHERE id = p_thread_id;

  IF v_thread IS NULL THEN
    RAISE EXCEPTION 'Thread not found';
  END IF;

  -- Check participant status
  SELECT * INTO v_participant
  FROM thread_participants
  WHERE thread_id = p_thread_id
  AND user_id = v_user_id
  AND is_active = true;

  IF v_participant IS NULL THEN
    RAISE EXCEPTION 'User is not an active participant in this thread';
  END IF;

  IF NOT v_participant.can_send THEN
    RAISE EXCEPTION 'User does not have permission to send messages in this thread';
  END IF;

  -- Create message
  INSERT INTO messages (
    thread_id,
    sender_id,
    sender_role,
    message_type,
    content,
    sent_at,
    is_offline_queued,
    device_fingerprint
  ) VALUES (
    p_thread_id,
    v_user_id,
    v_user_role,
    p_message_type,
    p_content,
    now(),
    p_is_offline_queued,
    p_device_fingerprint
  )
  RETURNING id INTO v_message_id;

  -- Update thread last message time
  UPDATE message_threads
  SET last_message_at = now()
  WHERE id = p_thread_id;

  -- Create receipts for all active participants except sender
  FOR v_recipient IN
    SELECT user_id
    FROM thread_participants
    WHERE thread_id = p_thread_id
    AND user_id != v_user_id
    AND is_active = true
  LOOP
    INSERT INTO message_receipts (
      message_id,
      user_id,
      delivered_at
    ) VALUES (
      v_message_id,
      v_recipient.user_id,
      now()
    );
  END LOOP;

  -- Audit message send
  INSERT INTO message_audit (
    agency_id,
    actor_id,
    actor_role,
    action_type,
    thread_id,
    message_id,
    context_type,
    context_id,
    device_fingerprint,
    metadata
  ) VALUES (
    v_thread.agency_id,
    v_user_id,
    v_user_role,
    'SEND',
    p_thread_id,
    v_message_id,
    v_thread.context_type,
    v_thread.context_id,
    p_device_fingerprint,
    jsonb_build_object(
      'message_type', p_message_type,
      'is_offline_queued', p_is_offline_queued
    )
  );

  RETURN json_build_object(
    'success', true,
    'message_id', v_message_id,
    'thread_id', p_thread_id,
    'sent_at', now(),
    'message', 'Message sent successfully'
  );
END;
$$;

-- Function: mark_message_read
-- Marks a message as read
CREATE OR REPLACE FUNCTION mark_message_read(
  p_message_id uuid,
  p_device_fingerprint text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_message record;
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

  -- Get message
  SELECT m.*, mt.agency_id, mt.context_type, mt.context_id
  INTO v_message
  FROM messages m
  JOIN message_threads mt ON mt.id = m.thread_id
  WHERE m.id = p_message_id;

  IF v_message IS NULL THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  -- Update receipt
  UPDATE message_receipts
  SET read_at = now(),
      device_fingerprint = p_device_fingerprint
  WHERE message_id = p_message_id
  AND user_id = v_user_id
  AND read_at IS NULL;

  -- Audit message read
  INSERT INTO message_audit (
    agency_id,
    actor_id,
    actor_role,
    action_type,
    thread_id,
    message_id,
    context_type,
    context_id,
    device_fingerprint
  ) VALUES (
    v_message.agency_id,
    v_user_id,
    v_user_role,
    'READ',
    v_message.thread_id,
    p_message_id,
    v_message.context_type,
    v_message.context_id,
    p_device_fingerprint
  );

  RETURN json_build_object(
    'success', true,
    'message_id', p_message_id,
    'read_at', now(),
    'message', 'Message marked as read'
  );
END;
$$;

-- Function: mark_message_acknowledged
-- Marks a message as acknowledged
CREATE OR REPLACE FUNCTION mark_message_acknowledged(
  p_message_id uuid,
  p_device_fingerprint text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_message record;
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

  -- Get message
  SELECT m.*, mt.agency_id, mt.context_type, mt.context_id
  INTO v_message
  FROM messages m
  JOIN message_threads mt ON mt.id = m.thread_id
  WHERE m.id = p_message_id;

  IF v_message IS NULL THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  -- Update receipt
  UPDATE message_receipts
  SET acknowledged_at = now(),
      device_fingerprint = p_device_fingerprint
  WHERE message_id = p_message_id
  AND user_id = v_user_id
  AND acknowledged_at IS NULL;

  -- Audit acknowledgment
  INSERT INTO message_audit (
    agency_id,
    actor_id,
    actor_role,
    action_type,
    thread_id,
    message_id,
    context_type,
    context_id,
    device_fingerprint
  ) VALUES (
    v_message.agency_id,
    v_user_id,
    v_user_role,
    'ACK',
    v_message.thread_id,
    p_message_id,
    v_message.context_type,
    v_message.context_id,
    p_device_fingerprint
  );

  RETURN json_build_object(
    'success', true,
    'message_id', p_message_id,
    'acknowledged_at', now(),
    'message', 'Message acknowledged'
  );
END;
$$;

-- Function: get_thread_messages
-- Gets messages in a thread
CREATE OR REPLACE FUNCTION get_thread_messages(
  p_thread_id uuid,
  p_limit integer DEFAULT 50
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_messages json;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check participant status
  IF NOT EXISTS (
    SELECT 1
    FROM thread_participants
    WHERE thread_id = p_thread_id
    AND user_id = v_user_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'User is not an active participant in this thread';
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', m.id,
      'sender_id', m.sender_id,
      'sender_name', up.full_name,
      'sender_role', m.sender_role,
      'message_type', m.message_type,
      'content', CASE WHEN m.is_redacted THEN '[REDACTED]' ELSE m.content END,
      'sent_at', m.sent_at,
      'is_offline_queued', m.is_offline_queued,
      'is_redacted', m.is_redacted,
      'redacted_at', m.redacted_at,
      'my_receipt', (
        SELECT json_build_object(
          'delivered_at', mr.delivered_at,
          'read_at', mr.read_at,
          'acknowledged_at', mr.acknowledged_at
        )
        FROM message_receipts mr
        WHERE mr.message_id = m.id
        AND mr.user_id = v_user_id
      )
    ) ORDER BY m.sent_at DESC
  )
  INTO v_messages
  FROM messages m
  JOIN user_profiles up ON up.id = m.sender_id
  WHERE m.thread_id = p_thread_id
  LIMIT p_limit;

  RETURN json_build_object(
    'success', true,
    'thread_id', p_thread_id,
    'messages', COALESCE(v_messages, '[]'::json),
    'message_count', COALESCE(json_array_length(v_messages), 0)
  );
END;
$$;

-- Function: redact_message
-- Redacts a message (creates tombstone)
CREATE OR REPLACE FUNCTION redact_message(
  p_message_id uuid,
  p_redaction_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_user_role text;
  v_message record;
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

  -- Only admins can redact
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Only agency admins can redact messages';
  END IF;

  -- Get message
  SELECT m.*, mt.agency_id, mt.context_type, mt.context_id
  INTO v_message
  FROM messages m
  JOIN message_threads mt ON mt.id = m.thread_id
  WHERE m.id = p_message_id;

  IF v_message IS NULL THEN
    RAISE EXCEPTION 'Message not found';
  END IF;

  IF v_message.is_redacted THEN
    RAISE EXCEPTION 'Message is already redacted';
  END IF;

  -- Redact message (creates tombstone)
  UPDATE messages
  SET is_redacted = true,
      redacted_at = now(),
      redacted_by = v_user_id,
      redaction_reason = p_redaction_reason
  WHERE id = p_message_id;

  -- Audit redaction
  INSERT INTO message_audit (
    agency_id,
    actor_id,
    actor_role,
    action_type,
    thread_id,
    message_id,
    context_type,
    context_id,
    metadata
  ) VALUES (
    v_message.agency_id,
    v_user_id,
    v_user_role,
    'MESSAGE_REDACT',
    v_message.thread_id,
    p_message_id,
    v_message.context_type,
    v_message.context_id,
    jsonb_build_object(
      'reason', p_redaction_reason
    )
  );

  RETURN json_build_object(
    'success', true,
    'message_id', p_message_id,
    'redacted_at', now(),
    'message', 'Message redacted - tombstone created'
  );
END;
$$;
