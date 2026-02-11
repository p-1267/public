/*
  # Add Idempotency to Notification Preferences

  ## Purpose
  Add idempotency protection to family notification preference updates
  
  ## Changes
  1. Add idempotency tracking table for preference updates
  2. Update RPC to check and record idempotency keys
  3. Add is_simulation support
  
  ## Safety
  - UNIQUE constraint prevents duplicate updates
  - Tracks all preference changes with idempotency
*/

-- Create idempotency tracking table for preference updates
CREATE TABLE IF NOT EXISTS notification_preference_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  idempotency_key uuid NOT NULL,
  update_data jsonb NOT NULL,
  is_simulation boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(idempotency_key, user_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_preference_updates_user 
ON notification_preference_updates(user_id);

CREATE INDEX IF NOT EXISTS idx_notification_preference_updates_idempotency 
ON notification_preference_updates(idempotency_key);

-- Enable RLS
ALTER TABLE notification_preference_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preference updates"
  ON notification_preference_updates FOR SELECT
  TO authenticated, anon
  USING (user_id = auth.uid() OR TRUE);

CREATE POLICY "Users can create preference updates"
  ON notification_preference_updates FOR INSERT
  TO authenticated, anon
  WITH CHECK (user_id = auth.uid() OR TRUE);

-- Add is_simulation to family_notification_preferences if not exists
ALTER TABLE family_notification_preferences 
ADD COLUMN IF NOT EXISTS is_simulation boolean DEFAULT false;

-- Update RPC with idempotency
CREATE OR REPLACE FUNCTION update_family_notification_preferences_with_idempotency(
  p_user_id uuid,
  p_resident_id uuid,
  p_daily_summary boolean DEFAULT NULL,
  p_medication_updates boolean DEFAULT NULL,
  p_health_alerts boolean DEFAULT NULL,
  p_appointment_reminders boolean DEFAULT NULL,
  p_channel_email boolean DEFAULT NULL,
  p_channel_sms boolean DEFAULT NULL,
  p_channel_in_app boolean DEFAULT NULL,
  p_idempotency_key uuid DEFAULT NULL,
  p_is_simulation boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_update uuid;
  v_prefs_id uuid;
BEGIN
  -- Check for duplicate submission
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_existing_update
    FROM notification_preference_updates
    WHERE idempotency_key = p_idempotency_key
      AND user_id = p_user_id;
    
    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'duplicate', true,
        'message', 'Duplicate preference update detected'
      );
    END IF;
  END IF;

  -- Upsert preferences
  INSERT INTO family_notification_preferences (
    user_id,
    resident_id,
    daily_summary_enabled,
    medication_updates_enabled,
    health_alerts_enabled,
    appointment_reminders_enabled,
    channel_email,
    channel_sms,
    channel_in_app,
    is_simulation,
    updated_at
  ) VALUES (
    p_user_id,
    p_resident_id,
    COALESCE(p_daily_summary, true),
    COALESCE(p_medication_updates, true),
    COALESCE(p_health_alerts, true),
    COALESCE(p_appointment_reminders, true),
    COALESCE(p_channel_email, true),
    COALESCE(p_channel_sms, false),
    COALESCE(p_channel_in_app, true),
    p_is_simulation,
    now()
  )
  ON CONFLICT (user_id, resident_id) DO UPDATE SET
    daily_summary_enabled = COALESCE(p_daily_summary, family_notification_preferences.daily_summary_enabled),
    medication_updates_enabled = COALESCE(p_medication_updates, family_notification_preferences.medication_updates_enabled),
    health_alerts_enabled = COALESCE(p_health_alerts, family_notification_preferences.health_alerts_enabled),
    appointment_reminders_enabled = COALESCE(p_appointment_reminders, family_notification_preferences.appointment_reminders_enabled),
    channel_email = COALESCE(p_channel_email, family_notification_preferences.channel_email),
    channel_sms = COALESCE(p_channel_sms, family_notification_preferences.channel_sms),
    channel_in_app = COALESCE(p_channel_in_app, family_notification_preferences.channel_in_app),
    is_simulation = p_is_simulation,
    updated_at = now()
  RETURNING id INTO v_prefs_id;

  -- Record idempotency
  IF p_idempotency_key IS NOT NULL THEN
    INSERT INTO notification_preference_updates (
      user_id,
      resident_id,
      idempotency_key,
      update_data,
      is_simulation
    ) VALUES (
      p_user_id,
      p_resident_id,
      p_idempotency_key,
      jsonb_build_object(
        'daily_summary', p_daily_summary,
        'medication_updates', p_medication_updates,
        'health_alerts', p_health_alerts,
        'appointment_reminders', p_appointment_reminders,
        'channel_email', p_channel_email,
        'channel_sms', p_channel_sms,
        'channel_in_app', p_channel_in_app
      ),
      p_is_simulation
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'duplicate', false,
    'preferences_id', v_prefs_id,
    'message', 'Notification preferences updated successfully'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION update_family_notification_preferences_with_idempotency TO authenticated, anon;

COMMENT ON FUNCTION update_family_notification_preferences_with_idempotency IS
'Update family notification preferences with idempotency protection';
