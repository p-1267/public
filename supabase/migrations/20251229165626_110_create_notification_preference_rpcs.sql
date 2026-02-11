/*
  # Notification Preference RPCs (Phase 22)

  ## Purpose
  RPC functions for managing family notification preferences.
  Enforces agency policy overrides.

  ## Functions
  1. update_family_notification_preferences - Update notification preferences with policy enforcement
  2. get_family_notification_preferences - Get current preferences
  3. update_agency_notification_policy - Update agency policy (admin only)
  4. get_agency_notification_policy - Get agency policy

  ## Security
  - All functions enforce authorization
  - Agency policy overrides user preferences
  - All changes audited
*/

-- Function: update_family_notification_preferences
-- Updates notification preferences for family member with policy enforcement
CREATE OR REPLACE FUNCTION update_family_notification_preferences(
  p_resident_id uuid,
  p_quiet_hours_start time DEFAULT NULL,
  p_quiet_hours_end time DEFAULT NULL,
  p_channel_in_app boolean DEFAULT NULL,
  p_channel_push boolean DEFAULT NULL,
  p_channel_sms boolean DEFAULT NULL,
  p_channel_email boolean DEFAULT NULL,
  p_summary_frequency text DEFAULT NULL,
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
  v_agency_id uuid;
  v_existing_prefs record;
  v_agency_policy record;
  v_prefs_id uuid;
  v_policy_violations text[] := '{}';
  v_changes_made boolean := false;
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

  -- Only family members can update their notification preferences
  IF v_user_role NOT IN ('FAMILY', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions: Only family members can update notification preferences';
  END IF;

  -- Get agency policy
  SELECT * INTO v_agency_policy
  FROM agency_notification_policy
  WHERE agency_id = v_agency_id;

  -- If no policy exists, create default restrictive policy
  IF v_agency_policy IS NULL THEN
    INSERT INTO agency_notification_policy (agency_id)
    VALUES (v_agency_id)
    RETURNING * INTO v_agency_policy;
  END IF;

  -- Enforce agency policy: quiet hours
  IF NOT v_agency_policy.allow_quiet_hours THEN
    IF p_quiet_hours_start IS NOT NULL OR p_quiet_hours_end IS NOT NULL THEN
      v_policy_violations := array_append(v_policy_violations, 'Quiet hours not allowed by agency policy');
      p_quiet_hours_start := NULL;
      p_quiet_hours_end := NULL;
    END IF;
  END IF;

  -- Get existing preferences
  SELECT * INTO v_existing_prefs
  FROM family_notification_preferences
  WHERE user_id = v_user_id AND resident_id = p_resident_id;

  -- Create preferences if they don't exist
  IF v_existing_prefs IS NULL THEN
    INSERT INTO family_notification_preferences (
      user_id,
      resident_id,
      quiet_hours_start,
      quiet_hours_end,
      channel_in_app,
      channel_push,
      channel_sms,
      channel_email,
      summary_frequency
    ) VALUES (
      v_user_id,
      p_resident_id,
      p_quiet_hours_start,
      p_quiet_hours_end,
      COALESCE(p_channel_in_app, true),
      COALESCE(p_channel_push, true),
      COALESCE(p_channel_sms, false),
      COALESCE(p_channel_email, false),
      COALESCE(p_summary_frequency, 'DAILY')
    )
    RETURNING id INTO v_prefs_id;

    -- Audit initial preferences
    INSERT INTO accessibility_preference_audit (
      user_id,
      user_role,
      preference_type,
      preference_key,
      previous_value,
      new_value,
      device_fingerprint
    ) VALUES (
      v_user_id,
      v_user_role,
      'NOTIFICATION_PREFERENCE',
      'initial_setup',
      NULL,
      json_build_object(
        'resident_id', p_resident_id,
        'quiet_hours_start', p_quiet_hours_start,
        'quiet_hours_end', p_quiet_hours_end,
        'channel_in_app', COALESCE(p_channel_in_app, true),
        'channel_push', COALESCE(p_channel_push, true),
        'channel_sms', COALESCE(p_channel_sms, false),
        'channel_email', COALESCE(p_channel_email, false),
        'summary_frequency', COALESCE(p_summary_frequency, 'DAILY')
      ),
      p_device_fingerprint
    );

    v_changes_made := true;
  ELSE
    -- Update preferences with auditing
    IF p_quiet_hours_start IS NOT NULL AND (v_existing_prefs.quiet_hours_start IS NULL OR p_quiet_hours_start != v_existing_prefs.quiet_hours_start) THEN
      INSERT INTO accessibility_preference_audit (user_id, user_role, preference_type, preference_key, previous_value, new_value, device_fingerprint)
      VALUES (v_user_id, v_user_role, 'NOTIFICATION_PREFERENCE', 'quiet_hours_start', to_jsonb(v_existing_prefs.quiet_hours_start), to_jsonb(p_quiet_hours_start), p_device_fingerprint);
      v_changes_made := true;
    END IF;

    IF p_channel_in_app IS NOT NULL AND p_channel_in_app != v_existing_prefs.channel_in_app THEN
      INSERT INTO accessibility_preference_audit (user_id, user_role, preference_type, preference_key, previous_value, new_value, device_fingerprint)
      VALUES (v_user_id, v_user_role, 'NOTIFICATION_PREFERENCE', 'channel_in_app', to_jsonb(v_existing_prefs.channel_in_app), to_jsonb(p_channel_in_app), p_device_fingerprint);
      v_changes_made := true;
    END IF;

    -- Apply updates
    UPDATE family_notification_preferences
    SET quiet_hours_start = COALESCE(p_quiet_hours_start, quiet_hours_start),
        quiet_hours_end = COALESCE(p_quiet_hours_end, quiet_hours_end),
        channel_in_app = COALESCE(p_channel_in_app, channel_in_app),
        channel_push = COALESCE(p_channel_push, channel_push),
        channel_sms = COALESCE(p_channel_sms, channel_sms),
        channel_email = COALESCE(p_channel_email, channel_email),
        summary_frequency = COALESCE(p_summary_frequency, summary_frequency),
        updated_at = now()
    WHERE user_id = v_user_id AND resident_id = p_resident_id
    RETURNING id INTO v_prefs_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'prefs_id', v_prefs_id,
    'changes_made', v_changes_made,
    'policy_violations', v_policy_violations,
    'message', CASE 
      WHEN array_length(v_policy_violations, 1) > 0 
      THEN 'Preferences updated with policy overrides applied'
      ELSE 'Notification preferences updated successfully'
    END
  );
END;
$$;

-- Function: get_family_notification_preferences
-- Gets notification preferences for family member
CREATE OR REPLACE FUNCTION get_family_notification_preferences(
  p_resident_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_prefs record;
  v_agency_policy record;
  v_agency_id uuid;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Get agency ID
  SELECT agency_id INTO v_agency_id
  FROM user_profiles
  WHERE id = v_user_id;

  -- Get preferences
  SELECT * INTO v_prefs
  FROM family_notification_preferences
  WHERE user_id = v_user_id AND resident_id = p_resident_id;

  -- Get agency policy
  SELECT * INTO v_agency_policy
  FROM agency_notification_policy
  WHERE agency_id = v_agency_id;

  IF v_prefs IS NULL THEN
    RETURN json_build_object(
      'exists', false,
      'quiet_hours_start', NULL,
      'quiet_hours_end', NULL,
      'channel_in_app', true,
      'channel_push', true,
      'channel_sms', false,
      'channel_email', false,
      'summary_frequency', 'DAILY',
      'agency_policy', CASE WHEN v_agency_policy IS NOT NULL THEN
        json_build_object(
          'allow_quiet_hours', v_agency_policy.allow_quiet_hours,
          'emergency_channels', v_agency_policy.emergency_channels,
          'critical_channels', v_agency_policy.critical_channels
        )
      ELSE NULL END
    );
  END IF;

  RETURN json_build_object(
    'exists', true,
    'quiet_hours_start', v_prefs.quiet_hours_start,
    'quiet_hours_end', v_prefs.quiet_hours_end,
    'channel_in_app', v_prefs.channel_in_app,
    'channel_push', v_prefs.channel_push,
    'channel_sms', v_prefs.channel_sms,
    'channel_email', v_prefs.channel_email,
    'summary_frequency', v_prefs.summary_frequency,
    'updated_at', v_prefs.updated_at,
    'agency_policy', CASE WHEN v_agency_policy IS NOT NULL THEN
      json_build_object(
        'allow_quiet_hours', v_agency_policy.allow_quiet_hours,
        'emergency_channels', v_agency_policy.emergency_channels,
        'critical_channels', v_agency_policy.critical_channels
      )
    ELSE NULL END
  );
END;
$$;

-- Function: update_agency_notification_policy
-- Updates agency notification policy (admin only)
CREATE OR REPLACE FUNCTION update_agency_notification_policy(
  p_mandatory_alert_types text[] DEFAULT NULL,
  p_emergency_channels text[] DEFAULT NULL,
  p_critical_channels text[] DEFAULT NULL,
  p_allow_quiet_hours boolean DEFAULT NULL,
  p_max_suppression_hours integer DEFAULT NULL,
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
  v_agency_id uuid;
  v_existing_policy record;
  v_policy_id uuid;
  v_changes_made boolean := false;
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

  -- Only agency admins can update policy
  IF v_user_role NOT IN ('AGENCY_ADMIN', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions: Only agency admins can update notification policy';
  END IF;

  -- Get existing policy
  SELECT * INTO v_existing_policy
  FROM agency_notification_policy
  WHERE agency_id = v_agency_id;

  -- Create policy if it doesn't exist
  IF v_existing_policy IS NULL THEN
    INSERT INTO agency_notification_policy (
      agency_id,
      mandatory_alert_types,
      emergency_channels,
      critical_channels,
      allow_quiet_hours,
      max_suppression_hours
    ) VALUES (
      v_agency_id,
      COALESCE(p_mandatory_alert_types, ARRAY['EMERGENCY', 'CRITICAL']),
      COALESCE(p_emergency_channels, ARRAY['IN_APP', 'PUSH', 'SMS']),
      COALESCE(p_critical_channels, ARRAY['IN_APP', 'PUSH']),
      COALESCE(p_allow_quiet_hours, false),
      COALESCE(p_max_suppression_hours, 0)
    )
    RETURNING id INTO v_policy_id;

    -- Audit policy creation
    INSERT INTO accessibility_preference_audit (
      user_id,
      user_role,
      preference_type,
      preference_key,
      previous_value,
      new_value,
      device_fingerprint
    ) VALUES (
      v_user_id,
      v_user_role,
      'NOTIFICATION_POLICY',
      'initial_setup',
      NULL,
      json_build_object(
        'mandatory_alert_types', COALESCE(p_mandatory_alert_types, ARRAY['EMERGENCY', 'CRITICAL']),
        'emergency_channels', COALESCE(p_emergency_channels, ARRAY['IN_APP', 'PUSH', 'SMS']),
        'critical_channels', COALESCE(p_critical_channels, ARRAY['IN_APP', 'PUSH']),
        'allow_quiet_hours', COALESCE(p_allow_quiet_hours, false),
        'max_suppression_hours', COALESCE(p_max_suppression_hours, 0)
      ),
      p_device_fingerprint
    );

    v_changes_made := true;
  ELSE
    -- Update policy with auditing
    UPDATE agency_notification_policy
    SET mandatory_alert_types = COALESCE(p_mandatory_alert_types, mandatory_alert_types),
        emergency_channels = COALESCE(p_emergency_channels, emergency_channels),
        critical_channels = COALESCE(p_critical_channels, critical_channels),
        allow_quiet_hours = COALESCE(p_allow_quiet_hours, allow_quiet_hours),
        max_suppression_hours = COALESCE(p_max_suppression_hours, max_suppression_hours),
        updated_at = now()
    WHERE agency_id = v_agency_id
    RETURNING id INTO v_policy_id;

    -- Audit changes
    INSERT INTO accessibility_preference_audit (
      user_id,
      user_role,
      preference_type,
      preference_key,
      previous_value,
      new_value,
      device_fingerprint
    ) VALUES (
      v_user_id,
      v_user_role,
      'NOTIFICATION_POLICY',
      'policy_update',
      to_jsonb(v_existing_policy),
      json_build_object(
        'mandatory_alert_types', COALESCE(p_mandatory_alert_types, v_existing_policy.mandatory_alert_types),
        'emergency_channels', COALESCE(p_emergency_channels, v_existing_policy.emergency_channels),
        'critical_channels', COALESCE(p_critical_channels, v_existing_policy.critical_channels),
        'allow_quiet_hours', COALESCE(p_allow_quiet_hours, v_existing_policy.allow_quiet_hours),
        'max_suppression_hours', COALESCE(p_max_suppression_hours, v_existing_policy.max_suppression_hours)
      ),
      p_device_fingerprint
    );

    v_changes_made := true;
  END IF;

  RETURN json_build_object(
    'success', true,
    'policy_id', v_policy_id,
    'changes_made', v_changes_made,
    'message', 'Agency notification policy updated successfully'
  );
END;
$$;

-- Function: get_agency_notification_policy
-- Gets agency notification policy
CREATE OR REPLACE FUNCTION get_agency_notification_policy()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_agency_id uuid;
  v_policy record;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT agency_id INTO v_agency_id
  FROM user_profiles
  WHERE id = v_user_id;

  SELECT * INTO v_policy
  FROM agency_notification_policy
  WHERE agency_id = v_agency_id;

  IF v_policy IS NULL THEN
    RETURN json_build_object(
      'exists', false,
      'mandatory_alert_types', ARRAY['EMERGENCY', 'CRITICAL'],
      'emergency_channels', ARRAY['IN_APP', 'PUSH', 'SMS'],
      'critical_channels', ARRAY['IN_APP', 'PUSH'],
      'allow_quiet_hours', false,
      'max_suppression_hours', 0
    );
  END IF;

  RETURN json_build_object(
    'exists', true,
    'mandatory_alert_types', v_policy.mandatory_alert_types,
    'emergency_channels', v_policy.emergency_channels,
    'critical_channels', v_policy.critical_channels,
    'allow_quiet_hours', v_policy.allow_quiet_hours,
    'max_suppression_hours', v_policy.max_suppression_hours,
    'updated_at', v_policy.updated_at
  );
END;
$$;
