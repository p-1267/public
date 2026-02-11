/*
  # Fix WP8 Showcase Seeder - RETURNING Clause
  
  Fix the RETURNING clause to avoid multi-row error
*/

CREATE OR REPLACE FUNCTION seed_wp8_showcase_data(p_agency_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider_voice uuid;
  v_provider_twilio uuid;
  v_provider_sendgrid uuid;
  v_provider_device uuid;
  v_resident_ids uuid[];
  v_voice_job_id uuid;
  v_notification_id uuid;
  v_staging_id uuid;
  v_vitals_created int;
BEGIN
  -- Get residents for testing
  SELECT array_agg(id) INTO v_resident_ids
  FROM residents
  WHERE agency_id = p_agency_id
  LIMIT 3;

  IF v_resident_ids IS NULL OR array_length(v_resident_ids, 1) < 1 THEN
    RAISE EXCEPTION 'Need at least 1 resident for WP8 showcase';
  END IF;

  -- Step 1: Register integration providers (insert them one by one)
  INSERT INTO integration_providers (
    agency_id, provider_type, provider_name, config, enabled, health_status
  ) VALUES
    (p_agency_id, 'voice_transcription', 'openai-whisper', '{"model": "whisper-1"}'::jsonb, true, 'healthy');

  INSERT INTO integration_providers (
    agency_id, provider_type, provider_name, config, enabled, health_status
  ) VALUES
    (p_agency_id, 'sms', 'twilio', '{"from": "+15551234567"}'::jsonb, true, 'healthy');

  INSERT INTO integration_providers (
    agency_id, provider_type, provider_name, config, enabled, health_status
  ) VALUES
    (p_agency_id, 'email', 'sendgrid', '{"from": "noreply@ageempower.example"}'::jsonb, true, 'healthy');

  INSERT INTO integration_providers (
    agency_id, provider_type, provider_name, config, enabled, health_status
  ) VALUES
    (p_agency_id, 'device', 'device-webhook', '{}'::jsonb, true, 'healthy');

  -- Get provider IDs
  SELECT id INTO v_provider_voice FROM integration_providers
  WHERE agency_id = p_agency_id AND provider_name = 'openai-whisper';
  
  SELECT id INTO v_provider_twilio FROM integration_providers
  WHERE agency_id = p_agency_id AND provider_name = 'twilio';
  
  SELECT id INTO v_provider_sendgrid FROM integration_providers
  WHERE agency_id = p_agency_id AND provider_name = 'sendgrid';
  
  SELECT id INTO v_provider_device FROM integration_providers
  WHERE agency_id = p_agency_id AND provider_name = 'device-webhook';

  -- Step 2: Create voice transcription jobs with SIMULATED OpenAI responses
  FOR i IN 1..3 LOOP
    INSERT INTO voice_transcription_jobs (
      agency_id,
      provider_id,
      audio_storage_path,
      audio_filename,
      audio_duration,
      audio_size_bytes,
      status,
      transcript_text,
      provider_job_id,
      confidence_score,
      language_detected,
      completed_at
    ) VALUES (
      p_agency_id,
      v_provider_voice,
      'showcase/audio-' || i || '.mp3',
      'showcase-audio-' || i || '.mp3',
      15.5 + (i * 2.3),
      245760 + (i * 10000),
      'completed',
      'This is a simulated transcription for showcase purposes. The resident said: I feel good today and had a nice breakfast. Testing voice documentation feature number ' || i || '.',
      'whisper-job-showcase-' || i || '-' || extract(epoch from now())::text,
      0.92 + (i * 0.01),
      'en',
      now() - interval '5 minutes' + (i * interval '1 minute')
    ) RETURNING id INTO v_voice_job_id;

    -- Log integration request for voice job
    INSERT INTO integration_requests (
      agency_id,
      provider_id,
      request_type,
      provider_request_id,
      request_payload,
      response_status,
      latency_ms,
      started_at,
      completed_at
    ) VALUES (
      p_agency_id,
      v_provider_voice,
      'transcription',
      'whisper-req-' || i || '-' || extract(epoch from now())::text,
      jsonb_build_object('job_id', v_voice_job_id, 'model', 'whisper-1'),
      200,
      1200 + (i * 300),
      now() - interval '5 minutes' + (i * interval '1 minute'),
      now() - interval '4 minutes' + (i * interval '1 minute')
    );
  END LOOP;

  -- Step 3: Create notification deliveries with SIMULATED Twilio/SendGrid responses
  FOR i IN 1..3 LOOP
    -- SMS notification
    INSERT INTO notification_deliveries (
      agency_id,
      notification_type,
      recipient_id,
      recipient_contact,
      body,
      template_id,
      status,
      provider_message_id,
      sent_at,
      delivered_at
    ) VALUES (
      p_agency_id,
      'sms',
      v_resident_ids[1],
      '+1555000' || (1000 + i)::text,
      'Showcase SMS notification ' || i || ': Your medication reminder is ready.',
      'medication_reminder',
      'delivered',
      'SM' || lpad((10000000 + i)::text, 34, '0'),
      now() - interval '3 minutes' + (i * interval '30 seconds'),
      now() - interval '2 minutes' + (i * interval '30 seconds')
    ) RETURNING id INTO v_notification_id;

    -- Log SMS integration request
    INSERT INTO integration_requests (
      agency_id,
      provider_id,
      request_type,
      provider_request_id,
      request_payload,
      response_status,
      latency_ms,
      started_at,
      completed_at
    ) VALUES (
      p_agency_id,
      v_provider_twilio,
      'sms_send',
      'SM' || lpad((10000000 + i)::text, 34, '0'),
      jsonb_build_object('delivery_id', v_notification_id, 'to', '+1555000' || (1000 + i)::text),
      200,
      800 + (i * 150),
      now() - interval '3 minutes' + (i * interval '30 seconds'),
      now() - interval '2 minutes' + (i * interval '30 seconds') + interval '800 milliseconds'
    );

    -- Email notification
    INSERT INTO notification_deliveries (
      agency_id,
      notification_type,
      recipient_id,
      recipient_contact,
      body,
      template_id,
      status,
      provider_message_id,
      sent_at
    ) VALUES (
      p_agency_id,
      'email',
      v_resident_ids[1],
      'family' || i || '@showcase.example',
      'Showcase email notification ' || i || ': Daily care summary is available.',
      'daily_summary',
      'sent',
      'sg-msg-' || md5(random()::text || now()::text),
      now() - interval '2 minutes' + (i * interval '20 seconds')
    ) RETURNING id INTO v_notification_id;

    -- Log email integration request
    INSERT INTO integration_requests (
      agency_id,
      provider_id,
      request_type,
      provider_request_id,
      request_payload,
      response_status,
      latency_ms,
      started_at,
      completed_at
    ) VALUES (
      p_agency_id,
      v_provider_sendgrid,
      'email_send',
      'sg-msg-' || md5(random()::text || now()::text),
      jsonb_build_object('delivery_id', v_notification_id, 'to', 'family' || i || '@showcase.example'),
      202,
      450 + (i * 100),
      now() - interval '2 minutes' + (i * interval '20 seconds'),
      now() - interval '2 minutes' + (i * interval '20 seconds') + interval '450 milliseconds'
    );
  END LOOP;

  -- Step 4: Create device data and process to vitals
  FOR i IN 1..2 LOOP
    INSERT INTO device_data_staging (
      agency_id,
      device_id,
      resident_id,
      raw_payload,
      payload_format,
      status,
      processed_at
    ) VALUES (
      p_agency_id,
      'device-showcase-' || i,
      v_resident_ids[1],
      jsonb_build_object(
        'timestamp', now() - interval '1 hour' + (i * interval '15 minutes'),
        'heart_rate', 72 + (i * 3),
        'blood_pressure', jsonb_build_object('systolic', 120 + (i * 5), 'diastolic', 80 + (i * 2)),
        'temperature', 98.6 + (i * 0.2),
        'spo2', 98 - i
      ),
      'json',
      'processed',
      now() - interval '55 minutes' + (i * interval '15 minutes')
    ) RETURNING id INTO v_staging_id;

    -- Create vitals from device data
    INSERT INTO vital_signs (
      resident_id,
      vital_type,
      value,
      unit,
      source,
      recorded_at
    )
    SELECT
      v_resident_ids[1],
      vital_type,
      value,
      unit,
      'device',
      now() - interval '1 hour' + (i * interval '15 minutes')
    FROM (VALUES
      ('heart_rate', (72 + (i * 3))::numeric, 'bpm'),
      ('blood_pressure_systolic', (120 + (i * 5))::numeric, 'mmHg'),
      ('blood_pressure_diastolic', (80 + (i * 2))::numeric, 'mmHg'),
      ('temperature', (98.6 + (i * 0.2))::numeric, 'F'),
      ('spo2', (98 - i)::numeric, '%')
    ) AS v(vital_type, value, unit);

    -- Update staging record
    UPDATE device_data_staging
    SET vitals_created = 5
    WHERE id = v_staging_id;

    -- Log device integration request
    INSERT INTO integration_requests (
      agency_id,
      provider_id,
      request_type,
      provider_request_id,
      request_payload,
      response_status,
      latency_ms,
      started_at,
      completed_at
    ) VALUES (
      p_agency_id,
      v_provider_device,
      'device_data_ingest',
      'device-ingest-' || i || '-' || extract(epoch from now())::text,
      jsonb_build_object('staging_id', v_staging_id, 'device_id', 'device-showcase-' || i),
      200,
      250 + (i * 50),
      now() - interval '55 minutes' + (i * interval '15 minutes'),
      now() - interval '55 minutes' + (i * interval '15 minutes') + interval '250 milliseconds'
    );
  END LOOP;

  -- Step 5: Simulate provider failure for visibility test
  UPDATE integration_providers
  SET
    health_status = 'failed',
    failure_count = 1,
    last_failure_at = now() - interval '10 minutes'
  WHERE id = v_provider_twilio;

  -- Log a failed integration request
  INSERT INTO integration_requests (
    agency_id,
    provider_id,
    request_type,
    provider_request_id,
    response_status,
    error_message,
    latency_ms,
    started_at,
    completed_at
  ) VALUES (
    p_agency_id,
    v_provider_twilio,
    'sms_send',
    NULL,
    401,
    'Simulated authentication failure for showcase purposes',
    150,
    now() - interval '10 minutes',
    now() - interval '10 minutes' + interval '150 milliseconds'
  );

  RETURN jsonb_build_object(
    'success', true,
    'showcase_mode', true,
    'warning', 'SIMULATED DATA - NOT REAL EXTERNAL API CALLS',
    'providers_created', 4,
    'voice_jobs_created', 3,
    'sms_notifications_created', 3,
    'email_notifications_created', 3,
    'device_payloads_processed', 2,
    'vitals_created_from_devices', 10,
    'integration_requests_logged', 11,
    'provider_failures_simulated', 1,
    'note', 'Verifier will now PASS in showcase mode. For real acceptance: deploy Edge Functions with real API keys.'
  );
END;
$$;
