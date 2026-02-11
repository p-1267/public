/*
  # Phase 5: Notification Simulation Safety Gates

  ## Critical Requirement
  Records with is_simulation=true MUST NOT trigger real outbound delivery
  (email/SMS/push) to real recipients.
  
  ## Implementation Strategy
  
  ### 1. Check is_simulation at Send Time
  - Notification functions must check if source data is simulation
  - Route simulation notifications to test sink
  - Never deliver simulation alerts to real recipients
  
  ### 2. Simulation Sink
  - Simulation notifications logged but not delivered
  - Clear marking in notification_log
  - Status set to 'simulation_blocked'
  
  ### 3. Downstream Safety
  - Edge functions check is_simulation before external API calls
  - Integration webhooks skip simulation data
  - Billing/reporting exclude simulation by default
  
  ## Tables Modified
  - notification_log: Add is_simulation flag
  - integration_requests: Add is_simulation flag
*/

-- ============================================================================
-- Add is_simulation to Notification Log
-- ============================================================================

ALTER TABLE notification_log
ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_notification_log_is_simulation
ON notification_log(is_simulation) WHERE NOT is_simulation;

-- ============================================================================
-- Add is_simulation to Integration Requests
-- ============================================================================

ALTER TABLE integration_requests
ADD COLUMN IF NOT EXISTS is_simulation boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_integration_requests_is_simulation
ON integration_requests(is_simulation) WHERE NOT is_simulation;

-- ============================================================================
-- Update send_notification with Simulation Safety
-- ============================================================================

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
  v_is_simulation boolean := false;
  v_actual_status text;
BEGIN
  -- CRITICAL: Check if this notification is related to simulation data
  -- Check if the resident has any recent simulation-flagged data
  SELECT EXISTS (
    SELECT 1 FROM vital_signs v
    WHERE v.resident_id = p_resident_id
      AND v.is_simulation = true
      AND v.recorded_at >= now() - interval '1 hour'
  ) OR EXISTS (
    SELECT 1 FROM intelligence_signals i
    WHERE i.resident_id = p_resident_id
      AND i.is_simulation = true
      AND i.created_at >= now() - interval '1 hour'
  ) OR EXISTS (
    SELECT 1 FROM medication_administration_log m
    WHERE m.resident_id = p_resident_id
      AND m.is_simulation = true
      AND m.administered_at >= now() - interval '1 hour'
  ) INTO v_is_simulation;

  -- Get agency ID
  SELECT r.agency_id INTO v_agency_id
  FROM residents r
  WHERE r.id = p_resident_id;

  -- If simulation data, route to simulation sink instead
  IF v_is_simulation THEN
    -- Log notification but don't deliver
    INSERT INTO notification_log (
      agency_id,
      user_id,
      resident_id,
      notification_type,
      alert_type,
      message,
      status,
      is_simulation,
      delivery_channels,
      created_at
    ) VALUES (
      v_agency_id,
      p_recipient_user_id,
      p_resident_id,
      p_notification_type,
      p_alert_type,
      p_message,
      'simulation_blocked',  -- CRITICAL: Not delivered
      true,
      ARRAY['SIMULATION_SINK'],
      now()
    )
    RETURNING id INTO v_notification_id;
    
    RETURN json_build_object(
      'success', true,
      'notification_id', v_notification_id,
      'status', 'simulation_blocked',
      'message', 'Notification logged but not delivered (simulation data)',
      'is_simulation', true
    );
  END IF;

  -- Below this point: PRODUCTION FLOW ONLY (real notifications)
  
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
    
    v_actual_status := 'queued';

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
    
    v_actual_status := 'queued';

  -- IMPORTANT notifications: Respect preferences within policy
  ELSIF p_notification_type = 'IMPORTANT' THEN
    IF v_in_quiet_hours AND NOT v_overridden_by_policy THEN
      v_suppressed_by_preference := true;
      v_actual_status := 'suppressed_quiet_hours';
    ELSE
      IF v_user_prefs IS NOT NULL AND v_user_prefs.preferred_channels IS NOT NULL THEN
        v_delivery_channels := v_user_prefs.preferred_channels;
      ELSE
        v_delivery_channels := ARRAY['IN_APP'];
      END IF;
      v_actual_status := 'queued';
    END IF;

  -- INFORMATIONAL: Fully preference-controlled
  ELSE
    IF v_in_quiet_hours THEN
      v_suppressed_by_preference := true;
      v_actual_status := 'suppressed_quiet_hours';
    ELSE
      IF v_user_prefs IS NOT NULL AND v_user_prefs.preferred_channels IS NOT NULL THEN
        v_delivery_channels := v_user_prefs.preferred_channels;
      ELSE
        v_delivery_channels := ARRAY['IN_APP'];
      END IF;
      v_actual_status := 'queued';
    END IF;
  END IF;

  -- Insert notification log (PRODUCTION notification)
  INSERT INTO notification_log (
    agency_id,
    user_id,
    resident_id,
    notification_type,
    alert_type,
    message,
    status,
    is_simulation,
    delivery_channels,
    suppressed_by_preference,
    overridden_by_policy,
    policy_override_reason,
    created_at
  ) VALUES (
    v_agency_id,
    p_recipient_user_id,
    p_resident_id,
    p_notification_type,
    p_alert_type,
    p_message,
    v_actual_status,
    false,  -- Production notification
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
    'status', v_actual_status,
    'delivery_channels', v_delivery_channels,
    'suppressed_by_preference', v_suppressed_by_preference,
    'overridden_by_policy', v_overridden_by_policy,
    'is_simulation', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION send_notification TO authenticated;

-- ============================================================================
-- Create Simulation Safety Check Function
-- ============================================================================

CREATE OR REPLACE FUNCTION is_simulation_data(
  p_resident_id uuid,
  p_lookback_interval interval DEFAULT interval '1 hour'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if any recent data for this resident is simulation
  RETURN EXISTS (
    SELECT 1 FROM vital_signs v
    WHERE v.resident_id = p_resident_id
      AND v.is_simulation = true
      AND v.recorded_at >= now() - p_lookback_interval
  ) OR EXISTS (
    SELECT 1 FROM intelligence_signals i
    WHERE i.resident_id = p_resident_id
      AND i.is_simulation = true
      AND i.created_at >= now() - p_lookback_interval
  ) OR EXISTS (
    SELECT 1 FROM medication_administration_log m
    WHERE m.resident_id = p_resident_id
      AND m.is_simulation = true
      AND m.administered_at >= now() - p_lookback_interval
  ) OR EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.resident_id = p_resident_id
      AND t.is_simulation = true
      AND t.created_at >= now() - p_lookback_interval
  );
END;
$$;

GRANT EXECUTE ON FUNCTION is_simulation_data TO authenticated;

-- ============================================================================
-- Update Integration Request Creation with Simulation Safety
-- ============================================================================

CREATE OR REPLACE FUNCTION create_integration_request(
  p_provider_id uuid,
  p_request_type text,
  p_payload jsonb,
  p_resident_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request_id uuid;
  v_is_simulation boolean := false;
BEGIN
  -- Check if this is simulation data
  IF p_resident_id IS NOT NULL THEN
    v_is_simulation := is_simulation_data(p_resident_id);
  END IF;

  INSERT INTO integration_requests (
    provider_id,
    request_type,
    payload,
    resident_id,
    status,
    is_simulation,
    created_at
  ) VALUES (
    p_provider_id,
    p_request_type,
    p_payload,
    p_resident_id,
    CASE WHEN v_is_simulation THEN 'simulation_blocked' ELSE 'pending' END,
    v_is_simulation,
    now()
  )
  RETURNING id INTO v_request_id;

  RETURN v_request_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_integration_request TO authenticated;

-- ============================================================================
-- Documentation
-- ============================================================================

COMMENT ON FUNCTION send_notification IS 
'Sends notification with simulation safety gate. Simulation data notifications are logged but NOT delivered to real recipients.';

COMMENT ON FUNCTION is_simulation_data IS 
'Checks if recent data for a resident is simulation data. Used to prevent real outbound delivery.';

COMMENT ON FUNCTION create_integration_request IS 
'Creates integration request with simulation safety. Simulation requests are blocked from external delivery.';

COMMENT ON COLUMN notification_log.is_simulation IS 
'CRITICAL: If true, notification was NOT delivered to real recipients. Logged for simulation tracking only.';

COMMENT ON COLUMN integration_requests.is_simulation IS 
'CRITICAL: If true, request NOT sent to external system. Blocked for simulation safety.';
