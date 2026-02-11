/*
  # Provider Messaging RPCs

  RPC functions for sending and managing messages to providers
*/

-- Send message to provider
CREATE OR REPLACE FUNCTION send_provider_message(
  p_resident_id uuid,
  p_provider_name text,
  p_provider_type text,
  p_subject text,
  p_message_body text,
  p_message_type text,
  p_provider_id uuid DEFAULT NULL,
  p_is_urgent boolean DEFAULT false,
  p_on_behalf_of_resident boolean DEFAULT false,
  p_original_language text DEFAULT NULL,
  p_related_appointment_id uuid DEFAULT NULL,
  p_related_medication_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_id uuid;
BEGIN
  INSERT INTO provider_messages (
    resident_id, provider_id, provider_name, provider_type,
    direction, subject, message_body, message_type, is_urgent,
    sent_by_user_id, sent_on_behalf_of_resident, original_language,
    related_appointment_id, related_medication_id, status
  ) VALUES (
    p_resident_id, p_provider_id, p_provider_name, p_provider_type,
    'OUTBOUND', p_subject, p_message_body, p_message_type, p_is_urgent,
    auth.uid(), p_on_behalf_of_resident, p_original_language,
    p_related_appointment_id, p_related_medication_id, 'SENT'
  ) RETURNING id INTO v_message_id;

  INSERT INTO audit_log (actor_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), 'SEND_PROVIDER_MESSAGE', 'provider_messages', v_message_id,
    jsonb_build_object(
      'resident_id', p_resident_id,
      'provider_name', p_provider_name,
      'message_type', p_message_type,
      'on_behalf_of_resident', p_on_behalf_of_resident
    ));

  RETURN v_message_id;
END;
$$;

-- Get provider messages for resident
CREATE OR REPLACE FUNCTION get_provider_messages(
  p_resident_id uuid,
  p_provider_id uuid DEFAULT NULL,
  p_message_type text DEFAULT NULL,
  p_limit integer DEFAULT 50
)
RETURNS TABLE(
  id uuid, provider_name text, provider_type text, direction text,
  subject text, message_body text, message_type text, is_urgent boolean,
  sent_by_name text, sent_on_behalf_of_resident boolean,
  status text, sent_at timestamptz, read_at timestamptz,
  has_attachments boolean, reply_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pm.id, pm.provider_name, pm.provider_type, pm.direction,
    pm.subject, pm.message_body, pm.message_type, pm.is_urgent,
    up.full_name as sent_by_name, pm.sent_on_behalf_of_resident,
    pm.status, pm.sent_at, pm.read_at,
    EXISTS (SELECT 1 FROM message_attachments_external ma WHERE ma.message_id = pm.id) as has_attachments,
    (SELECT COUNT(*)::integer FROM provider_messages replies WHERE replies.parent_message_id = pm.id) as reply_count
  FROM provider_messages pm
  LEFT JOIN user_profiles up ON up.id = pm.sent_by_user_id
  WHERE pm.resident_id = p_resident_id
    AND (p_provider_id IS NULL OR pm.provider_id = p_provider_id)
    AND (p_message_type IS NULL OR pm.message_type = p_message_type)
  ORDER BY pm.sent_at DESC
  LIMIT p_limit;
END;
$$;

-- Get message templates
CREATE OR REPLACE FUNCTION get_message_templates(
  p_agency_id uuid,
  p_message_type text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, template_name text, message_type text,
  subject_template text, body_template text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    pmt.id, pmt.template_name, pmt.message_type,
    pmt.subject_template, pmt.body_template
  FROM provider_message_templates pmt
  WHERE pmt.agency_id = p_agency_id
    AND pmt.is_active = true
    AND (p_message_type IS NULL OR pmt.message_type = p_message_type)
  ORDER BY pmt.sort_order, pmt.template_name;
END;
$$;

-- Mark message as read
CREATE OR REPLACE FUNCTION mark_provider_message_read(p_message_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE provider_messages
  SET read_at = now(), status = 'READ'
  WHERE id = p_message_id AND read_at IS NULL;

  RETURN FOUND;
END;
$$;

-- Reply to provider message
CREATE OR REPLACE FUNCTION reply_to_provider_message(
  p_parent_message_id uuid,
  p_message_body text,
  p_on_behalf_of_resident boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message_id uuid;
  v_parent_message record;
BEGIN
  SELECT * INTO v_parent_message FROM provider_messages WHERE id = p_parent_message_id;

  INSERT INTO provider_messages (
    resident_id, provider_id, provider_name, provider_type,
    direction, subject, message_body, message_type, is_urgent,
    sent_by_user_id, sent_on_behalf_of_resident,
    parent_message_id, status
  ) VALUES (
    v_parent_message.resident_id, v_parent_message.provider_id,
    v_parent_message.provider_name, v_parent_message.provider_type,
    'OUTBOUND', 'Re: ' || v_parent_message.subject, p_message_body,
    v_parent_message.message_type, false, auth.uid(), p_on_behalf_of_resident,
    p_parent_message_id, 'SENT'
  ) RETURNING id INTO v_message_id;

  UPDATE provider_messages
  SET replied_at = now(), status = 'REPLIED'
  WHERE id = p_parent_message_id;

  RETURN v_message_id;
END;
$$;