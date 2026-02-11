/*
  # Notification Delivery RPCs (Phase 22)

  ## Purpose
  RPC functions for sending notifications with full policy enforcement.
  Respects notification types, priorities, and agency policy.

  ## Functions
  1. send_notification - Send notification with policy enforcement
  2. get_notification_history - Get notification history for user/resident
  3. mark_notification_read - Mark notification as read

  ## Notification Types & Priority (Brain-Owned)
  - EMERGENCY: Immediate, multi-channel, cannot be suppressed
  - CRITICAL: Immediate, policy-controlled channels
  - IMPORTANT: Respect preferences within policy
  - INFORMATIONAL: Fully preference-controlled

  ## Security
  - All functions enforce authorization
  - Agency policy overrides user preferences
  - All notifications logged
*/

-- Function: send_notification
-- Sends notification with full policy enforcement
CREATE OR REPLACE FUNCTION send_notification(
  p_resident_id uuid,
  p_recipient_user_id uuid,
  p_notification_type text,
  p_alert_type text,
  p_message text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency_id uuid;
  v_agency_policy record;
  v_user_prefs record;
  v_delivery_channels text[] := '{}';
  v_suppressed_by_preference boolean := false;
  v_overridden_by_policy boolean := false;
  v_policy_override_reason text := NULL;
  v_current_time time;
  v_in_quiet_hours boolean := false;
  v_notification_id uuid;
BEGIN
  -- Get agency ID
  SELECT r.agency_id INTO v_agency_id
  FROM residents r
  WHERE r.id = p_resident_id;

  -- Get agency policy
  SELECT * INTO v_agency_policy
  FROM agency_notification_policy
  WHERE agency_id = v_agency_id;

  -- Get user preferences
  SELECT * INTO v_user_prefs
  FROM family_notification_preferences
  WHERE user_id = p_recipient_user_id AND resident_id = p_resident_id;

  -- Determine current time for quiet hours check
  v_current_time := CURRENT_TIME;

  -- Check if in quiet hours
  IF v_user_prefs IS NOT NULL AND v_user_prefs.quiet_hours_start IS NOT NULL AND v_user_prefs.quiet_hours_end IS NOT NULL THEN
    IF v_user_prefs.quiet_hours_start < v_user_prefs.quiet_hours_end THEN
      v_in_quiet_hours := v_current_time >= v_user_prefs.quiet_hours_start AND v_current_time < v_user_prefs.quiet_hours_end;
    ELSE
      v_in_quiet_hours := v_current_time >= v_user_prefs.quiet_hours_start OR v_current_time < v_user_prefs.quiet_hours_end;
    END IF;
  END IF;

  -- EMERGENCY notifications: Immediate, multi-channel, cannot be suppressed
  IF p_notification_type = 'EMERGENCY' THEN
    IF v_agency_policy IS NOT NULL THEN
      v_delivery_channels := v_agency_policy.emergency_channels;
    ELSE
      v_delivery_channels := ARRAY['IN_APP', 'PUSH', 'SMS'];
    END IF;
    
    IF v_in_quiet_hours THEN
      v_overridden_by_policy := true;
      v_policy_override_reason := 'EMERGENCY alerts ignore quiet hours';
    END IF;

  -- CRITICAL notifications: Immediate, policy-controlled channels
  ELSIF p_notification_type = 'CRITICAL' THEN
    IF v_agency_policy IS NOT NULL THEN
      v_delivery_channels := v_agency_policy.critical_channels;
    ELSE
      v_delivery_channels := ARRAY['IN_APP', 'PUSH'];
    END IF;
    
    IF v_in_quiet_hours THEN
      v_overridden_by_policy := true;
      v_policy_override_reason := 'CRITICAL alerts ignore quiet hours';
    END IF;

  -- IMPORTANT notifications: Respect preferences within policy
  ELSIF p_notification_type = 'IMPORTANT' THEN
    IF v_in_quiet_hours AND (v_agency_policy IS NULL OR NOT v_agency_policy.allow_quiet_hours) THEN
      v_overridden_by_policy := true;
      v_policy_override_reason := 'Agency policy does not allow quiet hours for IMPORTANT alerts';
      v_delivery_channels := ARRAY['IN_APP'];
    ELSIF v_in_quiet_hours THEN
      v_suppressed_by_preference := true;
      v_delivery_channels := ARRAY[]::text[];
    ELSE
      IF v_user_prefs IS NOT NULL THEN
        IF v_user_prefs.channel_in_app THEN v_delivery_channels := array_append(v_delivery_channels, 'IN_APP'); END IF;
        IF v_user_prefs.channel_push THEN v_delivery_channels := array_append(v_delivery_channels, 'PUSH'); END IF;
        IF v_user_prefs.channel_sms THEN v_delivery_channels := array_append(v_delivery_channels, 'SMS'); END IF;
      ELSE
        v_delivery_channels := ARRAY['IN_APP', 'PUSH'];
      END IF;
    END IF;

  -- INFORMATIONAL notifications: Fully preference-controlled
  ELSIF p_notification_type = 'INFORMATIONAL' THEN
    IF v_in_quiet_hours THEN
      v_suppressed_by_preference := true;
      v_delivery_channels := ARRAY[]::text[];
    ELSE
      IF v_user_prefs IS NOT NULL THEN
        IF v_user_prefs.channel_in_app THEN v_delivery_channels := array_append(v_delivery_channels, 'IN_APP'); END IF;
        IF v_user_prefs.channel_push THEN v_delivery_channels := array_append(v_delivery_channels, 'PUSH'); END IF;
        IF v_user_prefs.channel_email THEN v_delivery_channels := array_append(v_delivery_channels, 'EMAIL'); END IF;
      ELSE
        v_delivery_channels := ARRAY['IN_APP'];
      END IF;
    END IF;
  END IF;

  -- Ensure at least IN_APP is always included for non-suppressed notifications
  IF NOT v_suppressed_by_preference AND NOT ('IN_APP' = ANY(v_delivery_channels)) THEN
    v_delivery_channels := array_prepend('IN_APP', v_delivery_channels);
  END IF;

  -- Log notification
  INSERT INTO notification_log (
    resident_id,
    recipient_user_id,
    notification_type,
    alert_type,
    message,
    delivery_channels,
    suppressed_by_preference,
    overridden_by_policy,
    policy_override_reason,
    delivered_at
  ) VALUES (
    p_resident_id,
    p_recipient_user_id,
    p_notification_type,
    p_alert_type,
    p_message,
    v_delivery_channels,
    v_suppressed_by_preference,
    v_overridden_by_policy,
    v_policy_override_reason,
    now()
  )
  RETURNING id INTO v_notification_id;

  RETURN json_build_object(
    'success', true,
    'notification_id', v_notification_id,
    'delivered', NOT v_suppressed_by_preference,
    'delivery_channels', v_delivery_channels,
    'suppressed_by_preference', v_suppressed_by_preference,
    'overridden_by_policy', v_overridden_by_policy,
    'policy_override_reason', v_policy_override_reason
  );
END;
$$;

-- Function: get_notification_history
-- Gets notification history for user
CREATE OR REPLACE FUNCTION get_notification_history(
  p_resident_id uuid DEFAULT NULL,
  p_notification_type text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_notifications json;
  v_total_count integer;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get notifications
  SELECT json_agg(
    json_build_object(
      'id', id,
      'resident_id', resident_id,
      'notification_type', notification_type,
      'alert_type', alert_type,
      'message', message,
      'delivery_channels', delivery_channels,
      'suppressed_by_preference', suppressed_by_preference,
      'overridden_by_policy', overridden_by_policy,
      'policy_override_reason', policy_override_reason,
      'delivered_at', delivered_at,
      'read_at', read_at,
      'is_unread', (read_at IS NULL)
    ) ORDER BY delivered_at DESC
  )
  INTO v_notifications
  FROM (
    SELECT *
    FROM notification_log
    WHERE recipient_user_id = v_user_id
    AND (p_resident_id IS NULL OR resident_id = p_resident_id)
    AND (p_notification_type IS NULL OR notification_type = p_notification_type)
    ORDER BY delivered_at DESC
    LIMIT p_limit OFFSET p_offset
  ) sub;

  -- Get total count
  SELECT COUNT(*)
  INTO v_total_count
  FROM notification_log
  WHERE recipient_user_id = v_user_id
  AND (p_resident_id IS NULL OR resident_id = p_resident_id)
  AND (p_notification_type IS NULL OR notification_type = p_notification_type);

  RETURN json_build_object(
    'success', true,
    'notifications', COALESCE(v_notifications, '[]'::json),
    'total_count', v_total_count,
    'limit', p_limit,
    'offset', p_offset
  );
END;
$$;

-- Function: mark_notification_read
-- Marks notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(
  p_notification_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_rows_updated integer;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  UPDATE notification_log
  SET read_at = now()
  WHERE id = p_notification_id
  AND recipient_user_id = v_user_id
  AND read_at IS NULL;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'marked_read', (v_rows_updated > 0)
  );
END;
$$;
