/*
  # Create Family Notification Triggers

  1. Purpose
    - Automatically notify family members when significant events occur
    - Wire caregiver actions to family notifications
    - Enable cross-scenario communication

  2. Notification Triggers
    - Medication administered/missed
    - Health anomaly detected
    - Incident reported
    - Emergency task completed

  3. Implementation
    - Helper function to send notifications to family
    - Triggers on key tables
*/

-- ============================================================
-- Helper Function to notify family members
-- ============================================================

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
  -- Get all family members linked to this resident
  FOR v_family_member IN
    SELECT
      frl.family_user_id,
      fnp.emergency_alerts,
      fnp.medication_alerts,
      fnp.health_status_updates,
      fnp.incident_alerts,
      fnp.delivery_channels
    FROM family_resident_links frl
    LEFT JOIN family_notification_preferences fnp ON fnp.family_user_id = frl.family_user_id AND fnp.resident_id = p_resident_id
    WHERE frl.resident_id = p_resident_id
      AND frl.status = 'active'
  LOOP
    -- Determine if notification should be sent based on preferences
    v_channels := COALESCE(v_family_member.delivery_channels, ARRAY['APP']);

    -- Emergency always goes through
    IF p_notification_type = 'EMERGENCY' THEN
      v_channels := ARRAY['APP', 'EMAIL', 'SMS'];
    -- Check alert-specific preferences
    ELSIF p_alert_type = 'MEDICATION_ADMINISTERED' AND NOT COALESCE(v_family_member.medication_alerts, true) THEN
      CONTINUE;
    ELSIF p_alert_type = 'MEDICATION_MISSED' AND NOT COALESCE(v_family_member.medication_alerts, true) THEN
      CONTINUE;
    ELSIF p_alert_type LIKE 'HEALTH_%' AND NOT COALESCE(v_family_member.health_status_updates, true) THEN
      CONTINUE;
    ELSIF p_alert_type LIKE 'INCIDENT_%' AND NOT COALESCE(v_family_member.incident_alerts, true) THEN
      CONTINUE;
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
      delivered_at,
      created_at
    ) VALUES (
      p_resident_id,
      v_family_member.family_user_id,
      p_notification_type,
      p_alert_type,
      p_message,
      v_channels,
      false,
      p_notification_type = 'EMERGENCY',
      now(),
      now()
    );
  END LOOP;
END;
$$;

-- ============================================================
-- Trigger: Medication Administration
-- ============================================================

CREATE OR REPLACE FUNCTION notify_family_on_medication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_med_name text;
  v_message text;
  v_notification_type text;
  v_alert_type text;
BEGIN
  -- Get medication name
  SELECT medication_name INTO v_med_name
  FROM resident_medications
  WHERE id = NEW.medication_id;

  -- Determine notification type based on status
  IF NEW.status = 'MISSED' THEN
    v_notification_type := 'IMPORTANT';
    v_alert_type := 'MEDICATION_MISSED';
    v_message := format('Medication missed: %s was not administered as scheduled.', v_med_name);
  ELSIF NEW.status = 'LATE' THEN
    v_notification_type := 'INFORMATIONAL';
    v_alert_type := 'MEDICATION_LATE';
    v_message := format('Medication administered late: %s was given after the scheduled time.', v_med_name);
  ELSIF NEW.status = 'REFUSED' THEN
    v_notification_type := 'IMPORTANT';
    v_alert_type := 'MEDICATION_REFUSED';
    v_message := format('Medication refused: Your family member declined %s. Reason: %s', v_med_name, COALESCE(NEW.reason_for_skip, 'Not specified'));
  ELSE
    -- TAKEN - informational only
    v_notification_type := 'INFORMATIONAL';
    v_alert_type := 'MEDICATION_ADMINISTERED';
    v_message := format('Medication administered: %s was given as scheduled.', v_med_name);
  END IF;

  -- Send notification
  PERFORM notify_family_members(
    NEW.resident_id,
    v_notification_type,
    v_alert_type,
    v_message
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_family_medication ON medication_administration_log;

CREATE TRIGGER trigger_notify_family_medication
  AFTER INSERT ON medication_administration_log
  FOR EACH ROW
  EXECUTE FUNCTION notify_family_on_medication();

-- ============================================================
-- Trigger: Intelligence Signal (Anomaly/Risk Detection)
-- ============================================================

CREATE OR REPLACE FUNCTION notify_family_on_intelligence_signal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message text;
  v_notification_type text;
BEGIN
  -- Only notify on high severity signals
  IF NEW.severity NOT IN ('HIGH', 'CRITICAL', 'URGENT') THEN
    RETURN NEW;
  END IF;

  -- Determine notification type
  v_notification_type := CASE
    WHEN NEW.severity = 'CRITICAL' OR NEW.severity = 'URGENT' THEN 'CRITICAL'
    ELSE 'IMPORTANT'
  END;

  v_message := format(
    'Health Alert: %s - %s',
    NEW.title,
    NEW.description
  );

  -- Send notification
  PERFORM notify_family_members(
    NEW.resident_id,
    v_notification_type,
    'HEALTH_ANOMALY_DETECTED',
    v_message
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_family_intelligence ON intelligence_signals;

CREATE TRIGGER trigger_notify_family_intelligence
  AFTER INSERT ON intelligence_signals
  FOR EACH ROW
  WHEN (NEW.severity IN ('HIGH', 'CRITICAL', 'URGENT'))
  EXECUTE FUNCTION notify_family_on_intelligence_signal();

-- ============================================================
-- Trigger: Emergency Task Completion
-- ============================================================

CREATE OR REPLACE FUNCTION notify_family_on_emergency_task()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message text;
BEGIN
  -- Only notify on emergency tasks
  IF NOT OLD.is_emergency THEN
    RETURN NEW;
  END IF;

  -- Only notify on completion
  IF NEW.state != 'completed' OR OLD.state = 'completed' THEN
    RETURN NEW;
  END IF;

  v_message := format(
    'Emergency Response: %s has been completed. Outcome: %s',
    NEW.task_name,
    COALESCE(NEW.outcome, 'Success')
  );

  -- Send notification
  PERFORM notify_family_members(
    NEW.resident_id,
    'CRITICAL',
    'EMERGENCY_TASK_COMPLETED',
    v_message
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_notify_family_emergency_task ON tasks;

CREATE TRIGGER trigger_notify_family_emergency_task
  AFTER UPDATE ON tasks
  FOR EACH ROW
  WHEN (NEW.is_emergency = true AND NEW.state = 'completed' AND OLD.state != 'completed')
  EXECUTE FUNCTION notify_family_on_emergency_task();

-- Grant permissions
GRANT EXECUTE ON FUNCTION notify_family_members(uuid, text, text, text) TO authenticated, anon;
