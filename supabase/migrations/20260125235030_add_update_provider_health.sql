/*
  # Add update_provider_health helper function

  Helper function for Edge Functions to update provider health status after API calls.
*/

CREATE OR REPLACE FUNCTION update_provider_health(
  p_provider_name text,
  p_agency_id uuid,
  p_health_status text,
  p_last_success_at timestamptz DEFAULT NULL,
  p_last_failure_at timestamptz DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE integration_providers
  SET
    health_status = p_health_status,
    last_success_at = COALESCE(p_last_success_at, last_success_at),
    last_failure_at = COALESCE(p_last_failure_at, last_failure_at),
    failure_count = CASE
      WHEN p_health_status = 'healthy' THEN 0
      WHEN p_health_status IN ('failed', 'degraded') THEN failure_count + 1
      ELSE failure_count
    END,
    updated_at = now()
  WHERE provider_name = p_provider_name
    AND agency_id = p_agency_id;

  -- Create provider if doesn't exist
  IF NOT FOUND THEN
    INSERT INTO integration_providers (
      agency_id,
      provider_type,
      provider_name,
      health_status,
      last_success_at,
      last_failure_at,
      enabled
    ) VALUES (
      p_agency_id,
      CASE
        WHEN p_provider_name LIKE '%whisper%' THEN 'voice_transcription'
        WHEN p_provider_name = 'twilio' THEN 'sms'
        WHEN p_provider_name = 'sendgrid' THEN 'email'
        ELSE 'other'
      END,
      p_provider_name,
      p_health_status,
      p_last_success_at,
      p_last_failure_at,
      true
    );
  END IF;
END;
$$;
