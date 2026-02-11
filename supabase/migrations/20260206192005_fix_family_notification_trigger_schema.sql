/*
  # Fix Family Notification Trigger Schema

  ## Issue
  notify_family_members() references wrong column names:
  - fnp.family_user_id → should be fnp.user_id
  - Wrong preference column names

  ## Fix
  Update function to match actual family_notification_preferences schema
*/

CREATE OR REPLACE FUNCTION notify_family_members(
  p_resident_id uuid,
  p_notification_type text,
  p_alert_type text,
  p_message text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_family_member RECORD;
  v_channels text[];
BEGIN
  -- Get all family members linked to this resident with their preferences
  FOR v_family_member IN
    SELECT
      frl.family_user_id as user_id,
      fnp.channel_in_app,
      fnp.channel_push,
      fnp.channel_sms,
      fnp.channel_email
    FROM family_resident_links frl
    LEFT JOIN family_notification_preferences fnp
      ON fnp.user_id = frl.family_user_id
      AND fnp.resident_id = p_resident_id
    WHERE frl.resident_id = p_resident_id
      AND frl.status = 'active'
  LOOP
    -- Build delivery channels array based on preferences
    v_channels := ARRAY[]::text[];

    IF COALESCE(v_family_member.channel_in_app, true) THEN
      v_channels := array_append(v_channels, 'IN_APP');
    END IF;

    IF COALESCE(v_family_member.channel_email, true) THEN
      v_channels := array_append(v_channels, 'EMAIL');
    END IF;

    IF COALESCE(v_family_member.channel_sms, false) THEN
      v_channels := array_append(v_channels, 'SMS');
    END IF;

    IF COALESCE(v_family_member.channel_push, true) THEN
      v_channels := array_append(v_channels, 'PUSH');
    END IF;

    -- Emergency overrides preferences
    IF p_notification_type = 'EMERGENCY' OR p_notification_type = 'CRITICAL' THEN
      v_channels := ARRAY['IN_APP', 'EMAIL', 'SMS', 'PUSH'];
    END IF;

    -- Insert notification
    INSERT INTO notification_log (
      resident_id,
      recipient_user_id,
      notification_type,
      alert_type,
      message,
      delivery_channels,
      suppressed_by_preference,
      overridden_by_policy,
      is_simulation
    ) VALUES (
      p_resident_id,
      v_family_member.user_id,
      p_notification_type,
      p_alert_type,
      p_message,
      v_channels,
      false,
      (p_notification_type IN ('EMERGENCY', 'CRITICAL')),
      true  -- For now, all notifications created by triggers are simulation
    );
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION notify_family_members(uuid, text, text, text) TO authenticated, anon;

COMMENT ON FUNCTION notify_family_members IS
'Production function: Notifies family members based on preferences. Called by triggers when events occur.';
