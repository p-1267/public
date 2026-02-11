/*
  # Accessibility Settings RPCs (Phase 22)

  ## Purpose
  RPC functions for managing senior accessibility settings.
  All changes are audited.

  ## Functions
  1. update_senior_accessibility_settings - Update accessibility settings
  2. get_senior_accessibility_settings - Get current settings

  ## Security
  - All functions enforce authorization
  - All changes audited
  - Settings respected across all screens
*/

-- Function: update_senior_accessibility_settings
-- Updates accessibility settings for a senior user
CREATE OR REPLACE FUNCTION update_senior_accessibility_settings(
  p_text_size text DEFAULT NULL,
  p_high_contrast_mode boolean DEFAULT NULL,
  p_button_spacing text DEFAULT NULL,
  p_simplified_ui_mode boolean DEFAULT NULL,
  p_voice_readback_enabled boolean DEFAULT NULL,
  p_voice_readback_speed numeric DEFAULT NULL,
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
  v_existing_settings record;
  v_settings_id uuid;
  v_changes_made boolean := false;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT r.name INTO v_user_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- Only seniors can update their own accessibility settings
  IF v_user_role NOT IN ('SENIOR', 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'Insufficient permissions: Only seniors can update accessibility settings';
  END IF;

  -- Get existing settings
  SELECT * INTO v_existing_settings
  FROM senior_accessibility_settings
  WHERE user_id = v_user_id;

  -- Create settings if they don't exist
  IF v_existing_settings IS NULL THEN
    INSERT INTO senior_accessibility_settings (
      user_id,
      text_size,
      high_contrast_mode,
      button_spacing,
      simplified_ui_mode,
      voice_readback_enabled,
      voice_readback_speed
    ) VALUES (
      v_user_id,
      COALESCE(p_text_size, 'MEDIUM'),
      COALESCE(p_high_contrast_mode, false),
      COALESCE(p_button_spacing, 'STANDARD'),
      COALESCE(p_simplified_ui_mode, false),
      COALESCE(p_voice_readback_enabled, false),
      COALESCE(p_voice_readback_speed, 1.0)
    )
    RETURNING id INTO v_settings_id;

    -- Audit initial settings
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
      'ACCESSIBILITY',
      'initial_setup',
      NULL,
      json_build_object(
        'text_size', COALESCE(p_text_size, 'MEDIUM'),
        'high_contrast_mode', COALESCE(p_high_contrast_mode, false),
        'button_spacing', COALESCE(p_button_spacing, 'STANDARD'),
        'simplified_ui_mode', COALESCE(p_simplified_ui_mode, false),
        'voice_readback_enabled', COALESCE(p_voice_readback_enabled, false),
        'voice_readback_speed', COALESCE(p_voice_readback_speed, 1.0)
      ),
      p_device_fingerprint
    );

    v_changes_made := true;
  ELSE
    -- Update settings with auditing
    IF p_text_size IS NOT NULL AND p_text_size != v_existing_settings.text_size THEN
      INSERT INTO accessibility_preference_audit (user_id, user_role, preference_type, preference_key, previous_value, new_value, device_fingerprint)
      VALUES (v_user_id, v_user_role, 'ACCESSIBILITY', 'text_size', to_jsonb(v_existing_settings.text_size), to_jsonb(p_text_size), p_device_fingerprint);
      v_changes_made := true;
    END IF;

    IF p_high_contrast_mode IS NOT NULL AND p_high_contrast_mode != v_existing_settings.high_contrast_mode THEN
      INSERT INTO accessibility_preference_audit (user_id, user_role, preference_type, preference_key, previous_value, new_value, device_fingerprint)
      VALUES (v_user_id, v_user_role, 'ACCESSIBILITY', 'high_contrast_mode', to_jsonb(v_existing_settings.high_contrast_mode), to_jsonb(p_high_contrast_mode), p_device_fingerprint);
      v_changes_made := true;
    END IF;

    IF p_button_spacing IS NOT NULL AND p_button_spacing != v_existing_settings.button_spacing THEN
      INSERT INTO accessibility_preference_audit (user_id, user_role, preference_type, preference_key, previous_value, new_value, device_fingerprint)
      VALUES (v_user_id, v_user_role, 'ACCESSIBILITY', 'button_spacing', to_jsonb(v_existing_settings.button_spacing), to_jsonb(p_button_spacing), p_device_fingerprint);
      v_changes_made := true;
    END IF;

    IF p_simplified_ui_mode IS NOT NULL AND p_simplified_ui_mode != v_existing_settings.simplified_ui_mode THEN
      INSERT INTO accessibility_preference_audit (user_id, user_role, preference_type, preference_key, previous_value, new_value, device_fingerprint)
      VALUES (v_user_id, v_user_role, 'ACCESSIBILITY', 'simplified_ui_mode', to_jsonb(v_existing_settings.simplified_ui_mode), to_jsonb(p_simplified_ui_mode), p_device_fingerprint);
      v_changes_made := true;
    END IF;

    IF p_voice_readback_enabled IS NOT NULL AND p_voice_readback_enabled != v_existing_settings.voice_readback_enabled THEN
      INSERT INTO accessibility_preference_audit (user_id, user_role, preference_type, preference_key, previous_value, new_value, device_fingerprint)
      VALUES (v_user_id, v_user_role, 'ACCESSIBILITY', 'voice_readback_enabled', to_jsonb(v_existing_settings.voice_readback_enabled), to_jsonb(p_voice_readback_enabled), p_device_fingerprint);
      v_changes_made := true;
    END IF;

    IF p_voice_readback_speed IS NOT NULL AND p_voice_readback_speed != v_existing_settings.voice_readback_speed THEN
      INSERT INTO accessibility_preference_audit (user_id, user_role, preference_type, preference_key, previous_value, new_value, device_fingerprint)
      VALUES (v_user_id, v_user_role, 'ACCESSIBILITY', 'voice_readback_speed', to_jsonb(v_existing_settings.voice_readback_speed), to_jsonb(p_voice_readback_speed), p_device_fingerprint);
      v_changes_made := true;
    END IF;

    -- Apply updates
    UPDATE senior_accessibility_settings
    SET text_size = COALESCE(p_text_size, text_size),
        high_contrast_mode = COALESCE(p_high_contrast_mode, high_contrast_mode),
        button_spacing = COALESCE(p_button_spacing, button_spacing),
        simplified_ui_mode = COALESCE(p_simplified_ui_mode, simplified_ui_mode),
        voice_readback_enabled = COALESCE(p_voice_readback_enabled, voice_readback_enabled),
        voice_readback_speed = COALESCE(p_voice_readback_speed, voice_readback_speed),
        updated_at = now()
    WHERE user_id = v_user_id
    RETURNING id INTO v_settings_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'settings_id', v_settings_id,
    'changes_made', v_changes_made,
    'message', 'Accessibility settings updated successfully'
  );
END;
$$;

-- Function: get_senior_accessibility_settings
-- Gets accessibility settings for current user
CREATE OR REPLACE FUNCTION get_senior_accessibility_settings()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_settings record;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_settings
  FROM senior_accessibility_settings
  WHERE user_id = v_user_id;

  IF v_settings IS NULL THEN
    -- Return defaults if no settings exist
    RETURN json_build_object(
      'exists', false,
      'text_size', 'MEDIUM',
      'high_contrast_mode', false,
      'button_spacing', 'STANDARD',
      'simplified_ui_mode', false,
      'voice_readback_enabled', false,
      'voice_readback_speed', 1.0
    );
  END IF;

  RETURN json_build_object(
    'exists', true,
    'text_size', v_settings.text_size,
    'high_contrast_mode', v_settings.high_contrast_mode,
    'button_spacing', v_settings.button_spacing,
    'simplified_ui_mode', v_settings.simplified_ui_mode,
    'voice_readback_enabled', v_settings.voice_readback_enabled,
    'voice_readback_speed', v_settings.voice_readback_speed,
    'updated_at', v_settings.updated_at
  );
END;
$$;
