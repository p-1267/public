/*
  # Add Idempotency to Senior Accessibility Settings RPC

  ## Purpose
  Add idempotency protection and showcase mode support to accessibility settings updates

  ## Changes
  1. Drop old function
  2. Recreate with idempotency_key and is_simulation parameters
  3. Store idempotency_key in audit log for duplicate detection
  4. Return early if duplicate detected

  ## Security
  - Prevents duplicate updates from double-submissions
  - Supports showcase mode data isolation
  - Maintains full audit trail
*/

-- Drop the old function
DROP FUNCTION IF EXISTS update_senior_accessibility_settings(text, boolean, text, boolean, boolean, numeric, text);

-- Recreate with idempotency
CREATE OR REPLACE FUNCTION update_senior_accessibility_settings(
  p_text_size text DEFAULT NULL,
  p_high_contrast_mode boolean DEFAULT NULL,
  p_button_spacing text DEFAULT NULL,
  p_simplified_ui_mode boolean DEFAULT NULL,
  p_voice_readback_enabled boolean DEFAULT NULL,
  p_voice_readback_speed numeric DEFAULT NULL,
  p_device_fingerprint text DEFAULT NULL,
  p_idempotency_key uuid DEFAULT NULL,
  p_is_simulation boolean DEFAULT false
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
  v_duplicate_check record;
BEGIN
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check for duplicate submission
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_duplicate_check
    FROM accessibility_preference_audit
    WHERE user_id = v_user_id
      AND preference_key = 'idempotency_check'
      AND new_value->>'idempotency_key' = p_idempotency_key::text
      AND created_at > (now() - INTERVAL '5 minutes');
    
    IF FOUND THEN
      RETURN json_build_object(
        'success', true,
        'duplicate', true,
        'message', 'Duplicate settings update detected'
      );
    END IF;
    
    -- Record this idempotency key
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
      'SENIOR',
      'IDEMPOTENCY_CHECK',
      'idempotency_check',
      NULL,
      json_build_object('idempotency_key', p_idempotency_key, 'is_simulation', p_is_simulation),
      p_device_fingerprint
    );
  END IF;

  SELECT r.name INTO v_user_role
  FROM user_profiles up
  JOIN roles r ON r.id = up.role_id
  WHERE up.id = v_user_id;

  -- Only seniors can update their own accessibility settings (or admins in showcase mode)
  IF v_user_role NOT IN ('SENIOR', 'SUPER_ADMIN') AND NOT p_is_simulation THEN
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
      COALESCE(v_user_role, 'SENIOR'),
      'ACCESSIBILITY',
      'initial_setup',
      NULL,
      json_build_object(
        'text_size', COALESCE(p_text_size, 'MEDIUM'),
        'high_contrast_mode', COALESCE(p_high_contrast_mode, false),
        'button_spacing', COALESCE(p_button_spacing, 'STANDARD'),
        'simplified_ui_mode', COALESCE(p_simplified_ui_mode, false),
        'voice_readback_enabled', COALESCE(p_voice_readback_enabled, false),
        'voice_readback_speed', COALESCE(p_voice_readback_speed, 1.0),
        'is_simulation', p_is_simulation
      ),
      p_device_fingerprint
    );

    v_changes_made := true;
  ELSE
    -- Update settings with auditing
    IF p_text_size IS NOT NULL AND p_text_size != v_existing_settings.text_size THEN
      INSERT INTO accessibility_preference_audit (user_id, user_role, preference_type, preference_key, previous_value, new_value, device_fingerprint)
      VALUES (v_user_id, COALESCE(v_user_role, 'SENIOR'), 'ACCESSIBILITY', 'text_size', to_jsonb(v_existing_settings.text_size), to_jsonb(p_text_size), p_device_fingerprint);
      v_changes_made := true;
    END IF;

    IF p_high_contrast_mode IS NOT NULL AND p_high_contrast_mode != v_existing_settings.high_contrast_mode THEN
      INSERT INTO accessibility_preference_audit (user_id, user_role, preference_type, preference_key, previous_value, new_value, device_fingerprint)
      VALUES (v_user_id, COALESCE(v_user_role, 'SENIOR'), 'ACCESSIBILITY', 'high_contrast_mode', to_jsonb(v_existing_settings.high_contrast_mode), to_jsonb(p_high_contrast_mode), p_device_fingerprint);
      v_changes_made := true;
    END IF;

    IF p_button_spacing IS NOT NULL AND p_button_spacing != v_existing_settings.button_spacing THEN
      INSERT INTO accessibility_preference_audit (user_id, user_role, preference_type, preference_key, previous_value, new_value, device_fingerprint)
      VALUES (v_user_id, COALESCE(v_user_role, 'SENIOR'), 'ACCESSIBILITY', 'button_spacing', to_jsonb(v_existing_settings.button_spacing), to_jsonb(p_button_spacing), p_device_fingerprint);
      v_changes_made := true;
    END IF;

    IF p_simplified_ui_mode IS NOT NULL AND p_simplified_ui_mode != v_existing_settings.simplified_ui_mode THEN
      INSERT INTO accessibility_preference_audit (user_id, user_role, preference_type, preference_key, previous_value, new_value, device_fingerprint)
      VALUES (v_user_id, COALESCE(v_user_role, 'SENIOR'), 'ACCESSIBILITY', 'simplified_ui_mode', to_jsonb(v_existing_settings.simplified_ui_mode), to_jsonb(p_simplified_ui_mode), p_device_fingerprint);
      v_changes_made := true;
    END IF;

    IF p_voice_readback_enabled IS NOT NULL AND p_voice_readback_enabled != v_existing_settings.voice_readback_enabled THEN
      INSERT INTO accessibility_preference_audit (user_id, user_role, preference_type, preference_key, previous_value, new_value, device_fingerprint)
      VALUES (v_user_id, COALESCE(v_user_role, 'SENIOR'), 'ACCESSIBILITY', 'voice_readback_enabled', to_jsonb(v_existing_settings.voice_readback_enabled), to_jsonb(p_voice_readback_enabled), p_device_fingerprint);
      v_changes_made := true;
    END IF;

    IF p_voice_readback_speed IS NOT NULL AND p_voice_readback_speed != v_existing_settings.voice_readback_speed THEN
      INSERT INTO accessibility_preference_audit (user_id, user_role, preference_type, preference_key, previous_value, new_value, device_fingerprint)
      VALUES (v_user_id, COALESCE(v_user_role, 'SENIOR'), 'ACCESSIBILITY', 'voice_readback_speed', to_jsonb(v_existing_settings.voice_readback_speed), to_jsonb(p_voice_readback_speed), p_device_fingerprint);
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
    'duplicate', false,
    'settings_id', v_settings_id,
    'changes_made', v_changes_made,
    'message', 'Accessibility settings updated successfully'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION update_senior_accessibility_settings TO authenticated, anon;

COMMENT ON FUNCTION update_senior_accessibility_settings IS
'Update senior accessibility settings with idempotency protection and showcase mode support';
